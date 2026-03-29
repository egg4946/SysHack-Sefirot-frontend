import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LuX, LuSend } from "react-icons/lu";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface ChatMessage {
  id: string;
  community_id: string;
  user: { id: string; display_name: string; };
  content: string;
  created_at: string;
}

interface ChatProps {
  communityId: string;
  currentUserId: string;
  onClose: () => void;
}

export const Chat: React.FC<ChatProps> = ({ communityId, currentUserId, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMessages = useCallback(async (token: string) => {
    const res = await fetch(`${API_BASE}/chat/messages?community_id=${communityId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  }, [communityId]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    let isMounted = true;

    const updateMessages = async () => {
      try {
        const data = await getMessages(token);
        if (isMounted) {
          setMessages(data);
        }
      } catch (error) {
        console.error('チャット取得失敗:', error);
      }
    };

    updateMessages();
    const intervalId = setInterval(updateMessages, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [getMessages]); 

  // メッセージが増えたら自動で一番下までスクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;
    const messageToSend = inputText;
    setInputText('');

    try {
      const res = await fetch(`${API_BASE}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          community_id: communityId,
          content: messageToSend
        })
      });

      if (res.ok) {
        const data = await getMessages(token);
        setMessages(data);
      } else {
        setInputText(messageToSend); // 失敗したらテキストボックスに戻す
      }
    } catch (error) {
      console.error('送信失敗:', error);
      setInputText(messageToSend);
    }
  };

  // ✨ 日付と時間の両方を綺麗にフォーマットする関数
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    // 今日の日付なら時間だけ、昨日以前なら日付＋時間を表示する工夫
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    
    if (isToday) {
      return `今日 ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('ja-JP', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }); // 例：3月30日 05:23
    }
  };

  return (
    <div className="flex flex-col h-full w-full border border-gray-300 rounded-none sm:rounded-2xl bg-white shadow-2xl overflow-hidden font-sans text-gray-950">
      
      {/* ヘッダー部分 */}
      <div className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10">
        <h3 className="text-sm font-bold flex items-center gap-2">
          💬 全体チャット
        </h3>
        <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold tracking-wider">
              🟢 ONLINE
            </span>
            <button 
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition active:scale-95"
            >
                <LuX className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* タイムライン部分 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sky-50/50">
        {messages.map((msg) => {
          const isMine = msg.user.id === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              
              {/* 送信者名（自分の場合は「あなた」と表示） */}
              <span className="text-[10px] text-gray-500 mb-1 px-1 font-bold">
                {isMine ? 'あなた' : msg.user.display_name}
              </span>
              
              <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* ふきだし本体 */}
                <div className={`px-4 py-2.5 rounded-[1.2rem] max-w-[85%] shadow-sm ${
                  isMine 
                    ? 'bg-[#DCF8C6] text-gray-950 rounded-br-sm' // LINE風の緑色
                    : 'bg-white text-gray-950 border border-gray-100 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                </div>
                
                {/* ✨ 日付＋時間表示 */}
                <span className="text-[9px] text-gray-400 mb-0.5 font-bold whitespace-nowrap">
                  {formatDateTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        {/* スクロール用ダミー要素 */}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* 入力フォーム部分 */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 border border-gray-200 rounded-full px-5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-gray-50 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-blue-600 text-white rounded-full p-3 flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition active:scale-90 shadow-md shadow-blue-500/30"
        >
          <LuSend className="w-5 h-5 ml-1" /> {/* 送信アイコン */}
        </button>
      </form>

    </div>
  );
};
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LuX } from "react-icons/lu";

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

  // 1. fetch 本体を useCallback で定義（依存関係を明確にする）
  const getMessages = useCallback(async (token: string) => {
    const res = await fetch(`${API_BASE}/chat/messages?community_id=${communityId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  }, [communityId]); // communityId が変わった時だけ関数が再生成される

  // 2. useEffect 内で安全に呼び出し
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

    updateMessages(); // 初回読み込み
    const intervalId = setInterval(updateMessages, 3000); // 3秒おき

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
    // getMessages を依存配列に含めることで警告を解消
  }, [getMessages]); 

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
        setInputText(messageToSend);
      }
    } catch (error) {
      console.error('送信失敗:', error);
      setInputText(messageToSend);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full w-full border border-gray-300 rounded-none sm:rounded-2xl bg-white shadow-2xl overflow-hidden font-sans text-gray-950">
      <div className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10">
        <h3 className="text-sm font-bold flex items-center gap-2">
          💬 全体チャット
        </h3>
        <div className="flex items-center gap-2">
            <span className="text-[10px] bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">リアルタイム監視中</span>
            <button 
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition active:scale-95"
            >
                <LuX className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sky-50">
        {messages.map((msg) => {
          const isMine = msg.user.id === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-600 mb-1 px-1 font-medium">
                {msg.user.display_name}
              </span>
              <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`px-4 py-2 rounded-xl max-w-[80%] shadow-sm ${
                  isMine ? 'bg-[#DCF8C6] text-gray-950 rounded-br-none' : 'bg-white text-gray-950 border border-gray-100 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                </div>
                <span className="text-[10px] text-gray-400 mb-1 font-mono">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t flex gap-2 rounded-b-lg">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-blue-600 text-white rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-50 transition-opacity active:scale-95"
        >
          送信
        </button>
      </form>
    </div>
  );
};
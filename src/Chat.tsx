import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LuX, LuSend } from "react-icons/lu";
import toast from 'react-hot-toast';

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
  
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false); 
  const isConnectedRef = useRef(false); // ✨ 内部判定用（無限ループ防止）

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

  // ✨ メッセージを安全に追加する処理（重複バグを防止）
  const addMessageSafe = useCallback((newMsg: ChatMessage) => {
    setMessages(prev => {
      // すでに画面にあるメッセージなら無視する
      if (prev.some(m => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    let isMounted = true;

    // 最新のチャットを丸ごと取得
    const updateMessages = async () => {
      try {
        const data = await getMessages(token);
        if (isMounted) setMessages(data);
      } catch (error) {
        console.error('チャット取得失敗:', error);
        toast.error('チャットの取得に失敗しました');
      }
    };

    updateMessages(); // 初回読み込み

    // ✨ 超重要：WebSocketが切れた時だけ、こっそり3秒おきに自動更新する（バックアップ機能）
    const intervalId = setInterval(() => {
      if (!isConnectedRef.current && isMounted) {
        updateMessages();
      }
    }, 3000);

    // WebSocket接続の開始
    const wsBaseUrl = API_BASE.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/chat/ws?community_id=${communityId}&token=${token}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('🔗 WebSocket Connected!');
      isConnectedRef.current = true;
      if (isMounted) setIsConnected(true);
    };

    // サーバーからリアルタイムで受信！
    ws.current.onmessage = (event) => {
      try {
        const newMsg: ChatMessage = JSON.parse(event.data);
        if (isMounted) addMessageSafe(newMsg);
      } catch (e) {
        console.error('メッセージの解析に失敗しました', e);
      }
    };

    ws.current.onerror = (error) => {
      console.error('❌ WebSocket Error:', error);
    };

    ws.current.onclose = () => {
      console.log('🔌 WebSocket Disconnected');
      isConnectedRef.current = false;
      if (isMounted) setIsConnected(false);
    };

    return () => {
      isMounted = false;
      clearInterval(intervalId); // 画面を閉じたらポーリングも止める
      if (ws.current) ws.current.close();
    };
  }, [communityId, getMessages, addMessageSafe]); 

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messageToSend = inputText;
    setInputText(''); // 送信ボタンを押した瞬間にテキストボックスを空にする

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // 🚀 WebSocket経由で超速送信
      ws.current.send(JSON.stringify({ content: messageToSend }));
    } else {
      // 🐢 万が一WSが切れていた場合のHTTP送信ルート
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/chat/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ community_id: communityId, content: messageToSend })
        });
        
        if (res.ok) {
          const newMsg = await res.json();
          addMessageSafe(newMsg); // ✨ 修正：送信が成功したら即座に画面に追加する！
        } else {
          setInputText(messageToSend); // 失敗したらテキストボックスに戻す
        }
      } catch (error) {
        console.error('送信失敗:', error);
        setInputText(messageToSend);
        toast.error('メッセージの送信に失敗しました');
      }
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    if (isToday) {
      return `今日 ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="flex flex-col h-full w-full border border-gray-300 rounded-none sm:rounded-2xl bg-white shadow-2xl overflow-hidden font-sans text-gray-950">
      
      <div className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10">
        <h3 className="text-sm font-bold flex items-center gap-2">
          💬 全体チャット
        </h3>
        <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold tracking-wider">
                🟢 WebSocket接続中
              </span>
            ) : (
              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-bold tracking-wider animate-pulse">
                🟡 接続待機中...
              </span>
            )}
            <button 
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition active:scale-95"
            >
                <LuX className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sky-50/50">
        {messages.map((msg) => {
          const isMine = msg.user.id === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-500 mb-1 px-1 font-bold">
                {isMine ? 'あなた' : msg.user.display_name}
              </span>
              <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`px-4 py-2.5 rounded-[1.2rem] max-w-[85%] shadow-sm ${
                  isMine ? 'bg-[#DCF8C6] text-gray-950 rounded-br-sm' : 'bg-white text-gray-950 border border-gray-100 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.content}</p>
                </div>
                <span className="text-[9px] text-gray-400 mb-0.5 font-bold whitespace-nowrap">
                  {formatDateTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-1" />
      </div>

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
          <LuSend className="w-5 h-5 ml-1" />
        </button>
      </form>

    </div>
  );
};
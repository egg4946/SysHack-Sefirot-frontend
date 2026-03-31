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
  const isConnectedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMessages = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/chat/messages?community_id=${communityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    } catch { return []; }
  }, [communityId]);

  const addMessageSafe = useCallback((newMsg: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    let isMounted = true;

    const updateMessages = async () => {
      const data = await getMessages(token);
      if (isMounted) setMessages(data);
    };

    updateMessages();

    // 復元ロジック: WebSocketが切れている間のHTTPバックアップ
    const intervalId = setInterval(() => {
      if (!isConnectedRef.current && isMounted) updateMessages();
    }, 4000);

    const wsBaseUrl = API_BASE.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/chat/ws?community_id=${communityId}&token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => { isConnectedRef.current = true; if (isMounted) setIsConnected(true); };
    ws.current.onmessage = (event) => {
      try {
        const newMsg: ChatMessage = JSON.parse(event.data);
        if (isMounted) addMessageSafe(newMsg);
      } catch (e) { console.error('Parse error', e); }
    };
    ws.current.onclose = () => { isConnectedRef.current = false; if (isMounted) setIsConnected(false); };

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (ws.current) ws.current.close();
    };
  }, [communityId, getMessages, addMessageSafe]); 

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const content = inputText;
    setInputText('');

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ content }));
    } else {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch(`${API_BASE}/chat/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ community_id: communityId, content })
        });
        if (res.ok) {
          const newMsg = await res.json();
          addMessageSafe(newMsg);
        } else { setInputText(content); }
      } catch { setInputText(content); toast.error("送信失敗"); }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
        <h3 className="text-sm font-bold flex items-center gap-2">💬 プロジェクトチャット</h3>
        <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700 animate-pulse'}`}>
                {isConnected ? '🟢 リアルタイム' : '🟡 接続待機中...'}
            </span>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full"><LuX /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => {
          const isMine = msg.user.id === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-500 mb-1 px-1 font-bold">{isMine ? 'あなた' : msg.user.display_name}</span>
              <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${isMine ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border rounded-tl-none'}`}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-gray-400 whitespace-nowrap">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t flex gap-2">
        <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder="メッセージを入力..." className="flex-1 bg-gray-100 border-none rounded-full px-5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <button type="submit" disabled={!inputText.trim()} className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:bg-gray-300 transition">
          <LuSend className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
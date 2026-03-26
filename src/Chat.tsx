import React, { useState, useEffect, useRef, useCallback } from 'react';

// バックエンドから返ってくるメッセージの型定義
interface ChatMessage {
  id: string;
  community_id: string;
  user: {
    id: string;
    display_name: string;
  };
  content: string;
  created_at: string;
}

interface ChatProps {
  communityId: string;
  currentUserId: string;
}

export const Chat: React.FC<ChatProps> = ({ communityId, currentUserId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 一番下に自動スクロールする関数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✨ 【正規ルール1】useCallbackを使って関数を「メモ化」する
  // これにより、communityIdが変わらない限り関数が再生成されず、無限ループを防ぎます。
  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return; // トークンがない場合の安全対策

      const res = await fetch(`http://localhost:8000/api/v1/chat/messages?community_id=${communityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('チャットの取得に失敗しました', error);
    }
  }, [communityId]); // 依存配列に communityId を指定

  // ✨ 【正規ルール2】useEffectの中で非同期処理をクリーンに呼ぶ
  useEffect(() => {
    // useEffectの直下で非同期関数を直接呼ばず、内部でラップして呼ぶのがReactの正しい作法です
    const initFetch = async () => {
      await fetchMessages();
    };
    initFetch();

    // 3秒ごとのポーリング
    const intervalId = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [fetchMessages]); // 👈 無視コメントなし！正規のルール通り fetchMessages だけを依存に指定！

  // メッセージが増えたら自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 送信処理
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const token = localStorage.getItem('access_token');
    const messageToSend = inputText;
    setInputText(''); // 送信ボタンを押したらすぐに入力欄を空にする

    try {
      const res = await fetch(`http://localhost:8000/api/v1/chat/send`, {
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
        await fetchMessages(); // 送信成功したら最新のメッセージを取得し直す
      } else {
        console.error('送信エラー');
        setInputText(messageToSend); // 失敗したらテキストを戻す
      }
    } catch (error) {
      console.error('送信に失敗しました', error);
      setInputText(messageToSend); // 失敗したらテキストを戻す
    }
  };

  // 時刻のフォーマット（例: 14:30）
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[500px] w-full max-w-md border rounded-lg bg-gray-50 shadow-sm">
      {/* チャット履歴表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMine = msg.user.id === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1 px-1">
                {msg.user.display_name}
              </span>
              <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                  isMine ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                </div>
                <span className="text-[10px] text-gray-400 mb-1">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        {/* スクロール用ダミー要素 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t flex gap-2 rounded-b-lg">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-blue-500 text-white rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 transition-opacity"
        >
          送信
        </button>
      </form>
    </div>
  );
};
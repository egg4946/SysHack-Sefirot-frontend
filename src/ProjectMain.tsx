import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat';
import { LuX, LuMessageSquare, LuBackpack } from "react-icons/lu";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface LatestMessageResponse {
  id: string;
}

interface UserCommunity {
  id: string;
  name: string;
}

interface UserData {
  user_data: {
    id: string;
  };
  user_communities: UserCommunity[];
}

export const ProjectMain: React.FC = () => {
  const { id: communityId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const meRes = await fetch(`${API_BASE}/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meRes.ok) {
          const meData: UserData = await meRes.json();
          setCurrentUserId(meData.user_data.id);
          
          const myCommunity = meData.user_communities.find((c: UserCommunity) => c.id === communityId);
          if (myCommunity) {
            setProjectName(myCommunity.name);
          }
        }
      } catch (error) {
        console.error('データの取得に失敗しました', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [communityId]);

  useEffect(() => {
    if (!communityId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;
    fetch(`${API_BASE}/chat/messages?community_id=${communityId}&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => { if(data.length > 0) lastMessageIdRef.current = data[0].id; })
    .catch(error => console.error(error));

    const intervalId = setInterval(async () => {
      if (!communityId || isChatOpen) return; 

      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE}/chat/messages?community_id=${communityId}&limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data: LatestMessageResponse[] = await res.json();
          if (data.length > 0) {
            const latestMessageId = data[0].id;
            if (lastMessageIdRef.current && latestMessageId !== lastMessageIdRef.current) {
              setHasUnread(true);
              lastMessageIdRef.current = latestMessageId;
            } else if (!lastMessageIdRef.current) {
              lastMessageIdRef.current = latestMessageId;
            }
          }
        }
      } catch (error) { console.error(error); }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [communityId, isChatOpen]);


  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => {
      const newState = !prev;
      if (newState === true) {
        setHasUnread(false);
      }
      return newState;
    });
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="relative flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm z-30">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/select-project')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition duration-150">
            <LuBackpack className="w-5 h-5" />
            プロジェクト一覧
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <h1 className="text-xl font-bold tracking-tight text-gray-950">
            {projectName || 'プロジェクト メイン画面'}
          </h1>
        </div>
        <button className="w-10 h-10 border rounded-lg hover:bg-gray-100 flex items-center justify-center transition duration-150">
          <span className="text-xl">三</span>
        </button>
      </header>

      <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <div className="bg-white p-8 rounded-2xl shadow-sm border h-full">
            <h2 className="text-2xl font-black mb-6 text-gray-950">タスクツリー (準備中)</h2>
            <p className="text-gray-600 leading-relaxed mb-4">ここにタスクのツリー表示などを実装します。</p>
            <div className="h-40 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
              タスクデータが入ります
            </div>
        </div>
      </div>
      
      <div className={`fixed z-50 transition-all duration-300 transform ${
        'inset-0 w-full h-full rounded-none origin-bottom' +
        ' sm:inset-auto sm:bottom-28 sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-gray-300 sm:origin-bottom-right '
      } ${
        isChatOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
      }`}>
        {currentUserId && communityId && isChatOpen && (
          <Chat communityId={communityId} currentUserId={currentUserId} onClose={handleToggleChat} />
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={handleToggleChat}
          className={`relative flex items-center justify-center w-20 h-20 rounded-full shadow-2xl border transition-all duration-200 active:scale-95 ${
            isChatOpen ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/40'
          }`}
        >
          {isChatOpen ? (
            <LuX className="w-10 h-10" />
          ) : (
            <>
              <LuMessageSquare className="w-10 h-10" />
              {hasUnread && (
                <span className="absolute top-1 right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border border-white shadow-md"></span>
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
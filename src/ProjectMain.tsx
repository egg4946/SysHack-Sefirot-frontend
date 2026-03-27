import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat';
import { LuX, LuMessageSquare, LuBackpack, LuPlus, LuChevronRight, LuMenu } from "react-icons/lu";

// --- API仕様 (api.yaml) に完全準拠した型定義 ---
interface Task {
  id: string;
  name: string; 
  progress: number;
  status: '未着手' | '進行中' | '完了';
  priority: '大' | '中' | '小';
  parent_task_id: string | null; 
  childTasks?: Task[]; 
}

interface LatestMessageResponse { id: string; }
interface UserCommunity { id: string; name: string; }
interface UserData {
  user_data: { id: string; };
  user_communities: UserCommunity[];
}

export const ProjectMain: React.FC = () => {
  const { id: communityId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [sortBy, setSortBy] = useState<'deadline' | 'progress' | 'created_at'>('created_at');
  const lastMessageIdRef = useRef<string | null>(null);

  // ログイン画面の書き方に合わせ、環境変数からBaseURLを取得
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  const fetchProjectData = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !communityId) return;

    try {
      // ユーザー情報取得
      const meRes = await fetch(`${apiBase}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const meData: UserData = await meRes.json();
        setCurrentUserId(meData.user_data.id);
        const myCommunity = meData.user_communities.find(c => c.id === communityId);
        if (myCommunity) setProjectName(myCommunity.name);
      }

      // タスク一覧取得
      const taskRes = await fetch(`${apiBase}/tasks?community_id=${communityId}&sort_by=${sortBy}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (taskRes.ok) {
        const rawTasks: Task[] = await taskRes.json();
        const tree = rawTasks.filter(t => !t.parent_task_id).map(parent => ({
          ...parent,
          childTasks: rawTasks.filter(child => child.parent_task_id === parent.id)
        }));
        setTasks(tree);
      }
    } catch (e) {
      console.error("API Error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [communityId, sortBy, apiBase]);

  useEffect(() => { fetchProjectData(); }, [fetchProjectData]);

  // チャット通知監視
  useEffect(() => {
    if (!communityId || isChatOpen) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/chat/messages?community_id=${communityId}&limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data: LatestMessageResponse[] = await res.json();
          if (data.length > 0) {
            const latestMessageId = data[0].id;
            if (lastMessageIdRef.current && latestMessageId !== lastMessageIdRef.current) {
              setHasUnread(true);
            }
            lastMessageIdRef.current = latestMessageId;
          }
        }
      } catch (error) { console.error(error); }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [communityId, isChatOpen, apiBase]);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => {
      if (!prev) setHasUnread(false);
      return !prev;
    });
  }, []);

  const handleCreateParentTask = async () => {
    const title = window.prompt("新しい親タスク名を入力してください");
    if (!title) return;
    const token = localStorage.getItem('access_token');
    
    const res = await fetch(`${apiBase}/tasks/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        community_id: communityId, 
        name: title,
        priority: '中',
        parent_task_id: null 
      })
    });

    if (res.ok) {
      fetchProjectData();
    } else {
      alert("タスクの作成に失敗しました。");
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-500 font-semibold animate-pulse">
      読み込み中...
    </div>
  );

  return (
    <div className="relative flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* ヘッダー：ログイン画面風の影と色使い */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-md z-30">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => navigate('/select-project')} 
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold transition duration-150"
          >
            <LuBackpack className="w-5 h-5" />
            プロジェクト一覧
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <h1 className="text-xl font-extrabold tracking-tight text-gray-800 drop-shadow-sm">
            {projectName || 'プロジェクトメイン'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-400 outline-none transition"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="created_at">作成順</option>
            <option value="deadline">しめきり順</option>
            <option value="progress">進捗順</option>
          </select>
          <button className="w-10 h-10 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 flex items-center justify-center transition">
            <LuMenu className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </header>

      {/* メイン：タスクカードにログイン画面風のスタイルを適用 */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-5xl mx-auto space-y-6">
          {tasks.map(parent => (
            <div key={parent.id} className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              {/* 親タスク */}
              <div 
                className="flex items-center p-5 hover:bg-blue-50/30 transition cursor-pointer" 
                onClick={() => navigate(`/project/${communityId}/task/${parent.id}`)}
              >
                <div className="flex-1 flex items-center gap-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    parent.priority === '大' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {parent.priority}
                  </span>
                  <span className="font-extrabold text-lg text-gray-800">{parent.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-40 h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-500" style={{ width: `${parent.progress}%` }} />
                  </div>
                  <span className="text-sm font-black text-blue-600 w-10">{parent.progress}%</span>
                  <LuChevronRight className="text-gray-300 w-6 h-6" />
                </div>
              </div>

              {/* 子タスク */}
              {parent.childTasks && parent.childTasks.length > 0 && (
                <div className="bg-gray-50/50 border-t border-gray-100 divide-y divide-gray-100">
                  {parent.childTasks.map(child => (
                    <div 
                      key={child.id} 
                      className="flex items-center pl-14 pr-6 py-4 hover:bg-white transition cursor-pointer" 
                      onClick={() => navigate(`/project/${communityId}/task/${child.id}`)}
                    >
                      <div className="flex-1 text-sm font-semibold text-gray-600">{child.name}</div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-400">{child.progress}%</span>
                        <LuChevronRight size={18} className="text-gray-200" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* 親タスク追加：ログインボタン風のグラデーション */}
          <button 
            onClick={handleCreateParentTask}
            className="w-full py-5 border-2 border-dashed border-blue-200 rounded-2xl text-blue-500 font-bold hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2 group"
          >
            <LuPlus className="w-5 h-5 group-hover:scale-125 transition-transform" />
            新しいタスクを作成
          </button>
        </div>
      </main>

      {/* チャット画面コンテナ */}
      <div className={`fixed z-50 transition-all duration-300 transform ${
        'inset-0 w-full h-full sm:inset-auto sm:bottom-28 sm:right-6 sm:w-[400px] sm:h-[650px] sm:rounded-3xl sm:shadow-2xl sm:border sm:border-gray-200 overflow-hidden'
      } ${isChatOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 pointer-events-none'}`}>
        {currentUserId && communityId && isChatOpen && (
          <Chat communityId={communityId} currentUserId={currentUserId} onClose={handleToggleChat} />
        )}
      </div>

      {/* フローティングチャットアイコン：ログインボタン風の配色 */}
      <div className="fixed bottom-8 right-8 z-40">
        <button 
          onClick={handleToggleChat}
          className={`relative flex items-center justify-center w-20 h-20 rounded-full shadow-2xl transition-all duration-200 active:scale-90 ${
            isChatOpen ? 'bg-gray-100 text-gray-600' : 'bg-gradient-to-r from-blue-600 to-green-400 text-white shadow-blue-500/40'
          }`}
        >
          {isChatOpen ? <LuX className="w-10 h-10" /> : (
            <>
              <LuMessageSquare className="w-10 h-10" />
              {hasUnread && (
                <span className="absolute top-1 right-1 flex h-6 w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-red-600 border-2 border-white shadow-sm"></span>
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
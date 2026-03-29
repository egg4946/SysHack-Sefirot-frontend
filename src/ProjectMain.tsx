import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat';
import { 
  LuX, LuMessageSquare, LuUsers, LuUserPlus, LuPenLine, LuLogOut, LuCopy, LuChevronRight, 
  LuPlus, LuFolderOpen, LuFile, LuCircleCheck 
} from "react-icons/lu";
import { Header } from './Header';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface LatestMessageResponse { id: string; }
interface UserCommunity { id: string; name: string; invite_code: string; }
interface UserData { user_data: { id: string; }; user_communities: UserCommunity[]; }

interface CommunityMember {
  user_id: string;
  display_name: string;
  role: string;
}

// ✨ タスクの型定義（APIのレスポンスに合わせて柔軟に）
interface Task {
  id: string;
  title?: string;
  name?: string; // APIによってはnameで返ってくる場合のフォールバック
  progress: number;
  status: string;
  parentId?: string | null;
  parent_task_id?: string | null; // APIによってはスネークケースの場合
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
  const [inviteCode, setInviteCode] = useState<string>('');

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);

  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [newName, setNewName] = useState('');

  // ✨ タスク関連のState
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // ✨ タスク一覧を取得する関数
  const fetchTasks = useCallback(async () => {
    if (!communityId) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/tasks?community_id=${communityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error("タスクの取得に失敗しました", e);
    }
  }, [communityId]);

  // 初期データ取得
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
            setInviteCode(myCommunity.invite_code);
          }
        }
        await fetchTasks(); // タスクも同時に取得
      } catch (error) {
        console.error('データの取得に失敗しました', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [communityId, fetchTasks]);

  // チャットの新着確認（ポーリング）
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

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/members?community_id=${communityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeName = async () => {
    if (!newName.trim()) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/member/update`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ community_id: communityId, display_name: newName })
      });

      if (res.ok) {
        alert("表示名を変更しました！");
        setShowNameModal(false);
        setNewName('');
      } else {
        alert("変更に失敗しました");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    alert("招待コードをコピーしました！");
  };

  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => {
      const newState = !prev;
      if (newState) setHasUnread(false);
      return newState;
    });
  }, []);

  // ✨ 親タスクを新規作成する処理
  const handleCreateParentTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isCreatingTask) return;
    
    setIsCreatingTask(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/tasks/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          community_id: communityId, 
          name: newTaskTitle,       // ✨ 'title' ではなく 'name' に修正
          priority: '中',           // ✨ 必須項目である 'priority' を追加（デフォルトで '中'）
          parent_task_id: null      // ✨ api.yaml に合わせて 'parent_id' を 'parent_task_id' に修正
        })
      });

      if (res.ok) {
        setNewTaskTitle('');
        await fetchTasks(); // 作成後にリストを再取得
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`タスクの作成に失敗しました: ${errorData.detail || '不正なリクエスト'}`);
      }
    } catch (error) {
      console.error(error);
      alert("通信エラーが発生しました");
    } finally {
      setIsCreatingTask(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">読み込み中...</div>;

  // ✨ タスクを親と子に分ける処理
  const parentTasks = tasks.filter(t => !t.parentId && !t.parent_task_id);
  
  return (
    <div className="relative flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      <Header 
        title={projectName || "Sefirot Project"} 
        showBackButton={true}
        onBack={() => navigate('/select-project')}
        menuItems={[
          { 
            label: 'メンバー一覧', 
            icon: <LuUsers />, 
            onClick: () => { fetchMembers(); setShowMemberModal(true); } 
          },
          { label: '招待コードを表示', icon: <LuUserPlus />, onClick: () => setShowInviteModal(true) },
          { label: 'このプロジェクトでの表示名変更', icon: <LuPenLine />, onClick: () => setShowNameModal(true) },
          { label: 'ログアウト', icon: <LuLogOut />, isDanger: true, onClick: () => { localStorage.removeItem('access_token'); navigate('/login'); } }
        ]} 
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* ✨ タスク新規作成フォーム */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black mb-4 text-gray-800">新しいタスクを追加</h2>
            <form onSubmit={handleCreateParentTask} className="flex gap-3">
              <input
                type="text"
                placeholder="タスク名を入力..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
              <button 
                type="submit" 
                disabled={!newTaskTitle.trim() || isCreatingTask}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition shadow-md"
              >
                <LuPlus className="w-5 h-5" />
                <span className="hidden sm:inline">追加</span>
              </button>
            </form>
          </div>

          {/* ✨ タスクツリー表示エリア */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black mb-6 text-gray-800 flex items-center justify-between">
              <span>タスク一覧</span>
              <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                全 {tasks.length} 件
              </span>
            </h2>

            <div className="space-y-4">
              {parentTasks.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                  <p className="text-gray-400 font-bold">まだタスクがありません</p>
                  <p className="text-xs text-gray-400 mt-1">上のフォームから最初のタスクを追加しましょう！</p>
                </div>
              ) : (
                parentTasks.map(parentTask => {
                  // この親タスクに属する子タスクを抽出
                  const childTasks = tasks.filter(t => t.parentId === parentTask.id || t.parent_task_id === parentTask.id);
                  
                  return (
                    <div key={parentTask.id} className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                      {/* 🔽 親タスクの表示 */}
                      <div 
                        onClick={() => navigate(`/project/${communityId}/task/${parentTask.id}`)}
                        className="p-4 bg-white hover:bg-blue-50 cursor-pointer transition flex items-center gap-4 group"
                      >
                        <LuFolderOpen className="w-6 h-6 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-gray-800 truncate text-lg group-hover:text-blue-700 transition-colors">
                            {parentTask.title || parentTask.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md">
                              {parentTask.status}
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${parentTask.progress}%` }} />
                            </div>
                            <span className="text-xs font-black text-blue-600 w-8 text-right">{parentTask.progress}%</span>
                          </div>
                        </div>
                      </div>

                      {/* 🔽 子タスクの表示（存在する場合のみ） */}
                      {childTasks.length > 0 && (
                        <div className="p-3 bg-gray-50/50 border-t border-gray-200 space-y-2 pl-6 sm:pl-12">
                          {childTasks.map(childTask => (
                            <div 
                              key={childTask.id}
                              onClick={() => navigate(`/project/${communityId}/task/${childTask.id}`)}
                              className="p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer transition flex items-center gap-3 group"
                            >
                              {childTask.progress === 100 ? (
                                <LuCircleCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <LuFile className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-blue-400" />
                              )}
                              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <h4 className="font-bold text-sm text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                                  {childTask.title || childTask.name}
                                </h4>
                                <div className="flex items-center gap-2 w-full sm:w-1/3">
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${childTask.progress === 100 ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${childTask.progress}%` }} />
                                  </div>
                                  <span className="text-[10px] font-black text-gray-500 w-6 text-right">{childTask.progress}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* チャットUI */}
      <div className={`fixed z-40 transition-all duration-300 transform ${
        'inset-0 w-full h-full rounded-none origin-bottom' +
        ' sm:inset-auto sm:bottom-28 sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-gray-300 sm:origin-bottom-right '
      } ${
        isChatOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
      }`}>
        {currentUserId && communityId && isChatOpen && (
          <Chat communityId={communityId} currentUserId={currentUserId} onClose={handleToggleChat} />
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-30">
        <button 
          onClick={handleToggleChat}
          className={`relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-2xl border transition-all duration-200 active:scale-95 ${
            isChatOpen ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/40'
          }`}
        >
          {isChatOpen ? <LuX className="w-8 h-8 sm:w-10 sm:h-10" /> : (
            <>
              <LuMessageSquare className="w-8 h-8 sm:w-10 sm:h-10" />
              {hasUnread && (
                <span className="absolute top-1 right-1 flex h-4 w-4 sm:h-5 sm:w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-red-600 border border-white shadow-md"></span>
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* 1. メンバー一覧モーダル */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-black">メンバー一覧</h3>
              <button onClick={() => setShowMemberModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><LuX /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {members.map(member => (
                <div 
                  key={member.user_id} 
                  onClick={() => navigate(`/project/${communityId}/member/${member.user_id}`)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-200 transition group"
                >
                  <div>
                    <p className="font-bold text-gray-900">{member.display_name}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">{member.role}</p>
                  </div>
                  <LuChevronRight className="text-gray-400 group-hover:text-blue-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. 招待コードモーダル */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <h3 className="text-xl font-black mb-2">招待コード</h3>
            <p className="text-sm text-gray-500 mb-6">メンバーを招待するためのコードです</p>
            <div className="text-4xl font-black tracking-[0.2em] text-blue-600 bg-blue-50 py-4 rounded-2xl mb-6 border border-blue-100">
              {inviteCode}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">閉じる</button>
              <button onClick={handleCopyCode} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/30">
                <LuCopy /> コピー
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 表示名変更モーダル */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black mb-2">表示名の変更</h3>
            <p className="text-sm text-gray-500 mb-6">このプロジェクト内でのみ使われる名前です</p>
            <input 
              type="text" 
              placeholder="新しい表示名" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNameModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">キャンセル</button>
              <button onClick={handleChangeName} disabled={!newName.trim()} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition">
                変更する
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
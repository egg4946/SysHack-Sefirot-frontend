import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat';
import { 
  LuX, LuMessageSquare, LuUsers, LuUserPlus, LuPenLine, LuLogOut, LuChevronRight, 
  LuPlus, LuFolderOpen, LuArrowDown, LuArrowUp,
  LuTrophy, LuLeaf, LuCalendarDays ,LuInfo
} from "react-icons/lu"; 
import { Header } from './Header';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface LatestMessageResponse { id: string; }
interface UserCommunity { id: string; name: string; invite_code: string; }
interface UserData { user_data: { id: string; }; user_communities: UserCommunity[]; }

interface CommunityMember {
  id: string; 
  email: string;
  display_name: string;
  created_at: string;
}

interface Assignee {
  id: string;
  display_name: string;
}

interface Task {
  id: string;
  title?: string;
  name?: string; 
  progress: number;
  status: string;
  priority: string;
  deadline: string | null;
  createdAt?: string;
  created_at?: string;
  parentId?: string | null;
  parent_task_id?: string | null; 
  assignees?: Assignee[];
}

type SortKey = 'created_at' | 'deadline' | 'priority' | 'progress' | 'name';
type SortOrder = 'asc' | 'desc';

const getProgressTheme = (progress: number) => {
  if (progress === 100) return {
    barBg: 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]',
    lineBg: 'bg-emerald-400',
    text: 'text-emerald-600',
    border: 'border-emerald-300',
    cardBg: 'bg-emerald-50/30',
    hoverBg: 'hover:bg-emerald-50',
    iconText: 'text-emerald-500'
  };
  if (progress >= 70) return {
    barBg: 'bg-green-500',
    lineBg: 'bg-green-400',
    text: 'text-green-700',
    border: 'border-green-300',
    cardBg: 'bg-green-50/20',
    hoverBg: 'hover:bg-green-50',
    iconText: 'text-green-500'
  };
  if (progress >= 30) return {
    barBg: 'bg-lime-400',
    lineBg: 'bg-lime-400',
    text: 'text-lime-700',
    border: 'border-lime-300',
    cardBg: 'bg-lime-50/20',
    hoverBg: 'hover:bg-lime-50',
    iconText: 'text-lime-500'
  };
  return { 
    barBg: 'bg-amber-600',
    lineBg: 'bg-amber-300',
    text: 'text-amber-800',
    border: 'border-amber-200',
    cardBg: 'bg-amber-50/10',
    hoverBg: 'hover:bg-amber-50',
    iconText: 'text-amber-600'
  };
};

const getDeadlineStatus = (deadlineStr: string | null, isCompleted: boolean) => {
  if (!deadlineStr) return null;
  const deadline = new Date(deadlineStr);
  if (isCompleted) {
    return { 
      text: deadline.toLocaleDateString(), 
      className: 'bg-gray-100 text-gray-400 border-transparent',
      isUrgent: false
    };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: '⚠️ 期限切れ', className: 'bg-red-100 text-red-700 border-red-300 animate-pulse shadow-sm', isUrgent: true };
  if (diffDays === 0) return { text: '🔥 今日まで', className: 'bg-orange-100 text-orange-700 border-orange-300 animate-pulse shadow-sm', isUrgent: true };
  if (diffDays === 1) return { text: '⚡ 明日まで', className: 'bg-yellow-100 text-yellow-700 border-yellow-300 shadow-sm', isUrgent: true };
  return { text: deadline.toLocaleDateString(), className: 'bg-gray-100 text-gray-500 border-transparent', isUrgent: false };
};

export const ProjectMain: React.FC = () => {
  const { id: communityId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [myDisplayName, setMyDisplayName] = useState<string>(''); 
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  // ✨ 再掲：親タスクの実質進捗を計算する共通関数
  const getTaskEffectiveProgress = (parentTask: Task, allTasks: Task[]) => {
    const children = allTasks.filter(t => t.parentId === parentTask.id || t.parent_task_id === parentTask.id);
    if (children.length > 0) {
      const sum = children.reduce((acc, c) => acc + (c.progress ?? 0), 0);
      return Math.round(sum / children.length);
    }
    return parentTask.progress ?? 0;
  };

  const fetchMembers = useCallback(async (userIdToFind: string) => {
    if (!communityId) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/members?community_id=${communityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: CommunityMember[] = await res.json();
        setMembers(data);
        const me = data.find(m => m.id === userIdToFind);
        if (me) setMyDisplayName(me.display_name);
      }
    } catch { /* エラー処理 */ }
  }, [communityId]);

  const fetchTasks = useCallback(async () => {
    if (!communityId) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/tasks?community_id=${communityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const sanitizedData = data.map((t: Task) => ({
          ...t,
          progress: typeof t.progress === 'number' ? t.progress : 0
        }));
        setTasks(sanitizedData);
      }
    } catch (_e) { console.error("タスク取得失敗", _e); }
  }, [communityId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) { navigate('/login'); return; }

        const meRes = await fetch(`${API_BASE}/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meRes.ok) {
          const meData: UserData = await meRes.json();
          const userId = meData.user_data.id;
          setCurrentUserId(userId);
          const myCommunity = meData.user_communities.find((c: UserCommunity) => c.id === communityId);
          if (myCommunity) {
            setProjectName(myCommunity.name);
            setInviteCode(myCommunity.invite_code);
          }
          await Promise.all([fetchTasks(), fetchMembers(userId)]);
        }
      } catch (_e) { console.error('データ取得失敗', _e); }
      finally { setIsLoading(false); }
    };
    fetchInitialData();
  }, [communityId, fetchTasks, fetchMembers, navigate]);

  useEffect(() => {
    if (!communityId || isChatOpen) return;
    const token = localStorage.getItem('access_token');
    
    fetch(`${API_BASE}/chat/messages?community_id=${communityId}&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => { if(data.length > 0) lastMessageIdRef.current = data[0].id; });

    const intervalId = setInterval(async () => {
      if (isChatOpen) return;
      try {
        const res = await fetch(`${API_BASE}/chat/messages?community_id=${communityId}&limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data: LatestMessageResponse[] = await res.json();
          if (data.length > 0) {
            const latestId = data[0].id;
            if (lastMessageIdRef.current && latestId !== lastMessageIdRef.current) {
              setHasUnread(true);
            }
            lastMessageIdRef.current = latestId;
          }
        }
      } catch { /* 通信エラー等は無視 */ }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [communityId, isChatOpen]);

  const handleOpenNameModal = () => { setNewName(myDisplayName); setShowNameModal(true); };

  const handleChangeName = async () => {
    if (!newName.trim()) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/member/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ community_id: communityId, display_name: newName })
      });
      if (res.ok) {
        toast.success("表示名を変更しました！");
        setShowNameModal(false);
        fetchMembers(currentUserId);
      }
    } catch { toast.error("通信エラー"); }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success("招待コードをコピーしました！");
  };

  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => {
      if (!prev) setHasUnread(false);
      return !prev;
    });
  }, []);

  const handleCreateParentTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isCreatingTask) return;
    setIsCreatingTask(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ community_id: communityId, name: newTaskTitle, priority: '中', parent_task_id: null })
      });
      if (res.ok) {
        const data = await res.json();
        setNewTaskTitle('');
        navigate(`/project/${communityId}/task/${data.id}`, { state: { autoEdit: true } });
      }
    } catch { toast.error("作成失敗"); }
    finally { setIsCreatingTask(false); }
  };

  // ✨ useMemo を修正：計算関数を内側に含め依存関係警告を解消
  const sortedParentTasks = useMemo(() => {
    let parents = tasks.filter(t => !t.parentId && !t.parent_task_id);
    parents = parents.filter(task => {
      const actualProgress = getTaskEffectiveProgress(task, tasks);
      if (hideCompleted && actualProgress === 100) return false;
      if (showOnlyMyTasks) {
        const isAssignedToParent = task.assignees?.some(a => a.id === currentUserId);
        const children = tasks.filter(t => t.parentId === task.id || t.parent_task_id === task.id);
        const isAssignedToChild = children.some(c => c.assignees?.some(a => a.id === currentUserId));
        if (!isAssignedToParent && !isAssignedToChild) return false;
      }
      return true;
    });
    
    return parents.sort((a, b) => {
      let valA: string | number, valB: string | number;
      switch (sortKey) {
        case 'progress': 
          valA = getTaskEffectiveProgress(a, tasks); 
          valB = getTaskEffectiveProgress(b, tasks); 
          break;
        case 'name': valA = a.title || a.name || ''; valB = b.title || b.name || ''; break;
        case 'priority': {
          const pMap: Record<string, number> = { '大': 3, '中': 2, '小': 1 };
          valA = pMap[a.priority] || 0; valB = pMap[b.priority] || 0; break;
        }
        case 'deadline':
          valA = a.deadline ? new Date(a.deadline).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
          valB = b.deadline ? new Date(b.deadline).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
          break;
        default:
          valA = new Date(a.createdAt || a.created_at || 0).getTime();
          valB = new Date(b.createdAt || b.created_at || 0).getTime();
      }
      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [tasks, sortKey, sortOrder, showOnlyMyTasks, hideCompleted, currentUserId]);

  if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">読み込み中...</div>;

  const parentTasks = tasks.filter(t => !t.parentId && !t.parent_task_id);
  const totalProjectProgress = parentTasks.length > 0 
    ? Math.round(parentTasks.reduce((acc, t) => acc + getTaskEffectiveProgress(t, tasks), 0) / parentTasks.length)
    : 0;
  const projectTheme = getProgressTheme(totalProjectProgress);

  return (
    <div className="relative flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Header 
        title={projectName ? `${projectName} （👤 ${myDisplayName}）` : "進捗の樹"} 
        showBackButton={true}
        onBack={() => navigate('/select-project')}
        menuItems={[
          { label: 'メンバー一覧', icon: <LuUsers />, onClick: () => setShowMemberModal(true) },
          { label: '招待コード', icon: <LuUserPlus />, onClick: () => setShowInviteModal(true) },
          { label: '表示名変更', icon: <LuPenLine />, onClick: handleOpenNameModal },
          { label: 'ログアウト', icon: <LuLogOut />, isDanger: true, onClick: () => { localStorage.removeItem('access_token'); navigate('/login'); } }
        ]} 
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <LuTrophy className="text-yellow-500 w-5 h-5" />
                <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Project Overall</span>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <span className={`text-5xl font-black tracking-tighter ${projectTheme.text}`}>{totalProjectProgress}%</span>
                <span className="text-sm font-bold text-gray-400 mb-2">完了</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${projectTheme.barBg}`} style={{ width: `${totalProjectProgress}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
                <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Total Tasks</p>
                    <p className="text-xl font-black text-gray-700">{parentTasks.length}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Done</p>
                    <p className="text-xl font-black text-gray-700">{parentTasks.filter(t => getTaskEffectiveProgress(t, tasks) === 100).length}</p>
                </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black mb-4 text-gray-800">新しいタスク（種）を植える</h2>
            <form onSubmit={handleCreateParentTask} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="タスク名を入力..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button 
                type="submit" 
                // 入力が空（または作成中）のときは無効化
                disabled={!newTaskTitle.trim() || isCreatingTask} 
                // disabled:bg-gray-300 を追加して、無効時にグレーになるように設定
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition shrink-0"
              >
                <LuPlus className="w-5 h-5" /> 
                <span className="sm:inline">追加</span> {/* テキストが長い場合は hidden sm:inline にしてもOK */}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">タスク一覧</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 text-xs font-bold">
                  <button onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)} className={`px-3 py-1.5 rounded-xl ${showOnlyMyTasks ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>自分のタスク</button>
                  <button onClick={() => setHideCompleted(!hideCompleted)} className={`px-3 py-1.5 rounded-xl ${hideCompleted ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}>完了を非表示</button>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                  <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="bg-transparent text-sm font-bold outline-none">
                    <option value="created_at">追加日</option>
                    <option value="deadline">期限日</option>
                    <option value="priority">優先度</option>
                    <option value="progress">進捗度</option>
                  </select>
                  <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-1.5 bg-white rounded-xl shadow-sm border border-gray-200">
                    {sortOrder === 'asc' ? <LuArrowUp className="w-4 h-4" /> : <LuArrowDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {sortedParentTasks.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <LuLeaf className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold">まだ何もありません。種を植えましょう！</p>
                </div>
              ) : (
                sortedParentTasks.map(parentTask => {
                  const children = tasks.filter(t => t.parentId === parentTask.id || t.parent_task_id === parentTask.id);
                  const actualProgress = getTaskEffectiveProgress(parentTask, tasks);
                  const isCompleted = actualProgress === 100;
                  const theme = getProgressTheme(actualProgress);
                  const deadlineInfo = getDeadlineStatus(parentTask.deadline, isCompleted);
                  
                  return (
                    <div key={parentTask.id} className={`rounded-3xl border overflow-hidden shadow-sm ${theme.cardBg} ${theme.border}`}>
                      <div onClick={() => navigate(`/project/${communityId}/task/${parentTask.id}`)} className={`p-5 bg-white cursor-pointer flex items-center gap-4 hover:bg-gray-50 transition`}>
                        <LuFolderOpen className={`w-7 h-7 flex-shrink-0 ${theme.iconText}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-extrabold truncate text-lg ${isCompleted ? 'text-emerald-800' : 'text-gray-800'}`}>{parentTask.title || parentTask.name}</h3>
                            {isCompleted && <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded">👑 COMPLETE!</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1 ${
                             parentTask.priority === '高' ? 'bg-red-50 text-red-600 border border-red-100' :
                             parentTask.priority === '中' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                             'bg-blue-50 text-blue-600 border border-blue-100'
                           }`}>
                             <LuInfo className="w-3 h-3" />
                             優先度: {parentTask.priority}
                           </span>
                            {deadlineInfo && <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${deadlineInfo.className}`}><LuCalendarDays className="w-3 h-3" /> {deadlineInfo.text}</span>}
                            <div className="flex-1 h-2 rounded-full bg-gray-100 shadow-inner">
                              <div className={`h-full transition-all duration-1000 ${theme.barBg}`} style={{ width: `${actualProgress}%` }} />
                            </div>
                            <span className={`text-xs font-black ${theme.text}`}>{actualProgress}%</span>
                          </div>
                        </div>
                      </div>
                      {children.length > 0 && (
                        <div className="relative pt-3 pb-5 pr-5">
                          <div className={`absolute left-[2.35rem] top-0 bottom-8 w-1 ${theme.lineBg}`}></div>
                          <div className="space-y-3">
                            {children.map(child => (
                                <div key={child.id} onClick={() => navigate(`/project/${communityId}/task/${child.id}`)} className="relative ml-[4rem] p-4 bg-white rounded-2xl border flex items-center gap-3 cursor-pointer hover:shadow-md transition">
                                {/* ✨ レイアウト崩れ防止のため、アイコンに shrink-0 を追加 */}
                                <LuLeaf className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="text-sm font-bold truncate flex-1">{child.title || child.name}</span>
    
                                {/* ✨ 子タスクにも優先度バッジを追加 */}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider border shrink-0 ${
                                     child.priority === '高' ? 'bg-red-50 text-red-600 border-red-100' :
                                     child.priority === '中' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                    'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>
                                {child.priority}
                                </span>

                                {/* ✨ こちらも shrink-0 を追加 */}
                                <span className="text-[10px] font-black shrink-0">{child.progress ?? 0}%</span>
                            </div>
                            ))}
                          </div>
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

      <div className={`fixed z-40 transition-all duration-300 ${isChatOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'} sm:bottom-28 sm:right-6 sm:w-[400px] sm:h-[600px] inset-0 sm:inset-auto`}>
        {currentUserId && communityId && isChatOpen && <Chat communityId={communityId} currentUserId={currentUserId} onClose={handleToggleChat} />}
      </div>
      <div className="fixed bottom-6 right-6 z-30">
        <button onClick={handleToggleChat} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-2xl flex items-center justify-center transition ${isChatOpen ? 'bg-gray-200 text-gray-800' : 'bg-blue-600 text-white'}`}>
          {isChatOpen ? <LuX className="w-8 h-8" /> : <><LuMessageSquare className="w-8 h-8" />{hasUnread && <span className="absolute top-1 right-1 h-5 w-5 bg-red-600 rounded-full border-2 border-white animate-pulse"></span>}</>}
        </button>
      </div>

      {showMemberModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-black mb-4">メンバー一覧</h3>
            {members.map(m => (
              <div key={m.id} onClick={() => { setShowMemberModal(false); navigate(`/project/${communityId}/member/${m.id}`); }} className="p-4 hover:bg-blue-50 rounded-2xl cursor-pointer border mb-2 flex justify-between items-center transition">
                <span>{m.display_name}</span><LuChevronRight />
              </div>
            ))}
            <button onClick={() => setShowMemberModal(false)} className="w-full mt-4 py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">閉じる</button>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-xl font-black mb-2">招待コード</h3>
            <div className="text-4xl font-black text-blue-600 bg-blue-50 py-4 rounded-2xl mb-6 border border-blue-100 tracking-widest">{inviteCode}</div>
            <div className="flex gap-3">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">閉じる</button>
              <button onClick={handleCopyCode} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">コピー</button>
            </div>
          </div>
        </div>
      )}

      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black mb-4">表示名の変更</h3>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            <div className="flex gap-3">
              <button onClick={() => setShowNameModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">キャンセル</button>
              <button onClick={handleChangeName} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">変更</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
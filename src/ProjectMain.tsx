import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat';
import { 
  LuX, LuMessageSquare, LuUsers, LuUserPlus, LuPenLine, LuLogOut, LuCopy, LuChevronRight, 
  LuPlus, LuFolderOpen, LuCircleCheck, LuArrowDownUp, LuArrowDown, LuArrowUp, LuTrash2,
  LuUserMinus, LuTrophy, LuLeaf // ✨ LuLeaf（葉っぱアイコン）を追加！
} from "react-icons/lu";
import { Header } from './Header';

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

// ✨ 提案2：進捗度に応じた「色の成長」テーマを生成する関数
const getProgressTheme = (progress: number) => {
  if (progress === 100) return {
    barBg: 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]',
    lineBg: 'bg-emerald-400', // 枝の色
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
  return { // 0-29% (土や種のイメージ)
    barBg: 'bg-amber-600',
    lineBg: 'bg-amber-300',
    text: 'text-amber-800',
    border: 'border-amber-200',
    cardBg: 'bg-amber-50/10',
    hoverBg: 'hover:bg-amber-50',
    iconText: 'text-amber-600'
  };
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
        if (me) {
          setMyDisplayName(me.display_name);
        }
      }
    } catch (e) {
      console.error(e);
    }
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
        setTasks(data);
      }
    } catch (e) {
      console.error("タスクの取得に失敗しました", e);
    }
  }, [communityId]);

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
          const userId = meData.user_data.id;
          setCurrentUserId(userId);
          
          const myCommunity = meData.user_communities.find((c: UserCommunity) => c.id === communityId);
          if (myCommunity) {
            setProjectName(myCommunity.name);
            setInviteCode(myCommunity.invite_code);
          }
          
          await fetchTasks();
          await fetchMembers(userId);
        }
      } catch (error) {
        console.error('データの取得に失敗しました', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [communityId, fetchTasks, fetchMembers]);

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

  const handleOpenNameModal = () => {
    setNewName(myDisplayName);
    setShowNameModal(true);
  };

  const handleChangeName = async () => {
    if (!newName.trim()) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/member/name`, {
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
        await fetchMembers(currentUserId);
        await fetchTasks(); 
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`変更に失敗しました: ${errorData.detail || 'エラー'}`);
      }
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました");
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
          name: newTaskTitle, 
          priority: '中',
          parent_task_id: null 
        })
      });

      if (res.ok) {
        setNewTaskTitle('');
        await fetchTasks(); 
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

  const handleDeleteProject = async () => {
    if (!window.confirm("本当にこのプロジェクトを削除しますか？\n（すべてのタスクやチャット履歴が完全に消去され、元に戻せません！）")) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/delete?community_id=${communityId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });

      if (res.ok) {
        alert("プロジェクトを削除しました。");
        navigate('/select-project');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`削除に失敗しました: ${errorData.detail || '権限がありません'}`);
      }
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました");
    }
  };

  const handleLeaveProject = async () => {
    if (!window.confirm("本当にこのプロジェクトから退出しますか？\n（担当しているタスクからは自動的に外れます。再度参加するには招待コードが必要です）")) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/leave`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ community_id: communityId })
      });

      if (res.ok) {
        alert("プロジェクトから退出しました。");
        navigate('/select-project');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`退出に失敗しました: ${errorData.detail || 'エラー'}`);
      }
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました");
    }
  };

  const sortedParentTasks = useMemo(() => {
    let parents = tasks.filter(t => !t.parentId && !t.parent_task_id);

    parents = parents.filter(task => {
      if (hideCompleted && task.progress === 100) return false;
      
      if (showOnlyMyTasks) {
        const isAssignedToParent = task.assignees?.some(a => a.id === currentUserId);
        const childTasks = tasks.filter(t => t.parentId === task.id || t.parent_task_id === task.id);
        const isAssignedToAnyChild = childTasks.some(child => child.assignees?.some(a => a.id === currentUserId));
        
        if (!isAssignedToParent && !isAssignedToAnyChild) return false;
      }

      return true;
    });
    
    return parents.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortKey) {
        case 'progress':
          valA = a.progress;
          valB = b.progress;
          break;
        case 'name':
          valA = a.title || a.name || '';
          valB = b.title || b.name || '';
          break;
        case 'priority': {
          const pMap: Record<string, number> = { '大': 3, '中': 2, '小': 1 };
          valA = pMap[a.priority] || 0;
          valB = pMap[b.priority] || 0;
          break;
        }
        case 'deadline':
          valA = a.deadline ? new Date(a.deadline).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
          valB = b.deadline ? new Date(b.deadline).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
          break;
        case 'created_at':
        default:
          valA = new Date(a.createdAt || a.created_at || 0).getTime();
          valB = new Date(b.createdAt || b.created_at || 0).getTime();
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortKey, sortOrder, showOnlyMyTasks, hideCompleted, currentUserId]);


  if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">読み込み中...</div>;

  const parentTasks = tasks.filter(t => !t.parentId && !t.parent_task_id);
  
  const totalProjectProgress = parentTasks.length > 0 
    ? Math.round(parentTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / parentTasks.length)
    : 0;
  
  // プロジェクト全体のテーマ色
  const projectTheme = getProgressTheme(totalProjectProgress);

  return (
    <div className="relative flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      <Header 
        title={projectName ? `${projectName} （👤 ${myDisplayName}）` : "Sefirot Project"} 
        showBackButton={true}
        onBack={() => navigate('/select-project')}
        menuItems={[
          { 
            label: 'メンバー一覧', 
            icon: <LuUsers />, 
            onClick: () => { fetchMembers(currentUserId); setShowMemberModal(true); } 
          },
          { label: '招待コードを表示', icon: <LuUserPlus />, onClick: () => setShowInviteModal(true) },
          { label: 'このプロジェクトでの表示名変更', icon: <LuPenLine />, onClick: handleOpenNameModal },
          { label: 'プロジェクトから退出する', icon: <LuUserMinus />, isDanger: true, onClick: handleLeaveProject },
          { label: 'プロジェクトを削除する', icon: <LuTrash2 />, isDanger: true, onClick: handleDeleteProject },
          { label: 'ログアウト', icon: <LuLogOut />, isDanger: true, onClick: () => { localStorage.removeItem('access_token'); navigate('/login'); } }
        ]} 
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* ✨ プロジェクト全体サマリー（色も連動） */}
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <LuTrophy className="text-yellow-500 w-5 h-5" />
                <span className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Project Overall</span>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <span className={`text-5xl font-black tracking-tighter transition-colors duration-1000 ${projectTheme.text}`}>
                  {totalProjectProgress}%
                </span>
                <span className="text-sm font-bold text-gray-400 mb-2">完了</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${projectTheme.barBg}`} 
                  style={{ width: `${totalProjectProgress}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
                <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Tasks</p>
                    <p className="text-xl font-black text-gray-700">{parentTasks.length}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Completed</p>
                    <p className="text-xl font-black text-gray-700">{parentTasks.filter(t => t.progress === 100).length}</p>
                </div>
            </div>
          </div>

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

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
              
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                <span>タスク一覧</span>
                <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                  全 {sortedParentTasks.length} 件
                </span>
              </h2>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                  <button
                    onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                      showOnlyMyTasks ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <LuUsers className="w-3.5 h-3.5" /> 自分のタスク
                  </button>
                  <button
                    onClick={() => setHideCompleted(!hideCompleted)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                      hideCompleted ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <LuCircleCheck className="w-3.5 h-3.5" /> 完了を非表示
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                  <div className="flex items-center pl-2 pr-1 text-gray-400">
                    <LuArrowDownUp className="w-4 h-4" />
                  </div>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer py-1 pr-2"
                  >
                    <option value="created_at">追加日</option>
                    <option value="deadline">期限日</option>
                    <option value="priority">重要度</option>
                    <option value="progress">進捗度</option>
                    <option value="name">名前</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 text-gray-600 transition flex items-center justify-center w-8 h-8"
                    title={sortOrder === 'asc' ? "昇順 (小さい順/古い順)" : "降順 (大きい順/新しい順)"}
                  >
                    {sortOrder === 'asc' ? <LuArrowUp className="w-4 h-4" /> : <LuArrowDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {sortedParentTasks.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <LuLeaf className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold">まだこの大地には何もありません</p>
                  <p className="text-sm text-gray-400 mt-1">最初のタスク（種）を植えて、樹を育てましょう！</p>
                </div>
              ) : (
                sortedParentTasks.map(parentTask => {
                  const childTasks = tasks.filter(t => t.parentId === parentTask.id || t.parent_task_id === parentTask.id);
                  const isCompleted = parentTask.progress === 100;
                  const parentTheme = getProgressTheme(parentTask.progress); // ✨ 親タスクのテーマ色
                  
                  return (
                    <div key={parentTask.id} className={`rounded-3xl border overflow-hidden transition-all duration-500 shadow-sm ${parentTheme.cardBg} ${parentTheme.border}`}>
                      
                      {/* 親タスクのカード */}
                      <div 
                        onClick={() => navigate(`/project/${communityId}/task/${parentTask.id}`)}
                        className={`relative z-10 p-5 bg-white cursor-pointer transition flex items-center gap-4 group ${parentTheme.hoverBg}`}
                      >
                        <LuFolderOpen className={`w-7 h-7 flex-shrink-0 transition-colors duration-500 ${parentTheme.iconText}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-extrabold truncate text-lg transition-colors duration-500 ${isCompleted ? 'text-emerald-800' : 'text-gray-800 group-hover:text-blue-700'}`}>
                              {parentTask.title || parentTask.name}
                            </h3>
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                                👑 COMPLETE!
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 ${parentTheme.text}`}>
                              {parentTask.status}
                            </span>
                            <div className={`flex-1 h-2 rounded-full overflow-hidden bg-gray-100`}>
                              <div className={`h-full transition-all duration-1000 ${parentTheme.barBg}`} style={{ width: `${parentTask.progress}%` }} />
                            </div>
                            <span className={`text-xs font-black w-8 text-right transition-colors duration-500 ${parentTheme.text}`}>{parentTask.progress}%</span>
                          </div>
                        </div>
                      </div>

                      {/* ✨ 提案1：枝葉のUI */}
                      {childTasks.length > 0 && (
                        <div className="relative pt-3 pb-5 pr-5">
                          {/* 樹の幹（縦線） */}
                          <div className={`absolute left-[2.35rem] top-0 bottom-8 w-1 rounded-b-full transition-colors duration-500 ${parentTheme.lineBg}`}></div>
                          
                          <div className="space-y-3">
                            {childTasks.map(childTask => {
                              const isMyChild = childTask.assignees?.some(a => a.id === currentUserId);
                              const childCompleted = childTask.progress === 100;
                              const childTheme = getProgressTheme(childTask.progress); // ✨ 子タスクのテーマ色

                              if (hideCompleted && childCompleted) return null;
                              if (showOnlyMyTasks && !isMyChild) return null;

                              return (
                                <div key={childTask.id} className="relative ml-[4rem] group/child">
                                  {/* 樹の枝（横線） */}
                                  <div className={`absolute -left-[1.65rem] top-1/2 w-[1.65rem] h-1 transition-colors duration-500 ${childTheme.lineBg}`}></div>
                                  
                                  <div 
                                    onClick={() => navigate(`/project/${communityId}/task/${childTask.id}`)}
                                    className={`relative p-4 bg-white rounded-2xl border transition-all duration-300 flex items-center gap-3 cursor-pointer hover:-translate-y-0.5 shadow-sm hover:shadow-md ${childTheme.border}`}
                                  >
                                    <LuLeaf className={`w-5 h-5 flex-shrink-0 transition-colors duration-500 ${childTheme.iconText}`} />
                                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <h4 className={`font-bold text-sm truncate transition-colors duration-500 ${childCompleted ? 'text-emerald-700' : 'text-gray-700 group-hover/child:text-blue-600'}`}>
                                          {childTask.title || childTask.name}
                                        </h4>
                                        {childCompleted && <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-1.5 rounded">DONE</span>}
                                      </div>
                                      <div className="flex items-center gap-3 w-full sm:w-1/3">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div className={`h-full transition-all duration-1000 ${childTheme.barBg}`} style={{ width: `${childTask.progress}%` }} />
                                        </div>
                                        <span className={`text-[10px] font-black w-6 text-right transition-colors duration-500 ${childTheme.text}`}>{childTask.progress}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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
                  key={member.id}
                  onClick={() => navigate(`/project/${communityId}/member/${member.id}`)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-200 transition group"
                >
                  <div>
                    <p className="font-bold text-gray-900">{member.display_name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <LuChevronRight className="text-gray-400 group-hover:text-blue-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              <button onClick={handleChangeName} disabled={!newName.trim()} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition shadow-lg shadow-blue-500/30">
                変更する
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
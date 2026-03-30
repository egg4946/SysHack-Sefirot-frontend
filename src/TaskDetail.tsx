import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LuPlus, LuCircleCheck, LuCircle, LuTrash2, LuFilePlus, LuPenLine, LuInfo, LuCalendarDays, LuAlignLeft, LuUsers, LuUserMinus,
  LuFolderOpen, LuUserPlus, LuX, LuChevronRight
} from "react-icons/lu";
import { Header } from './Header';
import toast from 'react-hot-toast';

// ✨ ひよこ画像のインポート（assetsフォルダに入っている前提です）
import img1 from './assets/1.png';
import img2 from './assets/2.png';
import img3 from './assets/3.png';
import img4 from './assets/4.png';
import img5 from './assets/5.png';
import img6 from './assets/6.png';

interface UserCommunity { id: string; name: string; }

interface UserData {
  user_data: { id: string; };
  user_communities: UserCommunity[];
}

interface Assignee {
  id: string;
  display_name: string;
  progress: number;
}

interface ChecklistItem {
  id: string;
  content: string;
  is_completed: boolean;
}

interface CommunityMember {
  id: string; 
  email: string;
  display_name: string;
}

interface Task {
  id: string;
  community_id: string; 
  name: string;
  description: string | null;
  progress: number;
  priority: '大' | '中' | '小';
  status: '未着手' | '進行中' | '完了';
  deadline: string | null;
  parent_task_id: string | null;
  assignees: Assignee[];
  checklists: ChecklistItem[];
}

// ✨ 進捗度に応じてひよこ画像を返す関数
const getHiyokoImage = (progress: number) => {
  if (progress <= 19) return img1;
  if (progress <= 39) return img2;
  if (progress <= 59) return img3;
  if (progress <= 79) return img4;
  if (progress <= 99) return img5;
  return img6; // 100%
};

export const TaskDetail: React.FC = () => {
  const { communityId, taskId } = useParams<{ communityId: string; taskId: string }>();
  const navigate = useNavigate();
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('access_token');

  const [task, setTask] = useState<Task | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [localProgress, setLocalProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const [newChildTaskName, setNewChildTaskName] = useState('');
  const [isCreatingChild, setIsCreatingChild] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'大' | '中' | '小'>('中');
  const [editDeadline, setEditDeadline] = useState('');

  const fetchTaskDetail = useCallback(async () => {
    if (!communityId || !taskId) return;
    try {
      const [meRes, tasksRes, membersRes] = await Promise.all([
        fetch(`${API_BASE}/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/tasks?community_id=${communityId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/community/members?community_id=${communityId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (meRes.ok) {
        const meData = (await meRes.json()) as UserData;
        setCurrentUserId(meData.user_data.id);
      }

      if (tasksRes.ok) {
        const data = (await tasksRes.json()) as Task[];
        setAllTasks(data);
        const currentTask = data.find((t: Task) => t.id === taskId);
        if (currentTask) setTask(currentTask);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }
    } catch (e) {
      console.error("データの取得に失敗しました", e);
    } finally {
      setLoading(false);
    }
  }, [taskId, communityId, API_BASE, token]);

  useEffect(() => {
    fetchTaskDetail();
  }, [fetchTaskDetail]);

  useEffect(() => {
    if (!isDragging && task) {
      const myData = task.assignees.find(a => a.id === currentUserId);
      if (myData) {
        setLocalProgress(myData.progress);
      }
    }
  }, [task, currentUserId, isDragging]);

  const handleDeleteTask = async () => {
    if (!task) return;
    if (!window.confirm("このタスクを本当に削除しますか？\n（子タスクがある場合は削除できません）")) return;

    try {
      const res = await fetch(`${API_BASE}/tasks/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: taskId })
      });
      if (res.ok) navigate(`/project/${communityId}`);
      else toast.error(`削除に失敗しました`);
    } catch {
      toast.error("通信エラーが発生しました。");
    }
  };

  const handleJoinTask = async () => {
    await fetch(`${API_BASE}/tasks/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ task_id: taskId, user_id: currentUserId })
    });
    fetchTaskDetail();
  };

  const handleAssignMember = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: taskId, user_id: userId })
      });
      if (res.ok) {
        setShowAssignModal(false);
        fetchTaskDetail();
      } else {
        toast.error("アサインに失敗しました");
      }
    } catch (e) {
      console.error(e);
      toast.error("通信エラーが発生しました");
    }
  };

  const handleLeaveTask = async () => {
    if (!window.confirm("このタスクの担当から外れますか？\n（あなたが入力した進捗データなどはリセットされます）")) return;

    try {
      const res = await fetch(`${API_BASE}/tasks/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: taskId })
      });
      
      if (res.ok) {
        toast.success("タスクから退出しました。");
        fetchTaskDetail();
      } else {
        toast.error("退出に失敗しました");
      }
    } catch (e) {
      console.error(e);
      toast.error("通信エラーが発生しました");
    }
  };

  const handleProgressChange = async (value: number) => {
    if (task) {
      const updatedAssignees = task.assignees.map(a => 
        a.id === currentUserId ? { ...a, progress: value } : a
      );
      setTask({ ...task, assignees: updatedAssignees });
    }

    try {
      await fetch(`${API_BASE}/tasks/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: taskId, progress: value })
      });
      fetchTaskDetail(); 
    } catch (e) {
      console.error("進捗の保存に失敗しました", e);
    }
  };

  const handleAddChecklist = async () => {
    const content = window.prompt("チェックリストの内容を入力してください");
    if (!content) return;
    await fetch(`${API_BASE}/checklists/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ task_id: taskId, content })
    });
    fetchTaskDetail();
  };

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    await fetch(`${API_BASE}/checklists/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ checklist_id: itemId, is_completed: !currentStatus })
    });
    fetchTaskDetail();
  };

  const handleCreateChildTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildTaskName.trim() || isCreatingChild) return;
    setIsCreatingChild(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          community_id: communityId, 
          name: newChildTaskName,
          priority: '中',
          parent_task_id: taskId
        })
      });
      if (res.ok) {
        toast.success('子タスクを追加しました！');
        fetchTaskDetail();
        setNewChildTaskName('');
      } else toast.error(`作成に失敗しました`);
    } catch (error) {
      console.error(error);
      toast.error("通信エラーが発生しました");
    } finally {
      setIsCreatingChild(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: taskId, status: newStatus })
      });
      if (res.ok) fetchTaskDetail();
      else toast.error('ステータスの更新に失敗しました');
    } catch (e) {
      console.error(e);
      toast.error('通信エラーが発生しました');
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          task_id: taskId, 
          name: editName,
          description: editDesc || null,
          priority: editPriority,
          deadline: editDeadline ? new Date(editDeadline).toISOString() : null
        })
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchTaskDetail();
      } else {
        toast.error('タスクの更新に失敗しました');
      }
    } catch (e) {
      console.error(e);
      toast.error('通信エラーが発生しました');
    }
  };

  const openEditModal = () => {
    if (task) {
      setEditName(task.name);
      setEditDesc(task.description || '');
      setEditPriority(task.priority);
      setEditDeadline(task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '');
      setShowEditModal(true);
    }
  };

  if (loading || !task) return <div className="flex items-center justify-center h-screen bg-gray-50 text-blue-600 font-black animate-pulse">LOADING...</div>;

  const isAssigned = task.assignees.some(a => a.id === currentUserId);
  const myData = task.assignees.find(a => a.id === currentUserId);

  const childTasks = allTasks.filter(t => t.parent_task_id === taskId);
  const unassignedMembers = members.filter(m => !task.assignees.some(a => a.id === m.id));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      <Header 
        title={task.name}
        showBackButton={true}
        onBack={() => navigate(-1)}
        menuItems={[
          { label: 'タスクを編集する', icon: <LuPenLine />, onClick: openEditModal },
          { label: 'メンバーを割り振る', icon: <LuUserPlus />, onClick: () => setShowAssignModal(true) },
          ...(isAssigned ? [{ label: 'このタスクから退出する', icon: <LuUserMinus />, isDanger: true, onClick: handleLeaveTask }] : []),
          { label: 'タスクを削除する', icon: <LuTrash2 />, isDanger: true, onClick: handleDeleteTask }
        ]} 
      />

      <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-24">
        
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900 mb-2">{task.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <select 
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-sm font-black tracking-widest outline-none cursor-pointer border-2 transition ${
                  task.status === '完了' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:border-emerald-500' :
                  task.status === '進行中' ? 'bg-orange-50 text-orange-700 border-orange-200 focus:border-orange-500' :
                  'bg-gray-50 text-gray-600 border-gray-200 focus:border-gray-500'
                }`}
              >
                <option value="未着手">未着手</option>
                <option value="進行中">進行中</option>
                <option value="完了">完了</option>
              </select>

              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                task.priority === '大' ? 'bg-red-50 text-red-600' : task.priority === '中' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-600'
              }`}>
                <LuInfo className="w-3.5 h-3.5" /> 優先度: {task.priority}
              </span>
              {task.deadline && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 flex items-center gap-1">
                  <LuCalendarDays className="w-3.5 h-3.5" /> 期限: {new Date(task.deadline).toLocaleDateString()}
                </span>
              )}
            </div>
            {task.description && (
              <div className="mt-4 p-4 bg-gray-50 rounded-2xl text-sm text-gray-700 flex gap-3">
                <LuAlignLeft className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <p className="whitespace-pre-wrap">{task.description}</p>
              </div>
            )}
          </div>
          <div className="w-full sm:w-32 flex flex-col items-center justify-center p-4 bg-blue-50/50 rounded-3xl border border-blue-100">
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Progress</span>
             <span className="text-3xl font-black text-blue-600">{task.progress}%</span>
          </div>
        </div>

        <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
          <div className="flex items-center gap-2 mb-6 border-b pb-4">
            <LuUsers className="w-6 h-6 text-blue-500" />
            <h3 className="text-xl font-black text-gray-800 tracking-tight">担当メンバー</h3>
          </div>
          
          <div className="space-y-4">
            {task.assignees.length > 0 ? (
              task.assignees.map(assignee => (
                <div key={assignee.id} className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-sm transition">
                  <button
                    onClick={() => navigate(`/project/${communityId}/member/${assignee.id}`)}
                    className="w-1/3 text-left font-extrabold text-sm sm:text-base text-gray-700 hover:text-blue-600 hover:underline truncate transition"
                  >
                    {assignee.display_name}
                  </button>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ${assignee.progress === 100 ? 'bg-emerald-400' : 'bg-blue-500'}`} 
                        style={{ width: `${assignee.progress}%` }} 
                      />
                    </div>
                    <span className={`text-xs font-black w-8 text-right ${assignee.progress === 100 ? 'text-emerald-500' : 'text-blue-600'}`}>
                      {assignee.progress}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 font-bold text-center py-6">担当者はまだいません</p>
            )}
          </div>
        </section>

        {task.parent_task_id === null && childTasks.length > 0 && (
          <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              <LuFolderOpen className="w-6 h-6 text-emerald-500" />
              <h3 className="text-xl font-black text-gray-800 tracking-tight">この樹の枝（子タスク）</h3>
            </div>
            <div className="space-y-3">
              {childTasks.map(child => (
                <div 
                  key={child.id}
                  onClick={() => navigate(`/project/${communityId}/task/${child.id}`)}
                  className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between hover:bg-emerald-50 cursor-pointer transition border border-transparent hover:border-emerald-200 group"
                >
                  <span className="font-bold text-gray-700 group-hover:text-emerald-700">{child.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${child.progress}%` }} />
                    </div>
                    <span className="text-xs font-black text-emerald-600 w-8 text-right">{child.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isAssigned ? (
          <button onClick={handleJoinTask} className="w-full py-6 bg-gradient-to-r from-blue-600 to-green-400 text-white rounded-3xl font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
            <LuPlus className="w-6 h-6" /> このタスクに参加して進捗を入力
          </button>
        ) : (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-100 overflow-hidden relative">
            <div className="flex justify-between items-center mb-10">
              <button 
                onClick={() => navigate(`/project/${communityId}/member/${currentUserId}`)}
                className="font-black text-xs uppercase tracking-widest text-blue-500 hover:text-blue-700 hover:underline transition"
              >
                {myData?.display_name}'s Progress
              </button>
              <span className="text-4xl font-black text-blue-600">{localProgress}%</span>
            </div>
            
            {/* ✨ ひよこスライダー！ */}
            <div className="py-4 relative z-10">
              <input 
                type="range" 
                min="0" max="100" 
                value={localProgress} 
                onPointerDown={() => setIsDragging(true)}
                onChange={(e) => setLocalProgress(parseInt(e.target.value))}
                onPointerUp={(e) => {
                  setIsDragging(false);
                  handleProgressChange(parseInt(e.currentTarget.value));
                }}
                className="w-full h-3 rounded-full appearance-none cursor-pointer hiyoko-slider" 
                style={{
                  '--thumb-img': `url(${getHiyokoImage(localProgress)})`,
                  background: `linear-gradient(to right, ${localProgress === 100 ? '#34d399' : '#3b82f6'} ${localProgress}%, #f3f4f6 ${localProgress}%)`
                } as React.CSSProperties}
              />
            </div>
          </div>
        )}

        <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">Checklist</h3>
            <button onClick={handleAddChecklist} className="bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-100 transition shadow-sm">
              <LuPlus size={24} />
            </button>
          </div>
          <div className="space-y-4">
            {task.checklists && task.checklists.length > 0 ? (
              task.checklists.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-4 p-5 bg-gray-50/50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-md transition cursor-pointer"
                  onClick={() => handleToggleChecklist(item.id, item.is_completed)}
                >
                  {item.is_completed ? <LuCircleCheck className="text-green-500 w-6 h-6" /> : <LuCircle className="text-gray-300 w-6 h-6" />}
                  <span className={`flex-1 font-bold text-lg ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.content}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-gray-400 font-bold italic">No items yet.</p>
            )}
          </div>
        </section>

        {task.parent_task_id === null && (
          <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                <LuFilePlus className="text-blue-500 w-6 h-6" /> 子タスクを追加
              </h3>
            </div>
            <form onSubmit={handleCreateChildTask} className="flex gap-3">
              <input
                type="text"
                placeholder="子タスク名を入力..."
                value={newChildTaskName}
                onChange={(e) => setNewChildTaskName(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
              <button 
                type="submit" 
                disabled={!newChildTaskName.trim() || isCreatingChild}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition shadow-md"
              >
                <LuPlus className="w-5 h-5" />
                <span className="hidden sm:inline">追加</span>
              </button>
            </form>
          </section>
        )}

      </main>

      {/* ✨ メンバーアサイン用モーダル */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-black">メンバーを割り振る</h3>
              <button onClick={() => setShowAssignModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <LuX />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 flex-1 text-left">
              {unassignedMembers.length > 0 ? (
                unassignedMembers.map(member => (
                  <div 
                    key={member.id}
                    onClick={() => handleAssignMember(member.id)}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 cursor-pointer border border-transparent hover:border-blue-200 transition group"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{member.display_name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm">
                      追加する <LuChevronRight />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-400 font-bold">全員アサイン済みです</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-2xl font-black text-gray-800">タスクを編集</h3>
            </div>
            <form onSubmit={handleUpdateTask} className="p-8 overflow-y-auto flex-1 space-y-6 text-left">
              
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">タスク名 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">優先度</label>
                <div className="flex gap-4">
                  {['大', '中', '小'].map(p => (
                    <label key={p} className="flex-1 cursor-pointer">
                      <input 
                        type="radio" 
                        name="priority" 
                        value={p}
                        checked={editPriority === p}
                        onChange={(e) => setEditPriority(e.target.value as '大' | '中' | '小')}
                        className="peer sr-only"
                      />
                      <div className="text-center py-3 rounded-xl border-2 font-bold transition peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 bg-white text-gray-500 border-gray-200 hover:bg-gray-50">
                        {p}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">期限 (しめきり)</label>
                <input 
                  type="datetime-local" 
                  value={editDeadline}
                  onChange={e => setEditDeadline(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">説明・メモ</label>
                <textarea 
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="タスクの詳細やメモを記入..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition">
                  キャンセル
                </button>
                <button type="submit" disabled={!editName.trim()} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:bg-gray-300 transition shadow-lg shadow-blue-500/30">
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  LuPlus, LuCircleCheck, LuCircle, LuTrash2, LuFilePlus, LuPenLine, LuInfo, LuCalendarDays, LuAlignLeft, LuUsers, LuUserMinus,
  LuFolderOpen, LuUserPlus, LuX, LuChevronRight, LuPlay, LuFile
} from "react-icons/lu";
import { Header } from './Header';

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

export const TaskDetail: React.FC = () => {
  const { communityId, taskId } = useParams<{ communityId: string; taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
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

  const openEditModal = useCallback((targetTask: Task) => {
    setEditName(targetTask.name);
    setEditDesc(targetTask.description || '');
    setEditPriority(targetTask.priority);
    setEditDeadline(targetTask.deadline ? new Date(targetTask.deadline).toISOString().slice(0, 16) : '');
    setShowEditModal(true);
  }, []);

  // ✨ 親タスクのステータスを子タスクの進捗から自動計算して同期する関数
  const syncParentStatus = useCallback(async (parentTask: Task, children: Task[]) => {
    if (children.length === 0) return;

    const avgProgress = Math.round(children.reduce((acc, c) => acc + c.progress, 0) / children.length);
    let autoStatus: '未着手' | '進行中' | '完了' = '進行中';
    if (avgProgress === 0) autoStatus = '未着手';
    else if (avgProgress === 100) autoStatus = '完了';

    // 現在の状態と異なる場合のみAPIを叩く
    if (parentTask.status !== autoStatus) {
      try {
        await fetch(`${API_BASE}/tasks/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ task_id: parentTask.id, status: autoStatus })
        });
        // ローカルのステータスも更新
        setTask(prev => prev ? { ...prev, status: autoStatus } : null);
      } catch (e) {
        console.error("ステータスの自動同期に失敗しました", e);
      }
    }
  }, [API_BASE, token]);

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
        if (currentTask) {
          setTask(currentTask);

          // ✨ 子タスクがある場合、ステータスの同期をチェック
          const children = data.filter(t => t.parent_task_id === taskId);
          if (children.length > 0) {
            syncParentStatus(currentTask, children);
          }
          
          const queryParams = new URLSearchParams(location.search);
          if (queryParams.get('edit') === 'true') {
            openEditModal(currentTask);
            navigate(location.pathname, { replace: true });
          }
        }
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
  }, [taskId, communityId, API_BASE, token, location.search, navigate, openEditModal, location.pathname, syncParentStatus]);

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
      else alert(`削除に失敗しました`);
    } catch {
      alert("通信エラーが発生しました。");
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
        alert("アサインに失敗しました");
      }
    } catch (e) {
      console.error(e);
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
        alert("タスクから退出しました。");
        fetchTaskDetail();
      } else {
        alert("退出に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました");
    }
  };

  const handleProgressChange = async (value: number) => {
    if (!task) return;

    let autoStatus: '未着手' | '進行中' | '完了' = '進行中';
    if (value === 0) autoStatus = '未着手';
    else if (value === 100) autoStatus = '完了';

    const updatedAssignees = task.assignees.map(a => 
      a.id === currentUserId ? { ...a, progress: value } : a
    );
    setTask({ ...task, assignees: updatedAssignees, status: autoStatus });

    try {
      const pRes = await fetch(`${API_BASE}/tasks/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: taskId, progress: value })
      });

      const sRes = await fetch(`${API_BASE}/tasks/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ task_id: taskId, status: autoStatus })
      });
      
      if (!pRes.ok || !sRes.ok) throw new Error('Sync failed');
      fetchTaskDetail();
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました。");
      fetchTaskDetail();
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

    const currentChildTasks = allTasks.filter(t => t.parent_task_id === taskId);
    if (currentChildTasks.length === 0 && (task?.assignees.length || 0) > 0) {
      if (!window.confirm("子タスクを作成すると、このタスク（親）に現在設定されている担当者や進捗データはすべてリセットされます。よろしいですか？")) {
        return;
      }
    }

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
        alert('子タスクを追加しました！');
        fetchTaskDetail();
        setNewChildTaskName('');
      } else alert(`作成に失敗しました`);
    } catch (error) {
      console.error(error);
      alert("通信エラーが発生しました");
    } finally {
      setIsCreatingChild(false);
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
        alert('タスクの更新に失敗しました');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onManualOpenEditModal = () => {
    if (task) openEditModal(task);
  };

  if (loading || !task) return <div className="flex items-center justify-center h-screen bg-gray-50 text-blue-600 font-black animate-pulse">LOADING...</div>;

  const isAssigned = task.assignees.some(a => a.id === currentUserId);
  const myData = task.assignees.find(a => a.id === currentUserId);
  const childTasks = allTasks.filter(t => t.parent_task_id === taskId);
  const hasChildren = childTasks.length > 0;
  const unassignedMembers = members.filter(m => !task.assignees.some(a => a.id === m.id));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      <Header 
        title={task.name}
        showBackButton={true}
        onBack={() => navigate(-1)}
        menuItems={[
          { label: 'タスクを編集する', icon: <LuPenLine />, onClick: onManualOpenEditModal },
          ...(!hasChildren ? [{ label: 'メンバーを割り振る', icon: <LuUserPlus />, onClick: () => setShowAssignModal(true) }] : []),
          ...(isAssigned && !hasChildren ? [{ label: 'このタスクから退出する', icon: <LuUserMinus />, isDanger: true, onClick: handleLeaveTask }] : []),
          { label: 'タスクを削除する', icon: <LuTrash2 />, isDanger: true, onClick: handleDeleteTask }
        ]} 
      />

      <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-24">
        
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900 mb-2">{task.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black tracking-widest border-2 transition ${
                  task.status === '完了' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  task.status === '進行中' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                {task.status === '完了' ? <LuCircleCheck className="w-4 h-4" /> : 
                 task.status === '進行中' ? <LuPlay className="w-4 h-4" /> : 
                 <LuCircle className="w-4 h-4" />}
                {task.status}
              </div>

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

        {/* 子タスクがない場合のみ「担当メンバー」を表示 */}
        {!hasChildren && (
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
        )}

        {/* 子タスク一覧表示セクション（メイン画面風のデザイン） */}
        {hasChildren && (
          <section className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <div className="flex items-center gap-2">
                <LuFolderOpen className="w-6 h-6 text-emerald-500" />
                <h3 className="text-xl font-black text-gray-800 tracking-tight">子タスク一覧</h3>
              </div>
              <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                全 {childTasks.length} 件
              </span>
            </div>
            
            <div className="space-y-4">
              {childTasks.map(child => {
                const isCompleted = child.progress === 100;
                return (
                  <div 
                    key={child.id}
                    onClick={() => navigate(`/project/${communityId}/task/${child.id}`)}
                    className={`p-4 bg-white rounded-2xl border cursor-pointer transition flex items-center gap-4 group ${
                      isCompleted ? 'border-emerald-200 hover:bg-emerald-50' : 'border-gray-200 hover:bg-blue-50'
                    }`}
                  >
                    {isCompleted ? (
                      <LuCircleCheck className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <LuFile className="w-6 h-6 text-blue-500 flex-shrink-0 group-hover:text-blue-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-extrabold truncate text-lg transition-colors ${
                          isCompleted ? 'text-emerald-800' : 'text-gray-800 group-hover:text-blue-700'
                        }`}>
                          {child.name}
                        </h4>
                        {isCompleted && (
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-1.5 rounded">DONE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {child.status}
                        </span>
                        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isCompleted ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                          <div 
                            className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                            style={{ width: `${child.progress}%` }} 
                          />
                        </div>
                        <span className={`text-xs font-black w-8 text-right ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {child.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 進捗入力セクション：子タスクがない場合のみ表示 */}
        {!hasChildren && (
          <>
            {!isAssigned ? (
              <button onClick={handleJoinTask} className="w-full py-6 bg-gradient-to-r from-blue-600 to-green-400 text-white rounded-3xl font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                <LuPlus className="w-6 h-6" /> このタスクに参加して進捗を入力
              </button>
            ) : (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-100">
                <div className="flex justify-between items-center mb-6">
                  <button 
                    onClick={() => navigate(`/project/${communityId}/member/${currentUserId}`)}
                    className="font-black text-xs uppercase tracking-widest text-blue-500 hover:text-blue-700 hover:underline transition"
                  >
                    {myData?.display_name}'s Progress
                  </button>
                  <span className="text-4xl font-black text-blue-600">{localProgress}%</span>
                </div>
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
                  className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-600 border" 
                />
              </div>
            )}
          </>
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

        {/* 子タスク追加フォーム（親タスクのみ） */}
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
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuPlus, LuCircleCheck, LuCircle, LuTrash2 } from "react-icons/lu";

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

interface Task {
  id: string;
  community_id: string; 
  name: string;
  description: string | null;
  progress: number;
  priority: '大' | '中' | '小';
  status: '未着手' | '進行中' | '完了';
  parent_task_id: string | null;
  assignees: Assignee[];
  checklists: ChecklistItem[];
}

export const TaskDetail: React.FC = () => {
  const { communityId, taskId } = useParams<{ communityId: string; taskId: string }>();
  const navigate = useNavigate();
  
  // ✨ 環境変数から取得するように変更
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('access_token');

  const [task, setTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchTaskDetail = useCallback(async () => {
    if (!communityId || !taskId) return;
    try {
      const [meRes, taskRes] = await Promise.all([
        fetch(`${API_BASE}/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/tasks?community_id=${communityId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (meRes.ok) {
        const meData = (await meRes.json()) as UserData;
        setCurrentUserId(meData.user_data.id);
      }

      if (taskRes.ok) {
        const data = (await taskRes.json()) as Task[];
        const currentTask = data.find((t: Task) => t.id === taskId);
        if (currentTask) setTask(currentTask);
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

  const handleDeleteTask = async () => {
    if (!task) return;
    if (!window.confirm("このタスクを削除しますか？")) return;

    try {
      const res = await fetch(`${API_BASE}/tasks/delete`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ task_id: taskId })
      });

      if (res.ok) {
        navigate(`/project/${communityId}`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`削除に失敗しました: ${errorData.detail || 'サーバーエラー'}`);
      }
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

  const handleProgressChange = async (value: number) => {
    await fetch(`${API_BASE}/tasks/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ task_id: taskId, progress: value })
    });
    fetchTaskDetail();
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

  if (loading || !task) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 text-blue-600 font-black animate-pulse">LOADING...</div>
  );

  const isAssigned = task.assignees.some(a => a.id === currentUserId);
  const myData = task.assignees.find(a => a.id === currentUserId);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-md sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-blue-600 font-extrabold hover:text-blue-800 transition">
          <LuArrowLeft className="w-5 h-5" /> 戻る
        </button>
        <h1 className="text-lg font-black text-gray-800 truncate px-4">{task.name}</h1>
        <button onClick={handleDeleteTask} className="p-2 text-gray-400 hover:text-red-500 transition">
          <LuTrash2 size={24} />
        </button>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-8 pb-24">
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Task Total</span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-1000" 
                style={{ width: `${task.progress}%` }} 
              />
            </div>
            <span className="text-sm font-black text-blue-600 w-10 text-right">{task.progress}%</span>
          </div>
        </div>

        {!isAssigned ? (
          <button onClick={handleJoinTask} className="w-full py-6 bg-gradient-to-r from-blue-600 to-green-400 text-white rounded-3xl font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
            <LuPlus className="w-6 h-6" /> このタスクに参加して進捗を入力
          </button>
        ) : (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-100">
            <div className="flex justify-between items-center mb-6">
              <span className="font-black text-xs uppercase tracking-widest text-blue-500">{myData?.display_name}'s Progress</span>
              <span className="text-4xl font-black text-blue-600">{myData?.progress}%</span>
            </div>
            <input type="range" min="0" max="100" value={myData?.progress || 0} onChange={(e) => handleProgressChange(parseInt(e.target.value))} className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-600 border" />
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
      </main>
    </div>
  );
};
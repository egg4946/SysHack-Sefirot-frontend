import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuPlus, LuCircleCheck, LuCircle, LuTrash2, LuFilePlus } from "react-icons/lu";
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
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('access_token');

  const [task, setTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // ✨ 子タスク作成用のState
  const [newChildTaskName, setNewChildTaskName] = useState('');
  const [isCreatingChild, setIsCreatingChild] = useState(false);

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
    if (!window.confirm("このタスクを本当に削除しますか？\n（子タスクがある場合は削除できません）")) return;

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

  // ✨ 子タスクを作成する関数
  const handleCreateChildTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildTaskName.trim() || isCreatingChild) return;
    
    setIsCreatingChild(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          community_id: communityId, 
          name: newChildTaskName,
          priority: '中',
          parent_task_id: taskId // ✨ 今開いているタスクのIDを親として指定！
        })
      });

      if (res.ok) {
        setNewChildTaskName('');
        alert('子タスクを追加しました！');
        // 子タスクができたらメイン画面に戻る（ツリーで確認するため）
        navigate(`/project/${communityId}`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`作成に失敗しました: ${errorData.detail || '不正なリクエスト'}`);
      }
    } catch (error) {
      console.error(error);
      alert("通信エラーが発生しました");
    } finally {
      setIsCreatingChild(false);
    }
  };

  if (loading || !task) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 text-blue-600 font-black animate-pulse">LOADING...</div>
  );

  const isAssigned = task.assignees.some(a => a.id === currentUserId);
  const myData = task.assignees.find(a => a.id === currentUserId);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      <Header 
        title={task.name}
        showBackButton={true}
        onBack={() => navigate(-1)}
        menuItems={[
          { 
            label: 'タスクを削除する', 
            icon: <LuTrash2 />, 
            isDanger: true,
            onClick: handleDeleteTask 
          }
        ]} 
      />

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
            <input 
              type="range" 
              min="0" max="100" 
              value={myData?.progress || 0} 
              onChange={(e) => handleProgressChange(parseInt(e.target.value))} 
              className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-600 border" 
            />
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

        {/* ✨ 親タスクの場合のみ、子タスク追加UIを表示 */}
        {task.parent_task_id === null && (
          <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                <LuFilePlus className="text-blue-500 w-6 h-6" />
                子タスクを追加
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
            <p className="text-xs text-gray-400 mt-4 font-bold leading-relaxed">
              ※子タスクを追加すると、この親タスクは「コンテナ化」され、進捗は配下の子タスクの平均値として自動計算されるようになります。
            </p>
          </section>
        )}

      </main>
    </div>
  );
};
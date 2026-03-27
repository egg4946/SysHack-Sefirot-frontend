import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// アイコン名はご利用の環境で動く LuCheckCheck または LuCircleCheck に統一してください
import { LuArrowLeft, LuPlus, LuCheckCheck, LuCircle, LuTrash2 } from "react-icons/lu";

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
  // 1. communityId も URL パラメータから受け取るように修正
  const { communityId, taskId } = useParams<{ communityId: string; taskId: string }>();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const token = localStorage.getItem('access_token');

  const [task, setTask] = useState<Task | null>(null);
  const [myProgress, setMyProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // 2. データ取得ロジックの修正
  const fetchTaskDetail = useCallback(async () => {
    if (!communityId || !taskId) return;

    try {
      // "dummy" ではなく、URL から取得した実際の communityId をクエリパラメータにセット
      const res = await fetch(`${apiBase}/tasks?community_id=${communityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data: Task[] = await res.json();
        const currentTask = data.find((t: Task) => t.id === taskId);
        
        if (currentTask) {
          setTask(currentTask);
          
          // 3. 自分の進捗を表示（暫定的に assignees の中から自分を探す想定）
          // 現状はリストの先頭を表示。本来はログイン中の userId と比較する。
          if (currentTask.assignees && currentTask.assignees.length > 0) {
            setMyProgress(currentTask.assignees[0].progress);
          }
        }
      } else if (res.status === 403) {
        console.error("アクセス権限がありません。プロジェクトに参加しているか確認してください。");
      }
    } catch (e) {
      console.error("通信エラー:", e);
    } finally {
      setLoading(false);
    }
  }, [taskId, communityId, apiBase, token]);

  useEffect(() => { fetchTaskDetail(); }, [fetchTaskDetail]);

  // 進捗更新処理
  const handleProgressChange = async (value: number) => {
    setMyProgress(value);
    await fetch(`${apiBase}/tasks/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ task_id: taskId, progress: value })
    });
    fetchTaskDetail(); // 親タスクなどの平均進捗を再計算するため再取得
  };

  const handleAddChildTask = async () => {
    if (!task) return;
    const name = window.prompt("子タスク名を入力してください");
    if (!name) return;
    
    await fetch(`${apiBase}/tasks/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        community_id: communityId, // URLから取得したIDを使用
        name,
        priority: '中',
        parent_task_id: taskId
      })
    });
    fetchTaskDetail();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 text-blue-600 font-black animate-pulse">
      LOADING...
    </div>
  );

  if (!task) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 space-y-4">
      <p className="text-xl font-black text-gray-400">タスクが見つかりません</p>
      <button onClick={() => navigate(-1)} className="text-blue-600 font-bold underline">戻る</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4 lg:p-10 text-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-blue-600 font-extrabold hover:text-blue-800 transition"
        >
          <LuArrowLeft className="w-5 h-5" /> プロジェクトへ戻る
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 lg:p-12 border border-gray-100">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2">
              <span className={`text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                task.priority === '大' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {task.priority}優先
              </span>
              <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight tracking-tighter">
                {task.name}
              </h1>
            </div>
            <button className="p-4 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition duration-200">
              <LuTrash2 size={24} />
            </button>
          </div>

          {/* 進捗コントロール */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-3xl p-8 mb-10 shadow-lg shadow-blue-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-white text-lg tracking-wide uppercase">Your Progress</h2>
              <span className="text-4xl font-black text-white">{myProgress}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={myProgress}
              onChange={(e) => handleProgressChange(parseInt(e.target.value))}
              className="w-full h-4 bg-blue-400/30 rounded-full appearance-none cursor-pointer accent-white border border-white/20 shadow-inner"
            />
          </div>

          {/* チェックリスト */}
          <section className="mb-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">Checklist</h3>
              <button className="bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-100 transition shadow-sm">
                <LuPlus size={24} />
              </button>
            </div>
            <div className="space-y-4">
              {task.checklists && task.checklists.length > 0 ? (
                task.checklists.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-5 bg-gray-50/50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-md transition duration-200">
                    {item.is_completed ? <LuCheckCheck className="text-green-500 w-6 h-6" /> : <LuCircle className="text-gray-300 w-6 h-6" />}
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

          {/* 子タスク追加（親タスクの場合のみ表示） */}
          {!task.parent_task_id && (
            <button 
              onClick={handleAddChildTask}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-green-400 text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <LuPlus className="w-6 h-6" /> 子タスクを追加
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
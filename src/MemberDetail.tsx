import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuUserMinus, LuCircleCheck, LuClock, LuCircle, LuListTodo } from "react-icons/lu";
import { Header } from './Header';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// APIから返ってくるデータの型定義
interface MemberDetailData {
  user: {
    id: string;
    display_name: string;
    joined_at: string;
  };
  summary: {
    total_tasks: number;
    completed: number;
    in_progress: number;
    not_started: number;
  };
  tasks: {
    task_id: string;
    name: string;
    status: string;
    priority: string;
    deadline: string | null;
    personal_progress: number;
    overall_progress: number;
  }[];
}

export const MemberDetail: React.FC = () => {
  // URLから communityId と userId を取得
  const { communityId, userId } = useParams<{ communityId: string; userId: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  const [detailData, setDetailData] = useState<MemberDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  // メンバー詳細データの取得
  const fetchMemberDetail = useCallback(async () => {
    if (!communityId || !userId) return;
    try {
      const res = await fetch(`${API_BASE}/community/member/detail?community_id=${communityId}&user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      } else {
        alert("データの取得に失敗しました");
        navigate(-1);
      }
    } catch (e) {
      console.error(e);
      alert("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [communityId, userId, token, navigate]);

  useEffect(() => {
    fetchMemberDetail();
  }, [fetchMemberDetail]);

  // メンバーをキック（追放）する処理
  const handleKickMember = async () => {
    if (!window.confirm(`${detailData?.user.display_name} さんをプロジェクトから追放しますか？\nこの操作は取り消せません。`)) return;

    try {
      const res = await fetch(`${API_BASE}/community/kick`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ community_id: communityId, user_id: userId })
      });

      if (res.ok) {
        alert("メンバーを追放しました。");
        navigate(`/project/${communityId}`); // メイン画面に戻る
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`エラー: ${err.detail || 'キックに失敗しました'}`);
      }
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました。");
    }
  };

  if (loading || !detailData) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 text-blue-600 font-black animate-pulse">LOADING...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* 共通ヘッダー */}
      <Header 
        title={`${detailData.user.display_name} の詳細`} 
        showBackButton={true}
        onBack={() => navigate(`/project/${communityId}`)}
        menuItems={[
          { 
            label: 'プロジェクトからキック（追放）', 
            icon: <LuUserMinus />, 
            isDanger: true, 
            onClick: handleKickMember 
          }
        ]} 
      />

      <main className="p-6 max-w-4xl mx-auto space-y-8 pb-24">
        
        {/* サマリー（統計）セクション */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <LuListTodo className="w-8 h-8 text-blue-500 mb-2" />
            <span className="text-3xl font-black text-gray-800">{detailData.summary.total_tasks}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Tasks</span>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <LuCircleCheck className="w-8 h-8 text-emerald-500 mb-2" />
            <span className="text-3xl font-black text-gray-800">{detailData.summary.completed}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</span>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <LuClock className="w-8 h-8 text-orange-500 mb-2" />
            <span className="text-3xl font-black text-gray-800">{detailData.summary.in_progress}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">In Progress</span>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <LuCircle className="w-8 h-8 text-gray-300 mb-2" />
            <span className="text-3xl font-black text-gray-800">{detailData.summary.not_started}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Not Started</span>
          </div>
        </section>

        {/* 担当タスク一覧セクション */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
            担当中のタスク
          </h2>
          <div className="space-y-4">
            {detailData.tasks.length > 0 ? (
              detailData.tasks.map(task => (
                <div 
                  key={task.task_id} 
                  onClick={() => navigate(`/project/${communityId}/task/${task.task_id}`)}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition cursor-pointer flex flex-col gap-4"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-800 truncate pr-4">{task.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider ${
                      task.status === '完了' ? 'bg-emerald-100 text-emerald-700' :
                      task.status === '進行中' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        <span>Personal Progress</span>
                        <span className="text-blue-600">{task.personal_progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${task.personal_progress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 border-dashed">
                <p className="text-gray-400 font-bold">担当しているタスクはありません</p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
};

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LuUserMinus, LuCircleCheck, LuClock, LuCircle, LuListTodo, 
  LuCalendarDays, LuInfo 
} from "react-icons/lu";
import { Header } from './Header';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

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
  const { communityId, userId } = useParams<{ communityId: string; userId: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  const [detailData, setDetailData] = useState<MemberDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  // 日付を綺麗にフォーマットする関数（例：2026/03/29）
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未設定';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? '未設定' : d.toLocaleDateString('ja-JP');
  };

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
    } finally {
      setLoading(false);
    }
  }, [communityId, userId, token, navigate]);

  useEffect(() => {
    fetchMemberDetail();
  }, [fetchMemberDetail]);

  const handleKickMember = async () => {
    if (!window.confirm(`${detailData?.user.display_name} さんをプロジェクトから追放しますか？\nこの操作は取り消せません。`)) return;

    try {
      const res = await fetch(`${API_BASE}/community/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ community_id: communityId, user_id: userId })
      });

      if (res.ok) {
        alert("メンバーを追放しました。");
        navigate(`/project/${communityId}`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`エラー: ${err.detail || 'キックに失敗しました'}`);
      }
    } catch (e) {
      console.error(e);
      alert("通信エラーが発生しました。");
    }
  };

  // ✨ プロ仕様のスケルトンローディング
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans animate-pulse">
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm"></header>
        <main className="p-6 max-w-4xl mx-auto space-y-8">
          <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white h-32 rounded-3xl border border-gray-100"></div>
            ))}
          </div>
          <div className="space-y-4 pt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white h-24 rounded-3xl border border-gray-100"></div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!detailData) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
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
        
        {/* ✨ ユーザープロフィール情報 */}
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{detailData.user.display_name}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 font-medium">
              <LuCalendarDays className="w-4 h-4" />
              参加日: {formatDate(detailData.user.joined_at)}
            </p>
          </div>
        </div>

        {/* ✨ サマリー（統計）セクション */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center transition hover:shadow-md">
            <LuListTodo className="w-8 h-8 text-blue-500 mb-2" />
            <span className="text-4xl font-black text-gray-800 tracking-tight">{detailData.summary.total_tasks}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Tasks</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center transition hover:shadow-md">
            <LuCircleCheck className="w-8 h-8 text-emerald-500 mb-2" />
            <span className="text-4xl font-black text-gray-800 tracking-tight">{detailData.summary.completed}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Completed</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center transition hover:shadow-md">
            <LuClock className="w-8 h-8 text-orange-500 mb-2" />
            <span className="text-4xl font-black text-gray-800 tracking-tight">{detailData.summary.in_progress}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">In Progress</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center transition hover:shadow-md">
            <LuCircle className="w-8 h-8 text-gray-300 mb-2" />
            <span className="text-4xl font-black text-gray-800 tracking-tight">{detailData.summary.not_started}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Not Started</span>
          </div>
        </section>

        {/* ✨ 担当タスク一覧セクション */}
        <section>
          <h3 className="text-lg font-black text-gray-900 mb-4 px-2">担当中のタスク</h3>
          <div className="space-y-4">
            {detailData.tasks.length > 0 ? (
              detailData.tasks.map(task => (
                <div 
                  key={task.task_id} 
                  onClick={() => navigate(`/project/${communityId}/task/${task.task_id}`)}
                  className="group bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 transition-all cursor-pointer flex flex-col gap-4 relative overflow-hidden"
                >
                  {/* 装飾用ライン（進捗が100%なら緑、それ以外は青） */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${task.personal_progress === 100 ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>

                  <div className="flex justify-between items-start pl-2">
                    <div className="flex-1 pr-4">
                      <h4 className="font-extrabold text-lg text-gray-800 line-clamp-1">{task.name}</h4>
                      
                      {/* メタ情報（優先度と締め切り） */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* 優先度バッジ */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1 ${
                          task.priority === '大' ? 'bg-red-50 text-red-600 border border-red-100' :
                          task.priority === '中' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                          'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          <LuInfo className="w-3 h-3" />
                          優先度: {task.priority}
                        </span>
                        
                        {/* 締め切り表示 */}
                        {task.deadline && (
                          <span className="text-xs font-bold text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                            <LuCalendarDays className="w-3 h-3" />
                            {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ステータスバッジ */}
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                      task.status === '完了' ? 'bg-emerald-100 text-emerald-700' :
                      task.status === '進行中' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  
                  {/* 進捗バー */}
                  <div className="pl-2 pt-2 border-t border-gray-50 mt-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
                      <span>Personal Progress</span>
                      <span className={task.personal_progress === 100 ? 'text-emerald-500' : 'text-blue-600'}>
                        {task.personal_progress}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ${task.personal_progress === 100 ? 'bg-emerald-400' : 'bg-blue-500'}`} 
                        style={{ width: `${task.personal_progress}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
                <LuListTodo className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold">現在担当しているタスクはありません</p>
                <p className="text-xs text-gray-400 mt-2">タスクがアサインされるとここに表示されます</p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
};
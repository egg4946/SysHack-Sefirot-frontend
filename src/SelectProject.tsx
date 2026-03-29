import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPlus, LuLogIn, LuLogOut, LuFolderOpen, LuX, LuUser, LuArrowRight } from 'react-icons/lu';
import { Header } from './Header';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface Community {
  id: string;
  name: string;
  invite_code: string;
  member_count: number;
}

interface UserData {
  user_data: { 
    id: string; 
    display_name: string; 
  };
  user_communities: Community[];
}

const SelectProject: React.FC = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [defaultName, setDefaultName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // モーダル開閉状態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // フォーム入力値
  const [newProjectName, setNewProjectName] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  
  const [inviteCode, setInviteCode] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✨ fetchMyData を useCallback でメモ化して依存関係を明確にする
  const fetchMyData = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await fetch(`${API_BASE}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data: UserData = await res.json();
        setCommunities(data.user_communities);
        setDefaultName(data.user_data.display_name); // アカウントの基本名を保存
      } else {
        localStorage.removeItem('access_token');
        navigate('/login');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  // ✨ プロジェクト作成処理（POST /community/create）
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !createDisplayName.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          name: newProjectName, 
          display_name: createDisplayName // ✨ 独自の表示名を送信！
        })
      });

      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setNewProjectName('');
        navigate(`/project/${data.id}`); // 作成したらそのままプロジェクトへ！
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`作成に失敗しました: ${err.detail || 'エラー'}`);
      }
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✨ プロジェクト参加処理（POST /community/join）
  const handleJoinProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !joinDisplayName.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          invite_code: inviteCode, 
          display_name: joinDisplayName // ✨ 独自の表示名を送信！
        })
      });

      if (res.ok) {
        const data = await res.json();
        setShowJoinModal(false);
        setInviteCode('');
        navigate(`/project/${data.id}`); // 参加したらそのままプロジェクトへ！
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`参加に失敗しました: ${err.detail || '招待コードが間違っています'}`);
      }
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✨ モーダルを開く時に、初期表示名としてアカウント名をセットする
  const openCreateModal = () => {
    setCreateDisplayName(defaultName);
    setShowCreateModal(true);
  };

  const openJoinModal = () => {
    setJoinDisplayName(defaultName);
    setShowJoinModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50 text-blue-600 font-black animate-pulse">LOADING...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      
      {/* 共通ヘッダー */}
      <Header 
        title="プロジェクト選択" 
        menuItems={[
          { label: 'ログアウト', icon: <LuLogOut />, isDanger: true, onClick: handleLogout }
        ]}
      />

      <main className="flex-1 p-6 sm:p-10 max-w-5xl mx-auto w-full space-y-10 pb-24">
        
        {/* 上部アクションボタン */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={openCreateModal}
            className="flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <LuPlus className="w-6 h-6" /> 新規プロジェクト作成
          </button>
          <button 
            onClick={openJoinModal}
            className="flex items-center justify-center gap-3 py-5 bg-white text-blue-600 border-2 border-blue-100 rounded-3xl font-black text-lg shadow-md hover:bg-blue-50 active:scale-95 transition-all"
          >
            <LuLogIn className="w-6 h-6" /> 招待コードで参加
          </button>
        </div>

        {/* 参加中のプロジェクト一覧 */}
        <section>
          <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
            <LuFolderOpen className="text-blue-500" /> 参加中のプロジェクト
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.length > 0 ? (
              communities.map(community => (
                <div 
                  key={community.id} 
                  onClick={() => navigate(`/project/${community.id}`)}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-extrabold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {community.name}
                    </h3>
                    <p className="text-sm font-bold text-gray-400 flex items-center gap-1">
                      <LuUser className="w-4 h-4" /> メンバー: {community.member_count}人
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <LuArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                <LuFolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold">まだ参加しているプロジェクトはありません</p>
                <p className="text-xs text-gray-400 mt-2">上のボタンからプロジェクトを作成するか、招待コードを入力して参加しましょう</p>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* =========================================
          ✨ プロジェクト作成モーダル
          ========================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-800">新規プロジェクト</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><LuX /></button>
            </div>
            <form onSubmit={handleCreateProject} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">プロジェクト名 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="例：〇〇ハッカソン開発チーム"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">このプロジェクトでのあなたの表示名 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={createDisplayName}
                  onChange={e => setCreateDisplayName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-2 font-bold">※プロジェクトごとに異なる名前（ハンドルネーム等）を設定できます</p>
              </div>
              <button 
                type="submit" 
                disabled={!newProjectName.trim() || !createDisplayName.trim() || isSubmitting}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition shadow-lg shadow-blue-500/30"
              >
                {isSubmitting ? '作成中...' : 'プロジェクトを作成して入室'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          ✨ プロジェクト参加モーダル
          ========================================= */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-800">招待コードで参加</h3>
              <button onClick={() => setShowJoinModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><LuX /></button>
            </div>
            <form onSubmit={handleJoinProject} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">招待コード (6桁) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="例：A1B2C3"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-bold text-lg tracking-widest uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">このプロジェクトでのあなたの表示名 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={joinDisplayName}
                  onChange={e => setJoinDisplayName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-2 font-bold">※プロジェクトごとに異なる名前（ハンドルネーム等）を設定できます</p>
              </div>
              <button 
                type="submit" 
                disabled={!inviteCode.trim() || !joinDisplayName.trim() || isSubmitting}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition shadow-lg shadow-blue-500/30"
              >
                {isSubmitting ? '参加中...' : 'プロジェクトに参加して入室'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SelectProject;
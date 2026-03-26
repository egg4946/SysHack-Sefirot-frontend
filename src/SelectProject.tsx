import React, { useState, useEffect } from 'react';

// 環境変数の取得
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const DEFAULT_DISPLAY_NAME = import.meta.env.VITE_DEFAULT_DISPLAY_NAME || "Sefirot User";

type Community = {
  id: string;
  name: string;
  invite_code: string;
  member_count: number;
  created_at: string;
};

const SelectProject: React.FC = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 認証ヘッダーの取得
  const getAuthHeader = () => {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // プロジェクト（コミュニティ）一覧取得
  const fetchMyData = async () => {
    try {
      setError(null);
      // OpenAPI: GET /me
      const response = await fetch(`${API_BASE}/me`, {
        headers: getAuthHeader()
      });
      
      if (!response.ok) {
        if (response.status === 401) throw new Error('認証が期限切れです。再ログインしてください。');
        throw new Error(`サーバーエラー (${response.status})`);
      }
      
      const data = await response.json();
      // MeResponse schema に基づき user_communities をセット
      setCommunities(data.user_communities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    }
  };

  useEffect(() => {
    void fetchMyData();
  }, []);

  // 新規作成: POST /community/create
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/community/create`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ 
          name: newProjectName,
          display_name: DEFAULT_DISPLAY_NAME 
        }),
      });

      if (!response.ok) throw new Error('プロジェクトの作成に失敗しました');

      await fetchMyData();
      setShowModal(false);
      setNewProjectName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '作成エラー');
    }
  };

  // 招待コードで参加: POST /community/join
  const handleJoinProject = async () => {
    if (!inviteCode.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/community/join`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ 
          invite_code: inviteCode,
          display_name: DEFAULT_DISPLAY_NAME 
        }),
      });

      if (!response.ok) throw new Error('参加に失敗しました。コードが正しいか確認してください。');

      await fetchMyData();
      setInviteCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加エラー');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Sefirot
            </h1>
            <p className="text-gray-400 mt-2">User: {DEFAULT_DISPLAY_NAME}</p>
          </div>
          <button 
            className="bg-gray-800 px-5 py-2 rounded-full border border-gray-700 hover:bg-gray-700 transition"
            onClick={() => void fetchMyData()}
          >
            再読み込み
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* 招待コード入力セクション */}
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 mb-12 flex items-center gap-4">
          <input
            type="text"
            placeholder="招待コードを入力"
            className="bg-gray-900 border border-gray-600 px-4 py-3 rounded-xl flex-grow focus:ring-2 focus:ring-blue-500 outline-none"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <button
            className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-900/20"
            onClick={handleJoinProject}
          >
            参加する
          </button>
        </div>

        {/* カードグリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <button
            className="h-56 border-2 border-dashed border-gray-600 rounded-3xl flex flex-col items-center justify-center hover:bg-gray-800/50 hover:border-blue-500 transition-all group"
            onClick={() => setShowModal(true)}
          >
            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-2xl group-hover:bg-blue-600 transition-colors">
              ＋
            </div>
            <span className="mt-4 font-bold text-gray-400 group-hover:text-white">新規作成</span>
          </button>

          {communities.map((c) => (
            <div key={c.id} className="h-56 bg-gray-800 border border-gray-700 rounded-3xl p-8 flex flex-col justify-between hover:border-blue-500/50 transition-colors cursor-pointer group">
              <div>
                <h3 className="text-2xl font-bold group-hover:text-blue-400 transition-colors truncate">{c.name}</h3>
                <p className="text-gray-500 text-xs mt-2 font-mono uppercase tracking-tighter">Invite Code: {c.invite_code}</p>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>メンバー: {c.member_count}名</span>
                <span className="bg-gray-700 px-3 py-1 rounded-full text-[10px]">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 作成モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-gray-100 text-gray-900 p-8 rounded-3xl w-full max-w-md">
            <h2 className="text-3xl font-black mb-2">New Project</h2>
            <p className="text-gray-500 text-sm mb-6">プロジェクト名を入力してください</p>
            <input
              type="text"
              className="w-full border-2 border-gray-200 px-4 py-3 rounded-2xl mb-6 focus:border-blue-500 outline-none font-bold"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-4">
              <button className="flex-1 py-4 font-bold text-gray-400 hover:bg-gray-200 rounded-2xl transition" onClick={() => setShowModal(false)}>
                やめる
              </button>
              <button 
                className="flex-1 py-4 font-bold bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-gray-300 transition" 
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                作成する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectProject;
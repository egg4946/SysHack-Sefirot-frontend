
import React, { useState } from 'react';

type Project = {
  id: string;
  name: string;
  createdAt: string;
  members: number;
};

// 6桁英数字ID生成
const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

const dummyProjects: Project[] = [
  { id: 'ABC123', name: '開発チームA', createdAt: '2026-03-20', members: 5 },
  { id: 'XYZ789', name: 'デザイン班', createdAt: '2026-03-21', members: 3 },
];

const Home: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(dummyProjects);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [joinError, setJoinError] = useState('');

  // プロジェクト作成
  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newId = generateRoomId();
    setProjects([
      ...projects,
      {
        id: newId,
        name: newProjectName,
        createdAt: new Date().toISOString().slice(0, 10),
        members: 1,
      },
    ]);
    setShowModal(false);
    setNewProjectName('');
    alert(`プロジェクトを作成しました！\nルームID: ${newId}`);
  };

  // ルームIDで参加
  const handleJoinProject = () => {
    if (!joinId.match(/^[A-Z0-9]{6}$/)) {
      setJoinError('6桁の英数字IDを入力してください');
      return;
    }
    const found = projects.find((p) => p.id === joinId);
    if (found) {
      alert(`プロジェクト「${found.name}」に参加しました！（仮）`);
      setJoinError('');
    } else {
      setJoinError('該当するプロジェクトが見つかりません');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">プロジェクト選択</h1>
        <button className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600">設定</button>
      </div>

      {/* ルームIDで参加 */}
      <div className="mb-8 flex items-center gap-2">
        <input
          type="text"
          placeholder="ルームIDで参加 (例: ABC123)"
          className="px-3 py-2 rounded text-black"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value.toUpperCase())}
          maxLength={6}
        />
        <button
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleJoinProject}
        >
          参加
        </button>
        {joinError && <span className="ml-4 text-red-400">{joinError}</span>}
      </div>

      {/* プロジェクトカード一覧 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {/* 新規作成カード */}
        <div
          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-500 rounded-lg h-48 cursor-pointer hover:bg-gray-800"
          onClick={() => setShowModal(true)}
        >
          <span className="text-5xl mb-2">＋</span>
          <span className="font-bold">新規プロジェクト作成</span>
        </div>
        {/* 既存プロジェクトカード */}
        {projects.map((p) => (
          <div key={p.id} className="bg-gray-800 rounded-lg p-6 shadow-md flex flex-col justify-between h-48">
            <div>
              <div className="text-lg font-bold mb-2">{p.name}</div>
              <div className="text-sm text-gray-300 mb-1">作成日: {p.createdAt}</div>
              <div className="text-sm text-gray-300">参加人数: {p.members}人</div>
            </div>
            <div className="mt-4 text-xs text-gray-400">ルームID: {p.id}</div>
          </div>
        ))}
      </div>

      {/* プロジェクト作成モーダル */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white text-black rounded-lg p-8 w-80">
            <h2 className="text-xl font-bold mb-4">新規プロジェクト作成</h2>
            <input
              type="text"
              placeholder="プロジェクト名"
              className="w-full px-3 py-2 mb-4 border rounded"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              maxLength={30}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick={() => setShowModal(false)}
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

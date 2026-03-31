import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPlus, LuLogIn, LuLogOut, LuFolderOpen, LuUser, LuArrowRight } from 'react-icons/lu';
import { Header } from './Header';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface Community { id: string; name: string; invite_code: string; member_count: number; }
interface UserData { user_data: { id: string; display_name: string; }; user_communities: Community[]; }

export const SelectProject: React.FC = () => { // ✨ default export から名前付き export に変更（推奨）
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [defaultName, setDefaultName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMyData = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) { navigate('/login'); return; }
      const res = await fetch(`${API_BASE}/me`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data: UserData = await res.json();
        setCommunities(data.user_communities);
        setDefaultName(data.user_data.display_name);
      } else { navigate('/login'); }
    } catch { /* エラー処理 */ }
    finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { fetchMyData(); }, [fetchMyData]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newProjectName, display_name: createDisplayName })
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/project/${data.id}`);
      } else { toast.error("作成失敗"); }
    } catch { toast.error("エラー"); }
    finally { setIsSubmitting(false); }
  };

  const handleJoinProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/community/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ invite_code: inviteCode, display_name: joinDisplayName })
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/project/${data.id}`);
      } else { toast.error("参加失敗"); }
    } catch { toast.error("エラー"); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 animate-pulse font-black text-blue-600">LOADING...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="プロジェクトを選択" menuItems={[{ label: 'ログアウト', icon: <LuLogOut />, isDanger: true, onClick: () => { localStorage.removeItem('access_token'); navigate('/login'); } }]} />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <button onClick={() => { setCreateDisplayName(defaultName); setShowCreateModal(true); }} className="p-6 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-3"><LuPlus /> 新規作成</button>
          <button onClick={() => { setJoinDisplayName(defaultName); setShowJoinModal(true); }} className="p-6 bg-white text-blue-600 border-2 border-blue-100 rounded-3xl font-black text-lg hover:bg-blue-50 transition flex items-center justify-center gap-3"><LuLogIn /> コードで参加</button>
        </div>
        <section>
          <h2 className="text-xl font-black mb-6 flex items-center gap-2"><LuFolderOpen /> 参加中のプロジェクト</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {communities.map(c => (
              <div key={c.id} onClick={() => navigate(`/project/${c.id}`)} className="bg-white p-6 rounded-3xl border hover:shadow-xl transition cursor-pointer group">
                <h3 className="text-lg font-black mb-2 group-hover:text-blue-600">{c.name}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1"><LuUser /> {c.member_count} メンバー</p>
                <div className="flex justify-end mt-4"><LuArrowRight className="text-gray-300 group-hover:text-blue-500" /></div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8">
            <h3 className="text-xl font-black mb-4">プロジェクト作成</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="プロジェクト名" className="w-full border p-3 rounded-xl font-bold" required />
              <input value={createDisplayName} onChange={e => setCreateDisplayName(e.target.value)} placeholder="表示名" className="w-full border p-3 rounded-xl font-bold" required />
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold">{isSubmitting ? '作成中...' : '作成する'}</button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="w-full py-2 text-gray-500 font-bold">キャンセル</button>
            </form>
          </div>
        </div>
      )}
      
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8">
            <h3 className="text-xl font-black mb-4">プロジェクト参加</h3>
            <form onSubmit={handleJoinProject} className="space-y-4">
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="招待コード" className="w-full border p-3 rounded-xl font-bold" required />
              <input value={joinDisplayName} onChange={e => setJoinDisplayName(e.target.value)} placeholder="表示名" className="w-full border p-3 rounded-xl font-bold" required />
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold">{isSubmitting ? '参加中...' : '参加する'}</button>
              <button type="button" onClick={() => setShowJoinModal(false)} className="w-full py-2 text-gray-500 font-bold">キャンセル</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectProject; // ✨ App.tsx との互換性のため残す
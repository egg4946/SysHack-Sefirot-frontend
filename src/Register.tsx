import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('パスワードが一致しません');
      return;
    }
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL;

      const res = await fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || '登録に失敗しました');
        setLoading(false);
        return;
      }
      navigate('/login');
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-200">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-blue-700 tracking-wide drop-shadow">新規登録</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="text-red-600 text-center font-semibold mb-2">{error}</div>}
          <div>
            <label className="block text-gray-700 font-semibold mb-1" htmlFor="displayName">ユーザー名</label>
            <input
              id="displayName"
              type="text"
              placeholder="例: 田中 太郎"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1" htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1" htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1" htmlFor="confirm">パスワード(確認)</label>
            <input
              id="confirm"
              type="password"
              placeholder="もう一度パスワード"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-green-400 text-white py-3 rounded-lg font-bold text-lg shadow hover:from-blue-600 hover:to-green-500 transition mb-2 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? '登録中...' : '登録'}
          </button>
        </form>
        <button
          onClick={() => navigate('/login')}
          className="w-full text-blue-600 hover:underline text-sm mt-4"
        >
          ログイン画面に戻る
        </button>
      </div>
    </div>
  );
};

export default Register;
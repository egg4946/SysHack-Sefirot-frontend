import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 環境変数からベースを取得し、authパスを生成
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      
      // api.yamlの仕様に基づき、/api/v1/auth/signin を呼び出す
      const res = await fetch(`${apiBase}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'ログインに失敗しました');
        return;
      }

      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
      } else {
        throw new Error('トークンがレスポンスに含まれていません');
      }

      navigate('/select-project');
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#586d87' }}>
      <div className="p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-300" style={{ backgroundColor: '#bfc6d5' }}>
        <h2 className="text-3xl font-extrabold mb-8 text-center text-white tracking-wide drop-shadow">ログイン</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="text-red-400 text-center font-semibold mb-2">{error}</div>}
          <div>
            <label className="block text-white font-semibold mb-1" htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-400 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white transition"
              style={{ backgroundColor: '#e8ecf0' }}
              required
            />
          </div>
          <div>
            <label className="block text-white font-semibold mb-1" htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-400 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white transition"
              style={{ backgroundColor: '#e8ecf0' }}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all mb-2 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        <button
          onClick={() => navigate('/register')}
          className="w-full text-white hover:underline text-sm mt-4"
        >
          新規登録はこちら
        </button>
      </div>
    </div>
  );
};

export default Login;          
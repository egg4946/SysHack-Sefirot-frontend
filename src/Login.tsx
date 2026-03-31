import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✨ ログイン通信のロジックを独立させて、通常・ゲスト両方から呼べるようにする
  const performLogin = async (loginEmail: string, loginPassword: string) => {
    setError(null);
    setLoading(true);
    try {
      // 環境変数からベースを取得し、authパスを生成
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      
      // api.yamlの仕様に基づき、/api/v1/auth/signin を呼び出す
      const res = await fetch(`${apiBase}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
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

      toast.success("ログインしました！");
      navigate('/select-project');
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました');
      toast.error("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // 通常の「ログイン」ボタンを押した時の処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  // ✨ 「ゲストとしてログイン」ボタンを押した時の処理
  const handleGuestLogin = async () => {
    // ⚠️ 注意：展示前に一度「新規登録」からこのアカウントを作っておく必要があります！
    await performLogin('guest@example.com', 'guest1234');
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
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all mb-2 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* ✨ 展示用ゲストログイン機能 */}
        <div className="mt-6 pt-6 border-t border-gray-400/30 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/30 hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            👀 展示用ゲストとして体験する
          </button>
          <p className="text-xs text-white/70 text-center font-semibold">
            ※面倒な入力なしですぐに触れます
          </p>
        </div>

        <button
          onClick={() => navigate('/register')}
          className="w-full text-white hover:underline text-sm mt-6 font-semibold"
        >
          新規登録はこちら
        </button>
      </div>
    </div>
  );
};

export default Login;
import React from 'react';

interface HomeProps {
  onLogout: () => void;
}

const Home: React.FC<HomeProps> = ({ onLogout }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">仮ホーム画面</h2>
        <p className="mb-6 text-center">ログインに成功しました！</p>
        <button
          onClick={onLogout}
          className="w-full bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
};

export default Home;

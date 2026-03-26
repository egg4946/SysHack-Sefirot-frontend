// src/ProjectMain.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat'; // 先ほど作った完全版Chatコンポーネント

export const ProjectMain: React.FC = () => { // 👈 Propsを使わずに空っぽにする
  const { id: communityId } = useParams<{ id: string }>(); // ✨ URLからIDを自動取得！
  const navigate = useNavigate(); // ✨ 画面遷移用のツール

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // 画面が開いた時に、自分のユーザーIDを取得する（チャットの右・左を分けるため）
  useEffect(() => {
    const fetchMyInfo = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        // /me APIを叩いて自分の情報を取得
        const res = await fetch('http://localhost:8000/api/v1/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          // バックエンドの /me は { user_data: {...}, user_communities: [...] } を返す仕様
          setCurrentUserId(data.user_data.id);
        }
      } catch (error) {
        console.error('ユーザー情報の取得に失敗しました', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyInfo();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center">読み込み中...</div>;
  }

 return (
    <div className="flex flex-col h-screen bg-white">
      {/* ヘッダー部分 */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          {/* ✨ 戻るボタンの処理をルーターの navigate に変更 */}
          <button onClick={() => navigate('/select-project')} className="text-gray-600 hover:text-gray-900 font-medium">
            ← プロジェクト一覧へ戻る
          </button>
          <h1 className="text-xl font-bold">プロジェクト メイン画面</h1>
        </div>
        <button className="p-2 border rounded hover:bg-gray-100">三</button>
      </header>

      {/* メインコンテンツ（左側にタスク、右側にチャット） */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 左側：タスク一覧エリア */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-100">
          {/* ...（省略）... */}
        </div>

        {/* 右側：チャットエリア */}
        <div className="w-[400px] border-l bg-white p-4 flex flex-col">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">💬 全体チャット</h2>
          <div className="flex-1 overflow-hidden">
            {/* ✨ communityId が無い（URLがおかしい）時のエラー防止も追加 */}
            {currentUserId && communityId ? (
              <Chat communityId={communityId} currentUserId={currentUserId} />
            ) : (
              <div className="text-red-500 text-sm">読み込み中、またはIDが不正です</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
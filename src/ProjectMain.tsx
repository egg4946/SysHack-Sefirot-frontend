// src/ProjectMain.tsx (レスポンシブ・アイコン拡大版)
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chat } from './Chat'; // 次に作るLINE風Chatコンポーネント
import { LuX, LuMessageSquare, LuBackpack } from "react-icons/lu";

// 最新1件のメッセージを取得するための型定義
interface LatestMessageResponse {
  id: string;
}

// ユーザーコミュニティデータの型定義
interface UserCommunity {
  id: string;
  name: string;
}

// ユーザー情報の型定義
interface UserData {
  user_data: {
    id: string;
  };
  user_communities: UserCommunity[];
}

export const ProjectMain: React.FC = () => {
  const { id: communityId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // UI管理用のステート
  const [isChatOpen, setIsChatOpen] = useState(false); // チャット画面が開いているか
  const [hasUnread, setHasUnread] = useState(false);   // 未読通知があるか（赤い点）
  const lastMessageIdRef = useRef<string | null>(null); // 最後に見たメッセージIDを記憶

  // プロジェクト名を保持する（ヘッダーに表示）
  const [projectName, setProjectName] = useState<string>('');

  // 1. ユーザー情報とプロジェクト情報を取得 (初回のみ)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        // ①自分の情報を取得
        const meRes = await fetch('http://localhost:8000/api/v1/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meRes.ok) {
          const meData: UserData = await meRes.json();
          setCurrentUserId(meData.user_data.id);
          
          // ②所属コミュニティの中から今のプロジェクトを探して名前をセット
          const myCommunity = meData.user_communities.find((c: UserCommunity) => c.id === communityId);
          if (myCommunity) {
            setProjectName(myCommunity.name);
          }
        }
      } catch (error) {
        console.error('データの取得に失敗しました', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [communityId]);

  // 2. バックグラウンドポーリング：最新メッセージを監視して通知バッジを点灯させる (そのまま)
  useEffect(() => {
    if (!communityId) return;

    // 初回に最新メッセージIDを取得して記憶
    const token = localStorage.getItem('access_token');
    if (!token) return;
    fetch(`http://localhost:8000/api/v1/chat/messages?community_id=${communityId}&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => { if(data.length > 0) lastMessageIdRef.current = data[0].id; })
    .catch(error => console.error(error));

    // 3秒ごとに最新1件をチェックする監視ポーリングを開始！
    const intervalId = setInterval(async () => {
      // チャットが開いている時は通知する必要がないのでスキップ
      if (!communityId || isChatOpen) return; 

      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/api/v1/chat/messages?community_id=${communityId}&limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data: LatestMessageResponse[] = await res.json();
          if (data.length > 0) {
            const latestMessageId = data[0].id;
            if (lastMessageIdRef.current && latestMessageId !== lastMessageIdRef.current) {
              setHasUnread(true);
              lastMessageIdRef.current = latestMessageId; // 最新を記憶
            } else if (!lastMessageIdRef.current) {
              lastMessageIdRef.current = latestMessageId; // 初回
            }
          }
        }
      } catch (error) { console.error(error); }
    }, 3000);

    return () => clearInterval(intervalId); // コンポーネントが消える時にタイマーを止める
  }, [communityId, isChatOpen]); // isChatOpenが変わった時に監視を再開


  // 3. チャットアイコンをクリックした時の処理
  const handleToggleChat = useCallback(() => {
    setIsChatOpen(prev => {
      const newState = !prev;
      if (newState === true) {
        setHasUnread(false); // チャットを開いた瞬間に未読バッジを消す
      }
      return newState;
    });
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="relative flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      {/*ヘッダー */}
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm z-30">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/select-project')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition duration-150">
            <LuBackpack className="w-5 h-5" />
            プロジェクト一覧
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <h1 className="text-xl font-bold tracking-tight text-gray-950">
            {projectName || 'プロジェクト メイン画面'}
          </h1>
        </div>
        <button className="w-10 h-10 border rounded-lg hover:bg-gray-100 flex items-center justify-center transition duration-150">
          <span className="text-xl">三</span>
        </button>
      </header>

      {/* メインコンテンツ（左側にタスク） */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {/* ...（タスク一覧の部分はそのまま）... */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border h-full">
            <h2 className="text-2xl font-black mb-6 text-gray-950">タスクツリー (準備中)</h2>
            <p className="text-gray-600 leading-relaxed mb-4">ここにタスクのツリー表示などを実装します。</p>
            <div className="h-40 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
              タスクデータが入ります
            </div>
        </div>
      </div>

      {/* ✨ 右下のフローティングチャットエリア ✨ */}
      
      {/* ① チャット画面コンテナ (✨レスポンス対応✨) */}
      <div className={`fixed z-50 transition-all duration-300 transform ${
        // スマホ(デフォルト): 全画面、角丸なし、下からスッと出るアニメーション
        'inset-0 w-full h-full rounded-none origin-bottom' +
        // PC(sm以上): 右下固定、角丸あり、右下から拡大するアニメーション
        ' sm:inset-auto sm:bottom-28 sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-gray-300 sm:origin-bottom-right '
      } ${
        isChatOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 pointer-events-none'
      }`}>
        {currentUserId && communityId && isChatOpen && (
          // LINE風Chatコンポーネントを呼び出す。onClose プロパティを渡す
          <Chat communityId={communityId} currentUserId={currentUserId} onClose={handleToggleChat} />
        )}
      </div>

      {/* ② 丸いフローティングアイコンコンテナ (✨右下に完全固定・拡大版✨) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={handleToggleChat}
          // ✨ サイズを w-16 -> w-20 に拡大 (80px)
          className={`relative flex items-center justify-center w-20 h-20 rounded-full shadow-2xl border transition-all duration-200 active:scale-95 ${
            isChatOpen ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/40'
          }`}
        >
          {isChatOpen ? (
            <LuX className="w-10 h-10" /> // 開いている時は×アイコン
          ) : (
            <>
              <LuMessageSquare className="w-10 h-10" /> {/* 閉じている時は吹き出し */}
              {/* ✨ 通知バッジ（少し位置を内側に調整） */}
              {hasUnread && (
                <span className="absolute top-1 right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border border-white shadow-md"></span>
                </span>
              )}
            </>
          )}
        </button>
      </div>

    </div>
  );
};
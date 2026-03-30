import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LuNetwork, LuMessageSquare, LuMousePointerClick, LuArrowRight } from "react-icons/lu";

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden relative">
      
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="text-3xl font-black text-blue-600 tracking-tighter flex items-center gap-2">
          <LuNetwork className="w-8 h-8" />
          進捗の樹
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32 text-center flex flex-col items-center">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-black tracking-widest mb-8 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          HACKATHON 2026 - TEAM SEFIROT
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-gray-900 leading-[1.1] mb-8 max-w-4xl">
          チームの進捗を<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-400">
            ひとつの樹
          </span>
          で繋ごう
        </h1>
        
        <p className="text-lg sm:text-xl text-gray-500 font-medium mb-12 max-w-2xl leading-relaxed">
          「進捗の樹」は、親タスクと子タスクの進捗が自動で連動する、次世代のタスク管理ツールです。誰がどこまで終わらせたか、リアルタイムで可視化します。
        </p>

        {/* ✨ 飛び先を /login に変更しました！ */}
        <button 
          onClick={() => navigate('/login')}
          className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 text-lg font-black text-white bg-blue-600 rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <span>プロジェクトを作成する</span>
          <LuArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-32 w-full text-left">
          
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <LuNetwork className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black mb-3">階層型のタスク管理</h3>
            <p className="text-gray-500 text-sm leading-relaxed font-medium">親タスクの中に子タスクを作成。メンバーの進捗が自動的に集計され、プロジェクト全体の進行度がひと目でわかります。</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <LuMousePointerClick className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black mb-3">直感的な進捗入力</h3>
            <p className="text-gray-500 text-sm leading-relaxed font-medium">スライダーを動かすだけで、シームレスに進捗を報告。100%になると自動的にCOMPLETEバッジが付与されます。</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 hover:-translate-y-2 transition-transform duration-300">
            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
              <LuMessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black mb-3">リアルタイムチャット</h3>
            <p className="text-gray-500 text-sm leading-relaxed font-medium">タスク画面からワンタップでチャットを開き、メンバーといつでも相談可能。WebSocketによる高速通信を実現しています。</p>
          </div>

        </div>
      </main>

      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-400/20 blur-[120px] pointer-events-none" />
    </div>
  );
};
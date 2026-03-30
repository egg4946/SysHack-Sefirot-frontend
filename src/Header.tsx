import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ✨ 追加
import { LuMenu, LuX, LuChevronLeft } from 'react-icons/lu';
import logo from './assets/logo.png'; // ✨ ロゴ画像をインポート

// メニュー項目の型定義
export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  isDanger?: boolean;
}

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  menuItems?: MenuItem[];
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  showBackButton = false, 
  onBack, 
  menuItems = [] 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate(); // ✨ 追加

  // メニューの外側をタップした時に自動で閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-40 h-14">
      
      {/* 1. 左エリア：戻るボタン or ロゴ画像 */}
      <div className="flex items-center justify-start min-w-[3rem]">
        {showBackButton ? (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition active:scale-95"
          >
            <LuChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          /* ✨ Sefirotの文字をロゴ画像と「進捗の樹」に変更 */
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition active:scale-95"
            onClick={() => navigate('/select-project')}
          >
            <img src={logo} alt="ロゴ" className="w-8 h-8 object-contain" />
            <span className="font-black text-lg tracking-tighter text-blue-600 hidden sm:block">
              進捗の樹
            </span>
          </div>
        )}
      </div>

      {/* 2. 中央エリア：タイトル */}
      <div className="flex-1 text-center truncate px-2">
        <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
          {title}
        </h1>
      </div>

      {/* 3. 右エリア：ハンバーガーメニュー */}
      <div className="w-12 flex items-center justify-end" ref={menuRef}>
        {menuItems.length > 0 && (
          <>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg transition active:scale-95"
            >
              {isMenuOpen ? <LuX className="w-6 h-6" /> : <LuMenu className="w-6 h-6" />}
            </button>

            {/* ドロップダウンメニュー本体 */}
            {isMenuOpen && (
              <div className="absolute right-4 top-14 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl py-2 origin-top-right animate-fade-in">
                {menuItems.map((item, index) => (
                  <button 
                    key={index}
                    onClick={() => {
                      setIsMenuOpen(false);
                      item.onClick();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-gray-50 ${
                      item.isDanger ? 'text-red-600 hover:text-red-700' : 'text-gray-700'
                    }`}
                  >
                    {item.icon && <span className={item.isDanger ? 'text-red-500' : 'text-gray-500'}>{item.icon}</span>}
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
};
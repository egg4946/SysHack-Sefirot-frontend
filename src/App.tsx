import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import SelectProject from './SelectProject';
import { ProjectMain } from './ProjectMain'; // ✨ 先ほど作った画面をインポート

const App: React.FC = () => {
  // プロジェクト画面に戻る処理

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/select-project" element={<SelectProject />} />
        
        {/* ✨ ここを追加！ :id の部分に選んだプロジェクトのIDが入ります */}
        <Route path="/project/:id" element={<ProjectMain />} />
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
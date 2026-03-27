import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import SelectProject from './SelectProject';
import { ProjectMain } from './ProjectMain'; 
import { TaskDetail } from './TaskDetail'; // 1. インポートを追加

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/select-project" element={<SelectProject />} />
        
        {/* プロジェクトメイン画面 */}
        <Route path="/project/:id" element={<ProjectMain />} />
        
        {/* 2. タスク詳細画面を追加 (taskIdをパラメータとして受け取る) */}
        <Route path="/project/:communityId/task/:taskId" element={<TaskDetail />} />
        
        {/* 未定義のパスはログインへリダイレクト */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 👇 エラーが出ていた3つは { } を外しました！（デフォルトインポート）
import Login from './Login';
import Register from './Register';
import SelectProject from './SelectProject';

// 👇 エラーが出ていないものは { } をつけたままです！（名前付きインポート）
import { ProjectMain } from './ProjectMain';
import { TaskDetail } from './TaskDetail';
import { MemberDetail } from './MemberDetail';
import { Home } from './Home';

function App() {
  return (
    <Router>
      <Routes>
        {/* 一番最初の画面をHome（ランディングページ）にする */}
        <Route path="/" element={<Home />} />
        
        {/* 既存の各画面へのルート */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/select-project" element={<SelectProject />} />
        <Route path="/project/:id" element={<ProjectMain />} />
        <Route path="/project/:communityId/task/:taskId" element={<TaskDetail />} />
        <Route path="/project/:communityId/member/:userId" element={<MemberDetail />} />
        
        {/* 存在しないURLにアクセスされたら、安全のためにHomeへ戻す */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
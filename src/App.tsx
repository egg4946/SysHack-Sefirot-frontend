import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // ✨ トースト用のコンポーネントをインポート

import Login from './Login';
import Register from './Register';
import SelectProject from './SelectProject';

import { ProjectMain } from './ProjectMain';
import { TaskDetail } from './TaskDetail';
import { MemberDetail } from './MemberDetail';
import { Home } from './Home';

function App() {
  return (
    <>
      {/* ✨ これを置くだけで、アプリのどこからでも美しい通知が出せるようになります！ */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 3000, // 3秒で消える
          style: {
            background: '#333',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '16px',
          },
          success: {
            style: { background: '#10b981' }, // 成功時はエメラルドグリーン
          },
          error: {
            style: { background: '#ef4444' }, // エラー時は赤
          },
        }} 
      />

      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/select-project" element={<SelectProject />} />
          <Route path="/project/:id" element={<ProjectMain />} />
          <Route path="/project/:communityId/task/:taskId" element={<TaskDetail />} />
          <Route path="/project/:communityId/member/:userId" element={<MemberDetail />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
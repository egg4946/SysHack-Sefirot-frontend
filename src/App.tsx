import React, { useState } from 'react';
import './App.css';
import Login from './Login';
import Register from './Register';
import SelectProject from './SelectProject';

type Page = 'login' | 'register' | 'selectProject';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('login');

  const handleLogin = () => setPage('selectProject');
  //const handleLogout = () => setPage('login');
  const handleRegisterClick = () => setPage('register');
  const handleRegister = () => setPage('login');
  const handleBackToLogin = () => setPage('login');

  if (page === 'login') {
    return <Login onLogin={handleLogin} onRegisterClick={handleRegisterClick} />;
  }
  if (page === 'register') {
    return <Register onRegister={handleRegister} onBackToLogin={handleBackToLogin} />;
  }
  if (page === 'selectProject') {
    return <SelectProject />;
  }
  return null;
};

export default App;
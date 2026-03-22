import React, { useState } from 'react';
import './App.css';
import Login from './Login';
import Register from './Register';
import Home from './Home';

type Page = 'login' | 'register' | 'home';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('login');

  const handleLogin = () => setPage('home');
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
  if (page === 'home') {
    return <Home />;
  }
  return null;
};

export default App;
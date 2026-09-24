import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { VotePage } from './pages/VotePage';
import { ResultPage } from './pages/ResultPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/participantes" element={<ParticipantsPage />} />
            <Route path="/votar" element={<VotePage />} />
            <Route path="/resultado" element={<ResultPage />} />
          </Route>
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin/painel" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" toastOptions={{ className: 'toast' }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

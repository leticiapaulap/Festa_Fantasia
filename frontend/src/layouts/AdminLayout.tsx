import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminHeader } from '../components/AdminHeader';
import { useAuth } from '../contexts/AuthContext';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/admin" replace />;
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <AdminHeader />
        {children}
      </div>
    </div>
  );
}

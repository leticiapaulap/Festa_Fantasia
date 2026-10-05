import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { HalloweenDecor } from '../components/HalloweenDecor';
import { useAuth } from '../contexts/AuthContext';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/admin" replace />;
  return (
    <div className="relative min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <HalloweenDecor />
      <div className="pointer-events-none fixed inset-0 z-0 bg-night/25 backdrop-blur-[1px]" />
      <div className="relative z-10 mx-auto w-full max-w-[1320px]">
        {children}
      </div>
    </div>
  );
}

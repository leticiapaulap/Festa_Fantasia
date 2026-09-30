import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { api, apiMessage, isApiConfigured } from '../services/api';
import type { BootstrapStatus } from '../types/api';

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
  authorizationCode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function AdminLoginPage() {
  const { token, login, bootstrap } = useAuth();
  const location = useLocation();
  const [creating, setCreating] = useState(location.pathname === '/admin/register');
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isApiConfigured) {
      setBootstrapAvailable(true);
      return;
    }
    api.get<BootstrapStatus>('/admin/bootstrap/status')
      .then(({ data }) => setBootstrapAvailable(data.available))
      .catch(() => setBootstrapAvailable(false));
  }, []);

  if (token) return <Navigate to="/admin/painel" replace />;

  async function onSubmit(values: FormData) {
    try {
      if (creating) {
        await bootstrap(values.name || 'Administrador', values.email, values.password, values.authorizationCode || '');
      } else {
        await login(values.email, values.password);
      }
      navigate('/admin/painel');
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <form className="card w-full max-w-md" onSubmit={handleSubmit(onSubmit)}>
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-white/65 underline-offset-4 hover:text-white hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para o site
        </Link>
        <div className="mb-6 grid gap-2 text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-ember" />
          <h1 className="text-2xl font-black text-white">{creating ? 'Halloween — Criar conta administrativa' : 'Halloween — Painel Administrativo'}</h1>
          <p className="text-sm text-white/60">{creating ? 'Este acesso é restrito à organização.' : 'Entre para controlar votação, códigos e resultado.'}</p>
        </div>
        {creating && (
          <label className="mb-4 grid gap-2 text-sm text-white/78">
            Nome
            <input className="input" {...register('name')} />
          </label>
        )}
        <label className="mb-4 grid gap-2 text-sm text-white/78">
          E-mail
          <input className="input" {...register('email')} />
          {errors.email?.message && <span className="text-orange-200">{errors.email.message}</span>}
        </label>
        <label className="mb-5 grid gap-2 text-sm text-white/78">
          Senha
          <input className="input" type="password" {...register('password')} />
          {errors.password?.message && <span className="text-orange-200">{errors.password.message}</span>}
        </label>
        {creating && (
          <label className="mb-5 grid gap-2 text-sm text-white/78">
            Código de autorização
            <input className="input uppercase" autoComplete="off" {...register('authorizationCode')} />
          </label>
        )}
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? (creating ? 'Criando...' : 'Entrando...') : creating ? 'Criar conta administrativa' : 'Entrar'}
        </button>
        {bootstrapAvailable && (
          creating ? (
            <Link className="btn-secondary mt-3 w-full" to="/admin" onClick={() => setCreating(false)}>Voltar ao login</Link>
          ) : (
            <Link className="btn-secondary mt-3 w-full" to="/admin/register" onClick={() => setCreating(true)}>Criar acesso administrativo</Link>
          )
        )}
      </form>
    </main>
  );
}

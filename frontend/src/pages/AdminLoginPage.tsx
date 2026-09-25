import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { api, apiMessage, isApiConfigured } from '../services/api';
import type { BootstrapStatus } from '../types/api';

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

type FormData = z.infer<typeof schema>;

export function AdminLoginPage() {
  const { token, login, bootstrap } = useAuth();
  const [creating, setCreating] = useState(false);
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
        await bootstrap(values.name || 'Administrador', values.email, values.password);
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
        <div className="mb-6 grid gap-2 text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-ember" />
          <h1 className="text-2xl font-black text-white">Painel Administrativo</h1>
          <p className="text-sm text-white/60">Entre para controlar votação, códigos e resultado.</p>
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
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? (creating ? 'Criando...' : 'Entrando...') : creating ? 'Criar administrador inicial' : 'Entrar'}
        </button>
        {bootstrapAvailable && (
          <button type="button" className="btn-secondary mt-3 w-full" disabled={isSubmitting} onClick={() => setCreating((value) => !value)}>
            {creating ? 'Voltar ao login' : 'Criar administrador inicial'}
          </button>
        )}
      </form>
    </main>
  );
}

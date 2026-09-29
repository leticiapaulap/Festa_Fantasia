import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, CheckCircle2, KeyRound, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { BackHomeLink } from '../components/BackHomeLink';
import { ParticipantCard } from '../components/ParticipantCard';
import { PhotoUpload } from '../components/PhotoUpload';
import { api, apiMessage } from '../services/api';
import type { EventSettings, Participant, RegistrationAccessResponse } from '../types/api';

const schema = z.object({
  name: z.string().min(2, 'Informe seu nome.'),
  costumeName: z.string().min(2, 'Informe o nome da fantasia.'),
  description: z.string().max(600, 'Descrição muito longa.').optional(),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const [created, setCreated] = useState<Participant | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('registrationAccessToken') ?? '');
  const [checkingAccess, setCheckingAccess] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api.get<EventSettings>('/settings').then(({ data }) => setSettings(data)).catch(() => undefined);
  }, []);

  async function unlockRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckingAccess(true);
    try {
      const { data } = await api.post<RegistrationAccessResponse>('/registration/access', { code: accessCode });
      sessionStorage.setItem('registrationAccessToken', data.token);
      setAccessToken(data.token);
      setAccessCode('');
      toast.success('Código confirmado.');
    } catch (error) {
      sessionStorage.removeItem('registrationAccessToken');
      setAccessToken('');
      toast.error(apiMessage(error));
    } finally {
      setCheckingAccess(false);
    }
  }

  async function onSubmit(values: FormData) {
    if (!accessToken) {
      toast.error('Informe o código de acesso antes de cadastrar.');
      return;
    }
    if (!photo) {
      toast.error('Selecione uma imagem para upload.');
      return;
    }
    try {
      const payload = new FormData();
      payload.append('name', values.name);
      payload.append('costumeName', values.costumeName);
      if (values.description) payload.append('description', values.description);
      if (photo) payload.append('photo', photo);
      const { data } = await api.post<Participant>('/participants', payload, {
        headers: { 'X-Registration-Access': accessToken },
      });
      setCreated(data);
      setPhoto(null);
      reset();
      sessionStorage.removeItem('registrationAccessToken');
      setAccessToken('');
      toast.success('Cadastro realizado com sucesso!');
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  if (settings && !settings.registrationOpen) {
    return (
      <section className="mx-auto grid max-w-3xl gap-6 py-6">
        <BackHomeLink />
        <div className="card text-center">
          <p className="text-sm font-bold uppercase text-ember">Cadastro da fantasia</p>
          <h1 className="mt-2 text-3xl font-black text-white">Cadastros encerrados</h1>
          <p className="mt-3 text-white/70">Estamos preparando a votação. Novos cadastros públicos não estão disponíveis.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-6 py-6">
      <BackHomeLink />
      {!accessToken && !created && (
        <form className="card mx-auto grid w-full max-w-xl gap-4 text-center" onSubmit={unlockRegistration}>
          <KeyRound className="mx-auto h-10 w-10 text-ember" />
          <div>
            <p className="text-sm font-bold uppercase text-ember">Halloween</p>
            <h1 className="mt-2 text-3xl font-black text-white">Cadastro de participante</h1>
            <p className="mt-3 text-white/70">Para continuar, informe o código de acesso fornecido pela organização.</p>
          </div>
          <label className="grid gap-2 text-left text-sm font-semibold text-white/80">
            <span>Código de acesso</span>
            <input className="input uppercase" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="off" />
          </label>
          <button className="btn-primary w-full" disabled={checkingAccess || !accessCode.trim()}>
            {checkingAccess ? 'Verificando...' : 'Continuar'}
          </button>
        </form>
      )}
      {accessToken && !created && (
        <>
          <div>
            <p className="text-sm font-bold uppercase text-ember">Cadastro da fantasia</p>
            <h1 className="mt-2 text-3xl font-black text-white">Cadastrar minha fantasia</h1>
          </div>
          <form className="card grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Nome do participante" error={errors.name?.message}><input className="input" {...register('name')} /></Field>
        <Field label="Nome da fantasia" error={errors.costumeName?.message}><input className="input" {...register('costumeName')} /></Field>
        <PhotoUpload file={photo} onChange={setPhoto} />
        <Field label="Descrição" error={errors.description?.message}><textarea className="input min-h-28 resize-y" {...register('description')} /></Field>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Cadastrando...' : <><Camera className="h-4 w-4" /> Cadastrar fantasia</>}
        </button>
          </form>
        </>
      )}
      {created && (
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-4 text-emerald-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> <span className="font-bold">Cadastro realizado!</span>
            </div>
            <p className="text-emerald-50/90">Sua fantasia foi cadastrada para o Halloween.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link className="btn-primary" to="/participantes"><Users className="h-4 w-4" /> Ver participantes</Link>
              <Link className="btn-secondary" to="/">Voltar para página inicial</Link>
            </div>
          </div>
          <ParticipantCard participant={created} />
        </div>
      )}
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-white/80">
      <span>{label}</span>
      {children}
      {error && <span className="text-sm text-orange-200">{error}</span>}
    </label>
  );
}

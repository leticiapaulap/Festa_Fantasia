import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { BackHomeLink } from '../components/BackHomeLink';
import { ParticipantCard } from '../components/ParticipantCard';
import { PhotoUpload } from '../components/PhotoUpload';
import { api, apiMessage } from '../services/api';
import type { EventSettings, Participant } from '../types/api';

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
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api.get<EventSettings>('/settings').then(({ data }) => setSettings(data)).catch(() => undefined);
  }, []);

  async function onSubmit(values: FormData) {
    try {
      const payload = new FormData();
      payload.append('name', values.name);
      payload.append('costumeName', values.costumeName);
      if (values.description) payload.append('description', values.description);
      if (photo) payload.append('photo', photo);
      const { data } = await api.post<Participant>('/participants', payload);
      setCreated(data);
      setPhoto(null);
      reset();
      toast.success('Fantasia cadastrada com sucesso!');
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
          {isSubmitting ? 'Salvando...' : <><Camera className="h-4 w-4" /> Salvar fantasia</>}
        </button>
      </form>
      {created && (
        <div className="grid gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-4 text-emerald-100">
            <CheckCircle2 className="h-5 w-5" /> Fantasia cadastrada com sucesso!
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

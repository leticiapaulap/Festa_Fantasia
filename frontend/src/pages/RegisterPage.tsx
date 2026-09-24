import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, CheckCircle2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { ParticipantCard } from '../components/ParticipantCard';
import { api, apiMessage } from '../services/api';
import type { Participant } from '../types/api';

const schema = z.object({
  name: z.string().min(2, 'Informe seu nome.'),
  costumeName: z.string().min(2, 'Informe o nome da fantasia.'),
  photoUrl: z.string().url('Informe uma URL válida.').optional().or(z.literal('')),
  description: z.string().max(600, 'Descrição muito longa.').optional(),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const [created, setCreated] = useState<Participant | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    try {
      const { data } = await api.post<Participant>('/participants', { ...values, photoUrl: values.photoUrl || null });
      setCreated(data);
      reset();
      toast.success('Fantasia cadastrada com sucesso!');
    } catch (error) {
      toast.error(apiMessage(error));
    }
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-6 py-6">
      <div>
        <p className="text-sm font-bold uppercase text-ember">Cadastro da fantasia</p>
        <h1 className="mt-2 text-3xl font-black text-white">Cadastrar minha fantasia</h1>
      </div>
      <form className="card grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Nome do participante" error={errors.name?.message}><input className="input" {...register('name')} /></Field>
        <Field label="Nome da fantasia" error={errors.costumeName?.message}><input className="input" {...register('costumeName')} /></Field>
        <Field label="Foto da fantasia (URL)" error={errors.photoUrl?.message}><input className="input" placeholder="https://..." {...register('photoUrl')} /></Field>
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

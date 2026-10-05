import { Sparkles } from 'lucide-react';
import type { Participant, RankingItem } from '../types/api';

type Props = {
  participant?: Participant;
  ranking?: RankingItem;
  action?: React.ReactNode;
  compact?: boolean;
};

export function ParticipantCard({ participant, ranking, action, compact }: Props) {
  const name = participant?.name ?? ranking?.participantName ?? '';
  const costumeName = participant?.costumeName ?? ranking?.costumeName ?? '';
  const description = participant?.description ?? ranking?.description;
  const photoUrl = participant?.photoUrl ?? ranking?.photoUrl;
  const status = ranking ? 'Resultado' : 'Pronto para votação';

  return (
    <article className="halloween-card group grid gap-4 rounded-xl p-3 transition duration-300 hover:-translate-y-1 hover:border-ember/45 hover:shadow-glow sm:p-4">
      <div className={`participant-photo-frame w-full rounded-xl ${compact ? 'aspect-square' : 'aspect-[4/5]'}`}>
        {photoUrl ? (
          <img src={photoUrl} alt={costumeName} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sparkles className="h-14 w-14 text-ember/80" />
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <span className="participant-status border-ember/25 bg-ember/10 text-orange-100">{status}</span>
        <div>
          <p className="truncate text-sm font-bold uppercase text-white/60">{name}</p>
          <h3 className="mt-1 text-xl font-black leading-tight text-white">{costumeName}</h3>
        </div>
        {!compact && <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/70">{description || 'Fantasia misteriosa pronta para surpreender a noite.'}</p>}
      </div>
      {ranking && (
        <div>
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>{ranking.votes} voto{ranking.votes === 1 ? '' : 's'}</span>
            <span>{ranking.percentage.toFixed(1)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-ember" style={{ width: `${Math.min(100, ranking.percentage)}%` }} />
          </div>
        </div>
      )}
      {action}
    </article>
  );
}

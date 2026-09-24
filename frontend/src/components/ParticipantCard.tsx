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

  return (
    <article className="card group grid gap-4 transition duration-300 hover:-translate-y-1 hover:border-ember/40">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-gradient-to-br from-velvet/45 via-black/30 to-ember/25">
        {photoUrl ? (
          <img src={photoUrl} alt={costumeName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sparkles className="h-12 w-12 text-ember/80" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-lg font-bold text-white">{name}</h3>
        <p className="text-base font-semibold text-ember">{costumeName}</p>
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

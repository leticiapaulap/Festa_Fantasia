import { Sparkles } from 'lucide-react';
import type { RankingItem, Results } from '../types/api';

type RankingMode = 'live' | 'test' | 'final';
type RankingVariant = 'public' | 'admin' | 'screen';

type RankingBoardProps = {
  results: Results | null;
  updatedAt?: string | null;
  mode: RankingMode;
  variant?: RankingVariant;
  hidden?: boolean;
  id?: string;
  className?: string;
};

export function RankingBoard({
  results,
  updatedAt,
  mode,
  variant = 'public',
  hidden = false,
  id,
  className = '',
}: RankingBoardProps) {
  const totalVotes = results?.totalVotes ?? 0;
  const heading = headingForMode(mode);
  const isScreen = variant === 'screen';

  if (hidden) {
    return (
      <section id={id} className={`halloween-card mx-auto grid w-full max-w-5xl gap-3 rounded-xl p-5 text-center sm:p-6 ${className}`}>
        <p className="text-sm font-black uppercase text-ember">Ranking em tempo real</p>
        <h2 className="text-2xl font-black text-white">Resultado parcial oculto pela organização.</h2>
      </section>
    );
  }

  return (
    <section id={id} className={`mx-auto grid w-full ${isScreen ? 'max-w-6xl' : 'max-w-5xl'} gap-5 ${className}`}>
      <div className="halloween-card flex flex-col gap-3 rounded-xl p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-black uppercase text-ember">{heading.eyebrow}</p>
          <h2 className={`${isScreen ? 'text-4xl sm:text-5xl' : 'text-3xl'} mt-1 font-black text-white`}>{heading.title}</h2>
          <p className="mt-2 text-sm text-white/60">{heading.caption}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-left sm:text-right">
          <p className="text-sm font-bold text-white/70">{mode === 'test' ? 'Votos de teste' : 'Total de votos'}</p>
          <p className="mt-1 text-3xl font-black text-white tabular-nums">{totalVotes}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-white/45">Atualizado às {updatedAt ? formatTime(updatedAt) : '--:--:--'}</p>
        </div>
      </div>

      <RankingRows items={results?.ranking ?? []} totalVotes={totalVotes} mode={mode} variant={variant} />
    </section>
  );
}

function RankingRows({
  items,
  totalVotes,
  mode,
  variant,
}: {
  items: RankingItem[];
  totalVotes: number;
  mode: RankingMode;
  variant: RankingVariant;
}) {
  if (items.length === 0) {
    return (
      <div className="halloween-card rounded-xl p-5 text-center">
        <p className="text-lg font-black text-white">A votação ainda está começando.</p>
        <p className="mt-2 text-sm text-white/60">Ainda não há votos registrados.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => {
        const rank = item.position ?? rankFor(items, index);
        const percentage = totalVotes ? item.percentage : 0;
        const tied = item.votes > 0 && items.some((other, otherIndex) => otherIndex !== index && other.votes === item.votes);
        const imageSize = imageSizeClass(variant, index);
        return (
          <article key={item.participantId} className="halloween-card rounded-xl p-3 sm:p-4">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
              <div className="grid justify-items-center gap-2">
                <div className="grid h-11 w-11 place-items-center rounded-lg border border-ember/35 bg-ember/12 text-base font-black text-ember shadow-glow">
                  {positionText(rank)}
                </div>
                <div className={`participant-photo-frame ${imageSize} rounded-xl`}>
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.costumeName} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <Sparkles className="h-8 w-8 text-ember" />
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 self-center">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`${variant === 'screen' ? 'text-2xl sm:text-3xl' : 'text-xl'} min-w-0 font-black leading-tight text-white`}>
                    {mode === 'final' && rank <= 3 ? `${rank}º lugar - ` : ''}{item.costumeName}
                  </h3>
                  {tied && <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs font-black uppercase text-amber-100">Empate</span>}
                </div>
                <p className="mt-1 truncate text-sm font-bold uppercase text-white/55">{item.participantName}</p>
                <div className="mt-4 flex items-center justify-between gap-3 text-sm font-bold text-white/70">
                  <span>{item.votes} voto{item.votes === 1 ? '' : 's'}</span>
                  <span className="text-ember">{formatPercent(percentage)}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/8 bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-ember shadow-glow transition-all duration-500" style={{ width: `${Math.min(100, percentage)}%` }} />
                </div>
              </div>

              <div className="col-span-2 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2 sm:col-span-1 sm:block sm:min-w-24 sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
                <p className={`${variant === 'screen' ? 'text-4xl' : 'text-2xl'} font-black text-white tabular-nums`}>{item.votes}</p>
                <p className="text-xs font-bold uppercase text-white/45">voto{item.votes === 1 ? '' : 's'}</p>
                <p className={`${variant === 'screen' ? 'text-3xl' : 'text-xl'} font-black text-ember sm:mt-2`}>{formatPercent(percentage)}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function headingForMode(mode: RankingMode) {
  if (mode === 'test') {
    return {
      eyebrow: 'Resultado parcial - modo teste',
      title: 'Ranking de teste',
      caption: 'Votos de teste ficam separados da votação oficial.',
    };
  }
  if (mode === 'final') {
    return {
      eyebrow: 'Resultado final',
      title: 'Halloween',
      caption: 'Ranking oficial divulgado pela organização.',
    };
  }
  return {
    eyebrow: 'Resultado parcial',
    title: 'Ranking em tempo real',
    caption: 'Resultado parcial, sem vencedor declarado.',
  };
}

function imageSizeClass(variant: RankingVariant, index: number) {
  if (variant === 'admin') return index === 0 ? 'h-24 w-20' : 'h-20 w-16 sm:h-24 sm:w-20';
  if (variant === 'screen') return index === 0 ? 'h-24 w-20 sm:h-[108px] sm:w-[92px]' : 'h-20 w-16 sm:h-24 sm:w-20';
  return index === 0 ? 'h-24 w-20 sm:h-[108px] sm:w-[92px]' : 'h-20 w-16 sm:h-24 sm:w-20';
}

function rankFor(items: RankingItem[], index: number) {
  if (!items[index].votes) return index + 1;
  let rank = 1;
  for (let i = 1; i <= index; i += 1) {
    if (items[i].votes < items[i - 1].votes) rank = i + 1;
  }
  return rank;
}

function positionText(rank: number) {
  return `${rank}º`;
}

function formatPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(safeValue % 1 === 0 ? 0 : 1)}%`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

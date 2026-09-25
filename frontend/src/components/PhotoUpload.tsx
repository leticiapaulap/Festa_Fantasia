import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
  currentUrl?: string | null;
  onRemoveCurrent?: () => void;
};

export function PhotoUpload({ file, onChange, currentUrl, onRemoveCurrent }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(nextFile?: File) {
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      toast.error('Selecione uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (nextFile.size > MAX_SIZE) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }
    onChange(nextFile);
  }

  const visibleUrl = previewUrl ?? currentUrl ?? null;

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-semibold text-white/80">Foto do participante</p>
        <p className="text-xs text-white/50">JPG, PNG ou WEBP. Máximo 5 MB.</p>
      </div>
      <button
        type="button"
        className="grid min-h-44 w-full place-items-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-black/25 p-3 text-center transition hover:border-ember/60 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-ember/40"
        onClick={() => inputRef.current?.click()}
      >
        {visibleUrl ? (
          <img src={visibleUrl} alt="Prévia da foto do participante" className="aspect-square w-full max-w-xs rounded-lg object-cover" />
        ) : (
          <span className="grid place-items-center gap-2 text-white/70">
            <ImagePlus className="h-9 w-9 text-ember" />
            Adicionar foto
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      {(visibleUrl || file) && (
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()}>
            Trocar foto
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onChange(null);
              onRemoveCurrent?.();
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            <Trash2 className="h-4 w-4" />
            Remover
          </button>
        </div>
      )}
    </div>
  );
}

import { useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import type { AuthenticatedProfessional, ProfilePhotoResponse } from '@studio-charme/contracts';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AUTH_SESSION_KEY } from '@/features/auth/AuthProvider';
import { api, ApiClientError, ensureCsrfToken } from '@/lib/api';
import { cn } from '@/lib/cn';
import { prepareProfilePhoto, professionalPhotoSrc } from './photo';

type ProfessionalPhotoProps = {
  professional: AuthenticatedProfessional;
  width?: number;
  height?: number;
  className?: string;
};

export function ProfessionalPhoto({
  professional,
  width = 40,
  height = 40,
  className,
}: ProfessionalPhotoProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ imageBase64: string; mimeType: 'image/jpeg' } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const src = professionalPhotoSrc(professional.photoUrl);

  const resetDraft = () => {
    setPreview(null);
    setPayload(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    setOpen(false);
    resetDraft();
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const next = await prepareProfilePhoto(file);
      setPayload(next);
      setPreview(`data:image/jpeg;base64,${next.imageBase64}`);
    } catch (caught) {
      setPayload(null);
      setPreview(null);
      setError(caught instanceof Error ? caught.message : 'Não foi possível ler a foto.');
    }
  };

  const save = async () => {
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
      await ensureCsrfToken();
      const data = await api<ProfilePhotoResponse>('/professionals/me/photo', {
        method: 'PUT',
        body: payload,
      });
      queryClient.setQueryData(AUTH_SESSION_KEY, data.professional);
      close();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : 'Não foi possível guardar a foto. Tente de novo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const restore = async () => {
    setSaving(true);
    setError(null);
    try {
      await ensureCsrfToken();
      const data = await api<ProfilePhotoResponse>('/professionals/me/photo', {
        method: 'DELETE',
      });
      queryClient.setQueryData(AUTH_SESSION_KEY, data.professional);
      close();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : 'Não foi possível voltar à foto original.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        aria-label={`Alterar sua foto, ${professional.name}`}
      >
        <img
          src={src}
          alt=""
          width={width}
          height={height}
          className={cn('rounded-full object-cover', className)}
        />
        <span className="bg-gold-500 text-brown-900 absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full shadow-card">
          <Camera className="size-3" aria-hidden="true" />
        </span>
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Sua foto"
        description="Essa foto fica só na sua área. As outras profissionais e o site público não mudam."
        size="sm"
        footer={
          <>
            {professional.photoUrl && (
              <Button variant="ghost" onClick={() => void restore()} disabled={saving}>
                Remover foto
              </Button>
            )}
            <Button variant="outline" onClick={close} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={!payload} isLoading={saving}>
              Guardar foto
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4">
          <img
            src={preview ?? src}
            alt={`Prévia da foto de ${professional.name}`}
            width={160}
            height={160}
            className="size-40 rounded-full object-cover"
          />
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              void onPick(event.target.files?.[0]);
            }}
          />
          <Button
            variant="secondary"
            leadingIcon={<Camera className="size-4" aria-hidden="true" />}
            onClick={() => inputRef.current?.click()}
          >
            Escolher foto
          </Button>
          <p className="text-brown-500 text-center text-xs">
            JPG, PNG ou WebP. A imagem é recortada em quadrado automaticamente.
          </p>
          {error && (
            <Alert tone="danger" className="w-full">
              {error}
            </Alert>
          )}
        </div>
      </Modal>
    </>
  );
}

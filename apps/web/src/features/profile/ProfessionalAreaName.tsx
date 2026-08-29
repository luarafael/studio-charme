import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import type { AuthenticatedProfessional, ProfileResponse } from '@studio-charme/contracts';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AUTH_SESSION_KEY } from '@/features/auth/AuthProvider';
import { api, ApiClientError, ensureCsrfToken } from '@/lib/api';

type ProfessionalAreaNameProps = {
  professional: AuthenticatedProfessional;
  variant?: 'sidebar' | 'header';
};

export function ProfessionalAreaName({
  professional,
  variant = 'sidebar',
}: ProfessionalAreaNameProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(professional.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setOpen(false);
    setName(professional.name);
    setError(null);
  };

  const save = async () => {
    const next = name.trim();
    if (next.length < 2) {
      setError('Informe seu nome.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await ensureCsrfToken();
      const data = await api<ProfileResponse>('/professionals/me', {
        method: 'PATCH',
        body: { name: next },
      });
      queryClient.setQueryData(AUTH_SESSION_KEY, data.professional);
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : 'Não foi possível guardar o nome. Tente de novo.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setName(professional.name);
          setError(null);
          setOpen(true);
        }}
        className="group flex min-w-0 max-w-full items-center gap-1.5 rounded-control text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        aria-label={`Alterar o nome da área, hoje ${professional.name}`}
      >
        <span
          className={
            variant === 'header'
              ? 'text-brown-900 truncate font-semibold'
              : 'font-display text-gold-500 truncate text-lg leading-none'
          }
        >
          {professional.name}
        </span>
        <Pencil
          className={
            variant === 'header'
              ? 'text-brown-400 size-3.5 shrink-0'
              : 'text-gold-500 size-3.5 shrink-0 opacity-80 group-hover:opacity-100'
          }
          aria-hidden="true"
        />
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Nome da sua área"
        description="Esse nome aparece só na sua conta. As outras profissionais e o site público não mudam."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} isLoading={saving}>
              Guardar nome
            </Button>
          </>
        }
      >
        <Field label="Seu nome" required error={error ?? undefined}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={120}
              placeholder="Como você quer aparecer aqui"
            />
          )}
        </Field>
        {error && error !== 'Informe seu nome.' ? (
          <Alert tone="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}
      </Modal>
    </>
  );
}

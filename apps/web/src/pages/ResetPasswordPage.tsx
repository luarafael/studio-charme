import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { acceptInviteSchema, type AcceptInviteInput } from '@studio-charme/contracts';
import { brandAssets, siteConfig } from '@/config/site';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/Alert';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { api, ApiClientError } from '@/lib/api';

export default function ResetPasswordPage() {
  useDocumentMeta({
    title: `Definir senha | ${siteConfig.name}`,
    noIndex: true,
  });

  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const isInvite = params.get('convite') === '1';
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => acceptInviteSchema, []);
  const form = useForm<AcceptInviteInput>({
    resolver: zodResolver(schema),
    defaultValues: { token, password: '', passwordConfirmation: '' },
  });

  return (
    <div className="bg-brown-900 flex min-h-svh flex-col items-center justify-center px-4 py-12 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-md">
        <Link to="/entrar" className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={brandAssets.logoMark} alt="" width={56} height={56} className="size-14" />
          <span className="font-display text-gold-500 text-2xl">{siteConfig.name}</span>
        </Link>
        <div className="rounded-panel bg-cream px-6 py-8 shadow-overlay sm:px-8">
          <h1 className="text-display-sm text-brown-900">
            {isInvite ? 'Criar sua senha' : 'Nova senha'}
          </h1>
          <p className="text-brown-600 mt-2 text-sm">
            A senha precisa ter pelo menos 10 caracteres. Use uma frase que só você lembre.
          </p>
          {!token && (
            <Alert tone="danger" className="mt-6">
              Este link está incompleto. Solicite um novo pelo login.
            </Alert>
          )}
          {formError && (
            <Alert tone="danger" className="mt-6">
              {formError}
            </Alert>
          )}
          {done ? (
            <Alert tone="success" title="Senha definida" className="mt-6">
              Você já pode entrar com o e-mail e a nova senha.
            </Alert>
          ) : (
            token && (
              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={form.handleSubmit(async (values) => {
                  setFormError(null);
                  try {
                    await api(isInvite ? '/auth/accept-invite' : '/auth/reset-password', {
                      method: 'POST',
                      body: values,
                    });
                    setDone(true);
                  } catch (error) {
                    if (error instanceof ApiClientError && error.code === 'INVALID_TOKEN') {
                      setFormError('Este link é inválido ou expirou. Solicite um novo.');
                      return;
                    }
                    if (error instanceof ApiClientError) {
                      setFormError(error.message);
                      return;
                    }
                    setFormError(
                      'Não foi possível falar com o servidor. Confira se o site está apontando para a API de produção.',
                    );
                  }
                })}
              >
                <input type="hidden" {...form.register('token')} />
                <Field label="Nova senha" required error={form.formState.errors.password?.message}>
                  {(props) => (
                    <PasswordInput
                      {...props}
                      autoComplete="new-password"
                      {...form.register('password')}
                    />
                  )}
                </Field>
                <Field
                  label="Confirmar senha"
                  required
                  error={form.formState.errors.passwordConfirmation?.message}
                >
                  {(props) => (
                    <PasswordInput
                      {...props}
                      autoComplete="new-password"
                      {...form.register('passwordConfirmation')}
                    />
                  )}
                </Field>
                <Button type="submit" fullWidth isLoading={form.formState.isSubmitting}>
                  Salvar senha
                </Button>
              </form>
            )
          )}
          <p className="mt-6 text-center text-sm">
            <Link to="/entrar" className="text-accent-text underline-offset-2 hover:underline">
              Ir para o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

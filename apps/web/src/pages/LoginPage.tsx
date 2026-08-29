import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@studio-charme/contracts';
import { brandAssets, siteConfig } from '@/config/site';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export default function LoginPage() {
  useDocumentMeta({
    title: `Entrar | ${siteConfig.name}`,
    description: 'Acesso da equipe do Studio Charme à agenda e ao financeiro individual.',
    canonicalPath: '/entrar',
    noIndex: true,
  });

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  return (
    <div className="bg-brown-900 flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <a href="/" className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={brandAssets.logoMark} alt="" width={56} height={56} className="size-14" />
          <span className="font-display text-gold-500 text-2xl">{siteConfig.name}</span>
        </a>

        <div className="rounded-panel bg-cream px-6 py-8 shadow-overlay sm:px-8">
          <h1 className="text-display-sm text-brown-900">Entrar</h1>
          <p className="text-brown-600 mt-2 text-sm">
            Área exclusiva das profissionais. Cada conta vê somente os próprios dados.
          </p>

          {formError && (
            <Alert tone="danger" title="Não foi possível entrar" className="mt-6">
              {formError}
            </Alert>
          )}

          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              setFormError(null);
              try {
                await login(values);
                const from = (location.state as { from?: string } | null)?.from;
                navigate(from && from.startsWith('/app') ? from : '/app/dashboard', { replace: true });
              } catch (error) {
                if (error instanceof ApiClientError && error.code === 'INVALID_CREDENTIALS') {
                  setFormError('E-mail ou senha incorretos.');
                  return;
                }
                setFormError('Não foi possível entrar agora. Tente novamente em instantes.');
              }
            })}
          >
            <Field label="E-mail" required error={form.formState.errors.email?.message}>
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  autoComplete="username"
                  {...form.register('email')}
                />
              )}
            </Field>
            <Field label="Senha" required error={form.formState.errors.password?.message}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                />
              )}
            </Field>
            <label className="text-brown-700 flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-gold-600" {...form.register('rememberMe')} />
              Manter conectada neste aparelho
            </label>
            <Button type="submit" fullWidth isLoading={form.formState.isSubmitting}>
              Entrar
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link to="/esqueci-a-senha" className="text-accent-text underline-offset-2 hover:underline">
              Esqueci a senha ou é meu primeiro acesso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

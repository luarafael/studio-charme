import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@studio-charme/contracts';
import { brandAssets, siteConfig } from '@/config/site';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  useDocumentMeta({
    title: `Recuperar senha | ${siteConfig.name}`,
    noIndex: true,
  });

  const [done, setDone] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  return (
    <div className="bg-brown-900 flex min-h-svh flex-col items-center justify-center px-4 py-12 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-md">
        <Link to="/entrar" className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={brandAssets.logoMark} alt="" width={56} height={56} className="size-14" />
          <span className="font-display text-gold-500 text-2xl">{siteConfig.name}</span>
        </Link>
        <div className="rounded-panel bg-cream px-6 py-8 shadow-overlay sm:px-8">
          <h1 className="text-display-sm text-brown-900">Recuperar senha</h1>
          <p className="text-brown-600 mt-2 text-sm">
            Se o e-mail estiver cadastrado, enviamos um link para definir a senha. A mensagem é a
            mesma caso o e-mail não exista, para não revelar contas.
          </p>
          {done ? (
            <Alert tone="success" title="Verifique seu e-mail" className="mt-6">
              Se este endereço estiver cadastrado, as instruções já foram enviadas.
            </Alert>
          ) : (
            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={form.handleSubmit(async (values) => {
                await api('/auth/forgot-password', { method: 'POST', body: values });
                setDone(true);
              })}
            >
              <Field label="E-mail" required error={form.formState.errors.email?.message}>
                {(props) => <Input {...props} type="email" autoComplete="username" {...form.register('email')} />}
              </Field>
              <Button type="submit" fullWidth isLoading={form.formState.isSubmitting}>
                Enviar link
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm">
            <Link to="/entrar" className="text-accent-text underline-offset-2 hover:underline">
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

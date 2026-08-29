import { z } from 'zod';

/**
 * Toda configuração sensível vem do ambiente e é validada na inicialização.
 * O processo falha imediatamente se algo estiver ausente ou fraco, para que um
 * segredo mal configurado nunca chegue à produção silenciosamente.
 */

const commaSeparatedOrigins = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ''),
  )
  .refine((origins) => origins.length > 0, 'Informe ao menos uma origem autorizada.')
  .refine(
    (origins) => origins.every((origin) => /^https?:\/\//.test(origin)),
    'Cada origem deve incluir o protocolo (http:// ou https://).',
  );

const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    DATABASE_URL: z
      .string()
      .refine(
        (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
        'DATABASE_URL deve ser uma URL PostgreSQL.',
      ),

    /** Origens do frontend autorizadas no CORS. Sem curinga. */
    WEB_ORIGINS: commaSeparatedOrigins,
    /** URL pública do site, usada em links de convite e recuperação de senha. */
    WEB_PUBLIC_URL: z.url(),

    SESSION_SECRET: z
      .string()
      .min(32, 'SESSION_SECRET precisa de no mínimo 32 caracteres aleatórios.'),
    SESSION_COOKIE_NAME: z.string().min(1).default('sc_session'),
    SESSION_TTL_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .default(24 * 7),
    /** Domínio do cookie. Vazio mantém o cookie restrito ao host da API. */
    COOKIE_DOMAIN: z.string().optional(),

    /** Em produção o cookie exige HTTPS; em desenvolvimento local pode ser relaxado. */
    COOKIE_SECURE: booleanFromEnv.default(true),
    /**
     * `lax` no mesmo site (ex.: studiocharme.com + api.studiocharme.com).
     * `none` quando o site está na Vercel e a API no Railway, em hosts diferentes.
     */
    COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).default('lax'),

    /** Documentação OpenAPI só deve ficar exposta fora de produção. */
    ENABLE_API_DOCS: booleanFromEnv.default(false),

    MAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
    MAIL_FROM: z.string().default('Studio Charme <nao-responda@studiocharme.local>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    /** Armazenamento de imagens e comprovantes compatível com S3. */
    STORAGE_DRIVER: z.enum(['disabled', 's3']).default('disabled'),
    STORAGE_ENDPOINT: z.string().optional(),
    STORAGE_REGION: z.string().optional(),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_ACCESS_KEY_ID: z.string().optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
    STORAGE_PUBLIC_BASE_URL: z.string().optional(),

    /**
     * Chaves VAPID para notificação no celular. Sem as duas, o sino interno
     * continua funcionando e o push fica desligado.
     */
    VAPID_PUBLIC_KEY: z.string().min(20).optional(),
    VAPID_PRIVATE_KEY: z.string().min(20).optional(),
    VAPID_SUBJECT: z.string().default('mailto:nao-responda@studiocharme.local'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'Em produção o cookie de sessão precisa ser Secure.',
        });
      }
      if (env.ENABLE_API_DOCS) {
        ctx.addIssue({
          code: 'custom',
          path: ['ENABLE_API_DOCS'],
          message: 'A documentação OpenAPI não pode ficar pública em produção.',
        });
      }
      if (env.WEB_ORIGINS.some((origin) => origin.startsWith('http://'))) {
        ctx.addIssue({
          code: 'custom',
          path: ['WEB_ORIGINS'],
          message: 'Em produção todas as origens precisam usar HTTPS.',
        });
      }
    }

    if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SAMESITE'],
        message: 'COOKIE_SAMESITE=none exige COOKIE_SECURE=true.',
      });
    }

    if (env.MAIL_PROVIDER === 'smtp' && (!env.SMTP_HOST || !env.SMTP_PORT)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST e SMTP_PORT são obrigatórios quando MAIL_PROVIDER=smtp.',
      });
    }

    if (env.STORAGE_DRIVER === 's3') {
      const missing = (
        [
          ['STORAGE_BUCKET', env.STORAGE_BUCKET],
          ['STORAGE_REGION', env.STORAGE_REGION],
          ['STORAGE_ACCESS_KEY_ID', env.STORAGE_ACCESS_KEY_ID],
          ['STORAGE_SECRET_ACCESS_KEY', env.STORAGE_SECRET_ACCESS_KEY],
        ] as const
      ).filter(([, value]) => !value);

      for (const [key] of missing) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} é obrigatório quando STORAGE_DRIVER=s3.`,
        });
      }
    }

    const vapidPublic = Boolean(env.VAPID_PUBLIC_KEY);
    const vapidPrivate = Boolean(env.VAPID_PRIVATE_KEY);
    if (vapidPublic !== vapidPrivate) {
      ctx.addIssue({
        code: 'custom',
        path: [vapidPublic ? 'VAPID_PRIVATE_KEY' : 'VAPID_PUBLIC_KEY'],
        message: 'VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY precisam ser definidas juntas.',
      });
    }
  });

const NODE_ENV_ALIASES: Record<string, 'development' | 'test' | 'production'> = {
  production: 'production',
  prod: 'production',
  prd: 'production',
  development: 'development',
  dev: 'development',
  test: 'test',
  testing: 'test',
};

/**
 * Painéis de deploy às vezes enviam string vazia, maiúsculas ou o nome do
 * ambiente (`prod`, `studio-charme`) no lugar de `production`.
 */
export function normalizeProcessEnv(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next: NodeJS.ProcessEnv = { ...source };

  for (const [key, value] of Object.entries(next)) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed === '') {
      delete next[key];
    } else {
      next[key] = trimmed;
    }
  }

  const raw = (next.NODE_ENV ?? '').toLowerCase();
  const aliased = NODE_ENV_ALIASES[raw];
  const onRailway = Boolean(next.RAILWAY_ENVIRONMENT || next.RAILWAY_ENVIRONMENT_ID);

  if (aliased) {
    next.NODE_ENV = aliased;
  } else if (onRailway) {
    next.NODE_ENV = 'production';
  }

  return next;
}

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(normalizeProcessEnv(source));

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${details}`);
  }

  return result.data;
}

export function getEnv(): Env {
  cachedEnv ??= loadEnv();
  return cachedEnv;
}

/** Usado apenas em testes, para trocar a configuração entre casos. */
export function setEnvForTesting(env: Env | null): void {
  cachedEnv = env;
}

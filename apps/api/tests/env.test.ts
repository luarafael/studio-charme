import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/studio_charme',
  WEB_ORIGINS: 'http://localhost:5173',
  WEB_PUBLIC_URL: 'http://localhost:5173',
  SESSION_SECRET: 'a'.repeat(32),
  COOKIE_SECURE: 'false',
} satisfies NodeJS.ProcessEnv;

describe('loadEnv', () => {
  it('aplica os padrões de desenvolvimento', () => {
    const env = loadEnv({ ...baseEnv });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3333);
    expect(env.SESSION_COOKIE_NAME).toBe('sc_session');
    expect(env.WEB_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('divide múltiplas origens e remove espaços', () => {
    const env = loadEnv({
      ...baseEnv,
      WEB_ORIGINS: 'http://localhost:5173, https://studiocharme.vercel.app ',
    });
    expect(env.WEB_ORIGINS).toEqual(['http://localhost:5173', 'https://studiocharme.vercel.app']);
  });

  it('exige origem com protocolo, evitando CORS mal configurado', () => {
    expect(() => loadEnv({ ...baseEnv, WEB_ORIGINS: 'studiocharme.com.br' })).toThrow(/protocolo/);
  });

  it('rejeita SESSION_SECRET curto', () => {
    expect(() => loadEnv({ ...baseEnv, SESSION_SECRET: 'curto' })).toThrow(/SESSION_SECRET/);
  });

  it('rejeita DATABASE_URL que não seja PostgreSQL', () => {
    expect(() => loadEnv({ ...baseEnv, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /PostgreSQL/,
    );
  });

  it('exige cookie Secure em produção', () => {
    expect(() =>
      loadEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        WEB_ORIGINS: 'https://studiocharme.com.br',
        WEB_PUBLIC_URL: 'https://studiocharme.com.br',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(/Secure/);
  });

  it('impede documentação OpenAPI pública em produção', () => {
    expect(() =>
      loadEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        WEB_ORIGINS: 'https://studiocharme.com.br',
        WEB_PUBLIC_URL: 'https://studiocharme.com.br',
        COOKIE_SECURE: 'true',
        ENABLE_API_DOCS: 'true',
      }),
    ).toThrow(/OpenAPI/);
  });

  it('rejeita SameSite=none sem cookie Secure', () => {
    expect(() =>
      loadEnv({
        ...baseEnv,
        COOKIE_SECURE: 'false',
        COOKIE_SAMESITE: 'none',
      }),
    ).toThrow(/COOKIE_SAMESITE/);
  });

  it('aceita SameSite=none em produção com cookie Secure', () => {
    const env = loadEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      WEB_ORIGINS: 'https://studio-charme.vercel.app',
      WEB_PUBLIC_URL: 'https://studio-charme.vercel.app',
      COOKIE_SECURE: 'true',
      COOKIE_SAMESITE: 'none',
    });
    expect(env.COOKIE_SAMESITE).toBe('none');
  });

  it('exige HTTPS nas origens em produção', () => {
    expect(() =>
      loadEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
        WEB_ORIGINS: 'http://studiocharme.com.br',
        WEB_PUBLIC_URL: 'https://studiocharme.com.br',
      }),
    ).toThrow(/HTTPS/);
  });

  it('exige host e porta quando o provedor de e-mail é SMTP', () => {
    expect(() => loadEnv({ ...baseEnv, MAIL_PROVIDER: 'smtp' })).toThrow(/SMTP_HOST/);
  });

  it('exige as credenciais de armazenamento quando o driver é s3', () => {
    expect(() => loadEnv({ ...baseEnv, STORAGE_DRIVER: 's3' })).toThrow(/STORAGE_BUCKET/);
  });

  it('aceita o ambiente sem chaves VAPID, com o push desligado', () => {
    const env = loadEnv({ ...baseEnv });
    expect(env.VAPID_PUBLIC_KEY).toBeUndefined();
    expect(env.VAPID_PRIVATE_KEY).toBeUndefined();
  });

  it('rejeita uma chave VAPID sem a outra', () => {
    expect(() =>
      loadEnv({ ...baseEnv, VAPID_PUBLIC_KEY: 'B'.repeat(65) }),
    ).toThrow(/VAPID_PRIVATE_KEY/);
  });

  it('ignora NODE_ENV vazio e aplica o padrão de desenvolvimento', () => {
    const env = loadEnv({ ...baseEnv, NODE_ENV: '' });
    expect(env.NODE_ENV).toBe('development');
  });

  it('aceita NODE_ENV em maiúsculas e o alias prod', () => {
    const productionBase = {
      ...baseEnv,
      WEB_ORIGINS: 'https://studiocharme.com.br',
      WEB_PUBLIC_URL: 'https://studiocharme.com.br',
      COOKIE_SECURE: 'true',
    };
    expect(loadEnv({ ...productionBase, NODE_ENV: 'Production' }).NODE_ENV).toBe('production');
    expect(loadEnv({ ...productionBase, NODE_ENV: 'prod' }).NODE_ENV).toBe('production');
  });

  it('trata o ambiente do Railway sem as variáveis obrigatórias ainda como produção', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'studio-charme',
        RAILWAY_ENVIRONMENT_ID: 'abc',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('não expõe o valor dos segredos na mensagem de erro', () => {
    const secret = 'segredo-super-sensivel-que-nao-deve-vazar';
    try {
      loadEnv({ ...baseEnv, SESSION_SECRET: secret, DATABASE_URL: 'mysql://x' });
      expect.unreachable('deveria ter lançado erro de validação');
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });
});

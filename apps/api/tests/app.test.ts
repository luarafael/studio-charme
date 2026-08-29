import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp(
    loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/studio_charme_test',
      WEB_ORIGINS: 'http://localhost:5173',
      WEB_PUBLIC_URL: 'http://localhost:5173',
      SESSION_SECRET: 'b'.repeat(40),
      COOKIE_SECURE: 'false',
    }),
  );
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('responde ok sem depender do banco', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('não revela versão, host nem configuração', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json<Record<string, unknown>>();
    expect(Object.keys(body).sort()).toEqual(['status', 'uptime']);
  });
});

describe('respostas de erro', () => {
  it('usa o formato padronizado em rota inexistente', async () => {
    const response = await app.inject({ method: 'GET', url: '/rota-que-nao-existe' });
    expect(response.statusCode).toBe(404);

    const body = response.json<{ error: { code: string; message: string; requestId: string } }>();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBeTruthy();
  });

  it('nunca expõe stack trace na resposta', async () => {
    const response = await app.inject({ method: 'GET', url: '/rota-que-nao-existe' });
    expect(response.body).not.toContain('at ');
    expect(response.body).not.toMatch(/node_modules|\.ts:\d+/);
  });
});

describe('cabeçalhos de segurança', () => {
  it('aplica os cabeçalhos do helmet', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});

describe('CORS', () => {
  it('autoriza a origem configurada e permite credenciais', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'GET',
      },
    });
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('não autoriza origem desconhecida', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'https://site-malicioso.example',
        'access-control-request-method': 'GET',
      },
    });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('nunca responde com curinga na origem', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5173' },
    });
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });
});

describe('GET /api/v1/auth/me', () => {
  it('recusa acesso sem sessão, sem revelar se a conta existe', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
  });
});

describe('GET /api/v1/auth/csrf', () => {
  it('emite um token CSRF para as mutações autenticadas', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ csrfToken: string }>();
    expect(body.csrfToken.length).toBeGreaterThan(20);
    expect(response.headers['set-cookie']).toBeTruthy();
  });
});

describe('POST /api/v1/auth/login', () => {
  it('rejeita payload inválido com o formato padronizado', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });
});

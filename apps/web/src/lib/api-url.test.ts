import { describe, expect, it } from 'vitest';
import { resolveApiUrl, shouldUseSameOriginApi } from './api';

describe('resolveApiUrl', () => {
  it('usa localhost quando a variável está vazia', () => {
    expect(resolveApiUrl(undefined, 'http://localhost:5173')).toBe('http://localhost:3333');
    expect(resolveApiUrl('', 'http://localhost:5173')).toBe('http://localhost:3333');
  });

  it('completa https quando o valor veio só com o host', () => {
    expect(resolveApiUrl('studio-charme-production.up.railway.app', 'http://localhost:5173')).toBe(
      'https://studio-charme-production.up.railway.app',
    );
  });

  it('remove barra final e sufixo /api/v1', () => {
    expect(resolveApiUrl('https://api.example.com/api/v1/', 'http://localhost:5173')).toBe(
      'https://api.example.com',
    );
  });

  it('no site publicado fala com o próprio host, não com o Railway', () => {
    expect(
      resolveApiUrl(
        'https://studio-charme-production.up.railway.app',
        'https://studio-charme-web-sigma.vercel.app',
      ),
    ).toBe('https://studio-charme-web-sigma.vercel.app');
  });
});

describe('shouldUseSameOriginApi', () => {
  it('ativa só em HTTPS fora do computador local', () => {
    expect(shouldUseSameOriginApi('https://studio-charme-web-sigma.vercel.app')).toBe(true);
    expect(shouldUseSameOriginApi('http://localhost:5173')).toBe(false);
    expect(shouldUseSameOriginApi('https://127.0.0.1')).toBe(false);
    expect(shouldUseSameOriginApi(undefined)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './api';

describe('resolveApiUrl', () => {
  it('usa localhost quando a variável está vazia', () => {
    expect(resolveApiUrl(undefined)).toBe('http://localhost:3333');
    expect(resolveApiUrl('')).toBe('http://localhost:3333');
  });

  it('completa https quando o valor veio só com o host', () => {
    expect(resolveApiUrl('studio-charme-production.up.railway.app')).toBe(
      'https://studio-charme-production.up.railway.app',
    );
  });

  it('remove barra final e sufixo /api/v1', () => {
    expect(resolveApiUrl('https://api.example.com/api/v1/')).toBe('https://api.example.com');
  });
});

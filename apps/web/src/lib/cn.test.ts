import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('junta classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('ignora valores falsos', () => {
    expect(cn('px-4', false, undefined, null, '')).toBe('px-4');
  });

  it('faz a classe recebida vencer o padrão do componente', () => {
    // Sem o merge, "px-4 px-8" manteria as duas e a vencedora dependeria da
    // ordem no CSS, quebrando a customização via prop className.
    expect(cn('px-4', 'px-8')).toBe('px-8');
    expect(cn('bg-brown-900', 'bg-gold-500')).toBe('bg-gold-500');
  });
});

import { describe, expect, it } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { AppError } from '../src/lib/errors.js';
import { assertOwnership, getScopedProfessionalId, scopedWhere } from '../src/lib/scope.js';

function requestWith(professionalId: string | null): FastifyRequest {
  return {
    professional: professionalId
      ? {
          id: professionalId,
          slug: 'livia',
          name: 'Lívia',
          email: 'livia@studiocharme.local',
          role: 'Designer de unhas',
          photoUrl: null,
        }
      : null,
  } as FastifyRequest;
}

describe('getScopedProfessionalId', () => {
  it('usa somente o id da sessão, nunca um valor enviado pelo cliente', () => {
    expect(getScopedProfessionalId(requestWith('prof-livia'))).toBe('prof-livia');
  });

  it('falha se a rota privada foi registrada sem autenticação', () => {
    expect(() => getScopedProfessionalId(requestWith(null))).toThrow(AppError);
    try {
      getScopedProfessionalId(requestWith(null));
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('UNAUTHENTICATED');
      expect((error as AppError).statusCode).toBe(401);
    }
  });
});

describe('assertOwnership', () => {
  it('aceita registro da própria profissional', () => {
    const record = { professionalId: 'prof-livia' };
    expect(() => assertOwnership(record, requestWith('prof-livia'), 'Cliente')).not.toThrow();
  });

  it('responde 404 para registro de outra profissional, sem confirmar que existe', () => {
    try {
      assertOwnership({ professionalId: 'prof-cibele' }, requestWith('prof-livia'), 'Cliente');
      throw new Error('deveria ter falhado');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('NOT_FOUND');
      expect((error as AppError).statusCode).toBe(404);
      expect((error as AppError).message).not.toMatch(/cibele/i);
    }
  });

  it('responde 404 para registro inexistente, com a mesma mensagem', () => {
    try {
      assertOwnership(null, requestWith('prof-livia'), 'Cliente');
      throw new Error('deveria ter falhado');
    } catch (error) {
      expect((error as AppError).code).toBe('NOT_FOUND');
      expect((error as AppError).statusCode).toBe(404);
    }
  });
});

describe('scopedWhere', () => {
  it('injeta o professionalId da sessão no filtro', () => {
    expect(scopedWhere(requestWith('prof-livia'), { name: 'Ana' })).toEqual({
      name: 'Ana',
      professionalId: 'prof-livia',
    });
  });
});

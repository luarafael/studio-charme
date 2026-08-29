import { describe, expect, it } from 'vitest';
import { professionalPhotoSrc } from './photo';

describe('professionalPhotoSrc', () => {
  it('usa a logo do studio quando a profissional ainda não tem foto', () => {
    expect(professionalPhotoSrc(null)).toBe('/assets/SC.png');
    expect(professionalPhotoSrc(undefined)).toBe('/assets/SC.png');
  });

  it('monta a URL da API só para a foto daquela profissional', () => {
    expect(professionalPhotoSrc('/public/professionals/clarisse/photo?v=1')).toBe(
      'http://localhost:3333/api/v1/public/professionals/clarisse/photo?v=1',
    );
  });
});

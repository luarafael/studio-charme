import { describe, expect, it } from 'vitest';
import { buildAppointmentConfirmationMessage } from './clientWhatsApp';

describe('buildAppointmentConfirmationMessage', () => {
  it('confirma data, serviço e profissional para a cliente', () => {
    const message = buildAppointmentConfirmationMessage({
      clientName: 'Maria',
      professionalName: 'Cibele',
      serviceNames: 'Coloração',
      when: 'sábado, 29 de agosto às 14:00',
    });

    expect(message).toContain('Olá, Maria!');
    expect(message).toContain('*Cibele*');
    expect(message).toContain('*confirmado*');
    expect(message).toContain('Coloração');
    expect(message).toContain('sábado, 29 de agosto às 14:00');
  });
});

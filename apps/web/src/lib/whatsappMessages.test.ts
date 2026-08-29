import { describe, expect, it } from 'vitest';
import {
  appointmentConfirmationMessage,
  bookingRequestMessage,
  emojiForService,
  liveBookingFollowUpMessage,
} from './whatsappMessages';

describe('emojiForService', () => {
  it('escolhe um emoji que combine com o serviço', () => {
    expect(emojiForService('Coloração')).toBe('💇‍♀️');
    expect(emojiForService('Manicure e pedicure')).toBe('💅');
    expect(emojiForService('Cílios')).toBe('👁️');
    expect(emojiForService('Depilação')).toBe('✨');
  });
});

describe('whatsapp messages', () => {
  it('monta o pedido de agendamento com os dados da cliente', () => {
    const message = bookingRequestMessage({
      clientName: 'Maria Silva',
      clientPhone: '(85) 99123-4567',
      serviceName: 'Coloração',
      professionalName: 'Cibele',
      notes: 'Prefiro à tarde',
    });

    expect(message).toContain('✨');
    expect(message).toContain('Maria Silva');
    expect(message).toContain('(85) 99123-4567');
    expect(message).toContain('Coloração');
    expect(message).toContain('Cibele');
    expect(message).toContain('Prefiro à tarde');
    expect(message).toContain('🗓️');
  });

  it('confirma o horário da cliente com emoji de confirmação', () => {
    const message = appointmentConfirmationMessage({
      clientName: 'Maria',
      professionalName: 'Cibele',
      serviceNames: 'Coloração',
      when: 'sábado, 29 de agosto às 14:00',
    });

    expect(message).toContain('✅');
    expect(message).toContain('*confirmado*');
    expect(message).toContain('📅');
  });

  it('avisa a profissional sobre o pedido pelo site', () => {
    const message = liveBookingFollowUpMessage({
      professionalName: 'Lívia',
      serviceName: 'Manicure e pedicure',
      date: '29/08/2026',
      time: '14:00',
    });

    expect(message).toContain('💅');
    expect(message).toContain('⏳');
    expect(message).toContain('*aguardando confirmação*');
  });
});

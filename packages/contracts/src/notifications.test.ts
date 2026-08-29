import { describe, expect, it } from 'vitest';
import { zonedDateTimeToUtc } from './datetime.js';
import { buildBookingRequestNotification, safeNotificationHref } from './notifications.js';

describe('buildBookingRequestNotification', () => {
  it('monta título, corpo e link da agenda no fuso do salão', () => {
    const startsAt = zonedDateTimeToUtc('2026-08-29', '14:00');
    const copy = buildBookingRequestNotification({
      clientName: 'Maria',
      serviceName: 'Coloração',
      startsAt,
    });

    expect(copy.type).toBe('BOOKING_REQUEST');
    expect(copy.title).toBe('Novo pedido de agendamento');
    expect(copy.body).toBe('Maria pediu Coloração em 29/08 às 14:00.');
    expect(copy.href).toBe('/app/agenda?date=2026-08-29');
  });
});

describe('safeNotificationHref', () => {
  it('aceita apenas caminhos da área interna', () => {
    expect(safeNotificationHref('/app/agenda?date=2026-08-29')).toBe(
      '/app/agenda?date=2026-08-29',
    );
    expect(safeNotificationHref('https://exemplo.com')).toBe('/app/agenda');
  });
});

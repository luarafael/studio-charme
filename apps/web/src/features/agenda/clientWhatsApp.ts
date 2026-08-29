import { buildWhatsAppUrl } from '@/config/site';
import { appointmentConfirmationMessage } from '@/lib/whatsappMessages';

export function buildAppointmentConfirmationMessage(input: {
  clientName: string;
  professionalName: string;
  serviceNames: string;
  when: string;
}): string {
  return appointmentConfirmationMessage(input);
}

/** Abre o WhatsApp da cliente com a confirmação pronta para enviar. */
export function openClientWhatsApp(phone: string, message: string): void {
  window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer');
}

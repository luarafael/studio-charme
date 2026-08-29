import { buildWhatsAppUrl, siteConfig } from '@/config/site';

export function buildAppointmentConfirmationMessage(input: {
  clientName: string;
  professionalName: string;
  serviceNames: string;
  when: string;
}): string {
  return [
    `Olá, ${input.clientName}! Aqui é o ${siteConfig.name}.`,
    '',
    `Seu horário com *${input.professionalName}* está *confirmado*.`,
    `*Serviço:* ${input.serviceNames}`,
    `*Quando:* ${input.when}`,
    '',
    'Te esperamos! Se precisar remarcar, responda esta mensagem.',
  ].join('\n');
}

/** Abre o WhatsApp da cliente com a confirmação pronta para enviar. */
export function openClientWhatsApp(phone: string, message: string): void {
  window.open(buildWhatsAppUrl(phone, message), '_blank', 'noopener,noreferrer');
}

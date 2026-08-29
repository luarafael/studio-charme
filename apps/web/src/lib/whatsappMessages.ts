import { siteConfig } from '@/config/site';

/** Escolhe um emoji que combine com o serviço citado na mensagem. */
export function emojiForService(serviceName: string | undefined): string {
  const text = (serviceName ?? '').toLowerCase();
  if (/unha|manicure|pedicure|alongamento|esmalt|nail/.test(text)) return '💅';
  if (/cabelo|corte|escova|colora|hidrata|luzes|progressiva|banho de lua/.test(text)) return '💇‍♀️';
  if (/cílio|cilio|sobrancelha|olhar|brow/.test(text)) return '👁️';
  if (/depil/.test(text)) return '✨';
  return '💖';
}

export function bookingRequestMessage(input: {
  clientName: string;
  clientPhone: string;
  serviceName?: string;
  professionalName?: string;
  notes?: string;
}): string {
  const serviceEmoji = emojiForService(input.serviceName);
  return [
    `✨ Olá! Gostaria de solicitar um agendamento no *${siteConfig.name}*.`,
    '',
    `👤 *Nome:* ${input.clientName}`,
    `📱 *WhatsApp:* ${input.clientPhone}`,
    `${serviceEmoji} *Serviço:* ${input.serviceName ?? 'A combinar'}`,
    `👩‍🎨 *Profissional:* ${input.professionalName ?? 'Qualquer uma disponível'}`,
    input.notes ? `📝 *Observações:* ${input.notes}` : null,
    '',
    '🗓️ Poderia me informar os horários disponíveis?',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function liveBookingFollowUpMessage(input: {
  professionalName: string;
  serviceName: string;
  date: string;
  time: string;
}): string {
  const serviceEmoji = emojiForService(input.serviceName);
  return [
    `✨ Olá, ${input.professionalName}! Enviei uma solicitação de agendamento pelo site do *${siteConfig.name}*.`,
    '',
    `${serviceEmoji} *Serviço:* ${input.serviceName}`,
    `📅 *Data:* ${input.date}`,
    `⏰ *Horário:* ${input.time}`,
    '',
    '⏳ O pedido no sistema está *aguardando confirmação*.',
  ].join('\n');
}

export function appointmentConfirmationMessage(input: {
  clientName: string;
  professionalName: string;
  serviceNames: string;
  when: string;
}): string {
  const serviceEmoji = emojiForService(input.serviceNames);
  return [
    `💖 Olá, ${input.clientName}! Aqui é o *${siteConfig.name}*.`,
    '',
    `✅ Seu horário com *${input.professionalName}* está *confirmado*.`,
    `${serviceEmoji} *Serviço:* ${input.serviceNames}`,
    `📅 *Quando:* ${input.when}`,
    '',
    '🌸 Te esperamos! Se precisar remarcar, é só responder esta mensagem.',
  ].join('\n');
}

export function siteHelloMessage(professionalName?: string): string {
  const greeting = professionalName
    ? `👋 Olá, ${professionalName}! Vim pelo site do *${siteConfig.name}*.`
    : `👋 Olá! Vim pelo site do *${siteConfig.name}*.`;
  return `${greeting} ✨`;
}

export function siteQuestionMessage(): string {
  return `👋 Olá! Vim pelo site do *${siteConfig.name}* e gostaria de tirar uma dúvida. 💬`;
}

export function siteBookingMessage(professionalName?: string): string {
  if (professionalName) {
    return `✨ Olá, ${professionalName}! Vim pelo site do *${siteConfig.name}* e gostaria de agendar um horário. 📅`;
  }
  return `✨ Olá! Vim pelo site do *${siteConfig.name}* e gostaria de agendar um atendimento. 📅`;
}

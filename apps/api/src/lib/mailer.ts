import type { FastifyBaseLogger } from 'fastify';
import type { Env } from '../config/env.js';

export type MailMessage = {
  to: string;
  subject: string;
  /** Corpo em texto puro. Suficiente para convite e recuperação de senha. */
  text: string;
};

export type Mailer = {
  send: (message: MailMessage) => Promise<void>;
};

/**
 * Mailer de desenvolvimento: imprime a mensagem no log.
 *
 * Permite testar convite e recuperação de senha sem configurar servidor de
 * e-mail e sem risco de disparar mensagem real para o endereço de uma cliente
 * durante os testes.
 */
function createConsoleMailer(logger: FastifyBaseLogger): Mailer {
  return {
    async send(message) {
      logger.info(
        { to: message.to, subject: message.subject },
        `[e-mail simulado]\n${message.text}`,
      );
    },
  };
}

/**
 * Envio por SMTP.
 *
 * O `nodemailer` é carregado sob demanda para não entrar no bundle nem exigir
 * instalação quando o provedor configurado é o console.
 */
function createSmtpMailer(env: Env, logger: FastifyBaseLogger): Mailer {
  return {
    async send(message) {
      const { createTransport } = await import('nodemailer');

      const transport = createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        // 465 usa TLS desde a conexão; as demais portas negociam com STARTTLS.
        secure: env.SMTP_PORT === 465,
        auth:
          env.SMTP_USER && env.SMTP_PASSWORD
            ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
            : undefined,
      });

      try {
        await transport.sendMail({
          from: env.MAIL_FROM,
          to: message.to,
          subject: message.subject,
          text: message.text,
        });
      } catch (error) {
        // O destinatário aparece no log, mas nunca o conteúdo: ele carrega o
        // link com o token de redefinição de senha.
        logger.error({ err: error, to: message.to }, 'falha ao enviar e-mail');
        throw error;
      }
    },
  };
}

export function createMailer(env: Env, logger: FastifyBaseLogger): Mailer {
  return env.MAIL_PROVIDER === 'smtp'
    ? createSmtpMailer(env, logger)
    : createConsoleMailer(logger);
}

/** Monta o corpo do convite de primeiro acesso. */
export function buildInviteEmail(params: {
  name: string;
  link: string;
  expiresInHours: number;
}): MailMessage & { to: string } {
  return {
    to: '',
    subject: 'Seu acesso ao Studio Charme',
    text: [
      `Olá, ${params.name}!`,
      '',
      'Sua conta no sistema do Studio Charme foi criada. Para definir sua senha e',
      'acessar sua agenda, abra o link abaixo:',
      '',
      params.link,
      '',
      `O link é válido por ${params.expiresInHours} horas e só pode ser usado uma vez.`,
      '',
      'Se você não esperava este e-mail, ignore esta mensagem: nenhuma senha será',
      'definida sem que você abra o link.',
    ].join('\n'),
  };
}

/** Monta o corpo da recuperação de senha. */
export function buildPasswordResetEmail(params: {
  name: string;
  link: string;
  expiresInMinutes: number;
}): MailMessage & { to: string } {
  return {
    to: '',
    subject: 'Redefinição de senha — Studio Charme',
    text: [
      `Olá, ${params.name}!`,
      '',
      'Recebemos um pedido para redefinir a senha da sua conta. Para escolher uma',
      'nova senha, abra o link abaixo:',
      '',
      params.link,
      '',
      `O link é válido por ${params.expiresInMinutes} minutos e só pode ser usado uma vez.`,
      '',
      'Se não foi você que pediu, ignore este e-mail: sua senha atual continua',
      'valendo e nenhuma alteração foi feita.',
    ].join('\n'),
  };
}

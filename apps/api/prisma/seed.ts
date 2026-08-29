import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { generateToken, hashToken } from '../src/lib/tokens.js';

/**
 * Seed inicial das três profissionais.
 *
 * Nenhuma senha é gravada: o primeiro acesso é pelo convite impresso no
 * terminal. Os e-mails de login foram confirmados pelas profissionais e são
 * guardados em minúsculas, que é a forma comparada na autenticação.
 *
 * Contatos públicos (WhatsApp e Instagram) vêm do site já publicado.
 */

const INVITE_TTL_HOURS = 72;

const professionals = [
  {
    slug: 'livia',
    name: 'Lívia',
    email: 'liviamariaazevedomendes456@gmail.com',
    role: 'Designer de unhas',
    bio: 'Designer de unhas especialista em alongamentos, esmaltação em gel e nail art. Criativa e detalhista, ela transforma suas unhas em verdadeiras joias que refletem sua personalidade.',
    phone: '5585992029844',
    whatsapp: '5585992029844',
    instagram: 'livianailsdesigner_1',
  },
  {
    slug: 'cibele',
    name: 'Cibele',
    email: 'catundacibele@gmail.com',
    role: 'Cabeleireira',
    bio: 'Cabeleireira dedicada, especialista em cortes modernos, coloração, hidratações e finalizações que realçam a beleza única de cada cliente. Com ela, cada cabelo ganha vida e movimento.',
    phone: '5585987963037',
    whatsapp: '5585987963037',
    instagram: '_studiocharme',
  },
  {
    slug: 'clarisse',
    name: 'Clarisse',
    email: 'clarissemendes1607@gmail.com',
    role: 'Especialista em olhar e depilação',
    bio: 'Clarisse é especialista em cílios, sobrancelhas e depilação, conhecida por seu cuidado minucioso e técnicas que valorizam o olhar e realçam sua expressão natural. Cada detalhe recebe sua atenção especial para resultados perfeitos.',
    phone: '5585984560521',
    whatsapp: '5585984560521',
    instagram: 'beauty.clarissemendes',
  },
] as const;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const webPublicUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:5173';
  const invites: { name: string; link: string }[] = [];

  for (const professional of professionals) {
    const record = await prisma.professional.upsert({
      where: { slug: professional.slug },
      update: {
        name: professional.name,
        email: professional.email,
        role: professional.role,
        bio: professional.bio,
        phone: professional.phone,
        whatsapp: professional.whatsapp,
        instagram: professional.instagram,
        isActive: true,
        isPubliclyVisible: true,
      },
      create: {
        ...professional,
        isActive: true,
        isPubliclyVisible: true,
      },
    });

    const token = generateToken();

    await prisma.accessToken.create({
      data: {
        tokenHash: hashToken(token),
        purpose: 'INVITE',
        professionalId: record.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000),
      },
    });

    invites.push({
      name: record.name,
      link: `${webPublicUrl}/definir-senha?token=${token}&convite=1`,
    });
  }

  console.warn('Seed concluído. Nenhum senha foi definida.');
  console.warn('Links de primeiro acesso (válidos por 72h, uso único):');
  for (const invite of invites) {
    console.warn(`  ${invite.name}: ${invite.link}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

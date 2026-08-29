import { Heart, Sparkles, Users } from 'lucide-react';
import { brandAssets, siteConfig } from '@/config/site';
import { Section, SectionHeader } from '@/components/layout/Section';

const pillars = [
  {
    icon: Heart,
    title: 'Autoestima em primeiro lugar',
    description:
      'Acreditamos que a beleza vai além da aparência: ela é autoestima, confiança e bem-estar.',
  },
  {
    icon: Users,
    title: 'Equipe apaixonada',
    description:
      'Três profissionais especializadas, cada uma cuidando do que faz com mais dedicação.',
  },
  {
    icon: Sparkles,
    title: 'Cuidado nos detalhes',
    description:
      'Um refúgio para relaxar, cuidar de si mesma e sair se sentindo ainda mais incrível.',
  },
];

export function AboutSection() {
  return (
    <Section id="sobre" tone="muted">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="relative mx-auto w-full max-w-sm">
          <img
            src={brandAssets.logoMark}
            alt={`Logo do ${siteConfig.name}`}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            className="shadow-card aspect-square w-full rounded-full object-cover"
          />
        </div>

        <div>
          <SectionHeader
            eyebrow="Sobre nós"
            title="Um espaço criado para você se sentir cuidada"
            align="left"
          />

          <div className="prose-charme mt-6">
            <p>
              No <strong>{siteConfig.name}</strong>, acreditamos que a beleza vai além da aparência:
              ela é autoestima, confiança e bem-estar. Nosso espaço foi criado para ser um refúgio
              onde você pode relaxar, cuidar de si mesma e sair se sentindo ainda mais incrível.
            </p>
            <p>
              Cada cliente é recebida com carinho e atenção, porque acreditamos que você merece uma
              experiência completa — do atendimento ao resultado final.
            </p>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {pillars.map((pillar) => (
              <li key={pillar.title} className="flex flex-col gap-2">
                <span className="rounded-control bg-gold-100 text-gold-800 inline-flex size-10 items-center justify-center">
                  <pillar.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-brown-900 text-base">{pillar.title}</h3>
                <p className="text-brown-600 text-sm">{pillar.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

import { Instagram } from 'lucide-react';
import { instagramPosts, siteConfig } from '@/config/site';
import { Section, SectionHeader } from '@/components/layout/Section';
import { buttonClasses } from '@/components/ui/styles';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage';

export function InstagramSection() {
  return (
    <Section tone="dark">
      <SectionHeader
        eyebrow="Instagram"
        title={`@${siteConfig.social.instagramHandle}`}
        description="Acompanhe os trabalhos mais recentes e novidades do studio."
        tone="dark"
      />

      <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {instagramPosts.map((post) => (
          <li key={post.url}>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-card group block overflow-hidden"
            >
              <ResponsiveImage
                src={post.image}
                alt={post.alt}
                sizes="(min-width: 640px) 25vw, 50vw"
                className="ease-brand aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100"
              />
              <span className="sr-only">Abrir publicação no Instagram</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex justify-center">
        <a
          href={siteConfig.social.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ variant: 'primary' })}
        >
          <Instagram className="size-5" aria-hidden="true" />
          Seguir no Instagram
        </a>
      </div>
    </Section>
  );
}

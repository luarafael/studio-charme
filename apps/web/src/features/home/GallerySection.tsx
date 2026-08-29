import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { galleryItems } from '@/config/site';
import { Section, SectionHeader } from '@/components/layout/Section';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage';

/**
 * Galeria com visualização ampliada.
 *
 * O site anterior usava o truque de CSS `:target`, que exigia duplicar cada
 * imagem no HTML — o navegador baixava as seis fotos duas vezes. Aqui a miniatura
 * é a única imagem carregada de início e a versão ampliada só é buscada quando a
 * visitante abre o lightbox.
 */
export function GallerySection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const total = galleryItems.length;

  const goTo = useCallback(
    (offset: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        return (current + offset + total) % total;
      });
    },
    [total],
  );

  // Setas do teclado navegam entre as fotos enquanto o lightbox está aberto.
  useEffect(() => {
    if (openIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openIndex, goTo]);

  const active = openIndex === null ? null : galleryItems[openIndex];

  return (
    <Section id="galeria">
      <SectionHeader
        eyebrow="Galeria"
        title="Trabalhos feitos no studio"
        description="Resultados reais das nossas profissionais."
      />

      <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
        {galleryItems.map((item, index) => (
          <li key={item.src}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="rounded-card shadow-card hover:shadow-card-hover group block w-full overflow-hidden transition-shadow duration-200"
            >
              <ResponsiveImage
                src={item.src}
                alt={item.alt}
                sizes="(min-width: 768px) 33vw, 50vw"
                className="ease-brand aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100"
              />
              <span className="sr-only">Ampliar imagem</span>
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={active !== null}
        onClose={() => setOpenIndex(null)}
        title={active?.alt ?? 'Imagem da galeria'}
        description={active ? `Trabalho de ${active.credit}` : undefined}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(-1)}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Anterior
            </Button>

            <p className="text-brown-600 text-sm" aria-live="polite">
              {openIndex === null ? '' : `${openIndex + 1} de ${total}`}
            </p>

            <Button variant="outline" size="sm" onClick={() => goTo(1)} aria-label="Próxima imagem">
              Próxima
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        }
      >
        {active && (
          <ResponsiveImage
            src={active.src}
            alt={active.alt}
            // A versão ampliada ocupa quase toda a largura do diálogo.
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="rounded-control mx-auto max-h-[60vh] w-auto object-contain"
          />
        )}
      </Modal>
    </Section>
  );
}

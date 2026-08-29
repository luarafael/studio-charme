import { PublicLayout } from '@/layouts/PublicLayout';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { siteConfig } from '@/config/site';
import { HeroSection } from '@/features/home/HeroSection';
import { AboutSection } from '@/features/home/AboutSection';
import { ServicesSection } from '@/features/home/ServicesSection';
import { ProfessionalsSection } from '@/features/home/ProfessionalsSection';
import { GallerySection } from '@/features/home/GallerySection';
import { BookingSection } from '@/features/home/BookingSection';
import { InstagramSection } from '@/features/home/InstagramSection';
import { VisitSection } from '@/features/home/VisitSection';
import { ContactSection } from '@/features/home/ContactSection';

export default function HomePage() {
  useDocumentMeta({
    title: `${siteConfig.name} | Unhas, cabelos, cílios e sobrancelhas`,
    description: siteConfig.metaDescription,
  });

  return (
    <PublicLayout>
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <ProfessionalsSection />
      <GallerySection />
      <BookingSection />
      <InstagramSection />
      <VisitSection />
      <ContactSection />
    </PublicLayout>
  );
}

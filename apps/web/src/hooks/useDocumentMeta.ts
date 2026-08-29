import { useEffect } from 'react';

type DocumentMeta = {
  title: string;
  description?: string;
  /** Caminho canônico da página, relativo à raiz do site. */
  canonicalPath?: string;
  /** Impede indexação de páginas internas e de erro. */
  noIndex?: boolean;
};

function setMetaTag(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Mantém título, descrição e URL canônica sincronizados com a rota atual.
 *
 * Numa aplicação de página única o `<head>` estático não muda ao navegar, então
 * cada página define seus próprios metadados aqui — necessário para busca e para
 * o texto que aparece ao compartilhar o link.
 */
export function useDocumentMeta({
  title,
  description,
  canonicalPath,
  noIndex = false,
}: DocumentMeta): void {
  useEffect(() => {
    document.title = title;

    if (description) {
      setMetaTag('name', 'description', description);
      setMetaTag('property', 'og:description', description);
      setMetaTag('name', 'twitter:description', description);
    }

    setMetaTag('property', 'og:title', title);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    if (canonicalPath !== undefined) {
      const href = new URL(canonicalPath, window.location.origin).toString();
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = href;
      setMetaTag('property', 'og:url', href);
    }
  }, [title, description, canonicalPath, noIndex]);
}

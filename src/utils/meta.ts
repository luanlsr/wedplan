type PageMetadata = {
  title: string;
  description: string;
  image?: string | null;
  url?: string;
  type?: 'website' | 'article';
};

const defaultImage = '/image/wedplan_logo.png';

const absoluteUrl = (value?: string | null) => {
  if (!value) return new URL(defaultImage, window.location.origin).href;
  return new URL(value, window.location.origin).href;
};

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = content;
};

export const setPageMetadata = ({ title, description, image, url, type = 'website' }: PageMetadata) => {
  const pageUrl = url || window.location.href;
  const pageImage = absoluteUrl(image);

  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:site_name', 'WedPlan');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', pageImage);
  upsertMeta('property', 'og:image:alt', title);
  upsertMeta('property', 'og:url', pageUrl);
  upsertMeta('property', 'og:locale', 'pt_BR');
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', pageImage);
};

export const setDefaultPageMetadata = () => {
  setPageMetadata({
    title: 'WedPlan - Gestão completa para casamento',
    description: 'Organize convidados, RSVP, financeiro, tarefas, fornecedores e crie um site personalizado para o casal.',
    image: defaultImage,
    url: window.location.origin,
  });
};

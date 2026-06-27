import { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menuflow.in';

// Only marketing pages are indexable — /admin, /api, /r are disallowed in robots.txt
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/list-your-cafe',
    '/privacy-policy',
    '/terms-of-service',
    '/cookie-policy',
  ];

  return staticRoutes.map((route) => ({
    url: `${BASE}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.6,
  }));
}
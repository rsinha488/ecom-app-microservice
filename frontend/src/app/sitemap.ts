/**
 * Dynamic Sitemap Generation
 *
 * Generates an XML sitemap for SEO optimization.
 * Includes all public pages and dynamically fetches product listings.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 * @module app/sitemap
 */

import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
const PRODUCTS_API_URL = process.env.NEXT_PUBLIC_PRODUCTS_URL || 'http://localhost:3001';

/**
 * Fetch all products for sitemap inclusion
 *
 * @returns Promise<Array> Array of product objects with id and updatedAt
 */
async function getProducts() {
  try {
    const response = await fetch(`${PRODUCTS_API_URL}/v1/products?limit=1000`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      console.error('Failed to fetch products for sitemap');
      return [];
    }

    const data = await response.json();
    return data.data?.products || [];
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
    return [];
  }
}

/**
 * Generate sitemap entries
 *
 * @returns Promise<MetadataRoute.Sitemap> Sitemap configuration
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/auth/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamic product pages
  const products = await getProducts();
  const productPages: MetadataRoute.Sitemap = products.map((product: any) => ({
    url: `${SITE_URL}/products/${product._id}`,
    lastModified: new Date(product.updatedAt || product.createdAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...productPages];
}

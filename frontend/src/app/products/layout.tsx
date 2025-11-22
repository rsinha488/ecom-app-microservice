/**
 * Products Page Layout
 *
 * Provides SEO metadata and structured data for the products listing page.
 *
 * @module app/products/layout
 */

import { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

/**
 * Products page metadata for SEO
 */
export const metadata: Metadata = {
  title: 'Shop All Products',
  description:
    'Browse our complete collection of quality products. Find exactly what you need with our advanced search and filtering options. Free shipping on orders over $50.',
  keywords: [
    'products',
    'shop all',
    'online catalog',
    'product listing',
    'buy online',
    'ecommerce products',
  ],
  openGraph: {
    title: 'Shop All Products | E-commerce Platform',
    description: 'Browse our complete collection of quality products with free shipping on orders over $50.',
    url: `${SITE_URL}/products`,
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
};

/**
 * Products layout component
 *
 * Wraps products page with breadcrumb structured data
 */
export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  // JSON-LD for breadcrumb navigation
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: `${SITE_URL}/products`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}

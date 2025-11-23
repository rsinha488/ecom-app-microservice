/**
 * Product Detail Layout with Dynamic SEO Metadata
 *
 * Generates dynamic metadata for product pages to improve SEO.
 * Fetches product data server-side to populate Open Graph tags,
 * JSON-LD structured data, and meta descriptions.
 *
 * @module app/products/[id]/layout
 */

import { Metadata } from 'next';

const PRODUCTS_API_URL = process.env.NEXT_PUBLIC_PRODUCTS_URL || 'http://localhost:3001';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

interface ProductLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

/**
 * Fetch product data for metadata generation
 *
 * @param productId - Product ID from URL params
 * @returns Product data or null if not found
 */
async function getProduct(productId: string) {
  try {
    const response = await fetch(`${PRODUCTS_API_URL}/v1/products/${productId}`, {
      next: { revalidate: 60 }, // Revalidate every minute
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data?.product || data.product || null;
  } catch (error) {
    console.error('Error fetching product for metadata:', error);
    return null;
  }
}

/**
 * Generate dynamic metadata for product pages
 *
 * @param params - Route parameters containing product ID
 * @returns Metadata configuration for the product page
 */
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await getProduct(params.id);

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
    };
  }

  // Calculate savings if compareAtPrice exists
  const savings =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : 0;
  const savingsPercent =
    savings > 0 ? Math.round((savings / product.compareAtPrice) * 100) : 0;

  // Build description with key product features
  const description = product.description
    ? `${product.description.substring(0, 155)}...`
    : `Buy ${product.name} for $${product.price.toFixed(2)}. ${product.stock > 0 ? 'In stock' : 'Out of stock'}. ${savings > 0 ? `Save ${savingsPercent}%!` : ''}`;

  return {
    title: product.name,
    description,
    keywords: [
      product.name,
      product.category || 'product',
      'ecommerce',
      'online shopping',
      ...(product.tags || []),
    ],
    openGraph: {
      title: product.name,
      description,
      url: `${SITE_URL}/products/${params.id}`,
      siteName: 'E-commerce Platform',
      images: [
        {
          url: product.imageUrl || '/placeholder.png',
          width: 1200,
          height: 1200,
          alt: product.name,
        },
      ],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: [product.imageUrl || '/placeholder.png'],
    },
    alternates: {
      canonical: `${SITE_URL}/products/${params.id}`,
    },
    robots: {
      index: product.stock > 0, // Don't index out-of-stock products
      follow: true,
      googleBot: {
        index: product.stock > 0,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    // Additional metadata for rich snippets
    other: {
      'product:price:amount': product.price.toString(),
      'product:price:currency': 'USD',
      'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
      'product:condition': 'new',
      'product:brand': product.brand || 'E-commerce Platform',
      'product:category': product.category || 'General',
    },
  };
}

/**
 * Product detail layout component
 *
 * Wraps product detail page with JSON-LD structured data for search engines.
 *
 * @param props - Layout props with children and params
 * @returns Layout with structured data script
 */
export default async function ProductLayout({ children, params }: ProductLayoutProps) {
  const product = await getProduct(params.id);

  // Generate JSON-LD structured data for rich snippets
  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || `${product.name} - Buy online at E-commerce Platform`,
        image: product.imageUrl || '/placeholder.png',
        brand: {
          '@type': 'Brand',
          name: product.brand || 'E-commerce Platform',
        },
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}/products/${params.id}`,
          priceCurrency: 'USD',
          price: product.price.toFixed(2),
          priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          availability:
            product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: 'E-commerce Platform',
          },
        },
        aggregateRating: product.rating
          ? {
              '@type': 'AggregateRating',
              ratingValue: product.rating.toFixed(1),
              bestRating: '5',
              worstRating: '1',
              ratingCount: product.reviewCount || 1,
            }
          : undefined,
        sku: product._id,
        category: product.category || 'General',
      }
    : null;

  return (
    <>
      {/* Inject JSON-LD structured data into page head */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}

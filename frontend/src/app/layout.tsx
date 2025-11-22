/**
 * Root Layout Component
 *
 * Provides the foundational layout structure for the entire application.
 * Includes global SEO metadata, font optimization, Redux providers,
 * toast notifications, and main layout wrapper.
 *
 * @module app/layout
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from '@/components/layout/MainLayout';

// Configure Inter font with variable for optimal performance
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap', // Improve font loading performance
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';
const SITE_NAME = 'E-commerce Platform';

/**
 * Global metadata configuration for SEO
 *
 * Includes Open Graph, Twitter Cards, and structured metadata
 * for improved search engine visibility and social sharing.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s | ${SITE_NAME}`,
    default: `${SITE_NAME} - Shop Quality Products Online`,
  },
  description:
    'Discover quality products at unbeatable prices. Modern e-commerce platform powered by Next.js with secure checkout, fast shipping, and excellent customer service.',
  keywords: [
    'ecommerce',
    'online shopping',
    'buy products online',
    'online store',
    'shopping',
    'retail',
    'nextjs ecommerce',
    'secure checkout',
    'fast shipping',
  ],
  authors: [{ name: 'E-commerce Team', url: SITE_URL }],
  creator: 'E-commerce Platform',
  publisher: 'E-commerce Platform',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Shop Quality Products Online`,
    description: 'Discover quality products at unbeatable prices with secure checkout and fast shipping.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Online Shopping`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Shop Quality Products Online`,
    description: 'Discover quality products at unbeatable prices.',
    images: ['/og-image.png'],
    creator: '@ecommerce', // Replace with actual Twitter handle
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    // Add other verification codes as needed
  },
  category: 'ecommerce',
};

/**
 * Viewport configuration for responsive design
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4F46E5' },
    { media: '(prefers-color-scheme: dark)', color: '#4F46E5' },
  ],
};

/**
 * Root layout component props
 */
interface RootLayoutProps {
  /** Child components to render */
  children: React.ReactNode;
}

/**
 * Root Layout Component
 *
 * The foundational layout for all pages in the application.
 * Sets up the HTML structure, global providers, and notification system.
 *
 * Features:
 * - Redux store provider for global state management
 * - Toast notification system for user feedback
 * - Main layout wrapper with header/footer
 * - Font optimization with Inter variable font
 * - Responsive design with Tailwind CSS
 *
 * @param props - Component props
 * @returns Root HTML structure with providers
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50">
        {/* Redux Provider and Auth Provider wrapper */}
        <Providers>
          {/* Main layout with header and navigation */}
          <MainLayout>{children}</MainLayout>

          {/* Global toast notification container */}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </Providers>
      </body>
    </html>
  );
}

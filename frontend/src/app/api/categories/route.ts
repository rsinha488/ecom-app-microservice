import { NextRequest, NextResponse } from 'next/server';

const CATEGORIES_API_URL = process.env.NEXT_PUBLIC_CATEGORIES_URL || 'http://localhost:3002';

export async function GET(request: NextRequest) {
  try {
    // Fetch categories from categories service
    const response = await fetch(`${CATEGORIES_API_URL}/v1/categories`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('[Categories API] Error response:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch categories' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Handle new standardized format: data.data.categories or fallback to old formats
    const categories = data.data?.categories || data.categories || (Array.isArray(data) ? data : []);

    console.log('[Categories API] Success, categories count:', categories.length);
    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('[Categories API] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

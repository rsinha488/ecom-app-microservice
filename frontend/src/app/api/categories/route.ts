import { NextRequest, NextResponse } from 'next/server';

const CATEGORIES_API_URL = process.env.NEXT_PUBLIC_CATEGORIES_URL || 'http://localhost:3002';

export async function GET(request: NextRequest) {
  try {
    // Fetch categories from categories service
    const response = await fetch(`${CATEGORIES_API_URL}/api/v1/categories`);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to fetch categories' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ categories: data.results || [] });
  } catch (error: any) {
    console.error('Fetch categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

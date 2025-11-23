import { NextRequest, NextResponse } from 'next/server';

const PRODUCTS_API_URL = process.env.NEXT_PUBLIC_PRODUCTS_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch product from products service
    const response = await fetch(`${PRODUCTS_API_URL}/v1/products/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      throw new Error('Failed to fetch product');
    }

    const data = await response.json();
    // Extract product from standardized API response format
    const product = data.data?.product || data.product || data;
    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('Fetch product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

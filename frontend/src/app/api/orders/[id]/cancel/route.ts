import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ORDERS_API_URL = process.env.NEXT_PUBLIC_ORDERS_URL || 'http://localhost:3004';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated - please log in again' },
        { status: 401 }
      );
    }

    const { id } = params;

    console.log('[Cancel Order API] Cancelling order:', id);

    // Call orders service to cancel the order
    const response = await fetch(`${ORDERS_API_URL}/v1/orders/${id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[Cancel Order API] Response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to cancel order' }));
      console.error('[Cancel Order API] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to cancel order' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Cancel Order API] Order cancelled successfully');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Cancel Order API] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

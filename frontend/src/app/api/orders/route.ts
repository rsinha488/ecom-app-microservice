import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ORDERS_API_URL = process.env.NEXT_PUBLIC_ORDERS_URL || 'http://localhost:3004';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    console.log('[Orders API] Access token present:', !!accessToken);

    if (!accessToken) {
      console.log('[Orders API] No access token found, returning 401');
      return NextResponse.json(
        { error: 'Not authenticated - please log in again' },
        { status: 401 }
      );
    }

    // First, get user info from the access token to get userId
    // We need to fetch user info to get the userId
    const userInfoResponse = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8080'}/v1/auth/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[Orders API] Failed to get user info');
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 401 }
      );
    }

    const userInfo = await userInfoResponse.json();
    const userId = userInfo.sub || userInfo.id || userInfo._id;

    if (!userId) {
      console.error('[Orders API] No user ID in token');
      return NextResponse.json(
        { error: 'Invalid user token' },
        { status: 401 }
      );
    }

    console.log('[Orders API] User ID:', userId);

    // Fetch orders from orders service using user-specific endpoint
    console.log('[Orders API] Fetching from:', `${ORDERS_API_URL}/v1/orders/user/${userId}`);
    const response = await fetch(`${ORDERS_API_URL}/v1/orders/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('[Orders API] Response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('[Orders API] Error response:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch orders' },
        { status: response.status }
      );
    }

    const data = await response.json();
    // New standardized format: data.data.orders contains the orders array
    const orders = data.data?.orders || data.orders || [];
    console.log('[Orders API] Success, orders count:', orders.length);
    return NextResponse.json({
      success: true,
      data: { orders },
      message: 'Orders retrieved successfully'
    });
  } catch (error: any) {
    console.error('[Orders API] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Get user info to extract userId
    const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8080';
    const userInfoResponse = await fetch(`${AUTH_URL}/v1/auth/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[Orders API] Failed to get user info');
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 401 }
      );
    }

    const userInfo = await userInfoResponse.json();
    const userId = userInfo.sub || userInfo.id || userInfo._id;

    if (!userId) {
      console.error('[Orders API] No user ID in token');
      return NextResponse.json(
        { error: 'Invalid user token' },
        { status: 401 }
      );
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Prepare order data with userId and orderNumber
    const orderData = {
      ...body,
      userId,
      orderNumber,
    };

    console.log('[Orders API] Creating order:', orderNumber, 'for user:', userId);

    // Create order via orders service
    const response = await fetch(`${ORDERS_API_URL}/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Orders API] Create order failed:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create order' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Orders API] Order created successfully:', data.orderNumber);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

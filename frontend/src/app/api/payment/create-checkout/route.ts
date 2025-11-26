import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PAYMENT_API_URL = process.env.NEXT_PUBLIC_PAYMENT_URL || 'http://localhost:8080';

/**
 * POST /api/payment/create-checkout
 *
 * Creates a Stripe checkout session for online payment
 *
 * Request body:
 * {
 *   orderId: string,
 *   orderNumber: string,
 *   amount: number,
 *   currency?: string (default: 'usd'),
 *   paymentMethod: number (payment method code),
 *   items: Array<{productId, name, quantity, price}>
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     checkoutUrl: string,
 *     sessionId: string
 *   }
 * }
 */
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
    const { orderId, orderNumber, amount, currency = 'usd', paymentMethod, items } = body;

    // Validate required fields
    if (!orderId || !orderNumber || !amount || !paymentMethod || !items) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, orderNumber, amount, paymentMethod, items' },
        { status: 400 }
      );
    }

    // Get user info to extract userId and email
    const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8080';
    const userInfoResponse = await fetch(`${AUTH_URL}/v1/auth/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[Payment API] Failed to get user info');
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 401 }
      );
    }

    const userInfo = await userInfoResponse.json();
    const userId = userInfo.sub || userInfo.id || userInfo._id;
    const userEmail = userInfo.email;

    if (!userId) {
      console.error('[Payment API] No user ID in token');
      return NextResponse.json(
        { error: 'Invalid user token' },
        { status: 401 }
      );
    }

    console.log('[Payment API] Creating checkout session for order:', orderNumber);

    // Create checkout session via payment service
    const paymentData = {
      orderId,
      orderNumber,
      userId,
      amount,
      currency,
      paymentMethod,
      // Map items to include productName (required by backend)
      items: items.map((item: any) => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      customerEmail: userEmail,
      // Success and cancel URLs - frontend will handle these
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3006'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3006'}/payment/cancel?order_id=${orderId}`,
    };

    const response = await fetch(`${PAYMENT_API_URL}/v1/payment/checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Payment API] Create checkout failed:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create checkout session' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Payment API] Checkout session created successfully');

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: data.data?.checkoutUrl || data.checkoutUrl,
        sessionId: data.data?.sessionId || data.sessionId,
      }
    });
  } catch (error: any) {
    console.error('[Payment API] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

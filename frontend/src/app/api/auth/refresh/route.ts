import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      );
    }

    // Request new access token
    const response = await fetch(`${AUTH_API_URL}/api/v1/auth/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || 'ecommerce-client',
        client_secret: process.env.OAUTH_CLIENT_SECRET || 'ecommerce-secret-change-in-production',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Clear invalid cookies
      cookieStore.delete('accessToken');
      cookieStore.delete('refreshToken');
      cookieStore.delete('user');

      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 401 }
      );
    }

    // Update access token
    const isProduction = process.env.NODE_ENV === 'production';

    cookieStore.set('accessToken', data.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    // Update refresh token if provided
    if (data.refresh_token) {
      cookieStore.set('refreshToken', data.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

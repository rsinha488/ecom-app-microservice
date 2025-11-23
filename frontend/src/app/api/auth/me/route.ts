import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user info from auth service
    const response = await fetch(`${AUTH_API_URL}/v1/auth/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // Token might be expired, try to refresh
      const refreshResponse = await fetch(new URL('/api/auth/refresh', request.url), {
        method: 'POST',
      });

      if (!refreshResponse.ok) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        );
      }

      // Retry with new token
      const newAccessToken = cookieStore.get('accessToken')?.value;
      if (!newAccessToken) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        );
      }

      const retryResponse = await fetch(`${AUTH_API_URL}/v1/auth/oauth/userinfo`, {
        headers: {
          'Authorization': `Bearer ${newAccessToken}`,
        },
      });

      if (!retryResponse.ok) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }

      const userData = await retryResponse.json();
      return NextResponse.json({ user: userData });
    }

    const userData = await response.json();
    return NextResponse.json({ user: userData });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

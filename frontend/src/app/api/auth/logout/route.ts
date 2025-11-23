import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    // Revoke refresh token on auth server if exists
    if (refreshToken) {
      try {
        await fetch(`${AUTH_API_URL}/v1/auth/oauth/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: refreshToken,
            token_type_hint: 'refresh_token',
          }),
        });
      } catch (error) {
        console.error('Token revocation failed:', error);
        // Continue with logout even if revocation fails
      }
    }

    // Clear all auth cookies
    cookieStore.delete('accessToken');
    cookieStore.delete('refreshToken');
    cookieStore.delete('user');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

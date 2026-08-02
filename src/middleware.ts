import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const protectedPaths = ['/dashboard', '/api/categories', '/api/suppliers', '/api/buyers', '/api/stock', '/api/sales', '/api/payments', '/api/expenses', '/api/ledgers', '/api/dashboard', '/api/users', '/api/reports', '/api/returns'];

// async function verifyJWT(token: string): Promise<{ valid: boolean; payload?: any }> {
//   try {
//     const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
//     const { payload } = await jwtVerify(token, secret);
//     return { valid: true, payload };
//   } catch {
//     return { valid: false };
//   }
// }

async function verifyJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

    const { payload } = await jwtVerify(token, secret);

    console.log("JWT VERIFIED:", payload);

    return { valid: true, payload };
  } catch (err) {
    console.log("JWT ERROR:", err);
    return { valid: false };
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtected) {
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { valid, payload } = await verifyJWT(token);
    if (!valid) {
      const response = pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
        : NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('token', '', { httpOnly: true, maxAge: 0, path: '/' });
      return response;
    }

    if (payload?.status && payload.status !== 'active') {
      const response = pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Account not active' }, { status: 403 })
        : NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('token', '', { httpOnly: true, maxAge: 0, path: '/' });
      return response;
    }
  }

  if ((pathname === '/login' || pathname === '/register') && token) {
    const { valid } = await verifyJWT(token);
    if (valid) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/api/categories/:path*', '/api/suppliers/:path*', '/api/buyers/:path*', '/api/stock/:path*', '/api/sales/:path*', '/api/payments/:path*', '/api/expenses/:path*', '/api/ledgers/:path*', '/api/dashboard/:path*', '/api/users/:path*', '/api/reports/:path*', '/api/returns', '/api/returns/:path*'],
};

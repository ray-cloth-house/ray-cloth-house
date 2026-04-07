import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Please define the SESSION_SECRET environment variable');
  }
  return secret;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
  status: 'pending' | 'active' | 'suspended';
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(req?: NextRequest): Promise<JWTPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get('token')?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get('token')?.value;
  }

  if (!token) return null;
  return verifyToken(token);
}

export function requireRole(authUser: JWTPayload | null, allowedRoles: string[]): { error: string; status: number } | null {
  if (!authUser) return { error: 'Unauthorized', status: 401 };
  if (!authUser.role || !allowedRoles.includes(authUser.role)) {
    return { error: 'Access denied. Insufficient permissions.', status: 403 };
  }
  return null;
}

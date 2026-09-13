import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'expenro_session';
const SECRET_KEY = process.env.AUTH_SECRET || 'expenro-secure-auth-jwt-secret-key-32chars-minimum!';
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export interface SessionPayload {
  userId: string;
  email: string;
  fullName?: string;
  [key: string]: unknown;
}

/**
 * Signs a JWT session token using jose.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encodedKey);
}

/**
 * Verifies a JWT session token using jose. Works in Node.js and Edge runtime.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Sets the session HTTP-only cookie on the server response.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Retrieves the current session user from the incoming request cookies.
 */
export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Resolves the active user ID for server actions:
 * 1. Checks current HTTP session cookie
 * 2. If an explicit valid 24-character ObjectId is passed, uses it
 * 3. Fallback: finds the primary user in MongoDB
 */
export async function getEffectiveUserId(explicitUserId?: string | null): Promise<string | null> {
  const session = await getSessionUser();
  if (session?.userId) return session.userId;

  if (
    explicitUserId &&
    explicitUserId.length === 24 &&
    /^[0-9a-fA-F]{24}$/.test(explicitUserId)
  ) {
    return explicitUserId;
  }

  try {
    const { connectToDatabase } = await import('@/lib/mongodb/client');
    const { UserModel } = await import('@/lib/mongodb/models');
    await connectToDatabase();
    const primaryUser = await UserModel.findOne().sort({ createdAt: 1 }).lean();
    if (primaryUser) return primaryUser._id.toString();
  } catch (err) {
    console.error('[Auth] getEffectiveUserId fallback error:', err);
  }

  return null;
}

export { COOKIE_NAME };


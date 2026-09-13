import { NextResponse } from 'next/server';
import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { UserModel } from '@/lib/mongodb/models';
import { signSessionToken, COOKIE_NAME } from '@/lib/auth/session';

export async function POST() {
  try {
    let userId = '6a9e8338bc83e9b201534dd6';
    let email = 'jaswanthmg2006@gmail.com';
    let fullName = 'Jaswanth';

    if (isMongoConfigured()) {
      await connectToDatabase();
      const primaryUser = await UserModel.findOne().sort({ createdAt: 1 }).lean();
      if (primaryUser) {
        userId = primaryUser._id.toString();
        email = primaryUser.email;
        fullName = primaryUser.fullName || 'Jaswanth';
      }
    }

    const token = await signSessionToken({
      userId,
      email,
      fullName,
    });

    const res = NextResponse.json({
      success: true,
      user: { id: userId, email, fullName },
    });

    // 1. Set the main session cookie via HTTP headers so mobile Safari registers it reliably
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    // 2. Set the demo flag cookie
    res.cookies.set('expenro_demo_user', 'true', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

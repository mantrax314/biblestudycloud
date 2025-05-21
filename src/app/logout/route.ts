import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await signOut(auth);

    // Dynamically determine the host and protocol
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';

    if (host) {
      // Construct the redirect URL using the dynamic host and protocol
      return NextResponse.redirect(`${protocol}://${host}/login`);
    } else {
      // This is an unlikely fallback if host headers are missing.
      // Log an error. For a server-side redirect, an absolute URL is best.
      // If host cannot be determined, using a fixed known URL is a last resort if necessary,
      // or ensure your environment consistently provides the host headers.
      console.error('Error logging out: Could not determine host for redirect. Check proxy/hosting configuration.');
      // As an absolute last resort and acknowledging the domain change issue you raised,
      // we'd have to use a pre-configured domain or handle the error more gracefully.
      // For now, this will lead to an error response if host is not found.
      return NextResponse.json({ error: 'Failed to determine redirect URL' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link for navigation
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase'; // Assuming your firebase.ts exports auth

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div>
      <h1>Hello World!</h1>
      {/* Add Logout Link */}
      <Link href="/logout">
        Logout
      </Link>
    </div>
  );
}

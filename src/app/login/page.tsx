'use client';
import { useState } from 'react';
// Removed FirebaseError import as it's not directly exported in some SDK versions
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/'); // Redirect to dashboard on successful login
    } catch (err: unknown) {
      // Structural check for Firebase-like errors (object with a string 'code' property)
      if (typeof err === 'object' && err !== null && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
        const errorCode = (err as { code: string }).code;
        switch (errorCode) {
          case 'auth/invalid-email':
            setError('Formato de correo inválido');
            break;
          case 'auth/invalid-credential':
            setError('Credenciales incorrectas. Por favor, verifica tu correo y contraseña.');
            break;
          case 'auth/user-not-found':
            setError('Usuario no encontrado. Verifica el correo electrónico.');
            break;
          case 'auth/wrong-password':
            setError('Contraseña incorrecta. Por favor, inténtalo de nuevo.');
            break;
          default:
            console.error('Firebase Authentication Error:', err); // Log the actual error
            setError('Ocurrió un error de autenticación. Por favor, inténtalo de nuevo.');
        }
      } else if (err instanceof Error) { // For generic errors that are instances of Error
        console.error('Generic Error:', err);
        setError(err.message);
      } else { // For other unknown error types
        console.error('Unknown Error:', err);
        setError('Ocurrió un error inesperado. Por favor, inténtalo de nuevo.');
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start pt-20" style={{ background: 'linear-gradient(180deg, #f5e9d8 0%, #e0d0b8 100%)' }}>
      <div className="text-5xl font-bold mb-20" style={{ fontFamily: 'serif', color: '#5a4132' }}>BibleCloud</div>
      <div className="text-lg italic mb-16" style={{ color: '#808080' }}>¡Bienvenido!</div>
      <form onSubmit={handleLogin} className="flex flex-col items-center w-full px-8 max-w-sm">
        {error && (
          <div className="text-red-500 mb-4 text-center">
            {error}
          </div>
        )}
        <div className="w-full relative">
          <input
            placeholder="Usuario"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none border-b-2 border-[#d3b596] w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none bg-transparent placeholder-gray-500 mb-8"
            required
          />
        </div>
        <div className="w-full relative mb-12">
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none border-b-2 border-[#d3b596] w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none bg-transparent placeholder-gray-500"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          style={{
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
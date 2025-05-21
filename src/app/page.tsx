'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface Chapter {
  id: string;
  section: string;
  chapter: string;
}

export default function Home() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false); // State for modal

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch Bible chapters
  useEffect(() => {
    fetch('/bible_chapters.json')
      .then((res) => res.json())
      .then((data) => {
        setAllChapters(data);
        setFilteredChapters(data);
      })
      .catch(console.error);
  }, []);

  // Filter chapters based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredChapters(allChapters);
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase();
      setFilteredChapters(
        allChapters.filter(
          (chapter) =>
            chapter.section.toLowerCase().includes(lowerSearchTerm) ||
            chapter.chapter.toLowerCase().includes(lowerSearchTerm) ||
            `${chapter.section.toLowerCase()} ${chapter.chapter.toLowerCase()}`.includes(lowerSearchTerm)
        )
      );
    }
  }, [searchTerm, allChapters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleMenuClick = () => {
    setIsMenuModalOpen(true);
  };

  const closeMenuModal = () => {
    setIsMenuModalOpen(false);
  };

  return (
    <div className={`flex min-h-screen flex-col items-center justify-start pt-8 px-4 md:pt-12 ${isMenuModalOpen ? 'overflow-hidden' : ''}`} style={{ background: 'linear-gradient(180deg, #f5e9d8 0%, #e0d0b8 100%)' }}>
      {/* Header Section */}
      <div className="w-full max-w-3xl flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'serif', color: '#5a4132' }}>
          Bible Study Cloud
        </h1>
        <button
          onClick={handleMenuClick}
          className="bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm md:text-base"
          style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
        >
          Menu
        </button>
      </div>

      {/* Search Input Section */}
      <div className="w-full max-w-xl mb-8 relative flex items-center">
        <input
          type="text"
          placeholder="Búsqueda"
          value={searchTerm}
          onChange={handleSearchChange}
          className="appearance-none border-b-2 border-[#d3b596] w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none bg-transparent placeholder-gray-600 text-lg"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-0 mr-3 text-gray-600 hover:text-gray-800 text-2xl"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {/* Chapters List Section */}
      <div className="w-full max-w-xl bg-white/30 backdrop-blur-sm p-4 rounded-lg shadow-md overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' /* Adjust based on header/footer height */ }}>
        {filteredChapters.length > 0 ? (
          <ul>
            {filteredChapters.map((chapter) => (
              <li key={chapter.id} className="py-2 px-3 border-b border-gray-300/50 hover:bg-white/20 cursor-pointer">
                {chapter.section} {chapter.chapter}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-600 py-4">No se encontraron capítulos.</p>
        )}
      </div>

      {/* Logout Link - now part of the main layout, not menu modal logic explicitly here */}
      <div className="mt-auto pt-8 pb-8">
        {/* The main logout is in the menu modal now, this one could be removed or kept as an alternative */}
        <Link href="/logout" className="text-[#5a4132] hover:underline">
          Logout (alternative)
        </Link>
      </div>

      {/* Menu Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#f5e9d8] to-[#e0d0b8] p-6 rounded-lg shadow-2xl w-full max-w-xs mx-auto">
            <div className="flex flex-col space-y-3">
              <Link
                href="/logout"
                onClick={closeMenuModal} // Close modal on click
                className="w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline text-center"
                style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
              >
                Cerrar Sesión
              </Link>
              <button
                onClick={closeMenuModal}
                className="w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline"
                style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

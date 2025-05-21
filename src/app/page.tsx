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

// Helper function to normalize text (lowercase and remove accents)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose combined graphemes into base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
};

export default function Home() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    fetch('/bible_chapters.json')
      .then((res) => res.json())
      .then((data) => {
        setAllChapters(data);
        setFilteredChapters(data);
      })
      .catch(console.error);
  }, []);

  // Filter chapters based on search term (accent-insensitive)
  useEffect(() => {
    if (!searchTerm) {
      setFilteredChapters(allChapters);
    } else {
      const normalizedSearchTerm = normalizeText(searchTerm);
      setFilteredChapters(
        allChapters.filter((chapter) => {
          const normalizedSection = normalizeText(chapter.section);
          const normalizedChapterNum = normalizeText(chapter.chapter); // Chapter numbers usually don't have accents, but good for consistency
          const normalizedCombined = `${normalizedSection} ${normalizedChapterNum}`;

          return (
            normalizedSection.includes(normalizedSearchTerm) ||
            normalizedChapterNum.includes(normalizedSearchTerm) ||
            normalizedCombined.includes(normalizedSearchTerm)
          );
        })
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

  const buttonStyle = "bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm md:text-base";
  const inputStyle = "appearance-none border-b-2 border-[#d3b596] w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none bg-transparent placeholder-gray-600 text-lg";

  return (
    <div className={`flex min-h-screen flex-col items-center justify-start ${isMenuModalOpen ? 'overflow-hidden' : ''} pt-6 pb-32 md:pt-12 md:pb-6 px-4`}
         style={{ background: 'linear-gradient(180deg, #f5e9d8 0%, #e0d0b8 100%)' }}>
      
      {/* Desktop: Menu Button (Top Right) */}
      <div className="w-full max-w-xl mx-auto hidden md:flex justify-end items-center mb-6">
        <button
          onClick={handleMenuClick}
          className={buttonStyle}
          style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
        >
          Menu
        </button>
      </div>

      {/* Desktop: Search Input Section (Below Menu Button) */}
      <div className="w-full max-w-xl mx-auto hidden md:block mb-6 relative items-center">
        <input
          type="text"
          placeholder="Búsqueda"
          value={searchTerm}
          onChange={handleSearchChange}
          className={inputStyle}
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute top-0 bottom-0 right-0 mr-3 text-gray-600 hover:text-gray-800 text-2xl flex items-center"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {/* Chapters List Section (Main Content Area) */}
      <div className="w-full max-w-xl mx-auto bg-white/30 backdrop-blur-sm p-4 rounded-lg shadow-md overflow-y-auto flex-grow">
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

      {/* Mobile: Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 space-y-3 shadow-top-md" style={{backgroundColor: '#e0d0b8'}}>
        <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Búsqueda"
              value={searchTerm}
              onChange={handleSearchChange}
              className={`${inputStyle} py-2 text-base`}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute top-0 bottom-0 right-0 mr-3 text-gray-600 hover:text-gray-800 text-xl flex items-center"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
        </div>
        <button
          onClick={handleMenuClick}
          className={`${buttonStyle} w-full py-2.5 text-base`}
          style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
        >
          Menu
        </button>
      </div>

      {/* Menu Modal (Remains the same) */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#f5e9d8] to-[#e0d0b8] p-6 rounded-lg shadow-2xl w-full max-w-xs mx-auto">
            <div className="flex flex-col space-y-3">
              <Link
                href="/logout"
                onClick={closeMenuModal}
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

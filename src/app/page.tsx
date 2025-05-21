'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth'; // Import User type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { auth, db } from '../lib/firebase'; // Import db
// Firestore imports will be added in the next phase

interface Chapter {
  id: string;
  section: string;
  chapter: string;
}

// Interface for the structure of read chapter data (matches Firestore)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ReadChapterData {
  id: string; // chapter.id
  section: string;
  chapter: string;
  latestReadTimestamp: string; // ISO string
  allTimestamps: string[];     // Array of ISO strings
  notes?: string; // Optional notes
}

// Helper function to normalize text (lowercase and remove accents)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Helper function to format timestamp (e.g., May 01 25 14:00)
const formatTimestamp = (isoString: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { // Using en-US for "May 01 25" style as per image, adjust if locale is different
      month: 'short',
      day: '2-digit',
      year: '2-digit', // Assuming 2-digit year is acceptable as per image
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Assuming 24-hour format
    }).replace(',', ''); // Remove comma often inserted by toLocaleDateString
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid date';
  }
};

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  // State to store read status: chapterId -> { latestReadTimestamp: string, firestoreDocId?: string }
  const [readStatus, setReadStatus] = useState<Record<string, { latestReadTimestamp: string; firestoreDocId?: string }>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // In next phase, we'll fetch read status from Firestore here
      } else {
        setCurrentUser(null);
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

  useEffect(() => {
    if (!searchTerm) {
      setFilteredChapters(allChapters);
    } else {
      const normalizedSearchTerm = normalizeText(searchTerm);
      setFilteredChapters(
        allChapters.filter((chapter) => {
          const normalizedSection = normalizeText(chapter.section);
          const normalizedChapterNum = normalizeText(chapter.chapter);
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

  const handleMarkAsRead = async (chapter: Chapter) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const chapterId = chapter.id;

    console.log(`Attempting to mark chapter ${chapterId} as read for user ${currentUser.uid}`);
    // --- Firestore logic will go here in the next phase ---
    // For now, just update local state to give UI feedback
    setReadStatus(prevStatus => ({
      ...prevStatus,
      [chapterId]: { latestReadTimestamp: now }
    }));
    alert(`Marcado ${chapter.section} ${chapter.chapter} como leído (localmente).
Timestamp: ${now}`);
    // In the next phase, we will:
    // 1. Check if a document for this chapterId already exists for the user.
    // 2. If yes, update its latestReadTimestamp and add to allTimestamps.
    // 3. If no, create a new document with the ReadChapterData structure.
  };

  const handleMenuClick = () => setIsMenuModalOpen(true);
  const closeMenuModal = () => setIsMenuModalOpen(false);

  const buttonStyle = "bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm md:text-base";
  const inputStyle = "appearance-none border-b-2 border-[#d3b596] w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none bg-transparent placeholder-gray-600 text-lg";

  return (
    <div className={`flex min-h-screen flex-col items-center ${isMenuModalOpen ? 'overflow-hidden' : ''} pt-6 pb-36 md:pt-12 md:pb-6 px-4`}
         style={{ background: 'linear-gradient(180deg, #f5e9d8 0%, #e0d0b8 100%)' }}>
      
      <div className="w-full max-w-xl mx-auto hidden md:flex justify-end items-center mb-6">
        <button onClick={handleMenuClick} className={buttonStyle} style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>Menu</button>
      </div>

      <div className="w-full max-w-xl mx-auto hidden md:block mb-6 relative items-center">
        <input type="text" placeholder="Búsqueda" value={searchTerm} onChange={handleSearchChange} className={inputStyle} />
        {searchTerm && (
          <button onClick={clearSearch} className="absolute top-0 bottom-0 right-0 mr-3 text-gray-600 hover:text-gray-800 text-2xl flex items-center" aria-label="Clear search">&times;</button>
        )}
      </div>

      <div className="w-full max-w-xl mx-auto bg-white/30 backdrop-blur-sm p-2 md:p-4 rounded-lg shadow-md overflow-y-auto flex-grow">
        {filteredChapters.length > 0 ? (
          <ul>
            {filteredChapters.map((chapter) => {
              const isRead = !!readStatus[chapter.id];
              const timestamp = readStatus[chapter.id]?.latestReadTimestamp;
              return (
                <li key={chapter.id} className="flex items-center justify-between py-2.5 px-2 md:px-3 border-b border-gray-300/50 hover:bg-black/5 cursor-default">
                  <div className="flex items-center">
                    <button 
                      onClick={() => handleMarkAsRead(chapter)} 
                      className={`mr-3 w-6 h-6 border-2 rounded flex items-center justify-center focus:outline-none transition-colors ${isRead ? 'bg-[#8B4513]/70 border-[#654321]' : 'bg-transparent border-gray-400 hover:border-gray-500'}`}
                      aria-label={isRead ? `Marcar ${chapter.section} ${chapter.chapter} como no leído` : `Marcar ${chapter.section} ${chapter.chapter} como leído`}
                    >
                      {isRead && <span className="text-white text-sm">✓</span>}
                    </button>
                    <span className="text-sm md:text-base text-gray-800">{chapter.section} {chapter.chapter}</span>
                  </div>
                  {isRead && timestamp && (
                    <span className="text-xs text-gray-600 ml-2 whitespace-nowrap">
                      ({formatTimestamp(timestamp)})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-center text-gray-600 py-4">No se encontraron capítulos.</p>
        )}
      </div>

      {/* Mobile: Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 space-y-3 shadow-top-md" style={{backgroundColor: '#e0d0b8'}}>
        <div className="relative flex items-center">
            <input type="text" placeholder="Búsqueda" value={searchTerm} onChange={handleSearchChange} className={`${inputStyle} py-2 text-base`} />
            {searchTerm && (
              <button onClick={clearSearch} className="absolute top-0 bottom-0 right-0 mr-3 text-gray-600 hover:text-gray-800 text-xl flex items-center" aria-label="Clear search">&times;</button>
            )}
        </div>
        <button onClick={handleMenuClick} className={`${buttonStyle} w-full py-2.5 text-base`} style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>Menu</button>
      </div>

      {/* Menu Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#f5e9d8] to-[#e0d0b8] p-6 rounded-lg shadow-2xl w-full max-w-xs mx-auto">
            <div className="flex flex-col space-y-3">
              <Link href="/logout" onClick={closeMenuModal} className="w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline text-center" style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>Cerrar Sesión</Link>
              <button onClick={closeMenuModal} className="w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline" style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

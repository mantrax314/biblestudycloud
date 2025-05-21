'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
  getDocs,
  query
} from 'firebase/firestore';

interface Chapter {
  id: string;
  section: string;
  chapter: string;
}

interface ReadChapterData {
  id: string; 
  section: string;
  chapter: string;
  latestReadTimestamp: string; 
  allTimestamps: string[];
  notes?: string;
}

const normalizeText = (text: string): string => {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const formatTimestamp = (isoString: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).replace(',', '');
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid date';
  }
};

const FullPageLoader = ({ message }: { message: string }) => (
  <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(180deg, #f5e9d8 0%, #e0d0b8 100%)' }}>
    <p className="text-xl text-[#5a4132]">{message}</p>
  </div>
);

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchTerm, setSearchTerm] = useState('');
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [readStatus, setReadStatus] = useState<Record<string, { latestReadTimestamp: string; firestoreDocId: string }>>({});
  const [isLoadingReadStatus, setIsLoadingReadStatus] = useState(true);
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);

  const loadReadChapters = async (userId: string) => {
    setIsLoadingReadStatus(true);
    const newReadStatus: Record<string, { latestReadTimestamp: string; firestoreDocId: string }> = {};
    try {
      const q = query(collection(db, "users", userId, "readChapters"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as ReadChapterData;
        if (data.id) {
            newReadStatus[data.id] = { 
                latestReadTimestamp: data.latestReadTimestamp,
                firestoreDocId: docSnap.id 
            };
        }
      });
      setReadStatus(newReadStatus);
    } catch (error) {
      console.error("Error loading read chapters: ", error);
      // Optionally set an error state here to inform the user
    }
    setIsLoadingReadStatus(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        loadReadChapters(user.uid); // loadReadChapters sets setIsLoadingReadStatus(false) internally
      } else {
        setCurrentUser(null);
        setReadStatus({});
        setIsLoadingReadStatus(true); // Reset loading state for read chapters on logout
        router.push('/login');
      }
      setAuthCheckCompleted(true); // Crucially, set this after user state is confirmed and actions initiated
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    fetch('/bible_chapters.json')
      .then((res) => res.json()).then((data) => {
        setAllChapters(data);
        setFilteredChapters(data);
      }).catch(console.error);
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
    if (!currentUser) {
      alert("Debes iniciar sesión para marcar capítulos.");
      return;
    }
    const userId = currentUser.uid;
    const chapterId = chapter.id;
    const nowISO = new Date().toISOString();

    const docRef = doc(db, "users", userId, "readChapters", chapterId);

    try {
      const docSnap = await getDoc(docRef);
      const newTimestampToDisplay = nowISO;

      if (docSnap.exists()) {
        await updateDoc(docRef, {
          latestReadTimestamp: nowISO,
          allTimestamps: arrayUnion(nowISO)
        });
        console.log(`Chapter ${chapterId} updated for user ${userId}`);
      } else {
        const newReadEntry: ReadChapterData = {
          id: chapter.id,
          section: chapter.section,
          chapter: chapter.chapter,
          latestReadTimestamp: nowISO,
          allTimestamps: [nowISO],
          notes: ""
        };
        await setDoc(docRef, newReadEntry);
        console.log(`Chapter ${chapterId} marked as read for user ${userId}`);
      }
      setReadStatus(prevStatus => ({
        ...prevStatus,
        [chapterId]: { latestReadTimestamp: newTimestampToDisplay, firestoreDocId: chapterId } 
      }));
    } catch (error) {
      console.error("Error updating read status: ", error);
      alert("Error al guardar el estado de lectura. Inténtalo de nuevo.");
    }
  };
  
  const handleMenuClick = () => setIsMenuModalOpen(true);
  const closeMenuModal = () => setIsMenuModalOpen(false);

  const buttonStyle = "bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm md:text-base";
  const inputStyle = "appearance-none border-b-2 border-[#d3b596] w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none bg-transparent placeholder-gray-600 text-lg";

  if (!authCheckCompleted) {
    return <FullPageLoader message="Verificando sesión..." />;
  }
  if (!currentUser && authCheckCompleted) { // Explicitly check authCheckCompleted here too
    // router.push should have already initiated, this is a fallback display state
    return <FullPageLoader message="Redirigiendo a inicio de sesión..." />;
  }
  // currentUser exists at this point, and auth check is done.
  // Now check if read status is still loading for the authenticated user.
  if (isLoadingReadStatus) { 
    return <FullPageLoader message="Cargando datos..." />;
  }

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
                      aria-label={isRead ? `Desmarcar ${chapter.section} ${chapter.chapter}` : `Marcar ${chapter.section} ${chapter.chapter} como leído`}
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

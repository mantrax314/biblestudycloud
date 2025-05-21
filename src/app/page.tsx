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
  // arrayUnion, // We will manually prepend to the array
  collection,
  getDocs,
  query,
  deleteDoc // For "Mark as Unread"
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

const formatTimestampForModal = (isoString: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(',', '');
  } catch (e) {
    console.error('Error formatting date for modal:', e);
    return 'Invalid date';
  }
};

const formatTimestampForList = (isoString: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).replace(',', '');
  } catch (e) {
    console.error('Error formatting date for list:', e);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [readStatus, setReadStatus] = useState<Record<string, { latestReadTimestamp: string; firestoreDocId: string }>>({});
  const [isLoadingReadStatus, setIsLoadingReadStatus] = useState(true);
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);

  const [isChapterDetailModalOpen, setIsChapterDetailModalOpen] = useState(false);
  const [selectedChapterForModal, setSelectedChapterForModal] = useState<Chapter | null>(null);
  const [detailedChapterData, setDetailedChapterData] = useState<ReadChapterData | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [isLoadingChapterDetails, setIsLoadingChapterDetails] = useState(false);
  const [showUnreadConfirm, setShowUnreadConfirm] = useState(false);

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
    }
    setIsLoadingReadStatus(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        loadReadChapters(user.uid);
      } else {
        setCurrentUser(null);
        setReadStatus({});
        setIsLoadingReadStatus(true);
        router.push('/login');
      }
      setAuthCheckCompleted(true);
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
    if (!currentUser) return alert("Debes iniciar sesión.");
    const userId = currentUser.uid;
    const chapterId = chapter.id;
    const nowISO = new Date().toISOString();
    const docRef = doc(db, "users", userId, "readChapters", chapterId);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const existingData = docSnap.data() as ReadChapterData;
        const updatedTimestamps = [nowISO, ...(existingData.allTimestamps || [])];
        await updateDoc(docRef, { latestReadTimestamp: nowISO, allTimestamps: updatedTimestamps });
      } else {
        const newReadEntry: ReadChapterData = { id: chapter.id, section: chapter.section, chapter: chapter.chapter, latestReadTimestamp: nowISO, allTimestamps: [nowISO], notes: "" };
        await setDoc(docRef, newReadEntry);
      }
      setReadStatus(prev => ({ ...prev, [chapterId]: { latestReadTimestamp: nowISO, firestoreDocId: chapterId } }));
    } catch (error) { console.error("Error updating read status: ", error); alert("Error al guardar."); }
  };

  const handleChapterItemClick = async (chapter: Chapter) => {
    if (!currentUser) return;
    setSelectedChapterForModal(chapter);
    setIsChapterDetailModalOpen(true);
    setIsLoadingChapterDetails(true);
    setShowUnreadConfirm(false);
    const docRef = doc(db, "users", currentUser.uid, "readChapters", chapter.id);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDetailedChapterData(docSnap.data() as ReadChapterData);
        setCurrentNotes(docSnap.data().notes || '');
      } else {
        setDetailedChapterData({ ...chapter, latestReadTimestamp: '', allTimestamps: [], notes: '' });
        setCurrentNotes('');
      }
    } catch (error) {
      console.error("Error fetching chapter details:", error);
      setDetailedChapterData({ ...chapter, latestReadTimestamp: '', allTimestamps: [], notes: '' });
      setCurrentNotes('');
    }
    setIsLoadingChapterDetails(false);
  };

  const handleSaveNotes = async () => {
    if (!currentUser || !selectedChapterForModal || !detailedChapterData) return;
    const docRef = doc(db, "users", currentUser.uid, "readChapters", selectedChapterForModal.id);
    try {
      if (!detailedChapterData.allTimestamps || detailedChapterData.allTimestamps.length === 0) {
        const nowISO = new Date().toISOString();
        const newReadEntry: ReadChapterData = {
          id: selectedChapterForModal.id,
          section: selectedChapterForModal.section,
          chapter: selectedChapterForModal.chapter,
          latestReadTimestamp: nowISO,
          allTimestamps: [nowISO],
          notes: currentNotes
        };
        await setDoc(docRef, newReadEntry);
        setDetailedChapterData(newReadEntry);
        setReadStatus(prev => ({ ...prev, [selectedChapterForModal.id]: { latestReadTimestamp: nowISO, firestoreDocId: selectedChapterForModal.id } }));
      } else {
        await updateDoc(docRef, { notes: currentNotes });
        setDetailedChapterData(prev => prev ? { ...prev, notes: currentNotes } : null);
      }
      alert("Notas guardadas!");
    } catch (error) { console.error("Error saving notes: ", error); alert("Error al guardar notas."); }
  };

  const handleMarkUnread = async () => {
    if (!currentUser || !selectedChapterForModal) return;
    setShowUnreadConfirm(true);
  };

  const confirmMarkUnread = async () => {
    if (!currentUser || !selectedChapterForModal) return;
    const docRef = doc(db, "users", currentUser.uid, "readChapters", selectedChapterForModal.id);
    try {
      await deleteDoc(docRef);
      setReadStatus(prev => {
        const newState = { ...prev };
        delete newState[selectedChapterForModal.id];
        return newState;
      });
      setDetailedChapterData(null);
      setIsChapterDetailModalOpen(false);
      alert("Capítulo marcado como no leído.");
    } catch (error) { console.error("Error marking as unread: ", error); alert("Error al marcar como no leído."); }
    setShowUnreadConfirm(false);
  };

  const handleMenuClick = () => setIsMenuModalOpen(true);
  const closeMenuModal = () => setIsMenuModalOpen(false);
  const closeChapterDetailModal = () => {
    setIsChapterDetailModalOpen(false);
    setSelectedChapterForModal(null);
    setDetailedChapterData(null);
    setCurrentNotes('');
    setShowUnreadConfirm(false);
  };

  const buttonStyle = "bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm md:text-base";
  const inputStyle = "appearance-none border-b-2 border-[#d3b596] w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none bg-transparent placeholder-gray-600 text-lg";
  const modalButtonStyle = "w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2.5 px-4 rounded focus:outline-none focus:shadow-outline text-center";

  if (!authCheckCompleted) return <FullPageLoader message="Verificando sesión..." />;
  if (!currentUser && authCheckCompleted) return <FullPageLoader message="Redirigiendo a inicio de sesión..." />;
  if (isLoadingReadStatus) return <FullPageLoader message="Cargando datos..." />;

  return (
    <div className={`flex min-h-screen flex-col items-center ${isMenuModalOpen || isChapterDetailModalOpen ? 'overflow-hidden' : ''} pt-6 pb-36 md:pt-12 md:pb-6 px-4`}
         style={{ background: 'linear-gradient(180deg, #f5e9d8 0%, #e0d0b8 100%)' }}>
      
      <div className="w-full max-w-xl mx-auto hidden md:flex justify-end items-center mb-6">
        <button onClick={handleMenuClick} className={buttonStyle} style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>Menu</button>
      </div>

      <div className="w-full max-w-xl mx-auto hidden md:block mb-6 relative items-center">
        <input type="text" placeholder="Búsqueda" value={searchTerm} onChange={handleSearchChange} className={inputStyle} />
        {searchTerm && <button onClick={clearSearch} className="absolute top-0 bottom-0 right-0 mr-3 text-gray-600 hover:text-gray-800 text-2xl flex items-center" aria-label="Clear search">&times;</button>}
      </div>

      <div className="w-full max-w-xl mx-auto bg-white/30 backdrop-blur-sm p-2 md:p-4 rounded-lg shadow-md overflow-y-auto flex-grow">
        {filteredChapters.length > 0 ? (
          <ul>
            {filteredChapters.map((chapter) => {
              const isRead = !!readStatus[chapter.id];
              const timestamp = readStatus[chapter.id]?.latestReadTimestamp;
              return (
                <li key={chapter.id} className="flex items-center justify-between py-2 px-2 md:px-3 border-b border-gray-300/50">
                  {/* Make the entire div clickable for opening the detail modal */}
                  <div onClick={() => handleChapterItemClick(chapter)} className="flex items-center flex-grow min-w-0 cursor-pointer hover:bg-black/10 rounded px-1 py-0.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMarkAsRead(chapter);}} // Stop propagation to prevent modal open
                      className={`mr-2 md:mr-3 w-5 h-5 md:w-6 md:h-6 border-2 rounded flex-shrink-0 flex items-center justify-center focus:outline-none transition-colors ${isRead ? 'bg-[#8B4513]/70 border-[#654321]' : 'bg-transparent border-gray-400 hover:border-gray-500'}`}
                      aria-label={isRead ? `Marcar ${chapter.section} ${chapter.chapter} como leído nuevamente` : `Marcar ${chapter.section} ${chapter.chapter} como leído`}
                    >
                      {isRead && <span className="text-white text-xs md:text-sm">✓</span>}
                    </button>
                    {/* Removed onClick from here, moved to parent div */}
                    <span className="text-sm md:text-base text-gray-800 truncate">
                      {chapter.section} {chapter.chapter}
                    </span>
                  </div>
                  {isRead && timestamp && (
                    <span onClick={() => handleChapterItemClick(chapter)} className="text-xs text-gray-500 ml-2 whitespace-nowrap cursor-pointer hover:text-[#654321]">
                      ({formatTimestampForList(timestamp)})
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

      {/* Mobile Bottom Bar (existing) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 space-y-3 shadow-top-md" style={{backgroundColor: '#e0d0b8'}}>
        <div className="relative flex items-center">
            <input type="text" placeholder="Búsqueda" value={searchTerm} onChange={handleSearchChange} className={`${inputStyle} py-2 text-base`} />
            {searchTerm && <button onClick={clearSearch} className="absolute top-0 bottom-0 right-0 mr-3 text-gray-600 hover:text-gray-800 text-xl flex items-center" aria-label="Clear search">&times;</button>}
        </div>
        <button onClick={handleMenuClick} className={`${buttonStyle} w-full py-2.5 text-base`} style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>Menu</button>
      </div>

      {/* Menu Modal (existing) */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeMenuModal}>
          <div className="bg-gradient-to-br from-[#f5e9d8] to-[#e0d0b8] p-6 rounded-lg shadow-2xl w-full max-w-xs mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col space-y-3">
              <Link href="/logout" onClick={closeMenuModal} className={modalButtonStyle}>Cerrar Sesión</Link>
              <button onClick={closeMenuModal} className={modalButtonStyle}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Detail Modal */}
      {isChapterDetailModalOpen && selectedChapterForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={closeChapterDetailModal}>
          {/* Changed background gradient to match menu modal */}
          <div className="bg-gradient-to-br from-[#f5e9d8] to-[#e0d0b8] p-5 rounded-lg shadow-2xl w-full max-w-md mx-auto flex flex-col space-y-4" 
               style={{maxHeight: '90vh'}} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-center text-[#5a4132]" style={{fontFamily: 'serif'}}>
              {selectedChapterForModal.section} {selectedChapterForModal.chapter}
            </h2>
            
            {isLoadingChapterDetails ? (
              <p className="text-center text-gray-600">Cargando detalles...</p>
            ) : detailedChapterData ? (
              <div className="flex flex-col space-y-3 overflow-y-auto flex-grow pr-1">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Leído:</h3>
                  {detailedChapterData.allTimestamps && detailedChapterData.allTimestamps.length > 0 ? (
                    <div className="text-xs text-gray-600 space-y-0.5 max-h-20 overflow-y-auto pr-2">
                      {detailedChapterData.allTimestamps.map((ts, index) => (
                        <p key={index}>{formatTimestampForModal(ts)}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Aún no has leído este capítulo.</p>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Notas:</h3>
                  <textarea 
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    placeholder="Escribe tus notas aquí..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#b89b7e] focus:border-[#b89b7e] min-h-[80px] text-sm"
                    rows={3}
                  />
                </div>
              </div>
            ) : <p className="text-center text-gray-500">No hay datos para este capítulo.</p>}
            
            {/* Action Buttons for Detail Modal */}
            {!isLoadingChapterDetails && (
              <div className="flex flex-col space-y-2 pt-2 border-t border-gray-300/70">
                <button onClick={handleSaveNotes} className={`${modalButtonStyle} ${!detailedChapterData ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!detailedChapterData}>
                  Guardar Notas
                </button>
                {detailedChapterData && detailedChapterData.allTimestamps && detailedChapterData.allTimestamps.length > 0 && !showUnreadConfirm && (
                  <button onClick={handleMarkUnread} className={`${modalButtonStyle} bg-red-500/70 hover:bg-red-600/80 text-white`}>
                    Marcar No Leído
                  </button>
                )}
                {showUnreadConfirm && (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-md text-center">
                        <p className="text-sm text-red-700 mb-2">¿Seguro que quieres marcar este capítulo como no leído? Se borrará el historial de lectura y las notas.</p>
                        <div className="flex justify-center space-x-3">
                            <button onClick={confirmMarkUnread} className={`${modalButtonStyle} bg-red-600 hover:bg-red-700 text-white py-1.5 text-sm`}>Sí, No Leído</button>
                            <button onClick={() => setShowUnreadConfirm(false)} className={`${modalButtonStyle} bg-gray-300 hover:bg-gray-400 text-gray-800 py-1.5 text-sm`}>No</button>
                        </div>
                    </div>
                )}
                <button onClick={closeChapterDetailModal} className={modalButtonStyle}>
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

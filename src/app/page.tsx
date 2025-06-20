'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useBibleChapters } from '../hooks/useBibleChapters';
import { ChapterDetailModal } from '../components/ChapterDetailModal';
import { MenuModal } from '../components/MenuModal';
import { Chapter } from '@/lib/types';
import { ChapterListItem } from '@/components/ChapterListItem';

const FullPageLoader = ({ message }: { message: string }) => (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(180deg, #f5e9d8 0%, #e0d0b8 100%)' }}>
      <p className="text-xl text-[#5a4132]">{message}</p>
    </div>
);

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);
  
  const { searchTerm, setSearchTerm, filteredChapters, readStatus, setReadStatus, isLoading, handleMarkAsRead } = useBibleChapters(currentUser);

  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isChapterDetailModalOpen, setIsChapterDetailModalOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        router.push('/login');
      }
      setAuthCheckCompleted(true);
    });
    return () => unsubscribe();
  }, [router]);

  const handleChapterClick = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setIsChapterDetailModalOpen(true);
  };
  
  if (!authCheckCompleted) return <FullPageLoader message="Verificando sesión..." />;
  if (!currentUser) return <FullPageLoader message="Redirigiendo a inicio de sesión..." />;
  if (isLoading) return <FullPageLoader message="Cargando datos..." />;

  const buttonStyle = "bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm md:text-base";
  const inputStyle = "appearance-none border-b-2 border-[#d3b596] w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none bg-transparent placeholder-gray-600 text-lg";

  return (
    <div className={`flex min-h-screen flex-col items-center pt-6 pb-36 md:pt-12 md:pb-6 px-4`} style={{ background: 'linear-gradient(180deg, #f5e9d8 0%, #e0d0b8 100%)' }}>
      <div className="w-full max-w-xl mx-auto hidden md:flex justify-end items-center mb-6">
        <button onClick={() => setIsMenuModalOpen(true)} className={buttonStyle} style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>Menu</button>
      </div>

      <div className="w-full max-w-xl mx-auto hidden md:block mb-6 relative items-center">
        <input type="text" placeholder="Búsqueda" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputStyle} />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute top-0 bottom-0 right-0 mr-3 text-gray-600 hover:text-gray-800 text-2xl flex items-center" aria-label="Clear search">&times;</button>}
      </div>
      
      <div className="w-full max-w-xl mx-auto bg-white/30 backdrop-blur-sm p-2 md:p-4 rounded-lg shadow-md overflow-y-auto flex-grow">
          {filteredChapters.map(chapter => (
              <ChapterListItem 
                key={chapter.id}
                chapter={chapter}
                isRead={!!readStatus[chapter.id]}
                timestamp={readStatus[chapter.id]?.latestReadTimestamp}
                notesPreview={readStatus[chapter.id]?.notes}
                onMarkAsRead={handleMarkAsRead}
                onChapterClick={handleChapterClick}
              />
          ))}
      </div>
      
      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 space-y-3 shadow-top-md" style={{backgroundColor: '#e0d0b8'}}>
        <div className="relative flex items-center">
            <input type="text" placeholder="Búsqueda" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputStyle} py-2 text-base`} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute top-0 bottom-0 right-0 mr-3 text-gray-600 hover:text-gray-800 text-xl flex items-center" aria-label="Clear search">&times;</button>}
        </div>
        <button onClick={() => setIsMenuModalOpen(true)} className={`${buttonStyle} w-full py-2.5 text-base`} style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>Menu</button>
      </div>

      <MenuModal isOpen={isMenuModalOpen} onClose={() => setIsMenuModalOpen(false)} />
      <ChapterDetailModal isOpen={isChapterDetailModalOpen} onClose={() => setIsChapterDetailModalOpen(false)} chapter={selectedChapter} currentUser={currentUser} onUpdateReadStatus={setReadStatus} />
    </div>
  );
}

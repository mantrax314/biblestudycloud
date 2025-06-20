import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';
import { Chapter, ReadChapterData, ReadStatus } from '@/lib/types';
import { formatTimestampForModal } from '@/lib/utils';

interface ChapterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
  currentUser: User | null;
  onUpdateReadStatus: Dispatch<SetStateAction<ReadStatus>>; 
}

export function ChapterDetailModal({ isOpen, onClose, chapter, currentUser, onUpdateReadStatus }: ChapterDetailModalProps) {
  const [details, setDetails] = useState<ReadChapterData | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && chapter && currentUser) {
      setIsLoading(true);
      setShowConfirm(false);
      const docRef = doc(db, "users", currentUser.uid, "readChapters", chapter.id);
      getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ReadChapterData;
          setDetails(data);
          setNotes(data.notes || '');
        }
      }).catch(console.error).finally(() => setIsLoading(false));
    }
  }, [isOpen, chapter, currentUser]);

  const handleSaveNotes = async () => {
    if (!currentUser || !chapter) return;
    const docRef = doc(db, "users", currentUser.uid, "readChapters", chapter.id);
    await updateDoc(docRef, { notes });
    onUpdateReadStatus(prev => ({
        ...prev,
        [chapter.id]: {
            ...prev[chapter.id],
            notes: notes
        }
    }));
    alert("Notas guardadas!");
  };

  const handleMarkUnread = async () => {
    if (!currentUser || !chapter) return;
    const docRef = doc(db, "users", currentUser.uid, "readChapters", chapter.id);
    await deleteDoc(docRef);
    onUpdateReadStatus((prev: ReadStatus) => {
        const newState = {...prev};
        if (chapter?.id) {
          delete newState[chapter.id];
        }
        return newState;
    });
    onClose();
  };
  
  if (!isOpen || !chapter) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-[#f5e9d8] to-[#e0d0b8] p-5 rounded-lg shadow-2xl w-full max-w-md mx-auto flex flex-col space-y-4 max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-center text-[#5a4132]" style={{ fontFamily: 'serif' }}>
          {chapter.section} {chapter.chapter}
        </h2>
        {isLoading ? <p>Cargando...</p> : (
            <>
              {details && (
                <div className="text-xs text-gray-600 space-y-0.5 max-h-20 overflow-y-auto pr-2">
                    <h3 className="font-semibold text-gray-700 mb-1">Leído:</h3>
                    {details.allTimestamps.map((ts, i) => <p key={i}>{formatTimestampForModal(ts)}</p>)}
                </div>
              )}
               <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Notas:</h3>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Escribe tus notas aquí..." className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#b89b7e] focus:border-[#b89b7e] min-h-[80px] text-sm" rows={3}/>
                </div>
            </>
        )}
         <div className="flex flex-col space-y-2 pt-2 border-t border-gray-300/70">
            <button onClick={handleSaveNotes} className="w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2.5 px-4 rounded">Guardar Notas</button>
            {!showConfirm ? (
                 <button onClick={() => setShowConfirm(true)} className="w-full bg-red-500/70 hover:bg-red-600/80 text-white font-bold py-2.5 px-4 rounded">Marcar No Leído</button>
            ) : (
                <div className="p-3 bg-red-100 border border-red-300 rounded-md text-center">
                    <p className="text-sm text-red-700 mb-2">¿Seguro? Se borrará el historial y las notas.</p>
                    <div className="flex justify-center space-x-3">
                        <button onClick={handleMarkUnread} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-4 rounded text-sm">Sí, No Leído</button>
                        <button onClick={() => setShowConfirm(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1.5 px-4 rounded text-sm">No</button>
                    </div>
                </div>
            )}
            <button onClick={onClose} className="w-full bg-[#d3b596] hover:bg-[#c4a585] text-[#5a4132] font-bold py-2.5 px-4 rounded">Cerrar</button>
         </div>
      </div>
    </div>
  );
}
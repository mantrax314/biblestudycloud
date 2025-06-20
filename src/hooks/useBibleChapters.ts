import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query } from 'firebase/firestore'; 
import { Chapter, ReadChapterData, ReadStatus } from '@/lib/types';
import { normalizeText } from '@/lib/utils';

export function useBibleChapters(currentUser: User | null) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [readStatus, setReadStatus] = useState<ReadStatus>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all chapters from JSON
  useEffect(() => {
    fetch('/bible_chapters.json')
      .then((res) => res.json())
      .then((data) => {
        setAllChapters(data);
        setFilteredChapters(data);
      })
      .catch(console.error);
  }, []);

  // Load read status from Firestore
  const loadReadChapters = useCallback(async (userId: string) => {
    setIsLoading(true);
    const newReadStatus: ReadStatus = {};
    try {
      const q = query(collection(db, "users", userId, "readChapters"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.id) {
          newReadStatus[data.id] = {
            latestReadTimestamp: data.latestReadTimestamp,
            firestoreDocId: docSnap.id,
            notes: data.notes || ''
          };
        }
      });
      setReadStatus(newReadStatus);
    } catch (error) {
      console.error("Error loading read chapters: ", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadReadChapters(currentUser.uid);
    }
  }, [currentUser, loadReadChapters]);

  // Filter chapters based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredChapters(allChapters);
    } else {
      const normalizedSearch = normalizeText(searchTerm);
      setFilteredChapters(
        allChapters.filter((chapter) =>
          normalizeText(`${chapter.section} ${chapter.chapter}`).includes(normalizedSearch)
        )
      );
    }
  }, [searchTerm, allChapters]);

  const handleMarkAsRead = async (chapter: Chapter) => {
    if (!currentUser) return;
    const { uid } = currentUser;
    const { id, section, chapter: chapterNum } = chapter;
    const nowISO = new Date().toISOString();
    const docRef = doc(db, "users", uid, "readChapters", id);

    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as ReadChapterData;
        const updatedTimestamps = [nowISO, ...(data.allTimestamps || [])];
        await updateDoc(docRef, { latestReadTimestamp: nowISO, allTimestamps: updatedTimestamps });
        setReadStatus(prev => ({ ...prev, [id]: { ...prev[id], latestReadTimestamp: nowISO } }));
      } else {
        const newEntry: ReadChapterData = { id, section, chapter: chapterNum, latestReadTimestamp: nowISO, allTimestamps: [nowISO], notes: "" };
        await setDoc(docRef, newEntry);
        setReadStatus(prev => ({ ...prev, [id]: { latestReadTimestamp: nowISO, firestoreDocId: id, notes: "" } }));
      }
    } catch (error) {
      console.error("Error updating read status: ", error);
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    filteredChapters,
    readStatus,
    setReadStatus,
    isLoading,
    handleMarkAsRead,
  };
}
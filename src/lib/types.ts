export interface Chapter {
    id: string;
    section: string;
    chapter: string;
  }
  
  export interface ReadChapterData extends Chapter {
    latestReadTimestamp: string;
    allTimestamps: string[];
    notes?: string;
  }
  
  export interface ReadStatus {
    [key: string]: {
      latestReadTimestamp: string;
      firestoreDocId: string;
      notes?: string;
    };
  }
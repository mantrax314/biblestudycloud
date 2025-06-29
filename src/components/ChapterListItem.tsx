import { formatTimestampForList } from '@/lib/utils';
import { Chapter } from '@/lib/types';

interface ChapterListItemProps {
  chapter: Chapter;
  isRead: boolean;
  timestamp?: string;
  onMarkAsRead: (chapter: Chapter) => void;
  onChapterClick: (chapter: Chapter) => void;
  notesPreview?: string;
}

export const ChapterListItem = ({ chapter, isRead, timestamp, onMarkAsRead, onChapterClick, notesPreview }: ChapterListItemProps) => {
  return (
    <li className="flex items-start justify-between py-2 px-2 md:px-3 border-b border-gray-300/50">
      <div
        onClick={() => { if (isRead) onChapterClick(chapter); }}
        className={`flex items-start flex-grow min-w-0 rounded px-1 py-0.5 ${isRead ? 'cursor-pointer hover:bg-black/10' : 'cursor-default'}`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onMarkAsRead(chapter); }}
          className={`mt-1 mr-2 md:mr-3 w-5 h-5 md:w-6 md:h-6 border-2 rounded flex-shrink-0 flex items-center justify-center focus:outline-none transition-colors ${isRead ? 'bg-[#8B4513]/70 border-[#654321]' : 'bg-transparent border-gray-400 hover:border-gray-500'}`}
          aria-label={isRead ? `Marcar ${chapter.section} ${chapter.chapter} como leído nuevamente` : `Marcar ${chapter.section} ${chapter.chapter} como leído`}
        >
          {isRead && <span className="text-white text-xs md:text-sm">✓</span>}
        </button>
        <div className="flex-grow truncate">
            <span className="text-sm md:text-base text-gray-800 truncate block">
              {chapter.section} {chapter.chapter}
            </span>
            {isRead && notesPreview && (
              <span className="text-xs text-gray-600 truncate block">
                {notesPreview}
              </span>
            )}
        </div>
      </div>
      {isRead && timestamp && (
        <span onClick={() => onChapterClick(chapter)} className="text-xs text-gray-500 ml-2 whitespace-nowrap cursor-pointer hover:text-[#654321] self-start mt-1">
          ({formatTimestampForList(timestamp)})
        </span>
      )}
    </li>
  );
};

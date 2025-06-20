export const normalizeText = (text: string): string => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };
  
  const formatDate = (isoString: string, options: Intl.DateTimeFormatOptions): string => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString(undefined, options).replace(',', '');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };
  
  export const formatTimestampForModal = (isoString: string): string => {
    return formatDate(isoString, {
      month: 'short',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };
  
  export const formatTimestampForList = (isoString: string): string => {
    return formatDate(isoString, {
      month: 'short',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };
  
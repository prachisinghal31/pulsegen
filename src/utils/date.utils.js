exports.isDateInRange = (date, start, end) => {
  if (!date) return false;
  
  // Try to parse various date formats
  let d;
  if (typeof date === 'string') {
    // Try ISO format first (YYYY-MM-DD)
    if (date.match(/^\d{4}-\d{2}-\d{2}/)) {
      d = new Date(date);
    } else {
      // Try other formats
      d = new Date(date);
    }
  } else {
    d = new Date(date);
  }
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    return false;
  }
  
  return d >= start && d <= end;
};

// Helper to parse various date formats
exports.parseDate = (dateString) => {
  if (!dateString) return null;
  
  // Remove extra whitespace
  dateString = dateString.trim();
  
  // Try ISO format (YYYY-MM-DD)
  if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateString.slice(0, 10);
  }
  
  // Try to extract date from datetime attribute (e.g., "2023-01-15T00:00:00Z")
  const datetimeMatch = dateString.match(/(\d{4}-\d{2}-\d{2})/);
  if (datetimeMatch) {
    return datetimeMatch[1];
  }
  
  // Try parsing common text formats
  // Handle formats like "January 15, 2023", "Jan 15, 2023", "15 Jan 2023", etc.
  const d = new Date(dateString);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  
  // Try to extract date from strings like "Posted on January 15, 2023"
  const datePatterns = [
    /(\w+\s+\d{1,2},?\s+\d{4})/,  // "January 15, 2023" or "Jan 15 2023"
    /(\d{1,2}\s+\w+\s+\d{4})/,     // "15 January 2023"
    /(\d{4}-\d{2}-\d{2})/,          // "2023-01-15"
    /(\d{2}\/\d{2}\/\d{4})/,        // "01/15/2023"
    /(\d{2}-\d{2}-\d{4})/           // "01-15-2023"
  ];
  
  for (const pattern of datePatterns) {
    const match = dateString.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    }
  }
  
  return null;
};

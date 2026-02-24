/**
 * Truncates a long filename in the middle, preserving the beginning and file extension
 * Example: "LU-AA-FO-33-Volunteer-Sign-Up-Form%20(1).docx" -> "LU-AA-FO-33-Volunteer-S...(1).docx"
 * 
 * @param fileName - The full filename
 * @param maxLength - Maximum length before truncation (default: 30)
 * @returns Truncated filename with ellipsis in the middle
 */
export const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  if (fileName.length <= maxLength) {
    return fileName;
  }

  // Find the last dot to identify the extension
  const lastDotIndex = fileName.lastIndexOf('.');
  
  // If no extension found, just truncate normally
  if (lastDotIndex === -1) {
    const half = Math.floor(maxLength / 2);
    return `${fileName.slice(0, half)}...${fileName.slice(-half)}`;
  }

  const extension = fileName.slice(lastDotIndex);
  const nameWithoutExt = fileName.slice(0, lastDotIndex);
  
  // Calculate how much space we have for the name (excluding extension and ellipsis)
  const availableLength = maxLength - extension.length - 3; // 3 for "..."
  
  if (availableLength <= 0) {
    // If extension is too long, just show extension
    return `...${extension}`;
  }

  // Take more characters from the start, less from the end
  const startLength = Math.ceil(availableLength * 0.7);
  const endLength = Math.floor(availableLength * 0.3);
  
  return `${nameWithoutExt.slice(0, startLength)}...${nameWithoutExt.slice(-endLength)}${extension}`;
};

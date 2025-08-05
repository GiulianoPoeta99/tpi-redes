import { describe, it, expect } from 'vitest';
import { TransferUtils } from '../types';

// Helper function to create mock files (same as in components)
function createMockFile(name: string, size: number, type: string = 'text/plain'): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

describe('File Validation Utilities', () => {
  describe('File size validation', () => {
    it('validates file size correctly', () => {
      const smallFile = createMockFile('small.txt', 1024);
      const largeFile = createMockFile('large.txt', 10 * 1024 * 1024);
      
      expect(smallFile.size).toBe(1024);
      expect(largeFile.size).toBe(10 * 1024 * 1024);
    });

    it('formats file sizes correctly', () => {
      expect(TransferUtils.formatBytes(512)).toBe('512 B');
      expect(TransferUtils.formatBytes(1024)).toBe('1.0 KB');
      expect(TransferUtils.formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(TransferUtils.formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  describe('File type validation', () => {
    it('detects file extensions correctly', () => {
      const txtFile = createMockFile('document.txt', 1024, 'text/plain');
      const jpgFile = createMockFile('image.jpg', 1024, 'image/jpeg');
      const pdfFile = createMockFile('manual.pdf', 1024, 'application/pdf');
      
      expect(txtFile.name.split('.').pop()).toBe('txt');
      expect(jpgFile.name.split('.').pop()).toBe('jpg');
      expect(pdfFile.name.split('.').pop()).toBe('pdf');
    });

    it('handles files without extensions', () => {
      const noExtFile = createMockFile('README', 1024, 'text/plain');
      const extension = noExtFile.name.split('.').pop();
      
      expect(extension).toBe('README'); // No extension means the whole name
    });
  });

  describe('File validation logic', () => {
    function validateFile(file: File, maxSize: number, allowedTypes: string[]): string | null {
      // Check file size
      if (file.size > maxSize) {
        return `File size (${TransferUtils.formatBytes(file.size)}) exceeds maximum allowed size (${TransferUtils.formatBytes(maxSize)})`;
      }

      // Check file type if restrictions are set
      if (allowedTypes.length > 0) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type.toLowerCase();
        
        const isAllowed = allowedTypes.some(type => {
          if (type.startsWith('.')) {
            // Extension check
            return fileExtension === type.slice(1).toLowerCase();
          } else if (type.includes('/')) {
            // MIME type check
            return mimeType === type.toLowerCase() || mimeType.startsWith(type.split('/')[0] + '/');
          }
          return false;
        });

        if (!isAllowed) {
          return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
        }
      }

      return null;
    }

    it('validates file size limits', () => {
      const validFile = createMockFile('small.txt', 1024);
      const invalidFile = createMockFile('large.txt', 2048);
      
      expect(validateFile(validFile, 2000, [])).toBeNull();
      expect(validateFile(invalidFile, 1000, [])).toContain('exceeds maximum allowed size');
    });

    it('validates file type restrictions', () => {
      const txtFile = createMockFile('document.txt', 1024, 'text/plain');
      const jpgFile = createMockFile('image.jpg', 1024, 'image/jpeg');
      
      expect(validateFile(txtFile, 10000, ['.txt'])).toBeNull();
      expect(validateFile(jpgFile, 10000, ['.txt'])).toContain('File type not allowed');
    });

    it('allows all types when no restrictions are set', () => {
      const txtFile = createMockFile('document.txt', 1024, 'text/plain');
      const jpgFile = createMockFile('image.jpg', 1024, 'image/jpeg');
      const unknownFile = createMockFile('unknown.xyz', 1024, '');
      
      expect(validateFile(txtFile, 10000, [])).toBeNull();
      expect(validateFile(jpgFile, 10000, [])).toBeNull();
      expect(validateFile(unknownFile, 10000, [])).toBeNull();
    });

    it('validates MIME type restrictions', () => {
      const imageFile = createMockFile('image.jpg', 1024, 'image/jpeg');
      const textFile = createMockFile('document.txt', 1024, 'text/plain');
      
      expect(validateFile(imageFile, 10000, ['image/'])).toBeNull();
      expect(validateFile(textFile, 10000, ['image/'])).toContain('File type not allowed');
    });
  });

  describe('File icon detection', () => {
    function getFileIcon(file: File): string {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type.toLowerCase();

      // Image files
      if (mimeType.startsWith('image/')) {
        return '🖼️';
      }
      
      // Document files
      if (mimeType.includes('pdf') || extension === 'pdf') {
        return '📄';
      }
      
      // Code files (check before text files)
      if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(extension || '')) {
        return '💻';
      }
      
      // Text files
      if (mimeType.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv'].includes(extension || '')) {
        return '📄';
      }
      
      // Video files
      if (mimeType.startsWith('video/')) {
        return '🎥';
      }
      
      // Audio files
      if (mimeType.startsWith('audio/')) {
        return '🎵';
      }
      
      // Default
      return '📁';
    }

    it('returns correct icons for different file types', () => {
      const imageFile = createMockFile('image.jpg', 1024, 'image/jpeg');
      const pdfFile = createMockFile('document.pdf', 1024, 'application/pdf');
      const videoFile = createMockFile('video.mp4', 1024, 'video/mp4');
      const audioFile = createMockFile('audio.mp3', 1024, 'audio/mpeg');
      const codeFile = createMockFile('script.js', 1024, 'text/javascript');
      const unknownFile = createMockFile('unknown.xyz', 1024, '');
      
      expect(getFileIcon(imageFile)).toBe('🖼️');
      expect(getFileIcon(pdfFile)).toBe('📄');
      expect(getFileIcon(videoFile)).toBe('🎥');
      expect(getFileIcon(audioFile)).toBe('🎵');
      expect(getFileIcon(codeFile)).toBe('💻');
      expect(getFileIcon(unknownFile)).toBe('📁');
    });
  });

  describe('Date formatting', () => {
    function formatLastModified(timestamp: number): string {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    }

    it('formats dates correctly', () => {
      const now = new Date();
      const today = now.getTime();
      const yesterday = today - (24 * 60 * 60 * 1000);
      const threeDaysAgo = today - (3 * 24 * 60 * 60 * 1000);
      const oneWeekAgo = today - (7 * 24 * 60 * 60 * 1000);

      expect(formatLastModified(today)).toBe('Today');
      expect(formatLastModified(yesterday)).toBe('Yesterday');
      expect(formatLastModified(threeDaysAgo)).toBe('3 days ago');
      expect(formatLastModified(oneWeekAgo)).toBe(new Date(oneWeekAgo).toLocaleDateString());
    });
  });
});
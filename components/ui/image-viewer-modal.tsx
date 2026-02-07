
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function ImageViewerModal({ imageUrl, isOpen, onClose, title }: ImageViewerModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[90vh] w-full mx-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
        >
          <X className="h-8 w-8" />
          <span className="sr-only">Close</span>
        </button>

        {/* Title */}
        {title && (
          <div className="absolute -top-12 left-0 text-white text-sm font-medium">
            {title}
          </div>
        )}

        {/* Image Container */}
        <div 
          className="relative flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt="Full size view"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Instructions */}
        <div className="absolute -bottom-12 left-0 right-0 text-center text-white/70 text-xs">
          Click outside or press ESC to close
        </div>
      </div>
    </div>
  );
}

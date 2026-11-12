import React, { useState } from 'react';
import { Hospital } from 'lucide-react';

interface HospitalLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const DRIVE_FILE_ID = '1XcbmPp2b5r709OYg5fMEsI-BX7Ri1kEx';

// Google Drive direct image URLs
const PRIMARY_URL = `https://lh3.googleusercontent.com/d/${DRIVE_FILE_ID}`;
const SECONDARY_URL = `https://drive.google.com/thumbnail?id=${DRIVE_FILE_ID}&sz=w800`;

export const HospitalLogo: React.FC<HospitalLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'light',
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(PRIMARY_URL);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleError = () => {
    if (currentSrc === PRIMARY_URL) {
      setCurrentSrc(SECONDARY_URL);
    } else {
      setHasError(true);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }[size];

  if (hasError) {
    // Fallback: Medical institution emblem for HILA (Hospital Infantil Los Ángeles)
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md select-none shrink-0 ${className}`}
        title="Hospital Infantil Los Ángeles"
      >
        <Hospital className={size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-white p-1 border border-slate-200/60 shadow-xs shrink-0 ${sizeClasses} ${className}`}
    >
      <img
        src={currentSrc}
        alt="Logo Hospital Infantil Los Ángeles"
        onError={handleError}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        className="w-full h-full object-contain"
        loading="eager"
      />
    </div>
  );
};

import React, { useState } from 'react';
import { User } from 'lucide-react';

interface ProfileImageProps {
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

const ProfileImage: React.FC<ProfileImageProps> = ({ 
  imageUrl, 
  size = 'md', 
  className = '',
  alt = 'Profile'
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-28 h-28'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-16 h-16'
  };

  const handleImageError = () => {
    console.error('Failed to load profile image:', imageUrl);
    setImageError(true);
  };

  // Always render the image if imageUrl exists and no error
  if (imageUrl && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-blue-200 shadow ${className}`}
        onError={handleImageError}
      />
    );
  }

  // Show fallback if no URL or image failed to load
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200 shadow ${className}`}>
      <User className={`${iconSizes[size]} text-blue-400`} />
    </div>
  );
};

export default ProfileImage; 
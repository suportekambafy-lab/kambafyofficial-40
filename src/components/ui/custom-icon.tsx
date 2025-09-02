import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CustomIconProps {
  name: 'dollar' | 'book' | 'progress' | 'chart' | 'globe' | 'shield' | 'lightning' | 'download' | 'headphones';
  size?: number;
  className?: string;
  alt?: string;
}

const iconMap: Record<CustomIconProps['name'], string> = {
  dollar: '/lovable-uploads/c4aa109b-e508-4cf8-8d69-c1df88a047e5.png',
  book: '/lovable-uploads/8722df9f-57e0-4037-a7b2-1bd26571bda0.png',
  progress: '/lovable-uploads/c1b5edfb-9ee7-49f3-9d3b-42530c999c9e.png',
  chart: '/lovable-uploads/0d309e64-9c61-490a-aab4-f19cc1da672a.png',
  globe: '/lovable-uploads/609bac63-5da9-44a3-b759-c648b04170c1.png',
  shield: '/lovable-uploads/740da94b-2372-422f-94f-3f7f6ae2f492.png',
  lightning: '/lovable-uploads/b0d5cf94-6369-4cff-a802-4b8ba074b353.png',
  download: '/lovable-uploads/96179f5b-0fcd-483a-92d4-3d92f3cdd871.png',
  headphones: '/lovable-uploads/741d3845-6db3-45eb-a272-c274e417cdc7.png',
};

export const CustomIcon: React.FC<CustomIconProps> = ({ 
  name, 
  size = 24, 
  className = '', 
  alt 
}) => {
  const src = iconMap[name];
  
  if (!src) {
    console.warn(`CustomIcon: Icon "${name}" not found`);
    return null;
  }

  return (
    <img
      src={src}
      alt={alt || `${name} icon`}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

// Wrapper component for easy replacement of Lucide icons
interface IconWrapperProps {
  lucideIcon?: LucideIcon;
  customIcon?: CustomIconProps['name'];
  size?: number;
  className?: string;
  alt?: string;
}

export const IconWrapper: React.FC<IconWrapperProps> = ({
  lucideIcon: LucideIconComponent,
  customIcon,
  size = 24,
  className = '',
  alt,
  ...props
}) => {
  if (customIcon) {
    return <CustomIcon name={customIcon} size={size} className={className} alt={alt} />;
  }
  
  if (LucideIconComponent) {
    return <LucideIconComponent size={size} className={className} {...props} />;
  }
  
  return null;
};
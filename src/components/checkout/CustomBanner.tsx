
import React from 'react';

interface CustomBannerProps {
  bannerImage?: string;
}

const CustomBanner: React.FC<CustomBannerProps> = ({
  bannerImage
}) => {
  if (!bannerImage) {
    return null;
  }

  return (
    <div className="w-full relative">
      <img 
        src={bannerImage} 
        alt="Banner promocional" 
        className="w-full h-auto object-cover"
        style={{ 
          aspectRatio: '1000/300',
          maxHeight: '300px'
        }}
      />
    </div>
  );
};

export default CustomBanner;

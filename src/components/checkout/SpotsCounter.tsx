import React from 'react';

interface SpotsCounterProps {
  count: number;
  title: string;
  backgroundColor: string;
  textColor: string;
}

export default function SpotsCounter({ count, title, backgroundColor, textColor }: SpotsCounterProps) {
  return (
    <div 
      className="py-3 px-4 text-center"
      style={{ backgroundColor }}
    >
      <div 
        className="text-3xl font-bold mb-1"
        style={{ color: textColor }}
      >
        {count}
      </div>
      <div 
        className="text-sm font-semibold tracking-wider"
        style={{ color: textColor }}
      >
        {title}
      </div>
    </div>
  );
}

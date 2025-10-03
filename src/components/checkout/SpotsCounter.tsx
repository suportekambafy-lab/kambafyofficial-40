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
      className="py-8 px-4 text-center rounded-lg"
      style={{ backgroundColor }}
    >
      <div 
        className="text-6xl font-bold mb-2"
        style={{ color: textColor }}
      >
        {count}
      </div>
      <div 
        className="text-lg font-semibold tracking-wider"
        style={{ color: textColor }}
      >
        {title}
      </div>
    </div>
  );
}

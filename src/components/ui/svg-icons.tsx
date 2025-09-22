import React from 'react';

interface SVGIconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

// Logo Kambafy
export const KambafyLogo: React.FC<SVGIconProps> = ({ 
  width = 200, 
  height = 60, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 200 60" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="200" height="60" fill="#22c55e" rx="8"/>
    <text 
      x="100" 
      y="38" 
      fontSize="24" 
      fontWeight="bold" 
      fill="white" 
      textAnchor="middle" 
      fontFamily="Arial, sans-serif"
    >
      Kambafy
    </text>
    <text 
      x="16" 
      y="42" 
      fontSize="32" 
      fontWeight="bold" 
      fill="white" 
      fontFamily="Arial, sans-serif"
    >
      K
    </text>
  </svg>
);

// Ícone Kambafy (apenas K)
export const KambafyIcon: React.FC<SVGIconProps> = ({ 
  width = 40, 
  height = 40, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 40" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" fill="#22c55e" rx="8"/>
    <text 
      x="20" 
      y="28" 
      fontSize="20" 
      fontWeight="bold" 
      fill="white" 
      textAnchor="middle" 
      fontFamily="Arial, sans-serif"
    >
      K
    </text>
  </svg>
);

// Pagamento por Referência / Transferência Bancária
export const BankIcon: React.FC<SVGIconProps> = ({ 
  width = 40, 
  height = 40, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 40" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" fill="#f8fafc" rx="4"/>
    <g transform="translate(4, 6)">
      <path 
        d="M16 2L32 8v4H0V8L16 2z" 
        fill="#1e293b" 
        transform="scale(1, 0.8)"
      />
      <rect x="3" y="12" width="3" height="12" fill="#1e293b"/>
      <rect x="8" y="12" width="3" height="12" fill="#1e293b"/>
      <rect x="13" y="12" width="3" height="12" fill="#1e293b"/>
      <rect x="18" y="12" width="3" height="12" fill="#1e293b"/>
      <rect x="23" y="12" width="3" height="12" fill="#1e293b"/>
      <rect x="0" y="25" width="32" height="3" fill="#1e293b"/>
      <rect x="0" y="30" width="32" height="2" fill="#1e293b"/>
    </g>
  </svg>
);

// e-Mola
export const EMolaIcon: React.FC<SVGIconProps> = ({ 
  width = 40, 
  height = 40, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 40" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" fill="#ea580c" rx="4"/>
    <g transform="translate(6, 4)">
      {/* POS Terminal */}
      <rect x="2" y="4" width="12" height="18" fill="white" rx="2"/>
      <rect x="3" y="6" width="10" height="6" fill="#ea580c"/>
      <rect x="3" y="14" width="2" height="2" fill="#ea580c"/>
      <rect x="6" y="14" width="2" height="2" fill="#ea580c"/>
      <rect x="9" y="14" width="2" height="2" fill="#ea580c"/>
      <rect x="3" y="17" width="2" height="2" fill="#ea580c"/>
      <rect x="6" y="17" width="2" height="2" fill="#ea580c"/>
      <rect x="9" y="17" width="2" height="2" fill="#ea580c"/>
      
      {/* Card */}
      <rect x="16" y="8" width="10" height="6" fill="white" rx="1"/>
      <text x="21" y="13" fontSize="6" fill="#ea580c" textAnchor="middle">$</text>
      
      {/* Signal waves */}
      <path d="M10 2 Q12 1 14 2" stroke="white" strokeWidth="1" fill="none"/>
      <path d="M10 1 Q12 0 14 1" stroke="white" strokeWidth="1" fill="none"/>
    </g>
    <text x="20" y="32" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">e-Mola</text>
  </svg>
);

// e-Pesa/m-pesa
export const EPesaIcon: React.FC<SVGIconProps> = ({ 
  width = 40, 
  height = 40, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 40" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" fill="#dc2626" rx="4"/>
    <g transform="translate(8, 4)">
      {/* Phone */}
      <rect x="6" y="2" width="12" height="18" fill="white" rx="2"/>
      <rect x="7" y="4" width="10" height="12" fill="#dc2626"/>
      <rect x="10" y="17" width="1" height="1" fill="#dc2626"/>
      <rect x="12" y="17" width="1" height="1" fill="#dc2626"/>
      <rect x="14" y="17" width="1" height="1" fill="#dc2626"/>
      
      {/* Green swoosh */}
      <path d="M2 14 Q8 8 16 12" stroke="#16a34a" strokeWidth="2" fill="none"/>
    </g>
    <text x="20" y="32" fontSize="7" fill="white" textAnchor="middle" fontWeight="bold">e-Pesa</text>
  </svg>
);

// Cartão (Visa/Mastercard)
export const CardIcon: React.FC<SVGIconProps> = ({ 
  width = 40, 
  height = 40, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 40" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" fill="#f8fafc" rx="4"/>
    <g transform="translate(4, 8)">
      {/* Card */}
      <rect x="0" y="0" width="32" height="20" fill="white" stroke="#e2e8f0" strokeWidth="1" rx="3"/>
      
      {/* Visa */}
      <text x="4" y="8" fontSize="6" fill="#1e3a8a" fontWeight="bold">VISA</text>
      
      {/* Mastercard circles */}
      <circle cx="20" cy="6" r="3" fill="#dc2626"/>
      <circle cx="24" cy="6" r="3" fill="#ea580c"/>
      
      {/* Card strip */}
      <rect x="2" y="12" width="28" height="2" fill="#e2e8f0"/>
    </g>
  </svg>
);

// Multibanco
export const MultibancoIcon: React.FC<SVGIconProps> = ({ 
  width = 40, 
  height = 40, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 40" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" fill="white" rx="4" stroke="#e2e8f0"/>
    <g transform="translate(4, 6)">
      {/* Blue frame */}
      <rect x="2" y="2" width="28" height="4" fill="#3b82f6" rx="2"/>
      <rect x="2" y="22" width="28" height="4" fill="#3b82f6" rx="2"/>
      <rect x="2" y="6" width="4" height="16" fill="#3b82f6"/>
      <rect x="26" y="6" width="4" height="16" fill="#3b82f6"/>
      
      {/* MB text */}
      <text x="16" y="16" fontSize="10" fill="#1f2937" textAnchor="middle" fontWeight="bold">MB</text>
    </g>
    <text x="20" y="32" fontSize="6" fill="#1f2937" textAnchor="middle">MULTIBANCO</text>
  </svg>
);

// Klarna
export const KlarnaIcon: React.FC<SVGIconProps> = ({ 
  width = 40, 
  height = 40, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 40" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" fill="#ffb3d9" rx="4"/>
    <text x="20" y="22" fontSize="10" fill="#1f2937" textAnchor="middle" fontWeight="bold">Klarna</text>
    <circle cx="8" cy="12" r="2" fill="white"/>
    <circle cx="32" cy="12" r="2" fill="white"/>
    <circle cx="8" cy="28" r="2" fill="white"/>
    <circle cx="32" cy="28" r="2" fill="white"/>
  </svg>
);

// Apple Pay
export const ApplePayIcon: React.FC<SVGIconProps> = ({ 
  width = 40, 
  height = 40, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 40" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" fill="#000000" rx="4"/>
    <g transform="translate(6, 8)">
      {/* Apple logo */}
      <path 
        d="M16 2c-1.5 0-3 1-3.5 2.5C11.5 3.5 10 2.5 8.5 2.5C6.5 2.5 5 4 5 6c0 3 4 8 8 8s8-5 8-8c0-2-1.5-3.5-3.5-3.5z" 
        fill="white"
      />
      <path d="M16 0c-0.5 0-1 0.5-1 1s0.5 1 1 1 1-0.5 1-1-0.5-1-1-1z" fill="white"/>
    </g>
    <text x="20" y="30" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold">Apple Pay</text>
  </svg>
);

// KambaPay
export const KambaPayIcon: React.FC<SVGIconProps> = ({ 
  width = 40, 
  height = 40, 
  className = "" 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 40" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" fill="#2563eb" rx="8"/>
    <rect x="12" y="12" width="16" height="16" fill="white"/>
    <rect x="16" y="16" width="4" height="8" fill="#2563eb"/>
    <rect x="20" y="16" width="4" height="8" fill="#2563eb"/>
  </svg>
);
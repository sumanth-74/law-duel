interface AtticusCatProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeMap = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  '2xl': 120
};

/**
 * Atticus the purple cat mascot SVG component
 * Consistent with the cat from LawDuelLogo
 */
export function AtticusCat({ size = 'sm', className = '' }: AtticusCatProps) {
  const svgSize = sizeMap[size];
  
  return (
    <svg 
      width={svgSize}
      height={svgSize}
      viewBox="0 0 60 60" 
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="atticusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      
      {/* Cat silhouette - bigger and centered */}
      <g transform="translate(30, 18)">
        {/* Cat head */}
        <ellipse cx="0" cy="0" rx="14" ry="10" fill="url(#atticusGradient)" opacity="0.9"/>
        
        {/* Cat ears */}
        <polygon points="-10,-6 -14,-16 -4,-10" fill="url(#atticusGradient)" opacity="0.9"/>
        <polygon points="10,-6 14,-16 4,-10" fill="url(#atticusGradient)" opacity="0.9"/>
        
        {/* Cat eyes - bright purple/lavender */}
        <circle cx="-5" cy="-1" r="2" fill="#e9d5ff"/>
        <circle cx="5" cy="-1" r="2" fill="#e9d5ff"/>
        
        {/* Whiskers */}
        <line x1="-14" y1="0" x2="-20" y2="-2" stroke="#e9d5ff" strokeWidth="1" opacity="0.6"/>
        <line x1="-14" y1="2" x2="-20" y2="2" stroke="#e9d5ff" strokeWidth="1" opacity="0.6"/>
        <line x1="14" y1="0" x2="20" y2="-2" stroke="#e9d5ff" strokeWidth="1" opacity="0.6"/>
        <line x1="14" y1="2" x2="20" y2="2" stroke="#e9d5ff" strokeWidth="1" opacity="0.6"/>
        
        {/* Cat body */}
        <ellipse cx="0" cy="14" rx="10" ry="14" fill="url(#atticusGradient)" opacity="0.8"/>
        
        {/* Cat tail - curved */}
        <path d="M 10,20 Q 20,14 16,28" stroke="url(#atticusGradient)" strokeWidth="4" fill="none" opacity="0.8"/>
      </g>
    </svg>
  );
}

export default AtticusCat;
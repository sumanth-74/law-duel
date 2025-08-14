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
  '2xl': 80
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
      viewBox="0 0 40 40" 
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
      
      {/* Cat silhouette - scaled and centered */}
      <g transform="translate(20, 12)">
        {/* Cat head */}
        <ellipse cx="0" cy="0" rx="7" ry="5" fill="url(#atticusGradient)" opacity="0.9"/>
        
        {/* Cat ears */}
        <polygon points="-5,-3 -7,-8 -2,-5" fill="url(#atticusGradient)" opacity="0.9"/>
        <polygon points="5,-3 7,-8 2,-5" fill="url(#atticusGradient)" opacity="0.9"/>
        
        {/* Cat eyes - bright purple/lavender */}
        <circle cx="-2.5" cy="-0.5" r="1" fill="#e9d5ff"/>
        <circle cx="2.5" cy="-0.5" r="1" fill="#e9d5ff"/>
        
        {/* Tiny whiskers */}
        <line x1="-7" y1="0" x2="-10" y2="-1" stroke="#e9d5ff" strokeWidth="0.5" opacity="0.6"/>
        <line x1="-7" y1="1" x2="-10" y2="1" stroke="#e9d5ff" strokeWidth="0.5" opacity="0.6"/>
        <line x1="7" y1="0" x2="10" y2="-1" stroke="#e9d5ff" strokeWidth="0.5" opacity="0.6"/>
        <line x1="7" y1="1" x2="10" y2="1" stroke="#e9d5ff" strokeWidth="0.5" opacity="0.6"/>
        
        {/* Cat body */}
        <ellipse cx="0" cy="7" rx="5" ry="7" fill="url(#atticusGradient)" opacity="0.8"/>
        
        {/* Cat tail - curved */}
        <path d="M 5,10 Q 10,7 8,14" stroke="url(#atticusGradient)" strokeWidth="2" fill="none" opacity="0.8"/>
      </g>
    </svg>
  );
}

export default AtticusCat;
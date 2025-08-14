interface AtticusCatProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'massive';
  className?: string;
}

const sizeMap = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  '2xl': 120,
  massive: 110  // Slightly smaller than button for padding
};

/**
 * Atticus the purple cat mascot SVG component
 * Consistent with the cat from LawDuelLogo
 */
export function AtticusCat({ size = 'sm', className = '' }: AtticusCatProps) {
  const svgSize = sizeMap[size];
  
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ width: svgSize, height: svgSize }}
    >
      <svg 
        width="100%"
        height="100%" 
        viewBox="0 0 100 100" 
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`atticusGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        
        {/* Cat silhouette - fills most of the viewBox */}
        <g transform="translate(50, 30)">
          {/* Cat head - much larger */}
          <ellipse cx="0" cy="0" rx="25" ry="18" fill={`url(#atticusGradient-${size})`} opacity="0.95"/>
          
          {/* Cat ears - proportionally larger */}
          <polygon points="-18,-12 -25,-28 -8,-18" fill={`url(#atticusGradient-${size})`} opacity="0.95"/>
          <polygon points="18,-12 25,-28 8,-18" fill={`url(#atticusGradient-${size})`} opacity="0.95"/>
          
          {/* Cat eyes - bigger and more prominent */}
          <circle cx="-8" cy="-2" r="3.5" fill="#e9d5ff"/>
          <circle cx="8" cy="-2" r="3.5" fill="#e9d5ff"/>
          <circle cx="-8" cy="-2" r="1.5" fill="#5b21b6"/>
          <circle cx="8" cy="-2" r="1.5" fill="#5b21b6"/>
          
          {/* Nose */}
          <ellipse cx="0" cy="2" rx="2" ry="1.5" fill="#e9d5ff"/>
          
          {/* Whiskers - thicker */}
          <line x1="-25" y1="0" x2="-35" y2="-3" stroke="#e9d5ff" strokeWidth="2" opacity="0.7"/>
          <line x1="-25" y1="4" x2="-35" y2="4" stroke="#e9d5ff" strokeWidth="2" opacity="0.7"/>
          <line x1="25" y1="0" x2="35" y2="-3" stroke="#e9d5ff" strokeWidth="2" opacity="0.7"/>
          <line x1="25" y1="4" x2="35" y2="4" stroke="#e9d5ff" strokeWidth="2" opacity="0.7"/>
          
          {/* Cat body - bigger */}
          <ellipse cx="0" cy="25" rx="18" ry="25" fill={`url(#atticusGradient-${size})`} opacity="0.9"/>
          
          {/* Cat tail - more prominent */}
          <path d="M 18,35 Q 35,25 30,50" stroke={`url(#atticusGradient-${size})`} strokeWidth="6" fill="none" opacity="0.9"/>
        </g>
      </svg>
    </div>
  );
}

export default AtticusCat;
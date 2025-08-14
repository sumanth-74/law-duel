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
  massive: 70   // For the 80px button, fill most of it
};

/**
 * Atticus the purple cat mascot SVG component
 * Exact copy of the cat from LawDuelLogo for branding consistency
 */
export function AtticusCat({ size = 'sm', className = '' }: AtticusCatProps) {
  const svgSize = sizeMap[size];
  
  return (
    <svg 
      width={svgSize}
      height={svgSize}
      viewBox="0 0 100 100" 
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`purpleGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      
      {/* Cat silhouette - exact proportions from logo but scaled to fill most of viewBox */}
      <g transform="translate(50, 50)">
        {/* Cat head - 4x bigger than original */}
        <ellipse cx="0" cy="0" rx="32" ry="24" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        {/* Cat ears - 4x bigger */}
        <polygon points="-24,-16 -32,-40 -8,-24" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        <polygon points="24,-16 32,-40 8,-24" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        {/* Cat eyes - 4x bigger */}
        <circle cx="-12" cy="-4" r="4" fill="#e9d5ff"/>
        <circle cx="12" cy="-4" r="4" fill="#e9d5ff"/>
        {/* Cat body - 4x bigger */}
        <ellipse cx="0" cy="32" rx="24" ry="32" fill={`url(#purpleGradient-${size})`} opacity="0.6"/>
        {/* Cat tail - 4x bigger stroke */}
        <path d="M 24,48 Q 48,32 40,64" stroke={`url(#purpleGradient-${size})`} strokeWidth="8" fill="none" opacity="0.6"/>
      </g>
    </svg>
  );
}

export default AtticusCat;
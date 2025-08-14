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
  massive: 120  // For the 128px button with padding
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
      
      {/* Cat silhouette - exact proportions from logo but 5x bigger to fill button */}
      <g transform="translate(50, 50) scale(5)">
        {/* Cat head */}
        <ellipse cx="0" cy="0" rx="8" ry="6" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        {/* Cat ears */}
        <polygon points="-6,-4 -8,-10 -2,-6" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        <polygon points="6,-4 8,-10 2,-6" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        {/* Cat eyes */}
        <circle cx="-3" cy="-1" r="1" fill="#e9d5ff"/>
        <circle cx="3" cy="-1" r="1" fill="#e9d5ff"/>
        {/* Cat body */}
        <ellipse cx="0" cy="8" rx="6" ry="8" fill={`url(#purpleGradient-${size})`} opacity="0.6"/>
        {/* Cat tail */}
        <path d="M 6,12 Q 12,8 10,16" stroke={`url(#purpleGradient-${size})`} strokeWidth="2" fill="none" opacity="0.6"/>
      </g>
    </svg>
  );
}

export default AtticusCat;
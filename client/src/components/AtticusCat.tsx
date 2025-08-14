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
  massive: 90   // For the 96px button with padding
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
      
      {/* Cat silhouette - fills most of the viewBox */}
      <g transform="translate(50, 45)">
        {/* Cat head - fills significant portion */}
        <ellipse cx="0" cy="0" rx="35" ry="25" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        {/* Cat ears - proportionally large */}
        <polygon points="-25,-18 -35,-40 -10,-25" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        <polygon points="25,-18 35,-40 10,-25" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        {/* Cat eyes - clearly visible */}
        <circle cx="-12" cy="-3" r="5" fill="#e9d5ff"/>
        <circle cx="12" cy="-3" r="5" fill="#e9d5ff"/>
        {/* Cat body - substantial size */}
        <ellipse cx="0" cy="35" rx="25" ry="30" fill={`url(#purpleGradient-${size})`} opacity="0.6"/>
        {/* Cat tail - prominent */}
        <path d="M 25,50 Q 45,35 40,70" stroke={`url(#purpleGradient-${size})`} strokeWidth="8" fill="none" opacity="0.6"/>
      </g>
    </svg>
  );
}

export default AtticusCat;
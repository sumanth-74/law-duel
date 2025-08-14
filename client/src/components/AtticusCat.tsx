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
  massive: 140  // For the larger 160px button
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
      
      {/* Cat silhouette - large direct dimensions */}
      <g transform="translate(50, 50)">
        {/* Cat head - much bigger */}
        <ellipse cx="0" cy="0" rx="20" ry="15" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        {/* Cat ears - bigger */}
        <polygon points="-15,-10 -20,-25 -5,-15" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        <polygon points="15,-10 20,-25 5,-15" fill={`url(#purpleGradient-${size})`} opacity="0.8"/>
        {/* Cat eyes - bigger */}
        <circle cx="-7" cy="-2" r="3" fill="#e9d5ff"/>
        <circle cx="7" cy="-2" r="3" fill="#e9d5ff"/>
        {/* Cat body - bigger */}
        <ellipse cx="0" cy="20" rx="15" ry="20" fill={`url(#purpleGradient-${size})`} opacity="0.6"/>
        {/* Cat tail - bigger stroke */}
        <path d="M 15,30 Q 30,20 25,40" stroke={`url(#purpleGradient-${size})`} strokeWidth="5" fill="none" opacity="0.6"/>
      </g>
    </svg>
  );
}

export default AtticusCat;
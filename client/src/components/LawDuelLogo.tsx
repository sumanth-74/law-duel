interface LawDuelLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16', 
  xl: 'w-24 h-24'
};

const textSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl'
};

export default function LawDuelLogo({ size = 'md', showText = false, className = '' }: LawDuelLogoProps) {
  const logoSize = sizeClasses[size];
  const textSize = textSizes[size];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* SVG Logo */}
      <svg 
        className={`${logoSize} text-purple-400`}
        viewBox="0 0 100 100" 
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Elegant Script-style LD with Cat */}
        <defs>
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background Circle */}
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill="url(#purpleGradient)" 
          opacity="0.1" 
          stroke="url(#purpleGradient)" 
          strokeWidth="1"
        />
        
        {/* Cat silhouette with wizard hat - positioned above LD */}
        <g transform="translate(50, 30)">
          {/* Wizard hat */}
          <g transform="translate(0, -6)">
            {/* Hat brim */}
            <ellipse cx="0" cy="0" rx="10" ry="2" fill="#4C1D95" opacity="0.9"/>
            {/* Hat cone */}
            <polygon points="0,-10 -6,0 6,0" fill="#4C1D95" opacity="0.9"/>
            {/* Hat stars */}
            <text x="-2" y="-5" fontSize="4" fill="#FBBF24">★</text>
            <text x="2" y="-3" fontSize="3" fill="#F59E0B">✦</text>
          </g>
          
          {/* Cat head */}
          <ellipse cx="0" cy="0" rx="8" ry="6" fill="url(#purpleGradient)" opacity="0.8"/>
          {/* Cat ears - slightly hidden by hat */}
          <polygon points="-6,-4 -8,-10 -2,-6" fill="url(#purpleGradient)" opacity="0.5"/>
          <polygon points="6,-4 8,-10 2,-6" fill="url(#purpleGradient)" opacity="0.5"/>
          {/* Cat eyes */}
          <circle cx="-3" cy="-1" r="1" fill="#e9d5ff"/>
          <circle cx="3" cy="-1" r="1" fill="#e9d5ff"/>
          {/* Cat body */}
          <ellipse cx="0" cy="8" rx="6" ry="8" fill="url(#purpleGradient)" opacity="0.6"/>
          {/* Cat tail */}
          <path d="M 6,12 Q 12,8 10,16" stroke="url(#purpleGradient)" strokeWidth="2" fill="none" opacity="0.6"/>
        </g>
        
        {/* LD Text - positioned lower and properly centered */}
        <text 
          x="50" 
          y="70" 
          textAnchor="middle" 
          dominantBaseline="middle"
          className="font-cinzel font-bold" 
          fontSize="24" 
          fill="url(#purpleGradient)"
          filter="url(#glow)"
        >
          LD
        </text>
      </svg>

      {/* Text */}
      {showText && (
        <span className={`font-cinzel font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent ${textSize}`}>
          Law Duel
        </span>
      )}
    </div>
  );
}
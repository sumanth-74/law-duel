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
        {/* Elegant Script-style LD */}
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
        
        {/* Script-style L */}
        <path 
          d="M 25 25 
             C 25 22, 26 20, 28 20
             C 30 20, 31 22, 31 25
             L 31 60
             C 31 65, 33 67, 38 67
             L 45 67
             C 47 67, 48 69, 47 70
             C 46 71, 44 70, 42 70
             L 35 70
             C 28 70, 25 67, 25 60
             Z" 
          fill="url(#purpleGradient)"
          filter="url(#glow)"
        />
        
        {/* Script-style D */}
        <path 
          d="M 50 25
             C 50 22, 51 20, 53 20
             L 58 20
             C 67 20, 73 28, 73 45
             C 73 62, 67 70, 58 70
             L 53 70
             C 51 70, 50 68, 50 65
             Z
             
             M 56 27
             L 58 27
             C 63 27, 66 32, 66 45
             C 66 58, 63 63, 58 63
             L 56 63
             Z" 
          fill="url(#purpleGradient)"
          fillRule="evenodd"
          filter="url(#glow)"
        />
        
        {/* Legal accent - scales */}
        <g transform="translate(77, 12) scale(0.25)" opacity="0.7">
          <line x1="0" y1="10" x2="20" y2="10" stroke="url(#purpleGradient)" strokeWidth="2"/>
          <line x1="10" y1="0" x2="10" y2="20" stroke="url(#purpleGradient)" strokeWidth="2"/>
          <circle cx="5" cy="15" r="6" fill="none" stroke="url(#purpleGradient)" strokeWidth="1.5"/>
          <circle cx="15" cy="15" r="6" fill="none" stroke="url(#purpleGradient)" strokeWidth="1.5"/>
        </g>
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
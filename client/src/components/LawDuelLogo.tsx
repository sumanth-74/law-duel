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
        
        {/* Simple elegant text using same font as Law Duel */}
        <text 
          x="50" 
          y="55" 
          textAnchor="middle" 
          className="font-cinzel font-bold" 
          fontSize="32" 
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
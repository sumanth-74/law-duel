import { AvatarRenderer } from '@/components/AvatarRenderer';

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
 * Atticus the purple wizard cat mascot component
 * Uses the actual Atticus avatar for consistent branding
 */
export function AtticusCat({ size = 'sm', className = '' }: AtticusCatProps) {
  const svgSize = sizeMap[size];
  
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <AvatarRenderer
        avatarData={{
          base: 'atticus',
          palette: '#8B5CF6',
          props: [],
          archetypeId: 'atticus'
        }}
        size={svgSize}
        animated={false}
      />
    </div>
  );
}

export default AtticusCat;
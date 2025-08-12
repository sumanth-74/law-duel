import { useEffect, useRef } from 'react';
import { renderAvatarSVG } from '@/lib/creator';
import type { AvatarData } from '@shared/schema';

interface AvatarRendererProps {
  avatarData: AvatarData;
  level?: number;
  size?: number;
  className?: string;
  animated?: boolean;
}

export function AvatarRenderer({ 
  avatarData, 
  level = 1, 
  size = 120, 
  className = "",
  animated = false 
}: AvatarRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Calculate scale based on level (1 + 0.08 * level, capped at 1.8)
    const scale = Math.min(1 + 0.08 * (level - 1), 1.8);
    const scaledSize = size * scale;
    
    const svgString = renderAvatarSVG({
      ...avatarData,
      archetypeId: avatarData.archetypeId || null
    }, scale);
    containerRef.current.innerHTML = svgString;
    
    // Apply container size
    containerRef.current.style.width = `${scaledSize}px`;
    containerRef.current.style.height = `${scaledSize}px`;
    
    if (animated) {
      containerRef.current.style.transition = 'transform 0.3s ease';
    }
  }, [avatarData, level, size, animated]);
  
  return (
    <div 
      ref={containerRef}
      className={`avatar-glow ${className}`}
      style={{ 
        filter: 'drop-shadow(0 12px 24px rgba(0,0,0,.55))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      data-testid="avatar-renderer"
    />
  );
}

export function triggerLevelUpAnimation(avatarElement: HTMLElement) {
  if (!avatarElement) return;
  
  avatarElement.style.transform = 'scale(1.2)';
  avatarElement.classList.add('animate-pulse');
  
  setTimeout(() => {
    avatarElement.style.transform = 'scale(1)';
    avatarElement.classList.remove('animate-pulse');
  }, 500);
}

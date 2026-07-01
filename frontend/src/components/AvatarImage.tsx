import React from 'react';

interface AvatarImageProps {
  picId: string | null;
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AvatarImage = React.memo<AvatarImageProps>(({ picId, name, className = '', style }) => {
  const initials = (name || 'P')[0].toUpperCase();

  if (!picId || picId === 'none') {
    return (
      <span className={className} style={{ ...style, fontSize: 'inherit', fontWeight: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {initials}
      </span>
    );
  }

  if (picId === 'neon_matrix' || picId === 'cosmic_vortex' || picId === 'cyber_skull' || picId === 'retro_wave') {
    const emojiMap: Record<string, string> = {
      neon_matrix: '🤖',
      cosmic_vortex: '🌌',
      cyber_skull: '💀',
      retro_wave: '🌴'
    };
    return (
      <div 
        className={className} 
        style={{ 
          ...style, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'rgba(8, 14, 28, 0.95)', 
          width: '100%', 
          height: '100%', 
          borderRadius: '50%', 
          fontSize: '1.2rem',
          border: '1.5px solid var(--color-cyan, #22d3ee)'
        }}
      >
        {emojiMap[picId]}
      </div>
    );
  }

  // Fallback for static PNG avatars
  return (
    <img
      src={`/avatars/${picId}.png`}
      alt={name}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block', ...style }}
    />
  );
});

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
      <div className={`premium-avatar-crest premium-anim-${picId} ${className}`} style={style}>
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

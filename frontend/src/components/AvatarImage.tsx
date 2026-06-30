import React from 'react';

// Read once at module load — battery-saver mode does not toggle mid-session
const _isBatterySaver = localStorage.getItem('batterySaverEnabled') === 'true';

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

  // Render a simple static placeholder with corresponding emoji in Battery Saver Mode to eliminate rendering overhead
  if (_isBatterySaver && (picId === 'neon_matrix' || picId === 'cosmic_vortex' || picId === 'cyber_skull' || picId === 'retro_wave')) {
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

  // Handle CSS-animated premium avatars
  if (picId === 'neon_matrix') {
    return (
      <div className={`anim-avatar matrix-avatar ${className}`} style={style}>
        <div className="matrix-bg">
          {/* Matrix code lines */}
          <div className="matrix-rain-line line-1"></div>
          <div className="matrix-rain-line line-2"></div>
          <div className="matrix-rain-line line-3"></div>
          <div className="matrix-face">🤖</div>
        </div>
      </div>
    );
  }

  if (picId === 'cosmic_vortex') {
    return (
      <div className={`anim-avatar cosmic-avatar ${className}`} style={style}>
        <div className="cosmic-bg">
          <div className="cosmic-vortex-core"></div>
          <div className="cosmic-stars"></div>
          <div className="cosmic-galaxy">🌌</div>
        </div>
      </div>
    );
  }

  if (picId === 'cyber_skull') {
    return (
      <div className={`anim-avatar cyber-avatar ${className}`} style={style}>
        <div className="cyber-bg">
          <div className="cyber-glitch-layer text-cyan">💀</div>
          <div className="cyber-glitch-layer text-magenta">💀</div>
          <div className="cyber-glitch-skull">💀</div>
        </div>
      </div>
    );
  }

  if (picId === 'retro_wave') {
    return (
      <div className={`anim-avatar retro-avatar ${className}`} style={style}>
        <div className="retro-bg">
          <div className="retro-sun"></div>
          <div className="retro-horizon"></div>
          <div className="retro-grid"></div>
          <div className="retro-car">🌴</div>
        </div>
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

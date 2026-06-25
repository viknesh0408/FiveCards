import React from 'react';

interface AvatarImageProps {
  picId: string | null;
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({ picId, name, className = '', style }) => {
  const initials = (name || 'P')[0].toUpperCase();

  if (!picId || picId === 'none') {
    return (
      <span className={className} style={{ ...style, fontSize: 'inherit', fontWeight: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {initials}
      </span>
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
};

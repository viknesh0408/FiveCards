import React from 'react';

interface InactivityKickModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InactivityKickModal: React.FC<InactivityKickModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div 
        className="modal-content glass-panel" 
        style={{ 
          maxWidth: '460px', 
          padding: '40px 30px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '20px',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.02)'
        }}
      >
        {/* Pulsing Warning Icon Container */}
        <div 
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--color-red)',
            boxShadow: '0 0 25px var(--color-red-glow)',
            animation: 'pulse 2s infinite'
          }}
        >
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="var(--color-red)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 
            className="modal-title" 
            style={{ 
              color: 'var(--color-red)', 
              fontSize: '2rem', 
              fontWeight: 800,
              textShadow: '0 0 15px var(--color-red-glow)',
              marginBottom: '10px'
            }}
          >
            Inactivity Kick
          </h2>
          <p 
            style={{ 
              color: 'var(--color-text)', 
              fontSize: '0.95rem', 
              lineHeight: '1.6',
              margin: '0 0 10px 0'
            }}
          >
            You have been kicked from the game room due to inactivity.
          </p>
          <p 
            style={{ 
              color: 'var(--color-text-muted)', 
              fontSize: '0.85rem', 
              lineHeight: '1.5',
              margin: 0
            }}
          >
            To keep matches engaging and fair, players must take their turns within the 1-minute time limit.
          </p>
        </div>

        <button 
          className="btn-danger" 
          style={{ 
            marginTop: '10px',
            padding: '12px 36px', 
            borderRadius: '10px',
            fontSize: '1rem',
            width: '100%',
            justifyContent: 'center'
          }} 
          onClick={onClose}
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
};

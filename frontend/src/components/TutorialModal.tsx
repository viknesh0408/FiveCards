import React, { useState } from 'react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to 5 Cards! 🏆",
      subtitle: "Objective of the Game",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <p style={{ fontSize: '1rem', color: 'var(--color-text)', lineHeight: '1.6', textAlign: 'center' }}>
            The main objective of **Five Cards** is to minimize the total points in your hand. The player who accumulates the **lowest total score** across all rounds wins the entire game.
          </p>
          <div className="mm-luck-disclaimer" style={{ margin: '8px 0', borderStyle: 'solid', borderColor: 'rgba(251, 140, 0, 0.2)' }}>
            <span className="mm-luck-disclaimer-icon">🍀</span>
            <p className="mm-luck-disclaimer-text" style={{ color: 'var(--color-text)' }}>
              <strong>Fair Play Notice:</strong> There is no Easy, Medium, or Hard difficulty in this game. Everything is completely random and based on luck.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px var(--color-cyan-glow))' }}>🃏</span>
            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px var(--color-gold-glow))' }}>🃏</span>
            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px var(--color-red-glow))' }}>🃏</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '10px 0 0 0' }}>
            Think fast, discard strategically, and prepare to declare!
          </p>
        </div>
      ),
    },
    {
      title: "Card Values & Jokers 🃏",
      subtitle: "How Points are Scored",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <strong style={{ color: 'var(--color-gold)', display: 'block', marginBottom: '6px' }}>👑 Dynamic Jokers (0 points)</strong>
            At the start of each round, a card is flipped to determine the **Joker Rank**. If a 5 is flipped, all 5s in play are worth **0 points**. The 2 printed Jokers in the deck are also always **0 points**.
          </div>
          <div className="tutorial-grid">
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <strong style={{ color: 'var(--color-cyan)' }}>Aces:</strong> 1 point
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <strong style={{ color: 'var(--color-cyan)' }}>Numbers (2-10):</strong> Face Value
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)', gridColumn: 'span 2' }}>
              <strong style={{ color: 'var(--color-cyan)' }}>Jacks / Queens / Kings:</strong> 11 / 12 / 13 points
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Your Turn: Drop & Draw 🔄",
      subtitle: "Basic Discard Gameplay",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', lineHeight: '1.6' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-text)', textAlign: 'center' }}>
            On your turn, you must perform two main actions:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ background: 'var(--color-cyan)', color: '#040814', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.8rem' }}>1</span>
              <span><strong>Drop cards:</strong> Select and discard **one card** or **multiple cards of the same rank** (e.g. discard two 7s).</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ background: 'var(--color-cyan)', color: '#040814', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '0.8rem' }}>2</span>
              <span><strong>Draw a card:</strong> Take one card from the face-down Draw Pile, or take the previously dropped card.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "⚡ The Matching Rule ⚡",
      subtitle: "Skip Drawing & Shrink Your Hand",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <p style={{ fontSize: '1rem', color: 'var(--color-text)', lineHeight: '1.6', textAlign: 'center' }}>
            If the card rank you drop **matches the rank** of the top card of the discard pile, you **do not need to draw a card**!
          </p>
          <div style={{ background: 'rgba(34, 211, 238, 0.08)', border: '1px solid var(--color-cyan)', padding: '12px 18px', borderRadius: '12px', boxShadow: '0 0 15px var(--color-cyan-glow)', maxWidth: '90%' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--color-cyan)', fontWeight: 800 }}>PRO TIP 💡</span>
            <p style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--color-text)', lineHeight: '1.5' }}>
              This is the only way to reduce your hand size from 5 cards down to 4, 3, or eventually 0! Watch the discard pile closely to discard matching ranks.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "📢 Declaring \"5 Cards\" (Tick)",
      subtitle: "End the Round & Claim Victory",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', lineHeight: '1.5' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-text)', textAlign: 'center', marginBottom: '8px' }}>
            If the sum of your hand is **5 points or less**, you can click **Declare (Tick)** at the start of your turn:
          </p>
          <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid var(--color-green)', padding: '10px 14px', borderRadius: '10px' }}>
            <strong style={{ color: 'var(--color-green)' }}>✅ Correct Declare:</strong> If you indeed have the lowest hand value, you score **0 points** for the round. Everyone else gets their hand value as penalty.
          </div>
          <div style={{ background: 'rgba(248, 113, 113, 0.08)', border: '1px solid var(--color-red)', padding: '10px 14px', borderRadius: '10px' }}>
            <strong style={{ color: 'var(--color-red)' }}>❌ Wrong Declare:</strong> If another player has a lower or equal hand value, you get an **80-point penalty**, and the player who actually had the lowest gets 0 points.
          </div>
        </div>
      ),
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 11000 }}>
      <div className="modal-content glass-panel tutorial-card">
        {/* Close "X" Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: '1.6rem',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-red)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          ×
        </button>

        <div style={{ textAlign: "center" }}>
          <h2
            className="modal-title"
            style={{
              color: "var(--color-cyan)",
              fontSize: "2rem",
              fontWeight: 800,
              textShadow: "0 0 15px var(--color-cyan-glow)",
              marginBottom: "4px"
            }}
          >
            {steps[currentStep].title}
          </h2>
          <p
            style={{
              color: "var(--color-gold)",
              fontSize: "0.85rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              textShadow: "0 0 8px var(--color-gold-glow)",
              marginBottom: "20px"
            }}
          >
            {steps[currentStep].subtitle}
          </p>

          <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {steps[currentStep].content}
          </div>
        </div>

        {/* Footer controls */}
        <div className="tutorial-footer">
          <button
            className="btn-secondary tutorial-skip-btn"
            style={{ padding: '8px 18px', fontSize: '0.9rem' }}
            onClick={onClose}
          >
            Skip Tutorial
          </button>

          {/* Dots Indicator */}
          <div className="tutorial-dots" style={{ display: 'flex', gap: '6px' }}>
            {steps.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === currentStep ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: idx === currentStep ? 'var(--color-cyan)' : 'rgba(255,255,255,0.15)',
                  boxShadow: idx === currentStep ? '0 0 8px var(--color-cyan)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            ))}
          </div>

          <div className="tutorial-footer-buttons">
            {currentStep > 0 && (
              <button
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.9rem' }}
                onClick={handleBack}
              >
                Back
              </button>
            )}

            <button
              className="btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.9rem' }}
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? "Let's Play! 🚀" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

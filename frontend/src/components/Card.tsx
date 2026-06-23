import React from 'react';
import type { Card as CardType } from '../utils/gameHelpers';
import { getSuitSymbol, getRankDisplay, getSuitClass } from '../utils/gameHelpers';

interface CardProps {
  card?: CardType;
  isBack?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  dataIndex?: number;
}

export const Card: React.FC<CardProps> = ({
  card,
  isBack = false,
  selected = false,
  onClick,
  className = '',
  draggable,
  onDragStart,
  onDragOver,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  dataIndex,
}) => {
  if (isBack) {
    const selectedBack = localStorage.getItem('selected_card_back') || 'classic';
    return (
      <div 
        className={`game-card card-back card-back-${selectedBack} ${className}`} 
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data-index={dataIndex}
      >
        <div className="card-back-pattern">
          <div className="card-back-logo">5T</div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const suitSymbol = getSuitSymbol(card.suit);
  const rankDisplay = getRankDisplay(card.rank);
  const suitClass = getSuitClass(card.suit);
  const isJoker = card.joker;

  const isPrintedJoker = isJoker && !card.suit && !card.rank;

  return (
    <div
      className={`game-card ${suitClass} ${isJoker ? 'joker joker-glow' : ''} ${selected ? 'selected' : ''} ${className}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      data-index={dataIndex}
    >
      {isPrintedJoker ? (
        <img 
          src="/joker.png" 
          alt="Joker" 
          style={{ 
            position: 'absolute',
            inset: 0,
            width: '100%', 
            height: '100%', 
            objectFit: 'fill',
            borderRadius: 'inherit',
            pointerEvents: 'none'
          }} 
        />
      ) : (
        <>
          {/* Decorative inner line to give luxury playing card look */}
          <div 
            className="card-inner-border"
            style={{
              position: 'absolute',
              top: '4px',
              left: '4px',
              right: '4px',
              bottom: '4px',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              borderRadius: '6px',
              pointerEvents: 'none',
            }}
          />
          
          <div className="card-corner top">
            <span className="card-rank">{rankDisplay}</span>
            <span className="card-suit-icon">{suitSymbol}</span>
          </div>
          
          <div className="card-center-suit" style={{ opacity: isJoker ? 1 : 0.85 }}>
            {suitSymbol}
          </div>
          
          <div className="card-corner bottom">
            <span className="card-rank">{rankDisplay}</span>
            <span className="card-suit-icon">{suitSymbol}</span>
          </div>
        </>
      )}
    </div>
  );
};


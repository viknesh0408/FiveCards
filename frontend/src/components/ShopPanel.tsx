import React, { useState, useEffect } from 'react';
import {
  initDailyState,
  getDailyState,
  purchaseShopItem,
  equipShopItem,
} from '../utils/dailySystem';
import type { DailyState } from '../utils/dailySystem';
import { soundEffects } from '../utils/soundEffects';

interface ShopPanelProps {
  onBack: () => void;
  onStateChange?: () => void; // notify parent (e.g. to refresh stats or coins badges)
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon?: string; // used for quick display
}

const CARD_BACKS: ShopItem[] = [
  { id: 'classic', name: 'Classic Red', description: 'The timeless standard layout', price: 0 },
  { id: 'neon', name: 'Neon Cyber', description: 'Vibrant glowing grid from the future', price: 2500 },
  { id: 'holographic', name: 'Holographic Aura', description: 'Shimmering pastel rainbow shifting light', price: 3750 },
  { id: 'emerald', name: 'Emerald Forest', description: 'Rich green luxury marble with gold veins', price: 3000 },
  { id: 'gold', name: 'Golden Royal', description: 'Prestigious golden filigree and ornate details', price: 10000 },
  { id: 'obsidian', name: 'Dark Obsidian', description: 'Stealth charcoal texture with purple neon pulses', price: 12000 },
];

const AVATAR_FRAMES: ShopItem[] = [
  { id: 'none', name: 'Default Frame', description: 'Simple, clean border profile ring', price: 0 },
  { id: 'neon_frame', name: 'Neon Cyber', description: 'Electrifying cyan and hot pink glowing ring', price: 2000 },
  { id: 'frost', name: 'Ice Frost', description: 'Frosted blue crystals and cold sparkle glow', price: 3000 },
  { id: 'fire', name: 'Fire Flame', description: 'Energetic warm orange-red dancing fire ring', price: 4000 },
  { id: 'gold_aura', name: 'Golden Aura', description: 'Continuous rotate of brilliant royal gold rays', price: 10000 },
  { id: 'royal', name: 'Royal Crown', description: 'Majestic golden crest crowned with a royal tiara', price: 15000 },
];

export const ShopPanel: React.FC<ShopPanelProps> = ({ onBack, onStateChange }) => {
  const [state, setState] = useState<DailyState>(() => initDailyState());
  const [activeTab, setActiveTab] = useState<'cardBacks' | 'avatars'>('cardBacks');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    setState(getDailyState());
  }, []);

  const handlePurchase = (item: ShopItem) => {
    if (state.coins < item.price) return;
    setBuyingId(item.id);
    
    // Deduct coins & unlock
    purchaseShopItem(
      activeTab === 'cardBacks' ? 'cardBack' : 'avatar',
      item.id,
      item.price
    );

    // Auto equip upon purchase
    const finalState = equipShopItem(
      activeTab === 'cardBacks' ? 'cardBack' : 'avatar',
      item.id
    );

    setState(finalState);
    onStateChange?.();
    
    // Play celebratory sound
    soundEffects.playWin();

    setTimeout(() => {
      setBuyingId(null);
    }, 800);
  };

  const handleEquip = (itemId: string) => {
    const newState = equipShopItem(
      activeTab === 'cardBacks' ? 'cardBack' : 'avatar',
      itemId
    );
    setState(newState);
    onStateChange?.();
    soundEffects.playClick();
  };

  const currentItems = activeTab === 'cardBacks' ? CARD_BACKS : AVATAR_FRAMES;
  const playerInitials = (localStorage.getItem('tickPlayerName') || 'Player')[0].toUpperCase();

  return (
    <div className="shop-root daily-root">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="daily-header">
        <button className="mm-back-btn" onClick={onBack}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="daily-coins-pill">
            <span className="animate-spin-slow">🪙</span>
            <span className="daily-coins-val">{state.coins.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Custom Tab Bar ──────────────────────────────────── */}
      <div className="shop-tab-bar">
        <button
          className={`shop-tab-btn ${activeTab === 'cardBacks' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('cardBacks');
            soundEffects.playClick();
          }}
        >
          🃏 Card Backs
        </button>
        <button
          className={`shop-tab-btn ${activeTab === 'avatars' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('avatars');
            soundEffects.playClick();
          }}
        >
          👤 Avatar Frames
        </button>
      </div>

      <div className="daily-scroll-body shop-scroll-body">
        <div className="shop-items-grid">
          {currentItems.map((item) => {
            const isUnlocked = activeTab === 'cardBacks'
              ? state.unlockedCardBacks.includes(item.id)
              : state.unlockedAvatars.includes(item.id);

            const isEquipped = activeTab === 'cardBacks'
              ? state.selectedCardBack === item.id
              : state.selectedAvatar === item.id;

            const canAfford = state.coins >= item.price;
            const isBuying = buyingId === item.id;

            return (
              <div
                key={item.id}
                className={`shop-item-card glass-panel ${isEquipped ? 'equipped' : ''} ${isBuying ? 'pulse-green' : ''}`}
              >
                {/* Visual Preview Box */}
                <div className="shop-item-preview">
                  {activeTab === 'cardBacks' ? (
                    // Card Back Preview
                    <div className={`shop-card-back-preview card-back-${item.id}`}>
                      <div className="card-back-pattern">
                        <div className="card-back-logo">5T</div>
                      </div>
                    </div>
                  ) : (
                    // Avatar Frame Preview
                    <div className="shop-avatar-frame-container">
                      <div className={`shop-avatar-ring avatar-frame-${item.id}`}>
                        {item.id === 'royal' && <span className="shop-royal-crown">👑</span>}
                        <span className="shop-avatar-crest">{playerInitials}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="shop-item-details">
                  <h3 className="shop-item-name">{item.name}</h3>
                  <p className="shop-item-desc">{item.description}</p>
                </div>

                {/* Footer Action Buttons */}
                <div className="shop-item-actions">
                  {isEquipped ? (
                    <span className="shop-status-equipped">Equipped ✓</span>
                  ) : isUnlocked ? (
                    <button
                      className="shop-btn-equip"
                      onClick={() => handleEquip(item.id)}
                    >
                      Equip
                    </button>
                  ) : (
                    <button
                      className={`shop-btn-buy ${canAfford ? 'buyable' : 'disabled'}`}
                      disabled={!canAfford}
                      onClick={() => handlePurchase(item)}
                    >
                      🪙 {item.price}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

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
  { id: 'neon', name: 'Neon Cyber', description: 'Vibrant glowing grid from the future', price: 1000 },
  { id: 'holographic', name: 'Holographic Aura', description: 'Shimmering pastel rainbow shifting light', price: 1500 },
  { id: 'emerald', name: 'Emerald Forest', description: 'Rich green luxury marble with gold veins', price: 2000 },
  { id: 'amethyst', name: 'Amethyst Geode', description: 'Deep purple crystalline texture with shimmering light', price: 2500 },
  { id: 'ruby', name: 'Ruby Heart', description: 'Crimson red metallic plate with glowing heartbeat line', price: 3000 },
  { id: 'sapphire', name: 'Ocean Sapphire', description: 'Royal blue waves with silver accents', price: 3500 },
  { id: 'steampunk', name: 'Steampunk Brass', description: 'Ornate bronze gears and copper piping style', price: 4000 },
  { id: 'cyberpunk', name: 'Cyberpunk Glitch', description: 'Glitchy neon green and static lines', price: 5000 },
  { id: 'prism', name: 'Rainbow Prism', description: 'Shifting light spectrum and geometric shards', price: 6000 },
  { id: 'matrix', name: 'Matrix Code', description: 'Falling green digital rain code', price: 7000 },
  { id: 'lava', name: 'Volcanic Lava', description: 'Glowing orange molten magma flows', price: 8000 },
  { id: 'cosmic', name: 'Cosmic Nebula', description: 'Swirling starry galaxy background', price: 9000 },
  { id: 'gold', name: 'Golden Royal', description: 'Prestigious golden filigree and ornate details', price: 10000 },
  { id: 'obsidian', name: 'Dark Obsidian', description: 'Stealth charcoal texture with purple neon pulses', price: 12000 },
  { id: 'dragon_scale', name: 'Dragon Scale', description: 'Scaled fire-breathing red reptile armor plate', price: 15000 },
];

const AVATAR_FRAMES: ShopItem[] = [
  { id: 'none', name: 'Default Frame', description: 'Simple, clean border profile ring', price: 0 },
  { id: 'neon_frame', name: 'Neon Cyber', description: 'Electrifying cyan and hot pink glowing ring', price: 1000 },
  { id: 'frost', name: 'Ice Frost', description: 'Frosted blue crystals and cold sparkle glow', price: 1500 },
  { id: 'fire', name: 'Fire Flame', description: 'Energetic warm orange-red dancing fire ring', price: 2000 },
  { id: 'amethyst_frame', name: 'Amethyst Crystal', description: 'Purple crystalline glowing geode ring', price: 2500 },
  { id: 'ruby_frame', name: 'Ruby Heartbeat', description: 'Pulsing crimson crystal border', price: 3000 },
  { id: 'sapphire_frame', name: 'Sapphire Wave', description: 'Flowing blue ocean waters', price: 3500 },
  { id: 'steampunk_frame', name: 'Steampunk Gear', description: 'Rotating brass gears border', price: 4000 },
  { id: 'cyberpunk_frame', name: 'Glitch Matrix', description: 'Shifting cyan/lime noise glitch border', price: 5000 },
  { id: 'prism_frame', name: 'Rainbow Prism', description: 'Prismatic color cycle border', price: 6000 },
  { id: 'matrix_frame', name: 'Digital Code', description: 'Code waterfall flowing around avatar', price: 7000 },
  { id: 'lava_frame', name: 'Volcanic Lava', description: 'Hot glowing molten lava ring', price: 8000 },
  { id: 'cosmic_frame', name: 'Cosmic Nebula', description: 'Starry nebula galaxy swirl frame', price: 9000 },
  { id: 'gold_aura', name: 'Golden Aura', description: 'Continuous rotate of brilliant royal gold rays', price: 10000 },
  { id: 'dragon_frame', name: 'Dragon Emperor', description: 'Crimson scales crowned with dragon claws', price: 12000 },
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

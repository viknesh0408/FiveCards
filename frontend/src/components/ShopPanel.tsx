import React, { useState, useEffect } from 'react';
import {
  initDailyState,
  getDailyState,
  purchaseShopItem,
  equipShopItem,
} from '../utils/dailySystem';
import type { DailyState } from '../utils/dailySystem';
import { soundEffects } from '../utils/soundEffects';
import { AvatarImage } from './AvatarImage';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'cardBack' | 'avatar' | 'tableFelt' | 'avatarPic';
  icon?: string; // used for quick display
}

const CARD_BACKS: ShopItem[] = [
  { id: 'classic', name: 'Classic Red', description: 'The timeless standard layout', price: 0, type: 'cardBack' },
  { id: 'neon', name: 'Neon Cyber', description: 'Vibrant glowing grid from the future', price: 1000, type: 'cardBack' },
  { id: 'holographic', name: 'Holographic Aura', description: 'Shimmering pastel rainbow shifting light', price: 1500, type: 'cardBack' },
  { id: 'wood', name: 'Classic Wood', description: 'Ornate polished mahogany wood pattern', price: 2000, type: 'cardBack' },
  { id: 'emerald', name: 'Emerald Forest', description: 'Rich green luxury marble with gold veins', price: 2000, type: 'cardBack' },
  { id: 'amethyst', name: 'Amethyst Geode', description: 'Deep purple crystalline texture with shimmering light', price: 2500, type: 'cardBack' },
  { id: 'ruby', name: 'Ruby Heart', description: 'Crimson red metallic plate with glowing heartbeat line', price: 3000, type: 'cardBack' },
  { id: 'sapphire', name: 'Ocean Sapphire', description: 'Royal blue waves with silver accents', price: 3500, type: 'cardBack' },
  { id: 'steampunk', name: 'Steampunk Brass', description: 'Ornate bronze gears and copper piping style', price: 4000, type: 'cardBack' },
  { id: 'cyberpunk', name: 'Cyberpunk Glitch', description: 'Glitchy neon green and static lines', price: 5000, type: 'cardBack' },
  { id: 'prism', name: 'Rainbow Prism', description: 'Shifting light spectrum and geometric shards', price: 6000, type: 'cardBack' },
  { id: 'matrix', name: 'Matrix Code', description: 'Falling green digital rain code', price: 7000, type: 'cardBack' },
  { id: 'lava', name: 'Volcanic Lava', description: 'Glowing orange molten magma flows', price: 8000, type: 'cardBack' },
  { id: 'cosmic', name: 'Cosmic Nebula', description: 'Swirling starry galaxy background', price: 9000, type: 'cardBack' },
  { id: 'gold', name: 'Golden Royal', description: 'Prestigious golden filigree and ornate details', price: 10000, type: 'cardBack' },
  { id: 'obsidian', name: 'Dark Obsidian', description: 'Stealth charcoal texture with purple neon pulses', price: 12000, type: 'cardBack' },
  { id: 'dragon_scale', name: 'Dragon Scale', description: 'Scaled fire-breathing red reptile armor plate', price: 15000, type: 'cardBack' },
];



const ANIMATED_AVATARS: ShopItem[] = [
  { id: 'neon_matrix', name: 'Matrix Cyber', description: 'Cybernetic matrix code theme profile', price: 3000, type: 'avatarPic' },
  { id: 'cosmic_vortex', name: 'Cosmic Vortex', description: 'Deep space cosmic nebula theme profile', price: 3500, type: 'avatarPic' },
  { id: 'cyber_skull', name: 'Glitch Skull', description: 'Neon glitch cyber skull theme profile', price: 4000, type: 'avatarPic' },
  { id: 'retro_wave', name: 'Retrowave Sun', description: 'Retro synthwave sunset theme profile', price: 4500, type: 'avatarPic' },
];

const TABLE_FELTS: ShopItem[] = [
  { id: 'emerald_green', name: 'Emerald Green', description: 'Classic casino velvet felt background', price: 0, type: 'tableFelt' },
  { id: 'royal_blue', name: 'Royal Blue', description: 'Deep prestige royal blue felt background', price: 1000, type: 'tableFelt' },
  { id: 'cyber_purple', name: 'Cyber Purple', description: 'Vibrant neon purple futuristic felt background', price: 1500, type: 'tableFelt' },
];

interface ShopPanelProps {
  onBack: () => void;
  onStateChange?: () => void; // notify parent (e.g. to refresh stats or coins badges)
}

export const ShopPanel: React.FC<ShopPanelProps> = ({ onBack, onStateChange }) => {
  const [state, setState] = useState<DailyState>(() => initDailyState());
  const [activeTab, setActiveTab] = useState<'cardBacks' | 'avatars' | 'tableFelts'>('cardBacks');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    setState(getDailyState());
  }, []);

  const handlePurchase = (item: ShopItem) => {
    const balance = state.coins;
    if (balance < item.price) return;
    setBuyingId(item.id);
    
    // Deduct coins & unlock
    purchaseShopItem(
      item.type,
      item.id,
      item.price
    );

    // Auto equip upon purchase
    const finalState = equipShopItem(
      item.type,
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

  const handleEquip = (item: ShopItem) => {
    const newState = equipShopItem(
      item.type,
      item.id
    );
    setState(newState);
    onStateChange?.();
    soundEffects.playClick();
  };

  // Get current items for grid rendering based on tab
  const getCurrentItems = (): ShopItem[] => {
    if (activeTab === 'cardBacks') return CARD_BACKS;
    if (activeTab === 'tableFelts') return TABLE_FELTS;
    return [];
  };

  const playerInitials = (localStorage.getItem('tickPlayerName') || 'Player')[0].toUpperCase();

  const renderShopItem = (item: ShopItem) => {
    // Check unlocked state dynamically
    const isUnlocked = 
      item.type === 'cardBack' ? state.unlockedCardBacks.includes(item.id) :
      item.type === 'avatar' ? state.unlockedAvatars.includes(item.id) :
      item.type === 'avatarPic' ? (state.unlockedAvatarPics || ['none', 'cat']).includes(item.id) :
      item.type === 'tableFelt' ? (state.unlockedTableFelts || ['emerald_green']).includes(item.id) : false;

    // Check equipped state dynamically
    const isEquipped = 
      item.type === 'cardBack' ? state.selectedCardBack === item.id :
      item.type === 'avatar' ? state.selectedAvatar === item.id :
      item.type === 'avatarPic' ? localStorage.getItem('selected_avatar_pic') === item.id :
      item.type === 'tableFelt' ? (state.selectedTableFelt || 'emerald_green') === item.id : false;

    const canAfford = state.coins >= item.price;
    const isBuying = buyingId === item.id;

    return (
      <div
        key={`${item.type}-${item.id}`}
        className={`shop-item-card glass-panel ${isEquipped ? 'equipped' : ''} ${isBuying ? 'pulse-green' : ''}`}
      >
        {/* Visual Preview Box */}
        <div className="shop-item-preview">
          {item.type === 'cardBack' ? (
            // Card Back Preview
            <div className={`shop-card-back-preview card-back-${item.id}`}>
              <div className="card-back-pattern">
                <div className="card-back-logo">5T</div>
              </div>
            </div>
          ) : item.type === 'avatarPic' ? (
            // Animated Avatar Pic Preview
            <div className="shop-avatar-frame-container">
              <div className="shop-avatar-ring avatar-frame-none" style={{ overflow: 'hidden', width: '56px', height: '56px', borderWidth: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AvatarImage picId={item.id} name={playerInitials} className="mm-avatar-img" />
              </div>
            </div>
          ) : (
            // Table Felt Preview
            <div 
              className={`shop-felt-preview`} 
              style={{ 
                width: '100px', 
                height: '60px', 
                borderRadius: '8px', 
                border: '2px solid rgba(255,255,255,0.15)', 
                position: 'relative', 
                overflow: 'hidden',
                background: item.id === 'emerald_green' ? 'radial-gradient(circle at center, #0c2b1e 0%, #030f0a 100%)' :
                            item.id === 'royal_blue' ? 'radial-gradient(circle at center, #081d3d 0%, #020712 100%)' :
                            'radial-gradient(circle at center, #23083e 0%, #07010f 100%)'
              }}
            >
              {/* Felt weave details */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(#ffffff 25%, transparent 25%), radial-gradient(#ffffff 25%, transparent 25%)', backgroundSize: '4px 4px', backgroundPosition: '0 0, 2px 2px', pointerEvents: 'none' }} />
              <div className="felt-label" style={{ position: 'absolute', bottom: '4px', left: '0', right: '0', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontWeight: 'bold' }}>Felt</div>
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
              onClick={() => handleEquip(item)}
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
  };

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
          🃏 Card Themes
        </button>
        <button
          className={`shop-tab-btn ${activeTab === 'avatars' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('avatars');
            soundEffects.playClick();
          }}
        >
          👤 Avatar Profiles
        </button>
        <button
          className={`shop-tab-btn ${activeTab === 'tableFelts' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('tableFelts');
            soundEffects.playClick();
          }}
        >
          🟩 Table Felts
        </button>
      </div>

      <div className="daily-scroll-body shop-scroll-body">
        {activeTab === 'avatars' ? (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <h3 className="shop-section-title-divider" style={{ margin: '0 0 16px 0' }}>Premium Avatars</h3>
            <div className="shop-items-grid">
              {ANIMATED_AVATARS.map((item) => renderShopItem(item))}
            </div>
          </div>
        ) : (
          <div className="shop-items-grid">
            {getCurrentItems().map((item) => renderShopItem(item))}
          </div>
        )}
      </div>
    </div>
  );
};

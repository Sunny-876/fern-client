import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Star,
  CheckCircle,
  Shield,
  Tag,
  Shirt,
  Smile,
  Layers,
  Crown,
  Info,
  Check,
  X,
} from 'lucide-react';
import {
  CosmeticCategory,
  CosmeticDefinition,
  CosmeticEquippedState,
  CosmeticOwnership,
  CosmeticRarity,
  UserCosmeticItem,
} from '../../../../shared/models/cosmetics';

export const CosmeticsPage: React.FC = () => {
  const [catalog, setCatalog] = useState<CosmeticDefinition[]>([]);
  const [ownership, setOwnership] = useState<CosmeticOwnership | null>(null);
  const [equippedState, setEquippedState] = useState<CosmeticEquippedState | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<CosmeticCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [ownedOnly, setOwnedOnly] = useState(false);

  // Selected Item for Preview
  const [selectedItem, setSelectedItem] = useState<CosmeticDefinition | null>(null);

  useEffect(() => {
    loadCosmeticsData();
  }, []);

  const showToast = (text: string, isError = false) => {
    setFeedbackMsg({ text, isError });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const loadCosmeticsData = async () => {
    if (!window.fern) return;
    setLoading(true);
    try {
      const [catList, owned, eq] = await Promise.all([
        window.fern.getCosmeticsCatalog(),
        window.fern.getOwnedCosmetics(),
        window.fern.getEquippedCosmetics(),
      ]);

      setCatalog(catList);
      setOwnership(owned);
      setEquippedState(eq);

      if (catList.length > 0 && !selectedItem) {
        setSelectedItem(catList[0]);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading cosmetics', true);
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async (cosmetic: CosmeticDefinition) => {
    if (!window.fern) return;
    try {
      const success = await window.fern.equipCosmetic(cosmetic.category, cosmetic.id);
      if (success) {
        showToast(`Equipped ${cosmetic.name}`);
        const updatedEq = await window.fern.getEquippedCosmetics();
        setEquippedState(updatedEq);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to equip', true);
    }
  };

  const handleUnequip = async (category: CosmeticCategory) => {
    if (!window.fern) return;
    try {
      const success = await window.fern.unequipCosmetic(category);
      if (success) {
        showToast(`Unequipped ${category}`);
        const updatedEq = await window.fern.getEquippedCosmetics();
        setEquippedState(updatedEq);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to unequip', true);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, cosmeticId: string) => {
    e.stopPropagation();
    if (!window.fern) return;
    try {
      await window.fern.toggleFavoriteCosmetic(cosmeticId);
      const updatedOwned = await window.fern.getOwnedCosmetics();
      setOwnership(updatedOwned);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle favorite', true);
    }
  };

  // Merge items
  const userItems: UserCosmeticItem[] = catalog.map((def) => {
    const isOwned = ownership ? ownership.ownedCosmeticIds.includes(def.id) : false;
    const isEquipped = equippedState ? equippedState.equipped[def.category] === def.id : false;
    const isFavorite = ownership ? ownership.favorites.includes(def.id) : false;

    return {
      ...def,
      isOwned,
      isEquipped,
      isFavorite,
    };
  });

  // Filter items
  const filteredItems = userItems.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    if (favoritesOnly && !item.isFavorite) {
      return false;
    }
    if (ownedOnly && !item.isOwned) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getRarityBadgeStyle = (rarity: CosmeticRarity) => {
    switch (rarity) {
      case 'legendary':
        return { color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' };
      case 'epic':
        return { color: '#c084fc', background: 'rgba(192, 132, 252, 0.1)', border: '1px solid rgba(192, 132, 252, 0.3)' };
      case 'rare':
        return { color: '#60a5fa', background: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.3)' };
      case 'uncommon':
        return { color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)' };
      case 'common':
      default:
        return { color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.2)' };
    }
  };

  const getCategoryIcon = (cat: CosmeticCategory) => {
    switch (cat) {
      case 'cape':
        return Layers;
      case 'cloak':
        return Shirt;
      case 'hat':
        return Crown;
      case 'accessory':
        return Sparkles;
      case 'emote':
        return Smile;
      default:
        return Tag;
    }
  };

  const isSelectedEquipped = selectedItem && equippedState
    ? equippedState.equipped[selectedItem.category] === selectedItem.id
    : false;

  const isSelectedOwned = selectedItem && ownership
    ? ownership.ownedCosmeticIds.includes(selectedItem.id)
    : false;

  const isSelectedFavorite = selectedItem && ownership
    ? ownership.favorites.includes(selectedItem.id)
    : false;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1.25rem' }}>
      {/* Toast */}
      {feedbackMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: feedbackMsg.isError ? '#7f1d1d' : '#064e3b',
          color: feedbackMsg.isError ? '#fecaca' : '#a7f3d0',
          border: `1px solid ${feedbackMsg.isError ? '#dc2626' : '#059669'}`,
          padding: '0.6rem 1.2rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          fontWeight: 500,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {feedbackMsg.text}
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Cosmetics & Wardrobe
            </h1>
            <span style={{
              background: 'var(--color-accent-subtle)',
              color: 'var(--color-accent)',
              border: '1px solid var(--border-focus)',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontWeight: 600,
            }}>
              Purely Visual
            </span>
          </div>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Equip custom capes, cloaks, hats, accessories, and emotes with zero gameplay modifications.
          </p>
        </div>

        {/* Search */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '260px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          padding: '0 0.75rem',
        }}>
          <Search size={15} color="var(--text-dim)" />
          <input
            type="text"
            placeholder="Search cosmetics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              padding: '0.5rem 0.5rem',
              outline: 'none',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Three-Column Layout: Left (Categories) | Center (Grid) | Right (Preview/Details) */}
      <div style={{ display: 'flex', flex: 1, gap: '1.25rem', overflow: 'hidden' }}>
        {/* LEFT COLUMN: Categories & Filters */}
        <div style={{
          width: '200px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          borderRight: '1px solid var(--border-subtle)',
          paddingRight: '1.25rem',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              Categories
            </div>

            {[
              { id: 'all' as const, label: 'All Items', icon: Tag },
              { id: 'cape' as const, label: 'Capes', icon: Layers },
              { id: 'cloak' as const, label: 'Cloaks', icon: Shirt },
              { id: 'hat' as const, label: 'Hats', icon: Crown },
              { id: 'accessory' as const, label: 'Accessories', icon: Sparkles },
              { id: 'emote' as const, label: 'Emotes', icon: Smile },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                    color: isActive ? 'var(--color-accent)' : 'var(--text-muted)',
                    border: isActive ? '1px solid var(--border-focus)' : '1px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Icon size={16} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Filter
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ownedOnly}
                onChange={(e) => setOwnedOnly(e.target.checked)}
              />
              Owned Only
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => setFavoritesOnly(e.target.checked)}
              />
              Favorites Only
            </label>
          </div>
        </div>

        {/* CENTER COLUMN: Cosmetic Grid */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {filteredItems.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '3rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <Sparkles size={32} color="var(--text-dim)" />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                No cosmetics found
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Try adjusting your search query or category filters.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const rarityStyle = getRarityBadgeStyle(item.rarity);
                const IconComponent = getCategoryIcon(item.category);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      background: 'var(--bg-card)',
                      border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      cursor: 'pointer',
                      position: 'relative',
                      boxShadow: isSelected ? '0 0 0 1px var(--color-accent)' : 'none',
                      transition: 'border-color var(--transition-fast)',
                    }}
                  >
                    {/* Top Row: Rarity badge & Favorite toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        ...rarityStyle,
                        padding: '0.1rem 0.4rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {item.rarity}
                      </span>

                      <button
                        onClick={(e) => handleToggleFavorite(e, item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: item.isFavorite ? '#fbbf24' : 'var(--text-dim)',
                          padding: '0.1rem',
                        }}
                      >
                        <Star size={14} fill={item.isFavorite ? '#fbbf24' : 'none'} />
                      </button>
                    </div>

                    {/* Preview Graphic Box */}
                    <div style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      height: '90px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <IconComponent size={36} color="var(--color-accent)" opacity={0.8} />

                      {item.isEquipped && (
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: '#15803d',
                          color: '#ffffff',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                        }}>
                          <Check size={10} /> EQUIPPED
                        </div>
                      )}
                    </div>

                    {/* Title & Category */}
                    <div>
                      <div style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                        {item.category} • {item.isOwned ? 'Owned' : 'Locked'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Preview & Item Details */}
        <div style={{
          width: '280px',
          borderLeft: '1px solid var(--border-subtle)',
          paddingLeft: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
        }}>
          {selectedItem ? (
            <>
              {/* Preview Mannequin Canvas */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.08) 0%, transparent 70%)',
                }} />

                {React.createElement(getCategoryIcon(selectedItem.category), {
                  size: 64,
                  color: 'var(--color-accent)',
                })}

                <span style={{
                  marginTop: '0.85rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  3D Player Preview
                </span>
              </div>

              {/* Item Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedItem.name}
                  </h3>
                  <span style={{
                    ...getRarityBadgeStyle(selectedItem.rarity),
                    padding: '0.1rem 0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>
                    {selectedItem.rarity}
                  </span>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'capitalize', marginBottom: '0.65rem' }}>
                  {selectedItem.category} • Model: {selectedItem.modelType}
                </div>

                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {selectedItem.description}
                </p>
              </div>

              {/* Integrity & Zero-Advantage Guarantee */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <Shield size={16} color="var(--color-accent)" />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Zero hitbox, speed, or collision changes. Purely cosmetic.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {isSelectedEquipped ? (
                  <button
                    onClick={() => handleUnequip(selectedItem.category)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.55rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <X size={15} /> Unequip Item
                  </button>
                ) : (
                  <button
                    onClick={() => handleEquip(selectedItem)}
                    disabled={!isSelectedOwned}
                    style={{
                      width: '100%',
                      background: isSelectedOwned ? 'var(--color-accent)' : 'var(--bg-secondary)',
                      color: isSelectedOwned ? '#ffffff' : 'var(--text-dim)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.55rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: isSelectedOwned ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Check size={15} /> {isSelectedOwned ? 'Equip Item' : 'Item Locked'}
                  </button>
                )}

                <button
                  onClick={(e) => handleToggleFavorite(e, selectedItem.id)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.45rem',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Star size={14} fill={isSelectedFavorite ? '#fbbf24' : 'none'} color={isSelectedFavorite ? '#fbbf24' : 'currentColor'} />
                  {isSelectedFavorite ? 'Favorited' : 'Add to Favorites'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>
              Select a cosmetic to preview details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  UserCheck,
  Search,
  EyeOff,
  Clock,
  Gamepad2,
  Trash2,
  Ban,
  Check,
  X,
  Edit3,
  Award,
  Sparkles,
  Lock,
  RefreshCw,
  Info,
} from 'lucide-react';
import { FernUserProfile, UpdateUserProfileDTO, UserProfileValidator } from '../../../../shared/models/user-profile';
import { Friend, FriendRequest, BlockEntry, UserPresence } from '../../../../shared/models/social';
import { SocialPrivacySettings, DEFAULT_SOCIAL_PRIVACY, PRIVACY_EXPLANATIONS } from '../../../../shared/models/privacy';
import { PlayerStatistics, StatisticsCalculator } from '../../../../shared/models/statistics';
import { CosmeticEquippedState } from '../../../../shared/models/cosmetics';

export const SocialPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'friends' | 'requests' | 'profile' | 'privacy'>('friends');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [profile, setProfile] = useState<FernUserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [blocked, setBlocked] = useState<BlockEntry[]>([]);
  const [privacy, setPrivacy] = useState<SocialPrivacySettings>(DEFAULT_SOCIAL_PRIVACY);
  const [stats, setStats] = useState<PlayerStatistics | null>(null);
  const [equipped, setEquipped] = useState<CosmeticEquippedState | null>(null);

  // Search & Filtering
  const [friendSearch, setFriendSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [addUsernameInput, setAddUsernameInput] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Profile Edit Modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editFormErrors, setEditFormErrors] = useState<string[]>([]);

  // Selected Profile Preview Modal
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [previewProfile, setPreviewProfile] = useState<FernUserProfile | null>(null);

  useEffect(() => {
    loadAllSocialData();
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const loadAllSocialData = async () => {
    if (!window.fern) return;
    setLoading(true);
    try {
      const [p, f, r, b, priv, st, eq] = await Promise.all([
        window.fern.getUserProfile(),
        window.fern.getFriends(),
        window.fern.getFriendRequests(),
        window.fern.getBlockedUsers(),
        window.fern.getSocialPrivacy(),
        window.fern.getPlayerStatistics(),
        window.fern.getEquippedCosmetics(),
      ]);

      setProfile(p);
      setFriends(f);
      setRequests(r);
      setBlocked(b);
      setPrivacy(priv);
      setStats(st);
      setEquipped(eq);
    } catch (err: any) {
      showNotification(err.message || 'Error loading social data', true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!window.fern || !addUsernameInput.trim()) return;
    const clean = addUsernameInput.trim().replace(/^@/, '');
    setIsSendingRequest(true);
    try {
      await window.fern.sendFriendRequest(clean);
      setAddUsernameInput('');
      showNotification(`Friend request sent to @${clean}`);
      const updatedReqs = await window.fern.getFriendRequests();
      setRequests(updatedReqs);
    } catch (err: any) {
      showNotification(err.message || 'Failed to send request', true);
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleRespondRequest = async (requestId: string, accept: boolean) => {
    if (!window.fern) return;
    try {
      await window.fern.respondFriendRequest(requestId, accept);
      showNotification(accept ? 'Friend request accepted!' : 'Friend request declined.');
      const [updatedFriends, updatedReqs] = await Promise.all([
        window.fern.getFriends(),
        window.fern.getFriendRequests(),
      ]);
      setFriends(updatedFriends);
      setRequests(updatedReqs);
    } catch (err: any) {
      showNotification(err.message || 'Action failed', true);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!window.fern) return;
    try {
      await window.fern.cancelFriendRequest(requestId);
      showNotification('Friend request cancelled.');
      const updatedReqs = await window.fern.getFriendRequests();
      setRequests(updatedReqs);
    } catch (err: any) {
      showNotification(err.message || 'Failed to cancel request', true);
    }
  };

  const handleRemoveFriend = async (friendId: string, username: string) => {
    if (!window.fern) return;
    try {
      await window.fern.removeFriend(friendId);
      showNotification(`Removed @${username} from friends.`);
      const updated = await window.fern.getFriends();
      setFriends(updated);
    } catch (err: any) {
      showNotification(err.message || 'Failed to remove friend', true);
    }
  };

  const handleBlockUser = async (userId: string, username: string, displayName?: string) => {
    if (!window.fern) return;
    try {
      await window.fern.blockUser(userId, username, displayName, 'Blocked by user');
      showNotification(`Blocked @${username}.`);
      const [updatedFriends, updatedReqs, updatedBlocked] = await Promise.all([
        window.fern.getFriends(),
        window.fern.getFriendRequests(),
        window.fern.getBlockedUsers(),
      ]);
      setFriends(updatedFriends);
      setRequests(updatedReqs);
      setBlocked(updatedBlocked);
      if (previewUserId === userId) setPreviewUserId(null);
    } catch (err: any) {
      showNotification(err.message || 'Failed to block user', true);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    if (!window.fern) return;
    try {
      await window.fern.unblockUser(userId);
      showNotification('User unblocked.');
      const updated = await window.fern.getBlockedUsers();
      setBlocked(updated);
    } catch (err: any) {
      showNotification(err.message || 'Failed to unblock', true);
    }
  };

  const handleUpdatePrivacy = async (key: keyof SocialPrivacySettings, val: any) => {
    if (!window.fern) return;
    try {
      const updated = await window.fern.updateSocialPrivacy({ [key]: val });
      setPrivacy(updated);
      showNotification('Privacy settings updated.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to update privacy', true);
    }
  };

  const handleSaveProfile = async () => {
    if (!window.fern || !profile) return;
    const dto: UpdateUserProfileDTO = {
      displayName: editDisplayName.trim(),
      bio: editBio.trim(),
    };
    const validation = UserProfileValidator.validateUpdate(dto);
    if (!validation.valid) {
      setEditFormErrors(validation.errors);
      return;
    }

    try {
      const updated = await window.fern.updateUserProfile(dto);
      setProfile(updated);
      setIsEditProfileOpen(false);
      showNotification('Profile updated successfully.');
    } catch (err: any) {
      setEditFormErrors([err.message || 'Failed to update profile']);
    }
  };

  const handleViewProfile = async (userId: string) => {
    if (!window.fern) return;
    setPreviewUserId(userId);
    try {
      const p = await window.fern.getPublicProfile(userId);
      setPreviewProfile(p);
    } catch {
      setPreviewProfile(null);
    }
  };

  const handleResetStats = async () => {
    if (!window.fern) return;
    if (confirm('Are you sure you want to reset all local gameplay statistics? This cannot be undone.')) {
      try {
        const res = await window.fern.resetPlayerStatistics();
        setStats(res);
        showNotification('Gameplay statistics reset.');
      } catch (err: any) {
        showNotification(err.message || 'Failed to reset stats', true);
      }
    }
  };

  // Filtered friends
  const filteredFriends = friends.filter((f) => {
    const matchesSearch =
      f.username.toLowerCase().includes(friendSearch.toLowerCase()) ||
      (f.displayName && f.displayName.toLowerCase().includes(friendSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'online') {
      return (
        f.presence?.state === 'online' ||
        f.presence?.state === 'playing_minecraft' ||
        f.presence?.state === 'in_launcher'
      );
    }
    if (statusFilter === 'offline') {
      return !f.presence || f.presence.state === 'offline' || f.presence.state === 'invisible';
    }
    return true;
  });

  const incomingRequests = requests.filter((r) => r.direction === 'incoming');
  const outgoingRequests = requests.filter((r) => r.direction === 'outgoing');

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1.25rem' }}>
      {/* Toast Notification */}
      {successMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#064e3b',
          color: '#a7f3d0',
          border: '1px solid #059669',
          padding: '0.6rem 1.2rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          fontWeight: 500,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#7f1d1d',
          color: '#fecaca',
          border: '1px solid #dc2626',
          padding: '0.6rem 1.2rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          fontWeight: 500,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {errorMsg}
        </div>
      )}

      {/* Top Header & Sub-Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Social & Profile
            </h1>
            {privacy.invisibleMode && (
              <span style={{
                background: 'rgba(100, 116, 139, 0.2)',
                color: '#94a3b8',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <EyeOff size={12} /> Invisible
              </span>
            )}
          </div>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Privacy-first friend network and local player profile.
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setSubTab('friends')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: subTab === 'friends' ? 'var(--bg-card)' : 'transparent',
              color: subTab === 'friends' ? 'var(--color-accent)' : 'var(--text-muted)',
              border: subTab === 'friends' ? '1px solid var(--border-focus)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            <Users size={15} />
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setSubTab('requests')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: subTab === 'requests' ? 'var(--bg-card)' : 'transparent',
              color: subTab === 'requests' ? 'var(--color-accent)' : 'var(--text-muted)',
              border: subTab === 'requests' ? '1px solid var(--border-focus)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            <UserPlus size={15} />
            Requests {incomingRequests.length > 0 && `(${incomingRequests.length})`}
          </button>
          <button
            onClick={() => setSubTab('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: subTab === 'profile' ? 'var(--bg-card)' : 'transparent',
              color: subTab === 'profile' ? 'var(--color-accent)' : 'var(--text-muted)',
              border: subTab === 'profile' ? '1px solid var(--border-focus)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            <UserCheck size={15} />
            My Profile
          </button>
          <button
            onClick={() => setSubTab('privacy')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: subTab === 'privacy' ? 'var(--bg-card)' : 'transparent',
              color: subTab === 'privacy' ? 'var(--color-accent)' : 'var(--text-muted)',
              border: subTab === 'privacy' ? '1px solid var(--border-focus)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            <Shield size={15} />
            Privacy & Safety
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* TAB 1: FRIENDS */}
        {subTab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Add Friend Input Bar */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                <UserPlus size={18} color="var(--color-accent)" />
                <input
                  type="text"
                  placeholder="Enter a Fern @username to send a friend request..."
                  value={addUsernameInput}
                  onChange={(e) => setAddUsernameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleSendRequest}
                disabled={isSendingRequest || !addUsernameInput.trim()}
                style={{
                  background: 'var(--color-accent)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.45rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isSendingRequest || !addUsernameInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSendingRequest || !addUsernameInput.trim() ? 0.6 : 1,
                }}
              >
                Send Request
              </button>
            </div>

            {/* Friend Filters & Search */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                maxWidth: '360px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '0 0.75rem',
              }}>
                <Search size={15} color="var(--text-dim)" />
                <input
                  type="text"
                  placeholder="Filter friends..."
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
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

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {(['all', 'online', 'offline'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setStatusFilter(mode)}
                    style={{
                      background: statusFilter === mode ? 'var(--color-accent-subtle)' : 'var(--bg-secondary)',
                      color: statusFilter === mode ? 'var(--color-accent)' : 'var(--text-muted)',
                      border: statusFilter === mode ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Friend List */}
            {filteredFriends.length === 0 ? (
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
                <Users size={36} color="var(--text-dim)" />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {friendSearch ? 'No friends match your search' : 'No friends yet'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '320px' }}>
                  {friendSearch
                    ? 'Try searching with a different username or display name.'
                    : 'Your friends will appear here once you send or accept invitations.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                {filteredFriends.map((f) => {
                  const state = f.presence?.state || 'offline';
                  const isPlaying = state === 'playing_minecraft';
                  const isOnline = state === 'online' || isPlaying || state === 'in_launcher';

                  let statusBadgeColor = '#64748b'; // Gray for offline
                  let statusText = 'Offline';

                  if (isPlaying) {
                    statusBadgeColor = '#22c55e'; // Green
                    statusText = `Playing Minecraft ${f.presence?.minecraftVersion || ''}`;
                  } else if (state === 'in_launcher') {
                    statusBadgeColor = '#3b82f6'; // Blue
                    statusText = 'In Launcher';
                  } else if (state === 'online') {
                    statusBadgeColor = '#22c55e';
                    statusText = 'Online';
                  }

                  return (
                    <div
                      key={f.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                        transition: 'border-color var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        {/* Avatar with indicator */}
                        <div style={{ position: 'relative' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: 'var(--radius-sm)',
                            background: '#166534',
                            color: '#ffffff',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                          }}>
                            {f.displayName ? f.displayName.charAt(0).toUpperCase() : f.username.charAt(0).toUpperCase()}
                          </div>
                          <span style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: statusBadgeColor,
                            border: '2px solid var(--bg-card)',
                          }} />
                        </div>

                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {f.displayName || f.username}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                            @{f.username}
                          </div>
                          <div style={{
                            fontSize: '0.72rem',
                            color: isOnline ? 'var(--color-accent)' : 'var(--text-dim)',
                            marginTop: '0.2rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {statusText}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '0.65rem',
                        gap: '0.5rem',
                      }}>
                        <button
                          onClick={() => handleViewProfile(f.friendUserId)}
                          style={{
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                            padding: '0.3rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Profile
                        </button>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleRemoveFriend(f.id, f.username)}
                            title="Remove Friend"
                            style={{
                              background: 'transparent',
                              color: 'var(--text-dim)',
                              border: 'none',
                              padding: '0.35rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => handleBlockUser(f.friendUserId, f.username, f.displayName)}
                            title="Block User"
                            style={{
                              background: 'transparent',
                              color: '#ef4444',
                              border: 'none',
                              padding: '0.35rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                            }}
                          >
                            <Ban size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REQUESTS */}
        {subTab === 'requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Incoming Requests */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Incoming Invitations ({incomingRequests.length})
              </div>
              {incomingRequests.length === 0 ? (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                }}>
                  No incoming friend requests.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.85rem 1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-sm)',
                          background: '#166534',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}>
                          {req.fromDisplayName ? req.fromDisplayName.charAt(0) : req.fromUsername.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {req.fromDisplayName || req.fromUsername}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            @{req.fromUsername}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleRespondRequest(req.id, true)}
                          style={{
                            background: 'var(--color-accent)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Check size={14} /> Accept
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, false)}
                          style={{
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={14} /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Outgoing Invitations ({outgoingRequests.length})
              </div>
              {outgoingRequests.length === 0 ? (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                }}>
                  No sent requests pending approval.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.85rem 1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          @{req.toUsername}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Sent {new Date(req.timestamp).toLocaleDateString()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        style={{
                          background: 'transparent',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MY PROFILE */}
        {subTab === 'profile' && profile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Profile Header Card */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-md)',
                  background: '#15803d',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                }}>
                  {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : profile.username.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      {profile.displayName || profile.username}
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>@{profile.username}</span>
                  </div>

                  <p style={{ margin: '0.35rem 0 0.5rem 0', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '480px' }}>
                    {profile.bio || 'No bio specified.'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {(profile.badges || []).map((b) => (
                      <span
                        key={b}
                        style={{
                          background: 'var(--color-accent-subtle)',
                          color: 'var(--color-accent)',
                          border: '1px solid var(--border-focus)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {b.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditDisplayName(profile.displayName || profile.username);
                  setEditBio(profile.bio || '');
                  setEditFormErrors([]);
                  setIsEditProfileOpen(true);
                }}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={14} /> Edit Profile
              </button>
            </div>

            {/* Statistics Showcase */}
            {stats && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} color="var(--color-accent)" />
                    Player Statistics (Local)
                  </div>
                  <button
                    onClick={handleResetStats}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-dim)',
                      border: 'none',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    Reset Stats
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Playtime
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                      {StatisticsCalculator.formatPlaytime(stats.totalPlaytimeSeconds)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Sessions
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                      {stats.sessionCount}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Top Installation
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-accent)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {stats.favoriteInstallation || 'None'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Top Version
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-accent)', marginTop: '0.2rem' }}>
                      {stats.favoriteVersion || 'None'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Equipped Cosmetics Overview */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} color="var(--color-accent)" />
                Equipped Cosmetics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                {(['cape', 'cloak', 'hat', 'accessory', 'emote'] as const).map((cat) => {
                  const itemId = equipped?.equipped[cat];
                  return (
                    <div
                      key={cat}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                        {cat}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: itemId ? 'var(--text-main)' : 'var(--text-dim)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                      }}>
                        {itemId ? itemId.replace(/^[a-z]+_/, '').replace(/_/g, ' ') : 'None'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRIVACY & SAFETY */}
        {subTab === 'privacy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Privacy Explanation Banner */}
            <div style={{
              background: 'rgba(21, 128, 61, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
            }}>
              <Shield size={22} color="var(--color-accent)" />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                <strong>Strict Privacy Guarantee:</strong> Fern Client only tracks gameplay locally.
                Private server IP addresses, credentials, filesystem paths, and machine identifiers are <em>never</em> broadcast.
              </div>
            </div>

            {/* Privacy Controls List */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              {PRIVACY_EXPLANATIONS.map((item) => {
                const isChecked = Boolean(privacy[item.field]);
                return (
                  <div
                    key={item.field}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '0.85rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {item.description}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                        {item.securityNote}
                      </div>
                    </div>

                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleUpdatePrivacy(item.field, e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: isChecked ? 'var(--color-accent)' : 'var(--bg-tertiary)',
                        borderRadius: '22px',
                        transition: '0.2s',
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '""',
                          height: '16px',
                          width: '16px',
                          left: isChecked ? '20px' : '3px',
                          bottom: '3px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s',
                        }} />
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Blocked Users Section */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ban size={16} color="#ef4444" />
                Blocked Players ({blocked.length})
              </div>

              {blocked.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  You have not blocked any players.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {blocked.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        background: 'var(--bg-secondary)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          @{b.username}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          Blocked on {new Date(b.timestamp || b.blockedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(b.blockedUserId)}
                        style={{
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                        }}
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      {isEditProfileOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            width: '420px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Edit Fern Profile
            </h3>

            {editFormErrors.length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
              }}>
                {editFormErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Display Name
              </label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Bio
              </label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                style={{
                  background: 'var(--color-accent)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Preview Drawer / Modal */}
      {previewUserId && previewProfile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            width: '400px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Player Profile
              </h3>
              <button
                onClick={() => setPreviewUserId(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: 'var(--radius-sm)',
                background: '#166534',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {previewProfile.displayName ? previewProfile.displayName.charAt(0) : previewProfile.username.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {previewProfile.displayName || previewProfile.username}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  @{previewProfile.username}
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {previewProfile.bio || 'No bio.'}
            </p>

            <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Member since: {new Date(previewProfile.createdAt).toLocaleDateString()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setPreviewUserId(null)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

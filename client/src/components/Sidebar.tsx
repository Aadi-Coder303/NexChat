import { Hash, Ghost, Radio, X, Link2, DoorOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import AddFriendModal from './AddFriendModal';
import InviteCodeModal from './InviteCodeModal';
import ProfileModal from './ProfileModal';

interface SidebarProps {
  activeChannelId?: string;
  onChannelSelect: (id: string) => void;
  onClose?: () => void;
}

export default function Sidebar({ activeChannelId, onChannelSelect, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const { channels, unreadCounts, leaveChannel } = useChatStore();
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [inviteModal, setInviteModal] = useState<{ channelId: string; channelName: string } | null>(null);

  const handleLeave = async (channelId: string) => {
    if (!confirm('Leave this channel?')) return;
    await leaveChannel(channelId);
  };


  const groupChannels = channels.filter(c => c.type === 'group');
  const directChannels = channels.filter(c => c.type === 'direct' && c.members?.find(m => m.user.id === user?.id)?.status !== 'pending');
  const pendingChannels = channels.filter(c => c.type === 'direct' && c.members?.find(m => m.user.id === user?.id)?.status === 'pending');

  return (
    <>
      <div className="w-full max-w-[280px] sm:w-80 sm:max-w-none glass-panel border-r border-white/5 h-full relative overflow-hidden flex flex-col z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Texture Overlay */}
        <div className="absolute inset-0 bg-retro-grain opacity-[0.02] pointer-events-none" />

        <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-between relative z-10">
          <h1 className="text-xl sm:text-2xl font-display text-white italic lowercase tracking-tighter flex items-center gap-2">
            NexChat <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
          </h1>
          <div className="flex items-center gap-2">
            <button
              data-tour="add-btn"
              onClick={() => setAddFriendOpen(true)}
              className="p-2 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-black transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
              title="New Connection"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-xl bg-white/5 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div data-tour="channels-list" className="flex-1 overflow-y-auto px-4 space-y-10 relative z-10">
          {/* Streams (Groups) */}
          <section className="space-y-2">
            <div className="px-4 flex items-center justify-between text-white/20 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
              <div className="flex items-center gap-2">
                <Radio size={12} />
                <span>Frequencies</span>
              </div>
            </div>
            <div className="space-y-1">
              {groupChannels.map(channel => {
                const unread = unreadCounts[channel.id] || 0;
                return (
                  <div key={channel.id} className="relative group/ch">
                    <button
                      onClick={() => { onChannelSelect(channel.id); onClose?.(); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all duration-300 group relative overflow-hidden pr-16",
                        activeChannelId === channel.id
                          ? "text-primary font-bold bg-primary/10 shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]"
                          : "text-white/40 hover:bg-white/[0.05] hover:text-white"
                      )}
                    >
                      {activeChannelId === channel.id && (
                        <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-primary rounded-full" />
                      )}
                      <Hash className={cn("h-4 w-4 flex-shrink-0 transition-transform group-hover:rotate-12", activeChannelId === channel.id ? "text-primary" : "text-white/10")} />
                      <span className="italic tracking-tight truncate flex-1 text-left">{channel.name}</span>
                      {unread > 0 && activeChannelId !== channel.id && (
                        <span className="absolute right-10 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] bg-primary rounded-full text-[10px] font-bold text-black flex items-center justify-center px-1">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </button>
                    {/* Action buttons on hover */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/ch:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setInviteModal({ channelId: channel.id, channelName: channel.name || '' }); }}
                        className="p-1.5 rounded-lg text-white/30 hover:text-accent hover:bg-accent/10 transition-all"
                        title="Get invite code"
                      >
                        <Link2 size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLeave(channel.id); }}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                        title="Leave channel"
                      >
                        <DoorOpen size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {groupChannels.length === 0 && (
                <div className="px-4 text-xs text-white/30 italic">No frequencies found.</div>
              )}
            </div>
          </section>

          {/* Entities (DMs) */}
          <section className="space-y-2">
            <div className="px-4 flex items-center justify-between text-white/20 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
              <div className="flex items-center gap-2">
                <Ghost size={12} />
                <span>Apparitions</span>
              </div>
            </div>
            <div className="space-y-1">
              {directChannels.map(dm => {
                const otherMember = dm.members?.find(m => m.user.id !== user?.id)?.user;
                const displayName = otherMember?.username || dm.name;
                return (
                  <button
                    key={dm.id}
                    onClick={() => { onChannelSelect(dm.id); onClose?.(); }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all duration-300 group relative",
                      activeChannelId === dm.id
                        ? "text-accent font-bold bg-accent/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"
                        : "text-white/40 hover:bg-white/[0.05] hover:text-white"
                    )}
                  >
                    <div className="relative">
                      <div className={cn(
                        "h-10 w-10 rounded-[1rem] flex items-center justify-center text-lg filter grayscale group-hover:grayscale-0 transition-all text-white",
                        activeChannelId === dm.id ? "bg-accent/20 border-accent/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] grayscale-0" : "bg-white/5 border border-white/5"
                      )}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <span className="italic tracking-tight truncate">{displayName}</span>
                  </button>
                );
              })}
              {directChannels.length === 0 && (
                <div className="px-4 text-xs text-white/30 italic">No apparitions found.</div>
              )}
            </div>
          </section>

          {/* Pending Requests */}
          {pendingChannels.length > 0 && (
            <section className="space-y-2 mt-6">
              <div className="px-4 flex items-center justify-between text-yellow-500/50 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
                <div className="flex items-center gap-2">
                  <Ghost size={12} />
                  <span>Requests ({pendingChannels.length})</span>
                </div>
              </div>
              <div className="space-y-1">
                {pendingChannels.map(dm => {
                  const otherMember = dm.members?.find(m => m.user.id !== user?.id)?.user;
                  const displayName = otherMember?.username || dm.name;
                  return (
                    <button
                      key={dm.id}
                      onClick={() => { onChannelSelect(dm.id); onClose?.(); }}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all duration-300 group relative",
                        activeChannelId === dm.id
                          ? "text-yellow-400 font-bold bg-yellow-400/10 shadow-[inset_0_0_20px_rgba(250,204,21,0.1)]"
                          : "text-white/40 hover:bg-white/[0.05] hover:text-white"
                      )}
                    >
                      <div className="relative">
                        <div className={cn(
                          "h-10 w-10 rounded-2xl flex items-center justify-center text-lg uppercase transition-all duration-500",
                          activeChannelId === dm.id ? "bg-yellow-400/20 text-yellow-400" : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white"
                        )}>
                          {displayName[0]}
                        </div>
                      </div>
                      <span className="italic tracking-tight truncate flex-1 text-left">{displayName}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* User Footer */}
        <div className="p-6 mt-auto">
          <button
            data-tour="nexcode"
            onClick={() => setProfileOpen(true)}
            className="w-full glass-retro p-4 rounded-[2rem] border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center font-bold text-white shadow-xl">
                  {user?.username?.[0].toUpperCase()}
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent border-2 border-[#080808]"
                />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold text-white italic tracking-tighter">{user?.username}</span>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest group-hover:text-primary transition-colors">
                  View Profile
                </span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 text-white/20 group-hover:text-white transition-colors">
              <Plus size={16} className="rotate-45" />
            </div>
          </button>
        </div>
      </div>

      {/* Modals */}
      <AddFriendModal isOpen={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
      {inviteModal && (
        <InviteCodeModal
          isOpen={!!inviteModal}
          onClose={() => setInviteModal(null)}
          channelId={inviteModal.channelId}
          channelName={inviteModal.channelName}
        />
      )}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

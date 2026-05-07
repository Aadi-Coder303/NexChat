import { LogOut, Hash, Plus, Ghost, Radio, X, UserPlus, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { Button } from './Button';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeChannelId?: string;
  onChannelSelect: (id: string) => void;
  onClose?: () => void;
}

export default function Sidebar({ activeChannelId, onChannelSelect, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { channels, createChannel, connectByCode } = useChatStore();
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    const code = window.prompt('Enter the Entity NexCode:');
    if (code && code.trim()) {
      try {
        await connectByCode(code.trim());
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to locate entity in the void');
      }
    }
  };

  const copyCode = () => {
    if (user?.friendCode) {
      navigator.clipboard.writeText(user.friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateChannel = async () => {
    const name = window.prompt('Enter channel name:');
    if (name && name.trim()) {
      try {
        await createChannel(name.trim(), 'group', [user!.id]);
      } catch (error) {
        alert('Failed to create channel');
      }
    }
  };

  const groupChannels = channels.filter(c => c.type === 'group');
  const directChannels = channels.filter(c => c.type === 'direct');

  return (
    <div className="w-[280px] sm:w-80 bg-[#080808] flex flex-col border-r-2 border-white/5 h-full relative overflow-hidden">
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-retro-grain opacity-[0.02] pointer-events-none" />

      <div className="p-6 sm:p-8 flex items-center justify-between relative z-10">
        <h1 className="text-xl sm:text-2xl font-display text-white italic lowercase tracking-tighter flex items-center gap-2">
          NexChat <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateChannel} variant="outline" size="sm" className="h-10 w-10 p-0 rounded-2xl border-white/10 hover:border-primary/50">
            <Plus className="h-5 w-5" />
          </Button>
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
      <div className="flex-1 overflow-y-auto px-4 space-y-10 relative z-10">
        {/* Streams (Channels) */}
        <section className="space-y-2">
          <div className="px-4 flex items-center gap-2 text-white/20 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
            <Radio size={12} />
            <span>Frequencies</span>
          </div>
          <div className="space-y-1">
            {groupChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all group relative overflow-hidden",
                  activeChannelId === channel.id 
                    ? "text-primary font-bold bg-primary/5" 
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                )}
              >
                {activeChannelId === channel.id && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-primary rounded-full"
                  />
                )}
                <Hash className={cn("h-4 w-4 transition-transform group-hover:rotate-12", activeChannelId === channel.id ? "text-primary" : "text-white/10")} />
                <span className="italic tracking-tight">{channel.name}</span>
              </button>
            ))}
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
            <button 
              onClick={handleConnect}
              className="hover:text-accent transition-colors flex items-center gap-1 group/add"
            >
              <UserPlus size={12} className="group-hover/add:scale-110 transition-transform" />
            </button>
          </div>
          <div className="space-y-1">
            {directChannels.map(dm => (
              <button
                key={dm.id}
                onClick={() => onChannelSelect(dm.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all group relative",
                  activeChannelId === dm.id 
                    ? "text-accent font-bold bg-accent/5" 
                    : "text-white/40 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-[1rem] bg-white/5 border border-white/5 flex items-center justify-center text-lg filter grayscale group-hover:grayscale-0 transition-all text-white">
                    {dm.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="italic tracking-tight">{dm.name}</span>
              </button>
            ))}
            {directChannels.length === 0 && (
              <div className="px-4 text-xs text-white/30 italic">No apparitions found.</div>
            )}
          </div>
        </section>
      </div>

      {/* User Footer - Distorted Profile */}
      <div className="p-6 mt-auto">
        <div className="glass-retro p-4 rounded-[2rem] border-white/5 flex items-center justify-between group">
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
            <div className="flex flex-col flex-1">
              <span className="text-sm font-bold text-white italic tracking-tighter">{user?.username}</span>
              <button 
                onClick={copyCode}
                className="flex items-center gap-1.5 text-[9px] font-bold text-white/20 uppercase tracking-widest hover:text-primary transition-colors group/code"
              >
                {user?.friendCode}
                {copied ? <Check size={10} className="text-primary" /> : <Copy size={10} className="opacity-0 group-hover/code:opacity-100 transition-opacity" />}
              </button>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="p-2 rounded-xl bg-white/5 text-white/20 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

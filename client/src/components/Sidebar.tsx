import { LogOut, Hash, MessageSquare, Settings, Search, Plus, Ghost, Radio, Circle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from './Button';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeChannelId?: string;
  onChannelSelect: (id: string) => void;
}

export default function Sidebar({ activeChannelId, onChannelSelect }: SidebarProps) {
  const { user, logout } = useAuthStore();

  const channels = [
    { id: '1', name: 'void-stream', type: 'group' },
    { id: '2', name: 'echo-chamber', type: 'group' },
    { id: '3', name: 'static-noise', type: 'group' },
  ];

  const dms = [
    { id: '4', name: 'aadi', status: 'online', avatar: '👁️' },
    { id: '5', name: 'sarah', status: 'offline', avatar: '🌫️' },
  ];

  return (
    <div className="w-80 bg-[#080808] flex flex-col border-r-2 border-white/5 h-full relative overflow-hidden">
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-retro-grain opacity-[0.02] pointer-events-none" />

      {/* Header */}
      <div className="p-8 flex items-center justify-between relative z-10">
        <h1 className="text-2xl font-display text-white italic lowercase tracking-tighter flex items-center gap-2">
          NexChat <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
        </h1>
        <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-2xl border-white/10 hover:border-primary/50">
          <Plus className="h-5 w-5" />
        </Button>
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
            {channels.map(channel => (
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
          </div>
        </section>

        {/* Entities (DMs) */}
        <section className="space-y-2">
          <div className="px-4 flex items-center gap-2 text-white/20 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
            <Ghost size={12} />
            <span>Apparitions</span>
          </div>
          <div className="space-y-1">
            {dms.map(dm => (
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
                  <div className="h-10 w-10 rounded-[1rem] bg-white/5 border border-white/5 flex items-center justify-center text-lg filter grayscale group-hover:grayscale-0 transition-all">
                    {dm.avatar}
                  </div>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#080808]",
                    dm.status === 'online' ? "bg-accent shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-white/10"
                  )} />
                </div>
                <span className="italic tracking-tight">{dm.name}</span>
              </button>
            ))}
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
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white italic tracking-tighter">{user?.username}</span>
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Active Presence</span>
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

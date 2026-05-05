import { LogOut, Hash, MessageSquare, Settings, Search, Plus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from './Button';
import { cn } from './Button';

interface SidebarProps {
  activeChannelId?: string;
  onChannelSelect: (id: string) => void;
}

export default function Sidebar({ activeChannelId, onChannelSelect }: SidebarProps) {
  const { user, logout } = useAuthStore();

  const channels = [
    { id: '1', name: 'general', type: 'group' },
    { id: '2', name: 'development', type: 'group' },
    { id: '3', name: 'design', type: 'group' },
  ];

  const dms = [
    { id: '4', name: 'aadi', status: 'online' },
    { id: '5', name: 'sarah', status: 'offline' },
  ];

  return (
    <div className="w-72 bg-background flex flex-col border-r border-white/5 h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-background-lighter/30">
        <h1 className="font-bold text-xl tracking-tight text-white/90">NexChat</h1>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Jump to..." 
            className="w-full bg-background-subtle border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        {/* Channels */}
        <section className="space-y-1">
          <div className="px-3 flex items-center justify-between text-white/40 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Channels</span>
          </div>
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all group",
                activeChannelId === channel.id 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <Hash className={cn("h-4 w-4", activeChannelId === channel.id ? "text-primary" : "text-white/30 group-hover:text-white/50")} />
              <span>{channel.name}</span>
            </button>
          ))}
        </section>

        {/* Direct Messages */}
        <section className="space-y-1">
          <div className="px-3 flex items-center justify-between text-white/40 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Direct Messages</span>
          </div>
          {dms.map(dm => (
            <button
              key={dm.id}
              onClick={() => onChannelSelect(dm.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all group",
                activeChannelId === dm.id 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="relative">
                <div className="h-4 w-4 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-[10px] uppercase font-bold">
                  {dm.name[0]}
                </div>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-background",
                  dm.status === 'online' ? "bg-accent" : "bg-white/20"
                )} />
              </div>
              <span>{dm.name}</span>
            </button>
          ))}
        </section>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-white/5 bg-background-lighter/20">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center font-bold text-primary">
                {user?.username?.[0].toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-accent border-2 border-background" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white/90 leading-none">{user?.username}</span>
              <span className="text-[11px] text-white/40 mt-1">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => logout()}>
              <LogOut className="h-4 w-4 text-white/40 hover:text-danger transition-colors" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

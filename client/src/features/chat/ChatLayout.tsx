import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { Send, Hash, MoreVertical, Bell, Search, Plus, Sparkles, Ghost } from 'lucide-react';
import { Button } from '../../components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/chatStore';
import { socketService } from '../../lib/socket';

export default function ChatLayout() {
  const { channels, activeChannelId, setActiveChannel, messages, fetchChannels, onlineUsers } = useChatStore();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChannels();
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, [fetchChannels]);

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannel(channels[0].id);
    }
  }, [channels, activeChannelId, setActiveChannel]);

  useEffect(() => {
    if (activeChannelId) {
      socketService.joinChannel(activeChannelId);
    }
    return () => {
      if (activeChannelId) {
        socketService.leaveChannel(activeChannelId);
      }
    };
  }, [activeChannelId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const activeMessages = activeChannelId ? (messages[activeChannelId] || []) : [];

  const handleSendMessage = () => {
    if (messageText.trim() && activeChannelId) {
      socketService.sendMessage(activeChannelId, messageText.trim());
      setMessageText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden selection:bg-accent/30 font-mono">
      {/* Sidebar with Grainy Texture */}
      <div className="relative z-20">
        <Sidebar 
          activeChannelId={activeChannelId || undefined} 
          onChannelSelect={setActiveChannel} 
        />
        <div className="absolute inset-0 bg-primary/5 pointer-events-none mix-blend-overlay" />
      </div>
      
      <main className="flex-1 flex flex-col relative">
        {/* Surreal Background asset in main view */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <img src="/retro_surreal_bg.png" className="w-full h-full object-cover grayscale" alt="" />
        </div>

        {/* Chat Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b-2 border-white/5 bg-black/40 backdrop-blur-2xl z-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-accent/20 rounded-full flex items-center justify-center border border-accent/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Hash className="h-5 w-5 text-accent" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-display text-white italic tracking-tighter">
                {activeChannel?.type === 'group' ? '#' : '@'}{activeChannel?.name || 'void-stream'}
              </h2>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                  {Object.keys(onlineUsers).filter(id => onlineUsers[id] === 'online').length} entities online
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-white/30">
            <div className="flex items-center bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
              <Search className="h-4 w-4 mr-2" />
              <input type="text" placeholder="Recall..." className="bg-transparent border-none text-[11px] focus:ring-0 w-32 focus:w-48 transition-all" />
            </div>
            <div className="h-8 w-px bg-white/10" />
            <button className="hover:text-primary transition-colors"><Bell className="h-5 w-5" /></button>
            <button className="hover:text-accent transition-colors"><Ghost className="h-5 w-5" /></button>
            <button className="hover:text-white transition-colors"><MoreVertical className="h-5 w-5" /></button>
          </div>
        </header>

        {/* Message List with Surreal Motion */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 relative scroll-smooth">
          <AnimatePresence initial={false}>
            {activeMessages.map((msg) => {
              const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ type: 'spring', stiffness: 100, delay: 0.05 }}
                className="flex gap-6 group max-w-4xl mx-auto"
              >
                <div className="h-12 w-12 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-xl flex-shrink-0 group-hover:border-primary/50 transition-colors text-white">
                  {msg.sender.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="font-display text-sm text-primary italic lowercase tracking-tight">{msg.sender.username}</span>
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{time}</span>
                  </div>
                  <div className="glass-retro px-5 py-3 rounded-2xl rounded-tl-none relative border-white/5 group-hover:border-white/10 transition-colors">
                    <p className="text-sm text-white/80 leading-relaxed font-medium whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    {msg.clientTempId && (
                      <span className="absolute -bottom-4 right-0 text-[8px] text-white/20 uppercase tracking-widest">Sending...</span>
                    )}
                    <div className="absolute -left-2 top-0 w-2 h-2 bg-transparent border-t-[1px] border-l-[1px] border-white/10" />
                  </div>
                </div>
              </motion.div>
            )})}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input - Floating Surreal Panel */}
        <div className="p-8 pt-0 z-10">
          <motion.div 
            whileFocus-within={{ scale: 1.01 }}
            className="max-w-4xl mx-auto glass-retro rounded-[2.5rem] p-3 border-2 border-white/5 shadow-2xl relative"
          >
            <div className="absolute -top-1 -right-1 text-accent/20 animate-pulse">
               <Sparkles size={32} />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 flex-shrink-0 hover:bg-white/5">
                <Plus className="h-6 w-6 text-white/20" />
              </Button>
              
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Broadcast your thoughts..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-white/20 py-3.5 resize-none min-h-[52px] max-h-[150px] overflow-y-auto font-medium"
                rows={1}
              />

              <Button 
                onClick={handleSendMessage}
                size="icon" 
                variant="accent"
                className="rounded-full h-12 w-12 flex-shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-none"
                disabled={!messageText.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
          <div className="max-w-4xl mx-auto flex justify-between px-6 mt-3">
             <span className="text-[9px] font-bold text-white/10 uppercase tracking-[0.3em]">Encrypted Dream-Stream Active</span>
             <span className="text-[9px] font-bold text-white/10 uppercase tracking-[0.3em]">Shift + Enter for new line</span>
          </div>
        </div>
      </main>
    </div>
  );
}

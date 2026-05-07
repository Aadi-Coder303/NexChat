import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Send, Hash, MoreVertical, Bell, Search, Plus, Sparkles, Ghost } from 'lucide-react';
import { Button } from '../../components/Button';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatLayout() {
  const [activeChannelId, setActiveChannelId] = useState('1');
  const [message, setMessage] = useState('');

  const mockMessages = [
    { id: '1', sender: 'aadi', content: 'Welcome to the NexChat dreamscape.', time: '10:30 AM', avatar: '🪐' },
    { id: '2', sender: 'sarah', content: 'The surrealism is hitting hard. Love the grain.', time: '10:32 AM', avatar: '🎭' },
    { id: '3', sender: 'aadi', content: 'Reality is just a suggestion here.', time: '10:33 AM', avatar: '🪐' },
  ];

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden selection:bg-accent/30 font-mono">
      {/* Sidebar with Grainy Texture */}
      <div className="relative z-20">
        <Sidebar 
          activeChannelId={activeChannelId} 
          onChannelSelect={setActiveChannelId} 
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
              <h2 className="text-xl font-display text-white italic tracking-tighter">#void-stream</h2>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">128 entities online</span>
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
            {mockMessages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ type: 'spring', stiffness: 100, delay: index * 0.1 }}
                className="flex gap-6 group max-w-4xl mx-auto"
              >
                <div className="h-12 w-12 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-xl flex-shrink-0 group-hover:border-primary/50 transition-colors">
                  {msg.avatar}
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="font-display text-sm text-primary italic lowercase tracking-tight">{msg.sender}</span>
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{msg.time}</span>
                  </div>
                  <div className="glass-retro px-5 py-3 rounded-2xl rounded-tl-none relative border-white/5 group-hover:border-white/10 transition-colors">
                    <p className="text-sm text-white/80 leading-relaxed font-medium">
                      {msg.content}
                    </p>
                    <div className="absolute -left-2 top-0 w-2 h-2 bg-transparent border-t-[1px] border-l-[1px] border-white/10" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
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
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Broadcast your thoughts..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-white/20 py-3.5 resize-none min-h-[52px] font-medium"
                rows={1}
              />

              <Button 
                size="icon" 
                variant="accent"
                className="rounded-full h-12 w-12 flex-shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-none"
                disabled={!message.trim()}
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

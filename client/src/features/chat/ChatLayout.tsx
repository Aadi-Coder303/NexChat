import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Send, Hash, MoreVertical, Bell, Phone, Video, Search } from 'lucide-react';
import { Button } from '../../components/Button';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatLayout() {
  const [activeChannelId, setActiveChannelId] = useState('1');
  const [message, setMessage] = useState('');

  const mockMessages = [
    { id: '1', sender: 'aadi', content: 'Hey everyone! Welcome to NexChatfoundation.', time: '10:30 AM' },
    { id: '2', sender: 'sarah', content: 'Thanks! The UI looks amazing.', time: '10:32 AM' },
    { id: '3', sender: 'aadi', content: 'Wait till we get the real-time presence working!', time: '10:33 AM' },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        activeChannelId={activeChannelId} 
        onChannelSelect={setActiveChannelId} 
      />
      
      <main className="flex-1 flex flex-col bg-background-lighter/20">
        {/* Chat Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Hash className="h-5 w-5 text-white/30" />
            <div className="flex flex-col">
              <h2 className="font-semibold text-white/90">general</h2>
              <span className="text-[11px] text-white/40 leading-none">38 members</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white/40">
            <button className="hover:text-white transition-colors"><Bell className="h-5 w-5" /></button>
            <button className="hover:text-white transition-colors"><Phone className="h-5 w-5" /></button>
            <button className="hover:text-white transition-colors"><Video className="h-5 w-5" /></button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
              <input type="text" placeholder="Search" className="bg-background-subtle border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-xs w-48 focus:w-64 transition-all focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <button className="hover:text-white transition-colors"><MoreVertical className="h-5 w-5" /></button>
          </div>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence initial={false}>
            {mockMessages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-4 group"
              >
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-white/30 text-sm flex-shrink-0">
                  {msg.sender[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-sm text-white/90">{msg.sender}</span>
                    <span className="text-[10px] text-white/20">{msg.time}</span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mt-0.5">
                    {msg.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Message Input */}
        <div className="p-6 pt-0">
          <div className="relative group bg-background-subtle border border-white/5 rounded-2xl p-2 transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message #general"
              className="w-full bg-transparent border-none focus:ring-0 text-sm text-white/90 placeholder:text-white/20 resize-none min-h-[44px] py-3 px-4"
              rows={1}
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/30 hover:text-white">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <Button 
                size="sm" 
                className="h-8 px-4 gap-2"
                disabled={!message.trim()}
              >
                <span className="text-xs font-semibold">Send</span>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between px-2 mt-2">
             <span className="text-[10px] text-white/20">Press <kbd className="bg-white/5 px-1 rounded">Enter</kbd> to send</span>
          </div>
        </div>
      </main>
    </div>
  );
}

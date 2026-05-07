import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { Send, Hash, MoreVertical, Bell, Search, Sparkles, Ghost, Menu, Trash2, Edit3, Reply, Smile, ChevronUp, X, Check } from 'lucide-react';
import { Button } from '../../components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, type Message } from '../../stores/chatStore';
import { socketService } from '../../lib/socket';
import { Tooltip } from '../../components/Tooltip';
import { CryptoEngine } from '../../lib/crypto';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀'];

export default function ChatLayout() {
  const { user } = useAuthStore();
  const {
    channels, activeChannelId, setActiveChannel, messages, fetchChannels,
    onlineUsers, typingUsers, hasMoreMessages, loadMoreMessages,
  } = useChatStore();

  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, Record<string, string>>>({});
  const [messageText, setMessageText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchChannels();
    socketService.connect();
    return () => { socketService.disconnect(); };
  }, [fetchChannels]);

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) setActiveChannel(channels[0].id);
  }, [channels, activeChannelId, setActiveChannel]);

  useEffect(() => {
    if (activeChannelId) socketService.joinChannel(activeChannelId);
    return () => { if (activeChannelId) socketService.leaveChannel(activeChannelId); };
  }, [activeChannelId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  // Dismiss context menu on click
  useEffect(() => {
    const handler = () => { setContextMenu(null); setEmojiPickerFor(null); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Decrypt messages as they arrive
  useEffect(() => {
    const decryptAll = async () => {
      if (!activeChannelId || !user) return;
      const channelMessages = messages[activeChannelId] || [];
      const privateKey = await CryptoEngine.getPrivateKey(user.id);
      if (!privateKey) return;
      for (const msg of channelMessages) {
        if (msg.isEncrypted && msg.encryptionData && !decryptedMessages[activeChannelId]?.[msg.id]) {
          try {
            const encryptedKey = msg.encryptionData.keys?.[user.id];
            if (encryptedKey) {
              const decrypted = await CryptoEngine.decryptMessage(msg.content, encryptedKey, msg.encryptionData.iv, privateKey);
              setDecryptedMessages(prev => ({
                ...prev,
                [activeChannelId]: { ...(prev[activeChannelId] || {}), [msg.id]: decrypted },
              }));
            }
          } catch { /* silently skip */ }
        }
      }
    };
    decryptAll();
  }, [messages, activeChannelId, user]);

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const activeMessages = activeChannelId ? (messages[activeChannelId] || []) : [];
  const channelTypingUsers = activeChannelId ? (typingUsers[activeChannelId] || []) : [];
  const typingUsernames = channelTypingUsers
    .filter(id => id !== user?.id)
    .map(id => channels.flatMap(c => c.members || []).find(m => m.user.id === id)?.user.username || 'Someone');

  const getMessageContent = (msg: Message) => {
    if (msg.deletedAt) return null; // show deleted UI
    if (msg.isEncrypted && msg.encryptionData) {
      return decryptedMessages[activeChannelId!]?.[msg.id] || null;
    }
    return msg.content;
  };

  const handleSendMessage = async () => {
    const text = editingMessage ? editText.trim() : messageText.trim();
    if (!text || !activeChannelId || !activeChannel || !user) return;

    if (editingMessage) {
      socketService.editMessage(activeChannelId, editingMessage.id, text);
      setEditingMessage(null);
      setEditText('');
      return;
    }

    setMessageText('');
    setReplyTo(null);
    socketService.stopTyping(activeChannelId);

    try {
      const recipients = (activeChannel.members || [])
        .filter(m => m.user.publicKey)
        .map(m => ({ userId: m.user.id, publicKeyBase64: m.user.publicKey! }));

      if (recipients.length > 0) {
        const { content: encryptedContent, iv, keys } = await CryptoEngine.encryptMessageForMany(text, recipients);
        socketService.sendMessage(activeChannelId, encryptedContent, { keys, iv }, replyTo?.id);
      } else {
        socketService.sendMessage(activeChannelId, text, undefined, replyTo?.id);
      }
    } catch {
      socketService.sendMessage(activeChannelId, text, undefined, replyTo?.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    if (activeChannelId) socketService.emitTyping(activeChannelId);
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
  };

  const handleDelete = (msg: Message) => {
    if (activeChannelId) socketService.deleteMessage(activeChannelId, msg.id);
    setContextMenu(null);
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessage(msg);
    setEditText(msg.content);
    setContextMenu(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleReact = (msg: Message, emoji: string) => {
    if (activeChannelId) socketService.reactToMessage(activeChannelId, msg.id, emoji);
    setEmojiPickerFor(null);
  };

  const handleLoadMore = async () => {
    if (!activeChannelId) return;
    setIsLoadingMore(true);
    await loadMoreMessages(activeChannelId);
    setIsLoadingMore(false);
  };

  const groupReactions = (reactions: Message['reactions']) => {
    const map: Record<string, { count: number; users: string[]; hasMe: boolean }> = {};
    (reactions || []).forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, users: [], hasMe: false };
      map[r.emoji].count++;
      map[r.emoji].users.push(r.user.username);
      if (r.userId === user?.id) map[r.emoji].hasMe = true;
    });
    return map;
  };

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden selection:bg-accent/30 font-mono">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar activeChannelId={activeChannelId || undefined} onChannelSelect={(id) => { setActiveChannel(id); setIsSidebarOpen(false); }} onClose={() => setIsSidebarOpen(false)} />
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <main className="flex-1 flex flex-col relative min-w-0">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <img src="/retro_surreal_bg.png" className="w-full h-full object-cover grayscale" alt="" />
        </div>

        {/* Header */}
        <header className="h-20 flex items-center justify-between px-4 lg:px-8 border-b-2 border-white/5 bg-black/40 backdrop-blur-2xl z-30 flex-shrink-0">
          <div className="flex items-center gap-2 lg:gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-white/40 hover:text-white"><Menu size={24} /></button>
            <div className="h-8 w-8 lg:h-10 lg:w-10 bg-accent/20 rounded-full flex items-center justify-center border border-accent/30">
              {activeChannel?.type === 'direct' ? <Ghost className="h-4 w-4 lg:h-5 lg:w-5 text-accent" /> : <Hash className="h-4 w-4 lg:h-5 lg:w-5 text-accent" />}
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
          <div className="flex items-center gap-3 lg:gap-6 text-white/30">
            <div className="hidden sm:flex items-center bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
              <Search className="h-4 w-4 mr-2" />
              <input type="text" placeholder="Recall..." className="bg-transparent border-none text-[11px] focus:ring-0 w-32" />
            </div>
            <button className="hover:text-primary transition-colors"><Bell className="h-5 w-5" /></button>
            <button className="hover:text-white transition-colors"><MoreVertical className="h-5 w-5" /></button>
          </div>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 relative scroll-smooth">
          {/* Load more */}
          {activeChannelId && hasMoreMessages[activeChannelId] && (
            <div className="flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 text-xs font-bold text-white/30 uppercase tracking-widest hover:text-primary transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10"
              >
                <ChevronUp size={14} className={isLoadingMore ? 'animate-bounce' : ''} />
                {isLoadingMore ? 'Loading...' : 'Load older messages'}
              </button>
            </div>
          )}

          <AnimatePresence initial={false}>
            {activeMessages.map((msg) => {
              const isOwnMessage = msg.senderId === user?.id;
              const displayContent = getMessageContent(msg);
              const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const groupedReactions = groupReactions(msg.reactions);

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ type: 'spring', stiffness: 100, delay: 0.03 }}
                  className="flex gap-4 group max-w-4xl mx-auto relative"
                  onContextMenu={(e) => !msg.deletedAt && handleContextMenu(e, msg)}
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-xl flex-shrink-0 group-hover:border-primary/50 transition-colors text-white">
                    {msg.sender.username.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-display text-sm text-primary italic lowercase tracking-tight">{msg.sender.username}</span>
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{time}</span>
                      {msg.editedAt && !msg.deletedAt && <span className="text-[9px] text-white/20 italic">(edited)</span>}
                    </div>

                    {/* Reply-to preview */}
                    {msg.replyTo && !msg.deletedAt && (
                      <div className="mb-1 pl-3 border-l-2 border-primary/40 text-xs text-white/40 italic truncate">
                        <span className="text-primary/60 font-bold">{msg.replyTo.sender.username}: </span>
                        {msg.replyTo.deletedAt ? '[deleted]' : msg.replyTo.content.slice(0, 80)}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className="relative">
                      <div className={cn(
                        "glass-retro px-5 py-3 rounded-2xl rounded-tl-none border-white/5 group-hover:border-white/10 transition-colors",
                        msg.deletedAt && "opacity-40 italic"
                      )}>
                        <p className="text-sm text-white/80 leading-relaxed font-medium whitespace-pre-wrap break-words">
                          {msg.deletedAt
                            ? '🗑️ Message deleted'
                            : msg.isEncrypted
                              ? (displayContent || <span className="text-white/30 animate-pulse">🔒 Decrypting...</span>)
                              : displayContent}
                        </p>
                        {msg.clientTempId && <span className="absolute -bottom-4 right-0 text-[8px] text-white/20 uppercase tracking-widest">Sending...</span>}
                      </div>

                      {/* Action buttons — appear on hover */}
                      {!msg.deletedAt && (
                        <div className="absolute -right-2 -top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#111] border border-white/10 rounded-xl px-2 py-1 shadow-xl">
                          <Tooltip content="React">
                            <button onClick={(e) => { e.stopPropagation(); setEmojiPickerFor(msg.id); }} className="p-1 hover:text-accent text-white/30 transition-colors">
                              <Smile size={13} />
                            </button>
                          </Tooltip>
                          <Tooltip content="Reply">
                            <button onClick={() => { setReplyTo(msg); textareaRef.current?.focus(); }} className="p-1 hover:text-primary text-white/30 transition-colors">
                              <Reply size={13} />
                            </button>
                          </Tooltip>
                          {isOwnMessage && (
                            <>
                              <Tooltip content="Edit">
                                <button onClick={() => handleStartEdit(msg)} className="p-1 hover:text-accent text-white/30 transition-colors">
                                  <Edit3 size={13} />
                                </button>
                              </Tooltip>
                              <Tooltip content="Delete">
                                <button onClick={() => handleDelete(msg)} className="p-1 hover:text-red-400 text-white/30 transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      )}

                      {/* Emoji picker popover */}
                      <AnimatePresence>
                        {emojiPickerFor === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 5 }}
                            className="absolute left-0 top-full mt-1 z-50 bg-[#111] border border-white/15 rounded-2xl px-3 py-2 flex gap-1 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {EMOJI_LIST.map(emoji => (
                              <button key={emoji} onClick={() => handleReact(msg, emoji)} className="text-xl hover:scale-125 transition-transform p-1">
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Reactions */}
                    {Object.keys(groupedReactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(groupedReactions).map(([emoji, data]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg, emoji)}
                            className={cn(
                              "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all",
                              data.hasMe
                                ? "bg-primary/20 border-primary/40 text-primary"
                                : "bg-white/5 border-white/10 text-white/50 hover:border-white/30"
                            )}
                            title={data.users.join(', ')}
                          >
                            {emoji} <span>{data.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {typingUsernames.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex gap-4 max-w-4xl mx-auto"
              >
                <div className="h-10 w-10 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/20 flex-shrink-0">
                  <Ghost size={16} />
                </div>
                <div className="flex items-center gap-2 text-xs text-white/30 italic">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} className="h-1.5 w-1.5 rounded-full bg-white/30" />
                    ))}
                  </div>
                  <span>{typingUsernames.join(', ')} {typingUsernames.length === 1 ? 'is' : 'are'} typing…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Message Input */}
        <div className="p-4 lg:p-8 pt-0 z-10 flex-shrink-0">
          {/* Reply bar */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="max-w-4xl mx-auto mb-2 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2"
              >
                <Reply size={14} className="text-primary flex-shrink-0" />
                <span className="text-xs text-white/50 flex-1 truncate">
                  <span className="text-primary font-bold">{replyTo.sender.username}: </span>
                  {replyTo.content.slice(0, 80)}
                </span>
                <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white"><X size={14} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit bar */}
          <AnimatePresence>
            {editingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="max-w-4xl mx-auto mb-2 flex items-center gap-3 bg-accent/10 border border-accent/20 rounded-xl px-4 py-2"
              >
                <Edit3 size={14} className="text-accent flex-shrink-0" />
                <span className="text-xs text-white/50 flex-1">Editing message</span>
                <button onClick={() => { setEditingMessage(null); setEditText(''); }} className="text-white/30 hover:text-white"><X size={14} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="max-w-4xl mx-auto glass-retro rounded-[2.5rem] p-2 lg:p-3 border-2 border-white/5 shadow-2xl relative">
            <div className="absolute -top-1 -right-1 text-accent/20 animate-pulse"><Sparkles size={32} /></div>
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={editingMessage ? editText : messageText}
                onChange={editingMessage ? (e) => setEditText(e.target.value) : handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={editingMessage ? "Edit your message..." : "Broadcast your thoughts..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-white/20 py-3.5 resize-none min-h-[52px] max-h-[150px] overflow-y-auto font-medium ml-2"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                variant={editingMessage ? "surreal" : "accent"}
                className="rounded-full h-12 w-12 flex-shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-none"
                disabled={!(editingMessage ? editText.trim() : messageText.trim())}
              >
                {editingMessage ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </motion.div>
          <div className="max-w-4xl mx-auto flex justify-between px-6 mt-3">
            <span className="text-[9px] font-bold text-white/10 uppercase tracking-[0.3em]">Encrypted Dream-Stream Active</span>
            <span className="text-[9px] font-bold text-white/10 uppercase tracking-[0.3em]">Shift + Enter for new line</span>
          </div>
        </div>

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ top: contextMenu.y, left: contextMenu.x }}
              className="fixed z-[100] bg-[#111] border border-white/15 rounded-2xl py-2 min-w-[160px] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => { setReplyTo(contextMenu.message); setContextMenu(null); textareaRef.current?.focus(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                <Reply size={14} /> Reply
              </button>
              <button onClick={() => { navigator.clipboard.writeText(getMessageContent(contextMenu.message) || ''); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                <Sparkles size={14} /> Copy text
              </button>
              {contextMenu.message.senderId === user?.id && (
                <>
                  <button onClick={() => handleStartEdit(contextMenu.message)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                    <Edit3 size={14} /> Edit
                  </button>
                  <div className="h-px bg-white/5 my-1" />
                  <button onClick={() => handleDelete(contextMenu.message)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

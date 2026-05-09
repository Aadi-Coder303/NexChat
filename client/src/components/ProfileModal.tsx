import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Trash2, ShieldAlert, LogOut, Clock, Moon } from 'lucide-react';
import { Button } from './Button';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../lib/socket';
import api from '../lib/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, logout, deleteAccount } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [presence, setPresence] = useState<'online' | 'idle' | 'offline'>('online');
  const [confirmDeleteMessages, setConfirmDeleteMessages] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  const copyCode = () => {
    if (user?.friendCode) {
      navigator.clipboard.writeText(user.friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePresenceChange = (status: 'online' | 'idle' | 'offline') => {
    setPresence(status);
    socketService.setPresence(status);
  };

  const handleDeleteMessages = async () => {
    if (!confirmDeleteMessages) {
      setConfirmDeleteMessages(true);
      return;
    }
    setLoading(true);
    try {
      await api.delete('/auth/my-messages');
      setConfirmDeleteMessages(false);
    } catch (error) {
      console.error('Failed to delete messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true);
      return;
    }
    setLoading(true);
    try {
      await deleteAccount();
      onClose();
    } catch (error) {
      console.error('Failed to delete account:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-[#0c0c0c] border-2 border-white/10 rounded-[2rem] w-full max-w-md p-8 pointer-events-auto relative shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center font-bold text-white text-xl shadow-xl">
                    {user?.username?.[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white italic tracking-tight">{user?.username}</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Profile & Settings</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* NexCode Section */}
              <div className="mb-8 relative z-10">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Your NexCode</label>
                <div className="mt-2 bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-colors">
                  <span className="text-2xl font-bold font-mono tracking-[0.2em] text-white">
                    {user?.friendCode}
                  </span>
                  <button
                    onClick={copyCode}
                    className="p-3 rounded-lg bg-white/5 text-white/40 hover:text-primary hover:bg-primary/10 transition-all"
                    title="Copy NexCode"
                  >
                    {copied ? <Check size={18} className="text-accent" /> : <Copy size={18} />}
                  </button>
                </div>
                <p className="text-[10px] text-white/20 mt-2 ml-1">
                  Share this code with others to connect in the void.
                </p>
              </div>

              {/* Presence Selector */}
              <div className="mb-8 relative z-10">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Status</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    onClick={() => handlePresenceChange('online')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      presence === 'online'
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className={`h-2.5 w-2.5 rounded-full mb-1 ${presence === 'online' ? 'bg-accent' : 'bg-white/30'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">Online</span>
                  </button>
                  <button
                    onClick={() => handlePresenceChange('idle')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      presence === 'idle'
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                        : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Clock size={14} className="mb-1" />
                    <span className="text-xs font-bold uppercase tracking-wider">Idle</span>
                  </button>
                  <button
                    onClick={() => handlePresenceChange('offline')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      presence === 'offline'
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Moon size={14} className="mb-1" />
                    <span className="text-xs font-bold uppercase tracking-wider">Invis</span>
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-white/5 pt-6 relative z-10">
                <label className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 ml-1">Danger Zone</label>
                
                <div className="space-y-2 mt-3">
                  <Button
                    onClick={handleDeleteMessages}
                    disabled={loading}
                    variant="outline"
                    className={`w-full h-11 justify-start gap-3 text-xs font-bold uppercase tracking-wider transition-all ${
                      confirmDeleteMessages ? 'border-red-500/50 text-red-500 bg-red-500/5' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Trash2 size={16} className={confirmDeleteMessages ? 'text-red-500' : 'text-white/40'} />
                    {confirmDeleteMessages ? 'Confirm: Delete All My Msgs' : 'Delete All My Messages'}
                  </Button>

                  <Button
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    variant="outline"
                    className={`w-full h-11 justify-start gap-3 text-xs font-bold uppercase tracking-wider transition-all ${
                      confirmDeleteAccount ? 'border-red-500 bg-red-500/10 text-red-500' : 'text-red-400 hover:bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <ShieldAlert size={16} className={confirmDeleteAccount ? 'text-red-500' : 'text-red-400'} />
                    {confirmDeleteAccount ? 'Confirm: Erase My Existence' : 'Delete Account'}
                  </Button>
                </div>
              </div>

              {/* Logout */}
              <div className="mt-6 pt-4 border-t border-white/5 relative z-10">
                <Button
                  onClick={() => { logout(); onClose(); }}
                  variant="ghost"
                  className="w-full h-11 justify-start gap-3 text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white"
                >
                  <LogOut size={16} />
                  Disconnect
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

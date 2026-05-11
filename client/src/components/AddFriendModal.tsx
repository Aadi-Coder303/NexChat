import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Hash, Ghost, Sparkles, Users } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'friend' | 'group';

export default function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const [tab, setTab] = useState<Tab>('friend');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { connectByCode, joinByInviteCode, createChannel } = useChatStore();
  const { user } = useAuthStore();
  const [groupName, setGroupName] = useState('');

  const reset = () => {
    setCode('');
    setGroupName('');
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAddFriend = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await connectByCode(code.trim());
      setSuccess('Connection established! Check your Apparitions.');
      setTimeout(() => { handleClose(); }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Entity not found in the void.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await joinByInviteCode(code.trim());
      setSuccess('Joined the frequency!');
      setTimeout(() => { handleClose(); }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid invite code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !user) return;
    setLoading(true);
    setError(null);
    try {
      await createChannel(groupName.trim(), 'group', [user.id]);
      setSuccess(`"${groupName}" created!`);
      setTimeout(() => { handleClose(); }, 1500);
    } catch (err: any) {
      setError('Failed to create channel.');
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
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-[#0c0c0c] border-2 border-white/10 rounded-[2rem] w-full max-w-md p-5 sm:p-8 pointer-events-auto relative shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-5 sm:mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <UserPlus size={18} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white italic tracking-tight">Connect</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Add entity or join frequency</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => { setTab('friend'); reset(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                    tab === 'friend'
                      ? 'bg-primary text-black shadow-lg'
                      : 'text-white/30 hover:text-white'
                  }`}
                >
                  <Ghost size={14} />
                  Add Friend
                </button>
                <button
                  onClick={() => { setTab('group'); reset(); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                    tab === 'group'
                      ? 'bg-accent text-black shadow-lg'
                      : 'text-white/30 hover:text-white'
                  }`}
                >
                  <Hash size={14} />
                  Group
                </button>
              </div>

              {/* Error / Success */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold p-3 rounded-xl mb-4"
                  >
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-accent/10 border border-accent/30 text-accent text-xs font-bold p-3 rounded-xl mb-4 flex items-center gap-2"
                  >
                    <Sparkles size={14} /> {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Friend Tab */}
              {tab === 'friend' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">NexCode</label>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                      placeholder="e.g. A3B9C12"
                      className="bg-black/40 border-white/10 h-12 rounded-xl text-white placeholder:text-white/20 uppercase font-mono tracking-widest"
                    />
                    <p className="text-[10px] text-white/20 ml-1">
                      Ask your friend for their NexCode shown in their profile footer.
                    </p>
                  </div>
                  <Button
                    onClick={handleAddFriend}
                    disabled={loading || !code.trim()}
                    variant="default"
                    className="w-full h-12 rounded-xl font-bold"
                  >
                    {loading ? 'Locating entity...' : 'Open Channel'}
                  </Button>
                </div>
              )}

              {/* Group Tab */}
              {tab === 'group' && (
                <div className="space-y-6">
                  {/* Join existing group */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Join via Invite Code</label>
                    <div className="flex gap-2">
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoinGroup()}
                        placeholder="8-char invite code"
                        className="bg-black/40 border-white/10 h-12 rounded-xl text-white placeholder:text-white/20 uppercase font-mono tracking-widest flex-1"
                      />
                      <Button
                        onClick={handleJoinGroup}
                        disabled={loading || !code.trim()}
                        variant="surreal"
                        className="h-12 px-5 rounded-xl font-bold whitespace-nowrap"
                      >
                        Join
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">or</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  {/* Create new group */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Create New Frequency</label>
                    <div className="flex gap-2">
                      <Input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                        placeholder="channel-name"
                        className="bg-black/40 border-white/10 h-12 rounded-xl text-white placeholder:text-white/20 flex-1"
                      />
                      <Button
                        onClick={handleCreateGroup}
                        disabled={loading || !groupName.trim()}
                        variant="accent"
                        className="h-12 px-5 rounded-xl font-bold whitespace-nowrap flex items-center gap-2"
                      >
                        <Users size={16} />
                        Create
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

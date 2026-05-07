import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { useChatStore } from '../stores/chatStore';

interface InviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
}

export default function InviteCodeModal({ isOpen, onClose, channelId, channelName }: InviteCodeModalProps) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { generateInviteCode, channels } = useChatStore();

  // Check if we already have it cached in the store
  const cachedCode = channels.find(c => c.id === channelId)?.inviteCode;

  const fetchCode = async () => {
    setLoading(true);
    try {
      const c = await generateInviteCode(channelId);
      setCode(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const displayCode = code || cachedCode || null;

  const handleCopy = () => {
    if (displayCode) {
      navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Fetch on open
  if (isOpen && !displayCode && !loading && code === null) {
    fetchCode();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-[#0c0c0c] border-2 border-white/10 rounded-[2rem] w-full max-w-sm p-8 pointer-events-auto shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                    <Link2 size={18} className="text-accent" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white italic tracking-tight">Invite Code</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest truncate max-w-[150px]">#{channelName}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-white/40 mb-6 leading-relaxed">
                Share this code with others so they can join your frequency. Anyone with this code can join.
              </p>

              {/* Code Display */}
              <div className="bg-black/60 border-2 border-white/10 rounded-2xl p-6 text-center mb-4 relative">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-white/30">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </div>
                ) : displayCode ? (
                  <>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Invite Code</p>
                    <p className="font-mono text-3xl font-bold text-accent tracking-[0.3em]">{displayCode}</p>
                  </>
                ) : (
                  <p className="text-white/30 text-sm">Failed to generate code</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  disabled={!displayCode}
                  variant="accent"
                  className="flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </Button>
                <Button
                  onClick={() => { setCode(null); fetchCode(); }}
                  disabled={loading}
                  variant="outline"
                  className="h-12 w-12 rounded-xl p-0 border-white/10"
                  title="Regenerate code"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

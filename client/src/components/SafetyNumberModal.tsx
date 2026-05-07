import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, ShieldCheck, ShieldAlert, Copy, Check, RefreshCw } from 'lucide-react';
import { CryptoEngine } from '../lib/crypto';
import { Button } from './Button';

interface SafetyNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  myPublicKey: string;
  theirPublicKey: string;
}

type VerifyStatus = 'idle' | 'verified' | 'mismatch';

export default function SafetyNumberModal({
  isOpen,
  onClose,
  channelId,
  channelName,
  myPublicKey,
  theirPublicKey,
}: SafetyNumberModalProps) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    CryptoEngine.computeFingerprint(myPublicKey, theirPublicKey).then((fp) => {
      setFingerprint(fp);
      setLoading(false);
    });
    // Check previous verification
    CryptoEngine.getVerified(channelId).then((stored) => {
      if (!stored) return setStatus('idle');
      // Recompute to see if keys changed since last verification
      CryptoEngine.computeFingerprint(myPublicKey, theirPublicKey).then((fp) => {
        if (stored.fingerprint === fp) {
          setStatus('verified');
          setVerifiedAt(stored.verifiedAt);
        } else {
          // Keys changed — possible MITM!
          setStatus('mismatch');
        }
      });
    });
  }, [isOpen, channelId, myPublicKey, theirPublicKey]);

  const handleVerify = async () => {
    if (!fingerprint) return;
    await CryptoEngine.markVerified(channelId, fingerprint);
    setStatus('verified');
    setVerifiedAt(Date.now());
  };

  const handleCopy = () => {
    if (!fingerprint) return;
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { dateStyle: 'medium' });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-[#0c0c0c] border-2 border-white/10 rounded-[2rem] w-full max-w-md p-8 pointer-events-auto shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                    status === 'verified' ? 'bg-green-500/20 border-green-500/30' :
                    status === 'mismatch' ? 'bg-red-500/20 border-red-500/30' :
                    'bg-primary/20 border-primary/30'
                  }`}>
                    {status === 'verified' ? <ShieldCheck size={18} className="text-green-400" /> :
                     status === 'mismatch' ? <ShieldAlert size={18} className="text-red-400" /> :
                     <Shield size={18} className="text-primary" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white italic tracking-tight">Safety Number</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest truncate max-w-[180px]">@{channelName}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Status Banner */}
              <AnimatePresence mode="wait">
                {status === 'verified' && (
                  <motion.div key="verified" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold p-3 rounded-xl mb-5">
                    <ShieldCheck size={16} />
                    <div>
                      <p>Keys verified ✓</p>
                      {verifiedAt && <p className="text-green-400/60 font-normal">Last verified {formatDate(verifiedAt)}</p>}
                    </div>
                  </motion.div>
                )}
                {status === 'mismatch' && (
                  <motion.div key="mismatch" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-bold p-4 rounded-xl mb-5 space-y-1">
                    <div className="flex items-center gap-2"><ShieldAlert size={16} /> KEY MISMATCH — POSSIBLE ATTACK</div>
                    <p className="font-normal text-red-400/80 leading-relaxed">
                      The safety number has changed since you last verified. Someone may be intercepting your messages. Contact your friend through another channel to confirm.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Explanation */}
              <p className="text-xs text-white/40 leading-relaxed mb-5">
                Compare this number with <span className="text-white/70 font-bold">@{channelName}</span> over a different channel (call, in person). If they match, your conversation is secure. If they differ, stop sending sensitive information.
              </p>

              {/* Safety Number Display */}
              <div className="bg-black/60 border-2 border-white/10 rounded-2xl p-6 mb-4 relative">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-white/30">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm">Computing fingerprint...</span>
                  </div>
                ) : fingerprint ? (
                  <>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3 text-center">Safety Number</p>
                    <div className="grid grid-cols-3 gap-2">
                      {fingerprint.split(' ').map((group, i) => (
                        <div key={i} className="text-center bg-white/5 rounded-xl py-2 px-1">
                          <span className="font-mono text-base font-bold text-white tracking-widest">{group}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {status !== 'verified' && status !== 'mismatch' && (
                  <Button
                    onClick={handleVerify}
                    disabled={loading || !fingerprint}
                    variant="accent"
                    className="flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={16} /> Mark as Verified
                  </Button>
                )}
                {status === 'verified' && (
                  <Button
                    onClick={() => { setStatus('idle'); }}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl font-bold border-white/10 text-white/40 hover:text-white"
                  >
                    Re-verify
                  </Button>
                )}
                <Button
                  onClick={handleCopy}
                  disabled={!fingerprint}
                  variant="surreal"
                  className="h-12 px-4 rounded-xl font-bold flex items-center gap-2"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>

              {/* Footer note */}
              <p className="text-[10px] text-white/20 text-center mt-4 leading-relaxed">
                Safety numbers are computed locally from cryptographic public keys.<br />
                NexChat never sees this value.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

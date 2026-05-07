import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, ShieldAlert, Shield, Lock, Server } from 'lucide-react';

interface ThreatModelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Row {
  label: string;
  status: 'protected' | 'partial' | 'exposed';
  detail: string;
}

const rows: Row[] = [
  {
    label: 'Message content',
    status: 'protected',
    detail: 'AES-256-GCM encrypted client-side. Server stores only ciphertext — never sees plaintext.',
  },
  {
    label: 'Private keys',
    status: 'protected',
    detail: 'Stored in IndexedDB with extractable:false. Cannot be exported by any JS, even under XSS.',
  },
  {
    label: 'Forward secrecy',
    status: 'protected',
    detail: 'ECDH P-256 ephemeral keys per session. Compromising your static identity key does not decrypt past sessions.',
  },
  {
    label: 'Key fingerprints',
    status: 'protected',
    detail: 'Safety numbers (SHA-256 of both public keys) displayed for out-of-band MITM verification.',
  },
  {
    label: 'Message size (length)',
    status: 'partial',
    detail: 'Padded to nearest 256-byte block before encryption. "Hi" and a paragraph look the same to the server up to 256 bytes. Larger messages still reveal a size quantile.',
  },
  {
    label: 'Who talks to whom',
    status: 'exposed',
    detail: 'The server sees channel membership and message sender IDs. A sealed-sender architecture (like Signal) is needed to hide this — not yet implemented.',
  },
  {
    label: 'When messages are sent',
    status: 'exposed',
    detail: 'Server timestamps all messages. Your activity patterns (active hours, response latency) are visible to the server and any data breach.',
  },
  {
    label: 'Message frequency',
    status: 'exposed',
    detail: 'How often you message each person is visible. Traffic shaping (injecting dummy packets) would obscure this but hurts performance.',
  },
  {
    label: 'Presence / online status',
    status: 'exposed',
    detail: 'Online/offline status is broadcast to channel members in real time. Can be disabled per-user in settings.',
  },
  {
    label: 'IP address',
    status: 'exposed',
    detail: 'Railway (the server host) logs your IP. Use Tor or a VPN if your threat model includes server compromise.',
  },
];

const statusConfig = {
  protected: { icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Protected' },
  partial:   { icon: Shield,      color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Partial' },
  exposed:   { icon: ShieldAlert, color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20',   label: 'Visible to server' },
};

export default function ThreatModelModal({ isOpen, onClose }: ThreatModelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[#080808] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between p-8 pb-0 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Lock size={18} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white italic tracking-tight">Security & Privacy Disclosure</h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">NexChat Threat Model v1</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Intro */}
              <div className="px-8 pt-5 pb-4 flex-shrink-0">
                <p className="text-xs text-white/40 leading-relaxed">
                  NexChat provides end-to-end encrypted messaging. This table shows exactly what is and isn't protected —
                  because honest disclosure matters more than a green lock icon.
                  <span className="text-white/60"> True E2EE only protects content. Metadata is a separate, hard problem.</span>
                </p>
              </div>

              {/* Scrollable table */}
              <div className="overflow-y-auto px-8 pb-8 space-y-2 flex-1">
                {rows.map((row) => {
                  const cfg = statusConfig[row.status];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-4 items-start p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center border ${cfg.bg} ${cfg.border}`}>
                        <Icon size={15} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white/80">{row.label}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-white/35 leading-relaxed">{row.detail}</p>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Honest summary */}
                <div className="mt-4 p-5 rounded-2xl bg-white/3 border border-white/8">
                  <div className="flex items-start gap-3">
                    <Server size={16} className="text-white/30 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 text-xs text-white/35 leading-relaxed">
                      <p>
                        <span className="text-white/60 font-bold">What the server always sees:</span>{' '}
                        who you talk to, when, and how often. This is the &ldquo;metadata problem&rdquo; — the NSA famously said
                        &ldquo;we kill people based on metadata.&rdquo; It applies here too.
                      </p>
                      <p>
                        <span className="text-white/60 font-bold">Fully solving this requires:</span>{' '}
                        sealed-sender architecture (Signal), onion routing (Tor), and traffic shaping (dummy packets).
                        These are on the roadmap but not yet implemented.
                      </p>
                      <p>
                        <span className="text-white/60 font-bold">If your threat model includes a compromised server:</span>{' '}
                        verify safety numbers out-of-band, use a VPN/Tor, and treat all metadata as potentially exposed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comparison */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { name: 'NexChat', items: ['Content ✓', 'FS ✓', 'Metadata ✗', 'Sealed-sender ✗'] },
                    { name: 'Signal',  items: ['Content ✓', 'FS ✓', 'Sealed-sender ✓', 'Metadata ~'] },
                    { name: 'WhatsApp', items: ['Content ✓', 'FS ✓', 'Metadata ✗', 'Backups ✗'] },
                  ].map(app => (
                    <div key={app.name} className="p-3 rounded-xl bg-white/3 border border-white/8">
                      <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">{app.name}</p>
                      {app.items.map(i => (
                        <p key={i} className={`text-[10px] font-mono ${i.includes('✓') ? 'text-green-400/60' : i.includes('~') ? 'text-amber-400/60' : 'text-red-400/60'}`}>{i}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

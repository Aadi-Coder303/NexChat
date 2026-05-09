import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, ArrowRight, X, Sparkles, Hash, Copy, UserPlus, Shield, MessageSquare, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

/* ─── Tour step definitions ─────────────────────────────────── */
interface Step {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  /** CSS selector for the element to spotlight. null = center card only */
  target: string | null;
  /** Where to render the card relative to the spotlight */
  placement: 'center' | 'right' | 'bottom' | 'left' | 'top';
  accent: string; // Tailwind color token used for glow
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    icon: <Ghost size={28} className="text-primary" />,
    title: 'Welcome to NexChat',
    body: "You've entered the void. NexChat is an end-to-end encrypted, ephemeral messaging app. Every message is encrypted before it leaves your device — not even the server can read it.",
    target: null,
    placement: 'center',
    accent: 'primary',
  },
  {
    id: 'nexcode',
    icon: <Copy size={28} className="text-accent" />,
    title: 'Your NexCode',
    body: 'This is your unique NexCode — share it with anyone you want to connect with. It\'s your public identity in the void. Tap it to copy.',
    target: '[data-tour="nexcode"]',
    placement: 'top',
    accent: 'accent',
  },
  {
    id: 'add-friend',
    icon: <UserPlus size={28} className="text-primary" />,
    title: 'Add a Connection',
    body: 'Tap the + button to add a friend using their NexCode, join a group frequency via invite code, or create your own group channel.',
    target: '[data-tour="add-btn"]',
    placement: 'right',
    accent: 'primary',
  },
  {
    id: 'channels',
    icon: <Hash size={28} className="text-accent" />,
    title: 'Apparitions & Frequencies',
    body: 'Your direct messages appear as "Apparitions" and group channels as "Frequencies". Pending connection requests show up separately with a yellow indicator.',
    target: '[data-tour="channels-list"]',
    placement: 'right',
    accent: 'accent',
  },
  {
    id: 'messaging',
    icon: <MessageSquare size={28} className="text-primary" />,
    title: 'Send a Message',
    body: 'Type in the box and hit Enter to send. All messages are encrypted with ECDH forward secrecy — each session generates a fresh one-time key. Right-click any message to reply, react, or delete.',
    target: '[data-tour="message-input"]',
    placement: 'top',
    accent: 'primary',
  },
  {
    id: 'security',
    icon: <Shield size={28} className="text-accent" />,
    title: 'Verify Your Contacts',
    body: 'In a direct message, tap the shield icon in the header to verify your contact\'s safety number. This confirms you\'re talking to the real person and not an impersonator.',
    target: null,
    placement: 'center',
    accent: 'accent',
  },
];

/* ─── localStorage helpers ───────────────────────────────────── */
const TOUR_KEY = (userId: string) => `nexchat-tour-done-${userId}`;
export const markTourDone = (userId: string) =>
  localStorage.setItem(TOUR_KEY(userId), '1');
export const isTourDone = (userId: string) =>
  localStorage.getItem(TOUR_KEY(userId)) === '1';

/* ─── Spotlight rect tracker ─────────────────────────────────── */
function useTargetRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!selector) { setRect(null); return; }

    const measure = () => {
      const el = document.querySelector(selector);
      if (el) setRect(el.getBoundingClientRect());
      rafRef.current = requestAnimationFrame(measure);
    };
    rafRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selector]);

  return rect;
}

/* ─── Main component ─────────────────────────────────────────── */
export default function OnboardingTour() {
  const { user } = useAuthStore();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  /* Show tour once per user after a short boot delay */
  useEffect(() => {
    if (!user) return;
    if (isTourDone(user.id)) return;
    const t = setTimeout(() => setActive(true), 800);
    return () => clearTimeout(t);
  }, [user]);

  const current = STEPS[step];
  const targetRect = useTargetRect(active ? current.target : null);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    if (user) markTourDone(user.id);
    setActive(false);
  };

  /* Card position relative to spotlight */
  const getCardStyle = (): React.CSSProperties => {
    if (!targetRect || current.placement === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }
    const PAD = 20;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    switch (current.placement) {
      case 'right':
        return {
          position: 'fixed',
          top: Math.min(targetRect.top, vh - 320),
          left: Math.min(targetRect.right + PAD, vw - 380),
        };
      case 'left':
        return {
          position: 'fixed',
          top: Math.min(targetRect.top, vh - 320),
          right: Math.min(vw - targetRect.left + PAD, vw - 380),
        };
      case 'bottom':
        return {
          position: 'fixed',
          top: Math.min(targetRect.bottom + PAD, vh - 320),
          left: Math.max(0, targetRect.left + targetRect.width / 2 - 175),
        };
      case 'top':
      default:
        return {
          position: 'fixed',
          bottom: Math.min(vh - targetRect.top + PAD, vh - 60),
          left: Math.max(0, Math.min(targetRect.left + targetRect.width / 2 - 175, vw - 380)),
        };
    }
  };

  /* SVG clip-path for spotlight cutout */
  const buildClipPath = () => {
    if (!targetRect) return null;
    const R = 12; // border-radius of cutout
    const P = 8;  // padding around element
    const x = targetRect.left - P;
    const y = targetRect.top - P;
    const w = targetRect.width + P * 2;
    const h = targetRect.height + P * 2;
    return { x, y, w, h, R };
  };

  const spot = buildClipPath();

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* ── Dim overlay with spotlight cutout ── */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[9000] pointer-events-none"
            style={{ isolation: 'isolate' }}
          >
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <mask id="tour-mask">
                  {/* White = visible (dimmed) */}
                  <rect width="100%" height="100%" fill="white" />
                  {/* Black = cut-out (spotlight) */}
                  {spot && (
                    <rect
                      x={spot.x}
                      y={spot.y}
                      width={spot.w}
                      height={spot.h}
                      rx={spot.R}
                      ry={spot.R}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.75)"
                mask="url(#tour-mask)"
              />
            </svg>

            {/* Spotlight ring pulse */}
            {spot && (
              <motion.div
                key={`ring-${step}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0, 0.7, 0], scale: [0.9, 1.06, 1.12] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }}
                style={{
                  position: 'fixed',
                  left: spot.x - 4,
                  top: spot.y - 4,
                  width: spot.w + 8,
                  height: spot.h + 8,
                  borderRadius: spot.R + 4,
                  border: '2px solid',
                  borderColor: current.accent === 'accent' ? 'rgba(16,185,129,0.7)' : 'rgba(139,92,246,0.7)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </motion.div>

          {/* ── Clickable backdrop (for skip) ── */}
          <div
            className="fixed inset-0 z-[9001]"
            onClick={finish}
          />

          {/* ── Tour card ── */}
          <motion.div
            key={`card-${step}`}
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 12 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            style={getCardStyle()}
            className="z-[9002] w-[340px] sm:w-[360px] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative rounded-[1.75rem] p-7 shadow-2xl overflow-hidden"
              style={{
                background: 'rgba(10,10,10,0.97)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: current.accent === 'accent'
                  ? '0 0 60px rgba(16,185,129,0.12), 0 25px 60px rgba(0,0,0,0.7)'
                  : '0 0 60px rgba(139,92,246,0.12), 0 25px 60px rgba(0,0,0,0.7)',
              }}
            >
              {/* Ambient glow blob */}
              <div
                className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{
                  background: current.accent === 'accent'
                    ? 'radial-gradient(circle, #10B981, transparent)'
                    : 'radial-gradient(circle, #8B5CF6, transparent)',
                }}
              />

              {/* Header row */}
              <div className="flex items-start justify-between mb-5">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: current.accent === 'accent'
                      ? 'rgba(16,185,129,0.12)'
                      : 'rgba(139,92,246,0.12)',
                    border: current.accent === 'accent'
                      ? '1px solid rgba(16,185,129,0.25)'
                      : '1px solid rgba(139,92,246,0.25)',
                  }}
                >
                  {current.icon}
                </div>
                <button
                  onClick={finish}
                  className="p-1.5 rounded-lg text-white/20 hover:text-white/60 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Title */}
              <h3
                className="font-display text-xl text-white italic tracking-tight mb-2"
                style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}
              >
                {current.title}
              </h3>

              {/* Body */}
              <p className="text-sm text-white/50 leading-relaxed mb-6">
                {current.body}
              </p>

              {/* Step dots */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className="transition-all duration-300"
                      style={{
                        width: i === step ? 20 : 6,
                        height: 6,
                        borderRadius: 999,
                        background: i === step
                          ? (current.accent === 'accent' ? '#10B981' : '#8B5CF6')
                          : 'rgba(255,255,255,0.12)',
                      }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <button
                      onClick={prev}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-2 px-5 h-9 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    style={{
                      background: current.accent === 'accent'
                        ? 'linear-gradient(135deg, #10B981, #059669)'
                        : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                      color: '#fff',
                      boxShadow: current.accent === 'accent'
                        ? '0 0 20px rgba(16,185,129,0.35)'
                        : '0 0 20px rgba(139,92,246,0.35)',
                    }}
                  >
                    {step === STEPS.length - 1 ? (
                      <>
                        <Sparkles size={13} />
                        Let's go
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Skip link */}
              <button
                onClick={finish}
                className="w-full text-center text-[9px] font-bold uppercase tracking-[0.25em] text-white/15 hover:text-white/30 transition-colors mt-4"
              >
                Skip walkthrough
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

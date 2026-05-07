import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { UserPlus, Sparkles, Wand2, ArrowLeft, Copy, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Tooltip } from '../../components/Tooltip';
import { CryptoEngine } from '../../lib/crypto';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const registerUser = useAuthStore((state) => state.register);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      // Generate E2EE Key Pair
      const { publicKey, privateKey } = await CryptoEngine.generateKeyPair();
      
      const res = await registerUser(data.username, data.password, publicKey);
      
      // Store private key in IndexedDB linked to user ID
      if (res) {
        // We'll need the user ID from the response, but store it after registration is confirmed
        // Since authStore sets the user, we can get it from there
        const user = useAuthStore.getState().user;
        if (user) {
          await CryptoEngine.storePrivateKey(user.id, privateKey);
        }
      }
      
      setRecoveryKey(res.recoveryKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Registration Error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#050505]">
      {/* Surreal Background Asset */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img 
          src="/retro_surreal_bg.png" 
          className="w-full h-full object-cover filter contrast-125 hue-rotate-180 scale-125"
          alt="Surreal background"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: 2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-md z-10"
      >
        <div className="glass-panel p-8 rounded-[2rem] relative">
          <Link to="/login" className="absolute top-8 left-8 text-white/40 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>

          <div className="text-center mb-10">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 border border-accent/50 shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-6"
            >
              <UserPlus className="text-accent" size={32} />
            </motion.div>
            <Tooltip content="Sign Up">
              <h1 className="text-4xl font-display text-white mb-2 tracking-tight text-glow">Birth an Identity</h1>
            </Tooltip>
            <p className="text-accent font-bold text-xs uppercase tracking-[0.2em]">Join the collective consciousness</p>
          </div>

          {error && (
            <motion.div
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              className="bg-danger/20 border-2 border-danger text-danger text-xs font-bold p-4 rounded-xl mb-6 flex items-center gap-3"
            >
              <Wand2 size={16} />
              {error}
            </motion.div>
          )}

          {recoveryKey ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="bg-primary/10 border border-primary p-6 rounded-2xl relative group">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Your Secret Recovery Key</p>
                <p className="font-mono text-xl text-white break-all mb-4">{recoveryKey}</p>
                <Button 
                  onClick={handleCopy}
                  variant="surreal"
                  size="sm"
                  className="w-full flex items-center gap-2"
                >
                  {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} />}
                  {copied ? 'Captured in Memory' : 'Inscribe in Clipboard'}
                </Button>
              </div>
              <div className="bg-danger/20 border border-danger/50 p-4 rounded-xl flex items-start gap-3 text-left">
                <Wand2 className="text-danger flex-shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-danger/90 leading-relaxed font-bold">
                  SAVE THIS KEY IMMEDIATELY. We do not use email. If you lose your password, this is the ONLY way to recover your account. It will never be shown again.
                </p>
              </div>
              <Button
                onClick={() => navigate('/')}
                variant="default"
                className="w-full h-14 rounded-2xl text-lg font-bold"
              >
                I have saved it. Enter NexChat.
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Tooltip content="Choose a Username">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4 cursor-help">Entity Handle</label>
                </Tooltip>
                <Input
                  {...register('username')}
                  type="text"
                  placeholder="aadi_observer"
                  error={errors.username?.message}
                  className=""
                />
              </div>

              <div className="space-y-2">
                <Tooltip content="Choose a Password">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4 cursor-help">Access Secret</label>
                </Tooltip>
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  className=""
                />
              </div>

              <div className="space-y-2">
                <Tooltip content="Re-enter your Password">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4 cursor-help">Confirm Secret</label>
                </Tooltip>
                <Input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  className=""
                />
              </div>

              <Tooltip content="Create Account">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 transition-all font-bold flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Manifesting...' : 'Manifest Identity'}
                  {!isSubmitting && <Sparkles size={16} />}
                </Button>
              </Tooltip>
            </form>
          )}

          {!recoveryKey && (
            <div className="flex justify-between items-center mt-8">
              <p className="text-sm text-white/40">
                Already exist?{' '}
                <Tooltip content="Sign In">
                  <Link to="/login" className="text-indigo-400 font-bold hover:text-indigo-300 hover:underline cursor-help transition-colors">
                    Return to your body
                  </Link>
                </Tooltip>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

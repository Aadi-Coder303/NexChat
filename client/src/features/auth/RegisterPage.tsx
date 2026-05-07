import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { UserPlus, Sparkles, Wand2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Tooltip } from '../../components/Tooltip';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const registerUser = useAuthStore((state) => state.register);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      const res = await registerUser(data.username, data.password);
      setRecoveryKey(res.recoveryKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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
        initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-full max-w-md z-10"
      >
        <div className="glass-retro p-8 rounded-[2rem] border-2 border-white/10 relative">
          <Link to="/login" className="absolute top-8 left-8 text-white/40 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>

          <div className="text-center mb-10">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent shadow-[4px_4px_0px_0px_#000] border-2 border-black mb-6"
            >
              <UserPlus className="text-black" size={32} />
            </motion.div>
            <Tooltip content="Sign Up">
              <h1 className="text-4xl font-display text-white mb-2 italic tracking-tight">Birth an Identity</h1>
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
                <p className="font-mono text-xl text-white break-all">{recoveryKey}</p>
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
                  className="bg-black/40 border-white/10 h-14 rounded-xl focus:border-accent/50 text-white placeholder:text-white/20"
                />
              </div>

              <div className="space-y-2">
                <Tooltip content="Choose a Password">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4 cursor-help">Secure Seal</label>
                </Tooltip>
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  className="bg-black/40 border-white/10 h-14 rounded-xl focus:border-accent/50 text-white placeholder:text-white/20"
                />
              </div>

              <Tooltip content="Create Account">
                <Button
                  type="submit"
                  variant="accent"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-2xl text-lg group overflow-hidden relative"
                >
                  <motion.span 
                    className="relative z-10 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    {isSubmitting ? 'Manifesting...' : 'Manifest Identity'}
                    <Sparkles size={18} />
                  </motion.span>
                </Button>
              </Tooltip>
            </form>
          )}

          {!recoveryKey && (
            <p className="text-center mt-8 text-sm text-white/40">
              Already manifested?{' '}
              <Tooltip content="Log In">
                <Link to="/login" className="text-primary font-bold hover:underline italic cursor-help">
                  Recall identity
                </Link>
              </Tooltip>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

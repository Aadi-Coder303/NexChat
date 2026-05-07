import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { KeyRound, Sparkles, Wand2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

const recoverSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  recoveryKey: z.string().min(1, 'Recovery Key is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

type RecoverForm = z.infer<typeof recoverSchema>;

export default function RecoverPage() {
  const recoverAccount = useAuthStore((state) => state.recoverAccount);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RecoverForm>({
    resolver: zodResolver(recoverSchema),
  });

  const onSubmit = async (data: RecoverForm) => {
    try {
      setError(null);
      await recoverAccount(data.username, data.recoveryKey, data.newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.error || 'Recovery failed. Invalid key or username.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#050505]">
      {/* Surreal Background Asset */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img 
          src="/retro_surreal_bg.png" 
          className="w-full h-full object-cover filter contrast-125 hue-rotate-90 scale-125"
          alt="Surreal background"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
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
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-[4px_4px_0px_0px_#000] border-2 border-black mb-6"
            >
              <KeyRound className="text-white" size={32} />
            </motion.div>
            <h1 className="text-4xl font-display text-white mb-2 italic tracking-tight">Recover Identity</h1>
            <p className="text-accent font-bold text-xs uppercase tracking-[0.2em]">Unlock the void</p>
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

          {success ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="bg-accent/10 border border-accent p-6 rounded-2xl">
                <p className="text-accent font-bold text-lg mb-2">Identity Recovered!</p>
                <p className="text-white/70 text-sm">Your new seal has been forged. Redirecting to portal...</p>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Entity Handle</label>
                <Input
                  {...register('username')}
                  type="text"
                  placeholder="aadi_observer"
                  error={errors.username?.message}
                  className="bg-black/40 border-white/10 h-14 rounded-xl focus:border-primary/50 text-white placeholder:text-white/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">Secret Recovery Key</label>
                <Input
                  {...register('recoveryKey')}
                  type="text"
                  placeholder="nex-r-..."
                  error={errors.recoveryKey?.message}
                  className="bg-black/40 border-white/10 h-14 rounded-xl focus:border-primary/50 text-white placeholder:text-white/20 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4">New Secure Seal</label>
                <Input
                  {...register('newPassword')}
                  type="password"
                  placeholder="••••••••"
                  error={errors.newPassword?.message}
                  className="bg-black/40 border-white/10 h-14 rounded-xl focus:border-primary/50 text-white placeholder:text-white/20"
                />
              </div>

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
                  {isSubmitting ? 'Forging...' : 'Forge New Seal'}
                  <Sparkles size={18} />
                </motion.span>
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { LogIn, Sparkles, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Tooltip } from '../../components/Tooltip';
import { CryptoEngine } from '../../lib/crypto';
import api from '../../lib/api';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data.username, data.password);
      
      const user = useAuthStore.getState().user;
      if (user) {
        // Check if we have a private key
        const existingKey = await CryptoEngine.getPrivateKey(user.id);
        if (!existingKey) {
          console.log('No private key found for this identity. Generating new cryptographic seal...');
          const { publicKey, privateKey } = await CryptoEngine.generateKeyPair();
          await CryptoEngine.storePrivateKey(user.id, privateKey);
          
          // Update server's public key
          await api.post(`/auth/users/${user.id}/public-key`, { publicKey });
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#050505]">
      {/* Surreal Background Asset */}
      <div className="absolute inset-0 z-0 opacity-40">
        <img 
          src="/retro_surreal_bg.png" 
          className="w-full h-full object-cover filter contrast-125 hue-rotate-15 scale-110"
          alt="Surreal background"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-md z-10"
      >
        <div className="glass-panel p-8 rounded-[2rem] relative">
          {/* Floating Surreal Elements */}
          <motion.div 
            animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-12 -right-8 text-primary opacity-50"
          >
            <Sparkles size={64} />
          </motion.div>

          <div className="text-center mb-10">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/50 shadow-[0_0_30px_rgba(139,92,246,0.3)] mb-6"
            >
              <LogIn className="text-primary" size={32} />
            </motion.div>
            <Tooltip content="Sign In">
              <h1 className="text-4xl font-display text-white mb-2 tracking-tight text-glow">Welcome Back</h1>
            </Tooltip>
            <p className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Enter the dreamscape</p>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Tooltip content="Enter your Username">
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
              <Tooltip content="Enter your Password">
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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl text-lg group overflow-hidden relative"
            >
              <motion.span 
                className="relative z-10 flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                {isSubmitting ? 'Decrypting...' : 'Access NexChat'}
                <LogIn size={18} />
              </motion.span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-20 transition-opacity" />
            </Button>
          </form>

          <div className="flex justify-between items-center mt-8">
            <p className="text-sm text-white/40">
              Lost your way?{' '}
              <Tooltip content="Sign Up">
                <Link to="/register" className="text-accent font-bold hover:text-emerald-400 hover:underline cursor-help transition-colors">
                  Create a new identity
                </Link>
              </Tooltip>
            </p>
            <Tooltip content="Password Recovery">
              <Link to="/recover" className="text-sm text-primary/60 hover:text-primary transition-colors italic cursor-help">
                Forgot Secret?
              </Link>
            </Tooltip>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

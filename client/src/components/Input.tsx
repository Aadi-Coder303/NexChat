import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 block ml-4 italic">
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            className={cn(
              'flex h-14 w-full rounded-2xl border-2 border-white/5 bg-white/[0.02] backdrop-blur-md px-5 py-4 text-sm font-medium transition-all duration-300 placeholder:text-white/10 focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(139,92,246,0.1)] disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-danger/50 focus:border-danger focus:shadow-[0_0_20px_rgba(239,68,68,0.1)]',
              className
            )}
            {...props}
          />
          <div className="absolute inset-0 rounded-2xl bg-retro-grain opacity-[0.03] pointer-events-none" />
        </div>
        {error && (
          <motion.p 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] font-bold text-danger uppercase tracking-widest ml-4"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

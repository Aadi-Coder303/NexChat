import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-95 rounded-xl",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-hover shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] border border-white/10 hover:border-primary/50",
        accent: "bg-accent text-white hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-white/10 hover:border-accent/50",
        outline: "border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white hover:border-white/20 shadow-lg backdrop-blur-sm",
        ghost: "hover:bg-primary/10 text-primary hover:text-primary-hover",
        link: "text-primary underline-offset-4 hover:underline text-glow",
        surreal: "glass-button text-white",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-9 px-4 rounded-lg",
        lg: "h-14 px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

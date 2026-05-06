import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-[4px_4px_0px_0px_#000] border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000]",
        accent: "bg-accent text-black shadow-[4px_4px_0px_0px_#000] border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000]",
        outline: "border-2 border-white/20 bg-transparent hover:bg-white/5 text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]",
        ghost: "hover:bg-primary/10 text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        surreal: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-xl",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-9 px-4",
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

export { Button, buttonVariants }

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:scale-95",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-teal-500 text-white shadow-md border border-teal-600",
          "hover:bg-teal-600",
          "bg-[#14b8a6] border-[#0f766e] hover:bg-[#0d9488]",
        ].join(" "),
        destructive: [
          "bg-red-600 text-white shadow-sm border border-red-700",
          "hover:bg-red-700",
        ].join(" "),
        outline: [
          "border border-slate-300 bg-white text-slate-700 shadow-sm",
          "hover:bg-slate-100 hover:text-slate-900",
        ].join(" "),
        secondary: [
          "bg-slate-200 text-slate-900 shadow-sm border border-slate-300",
          "hover:bg-slate-300",
        ].join(" "),
        ghost: [
          "text-slate-600",
          "hover:bg-slate-100 hover:text-slate-900",
        ].join(" "),
        link: "text-teal-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }

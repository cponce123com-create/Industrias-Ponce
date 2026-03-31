import * as React from "react"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "destructive"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    let base =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none px-4 py-2"

    let styles = ""

    switch (variant) {
      case "outline":
        styles =
          "border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
        break
      case "destructive":
        styles =
          "bg-red-600 text-white hover:bg-red-700"
        break
      default:
        styles =
          "bg-[#14b8a6] text-white hover:bg-[#0d9488]" // verde jade fijo
    }

    return (
      <button
        ref={ref}
        className={`${base} ${styles} ${className}`}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

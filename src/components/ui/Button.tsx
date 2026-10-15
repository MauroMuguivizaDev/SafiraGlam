import type { ButtonHTMLAttributes, ReactNode } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium outline-none transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"

  const variants = {
    primary:
      "bg-[var(--button-bg)] text-[var(--button-text)] hover:bg-[var(--button-bg-hover)]",
    secondary:
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
    danger:
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-muted)]",
  }

  const sizes = {
    sm: "min-h-9 px-3 text-xs",
    md: "min-h-10 px-4 text-sm",
    lg: "min-h-11 px-5 text-sm",
  }

  return (
    <button
      disabled={disabled}
      className={[baseStyles, variants[variant], sizes[size], fullWidth ? "w-full" : "", className].join(" ")}
      {...props}
    >
      {children}
    </button>
  )
}

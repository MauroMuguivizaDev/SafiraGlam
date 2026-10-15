import type { InputHTMLAttributes, ReactNode } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export default function Input({
  label,
  error,
  hint,
  icon,
  className = "",
  id,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-[var(--text)]">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center text-[var(--text-muted)]">
            {icon}
          </div>
        )}

        <input
          id={id}
          className={[
            "h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--text)]",
            "outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--text)]",
            "disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)] disabled:text-[var(--text-muted)]",
            icon ? "pl-10" : "",
            error ? "border-[var(--text)]" : "",
            className,
          ].join(" ")}
          {...props}
        />
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}

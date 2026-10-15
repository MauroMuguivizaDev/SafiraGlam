import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.5rem,3vw,1.875rem)] font-semibold tracking-[-0.035em] text-[var(--text)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

import {
  BarChart3,
  Boxes,
  Coins,
  Home,
  MoreHorizontal,
  Package,
  Settings,
  ShoppingCart,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

const mainItems: NavItem[] = [
  { to: "/", label: "Início", icon: Home },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/caixa", label: "Caixa", icon: Wallet },
  { to: "/stock", label: "Stock", icon: Boxes },
]

const moreItems: NavItem[] = [
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/cambio", label: "Câmbio", icon: Coins },
  { to: "/definicoes", label: "Definições", icon: Settings },
]

/* Conteúdo visual de cada aba (ícone, texto e indicador) */
function TabContent({
  active,
  icon: Icon,
  label,
}: {
  active: boolean
  icon: LucideIcon
  label: string
}) {
  return (
    <span className="relative flex h-full w-full flex-col items-center justify-center gap-0.5">
      {/* Indicador no topo da aba activa */}
      <span
        className={`absolute top-0 h-0.5 w-8 rounded-b-full bg-(--primary) transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />

      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
          active
            ? "bg-(--primary-soft) text-(--primary)"
            : "text-(--text-muted)"
        }`}
      >
        <Icon size={20} strokeWidth={active ? 2.1 : 1.7} />
      </span>

      <span
        className={`text-[10px] leading-none transition-colors ${
          active
            ? "font-semibold text-(--primary)"
            : "font-medium text-(--text-muted)"
        }`}
      >
        {label}
      </span>
    </span>
  )
}

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()

  const moreIsActive = moreItems.some(
    (item) =>
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`),
  )

  function closeMore() {
    setMoreOpen(false)
  }

  // Fecha o menu com a tecla Esc
  useEffect(() => {
    if (!moreOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [moreOpen])

  return (
    <>
      {/* Fundo que fecha o menu */}
      {moreOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={closeMore}
          className="fixed inset-0 z-9998 bg-black/45 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Menu Mais */}
      {moreOpen && (
        <div
          role="menu"
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] left-4 right-4 z-9999 overflow-hidden rounded-xl border border-(--border) bg-(--surface) shadow-[0_16px_50px_rgba(0,0,0,0.35)] md:hidden"
        >
          <div className="flex items-center justify-between border-b border-(--border) px-4 py-3">
            <span className="text-sm font-semibold text-(--text)">Mais</span>

            <button
              type="button"
              onClick={closeMore}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-(--text-muted) transition hover:bg-(--surface-muted) hover:text-(--text) focus-visible:outline-2 focus-visible:outline-(--primary)"
            >
              <X size={17} strokeWidth={1.8} />
            </button>
          </div>

          <div className="divide-y divide-(--border)">
            {moreItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  onClick={closeMore}
                  className={({ isActive }) =>
                    `flex min-h-13 items-center gap-3 px-4 text-sm transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--primary) ${
                      isActive
                        ? "bg-(--primary-soft) font-medium text-(--primary)"
                        : "text-(--text-secondary) hover:bg-(--surface-soft) hover:text-(--primary)"
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        </div>
      )}

      {/* Navegação inferior */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-9997 border-t border-(--border) bg-(--surface) md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch">
          {mainItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={closeMore}
              className="flex min-w-0 flex-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--primary)"
            >
              {({ isActive }) => (
                <TabContent
                  active={isActive}
                  icon={item.icon}
                  label={item.label}
                />
              )}
            </NavLink>
          ))}

          {/* Mais */}
          <button
            type="button"
            aria-label="Abrir mais opções"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((current) => !current)}
            className="flex min-w-0 flex-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--primary)"
          >
            <TabContent
              active={moreOpen || moreIsActive}
              icon={MoreHorizontal}
              label="Mais"
            />
          </button>
        </div>
      </nav>
    </>
  )
}
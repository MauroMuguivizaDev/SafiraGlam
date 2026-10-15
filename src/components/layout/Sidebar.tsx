import {
  BarChart3,
  Boxes,
  Coins,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Wallet,
} from "lucide-react"
import { NavLink } from "react-router-dom"

const navigation = [
  { to: "/", label: "Início", icon: Home },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/caixa", label: "Caixa", icon: Wallet },
  { to: "/stock", label: "Stock", icon: Boxes },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/cambio", label: "Câmbio", icon: Coins },
]

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] border-r border-[var(--border)] bg-[var(--surface)] md:flex md:flex-col">
      <div className="flex h-20 items-center border-b border-[var(--border-soft)] px-6">
        <span className="text-lg font-semibold tracking-[-0.035em] text-[var(--primary)]">
          Diverse
        </span>
      </div>

      <nav className="flex-1 px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Gestão
        </p>

        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                    isActive
                      ? "bg-[var(--primary)] font-medium text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                  }`
                }
              >
                <Icon
                  size={18}
                  strokeWidth={1.8}
                />

                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <NavLink
          to="/definicoes"
          className={({ isActive }) =>
            `flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
              isActive
                ? "bg-[var(--primary)] font-medium text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
            }`
          }
        >
          <Settings
            size={18}
            strokeWidth={1.8}
          />

          Definições
        </NavLink>
      </div>
    </aside>
  )
}
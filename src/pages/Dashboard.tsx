import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"
import { Link } from "react-router-dom"
import { db } from "../db/database"

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "—"
  }

  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} MT`
}

function formatTime(dateString: string) {
  const date = new Date(dateString)

  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, "0")

  const period = hours >= 12 ? "PM" : "AM"
  const hour12 = hours % 12 || 12

  return `${hour12}:${minutes} ${period}`
}

function isToday(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export default function Dashboard() {
  const products = useLiveQuery(
    () => db.products.toArray(),
    [],
    [],
  )

  const sales = useLiveQuery(
    () =>
      db.sales
        .orderBy("createdAt")
        .reverse()
        .toArray(),
    [],
    [],
  )

  const todaySales = sales.filter((sale) =>
    isToday(sale.createdAt),
  )

  const revenueToday = todaySales.reduce(
    (total, sale) =>
      total +
      (Number.isFinite(sale.total)
        ? sale.total
        : 0),
    0,
  )

  const profitToday = todaySales.reduce(
    (total, sale) =>
      total +
      (Number.isFinite(sale.grossProfit)
        ? sale.grossProfit
        : 0),
    0,
  )


  const lowStockProducts = products.filter(
    (product) =>
      product.active &&
      product.stock > 0 &&
      product.stock <= product.minimumStock,
  )

  const outOfStockProducts = products.filter(
    (product) =>
      product.active &&
      product.stock <= 0,
  )

  const recentSales = sales.slice(0, 5)

  const hasAlerts =
    lowStockProducts.length > 0 ||
    outOfStockProducts.length > 0

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-10 lg:px-10">

        <header className="mb-6">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">

              <h1 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-3xl">
                HOME
              </h1>

            </div>

            <ShoppingCart
              size={21}
              strokeWidth={1.7}
              className="shrink-0 text-[var(--text-muted)]"
            />
          </div>
        </header>


        <div className="mb-6">
          <Link
            to="/vendas"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--button-bg)] px-5 text-sm font-medium text-[var(--button-text)] transition hover:bg-[var(--button-bg-hover)] active:opacity-80"
          >
            <ShoppingCart
              size={17}
              strokeWidth={1.7}
            />

            Nova venda

          </Link>
        </div>


        <section className="mb-6 grid grid-cols-2 border-y border-[var(--border)] sm:grid-cols-5">


          <Link
            to="/vendas"
            className="group px-3 py-4 transition hover:bg-[var(--surface-muted)] sm:px-4"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart
                size={15}
                strokeWidth={1.7}
                className="text-[var(--text-muted)]"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Vendas hoje
              </p>
            </div>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(revenueToday)}
            </p>

            <div className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <span>
                {todaySales.length}{" "}
                {todaySales.length === 1
                  ? "venda"
                  : "vendas"}
              </span>

              <ArrowRight
                size={11}
                strokeWidth={1.8}
                className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            </div>
          </Link>

          <div className="border-l border-[var(--border)] px-3 py-4 sm:px-4">
            <div className="flex items-center gap-2">
              <TrendingUp
                size={15}
                strokeWidth={1.7}
                className="text-[var(--text-muted)]"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Lucro hoje
              </p>
            </div>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(profitToday)}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              lucro bruto
            </p>
          </div>

          <Link
            to="/stock"
            className="group border-t border-[var(--border)] px-3 py-4 transition hover:bg-[var(--surface-muted)] sm:border-l sm:border-t-0 sm:px-4"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={15}
                strokeWidth={1.7}
                className="text-[var(--text-muted)]"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Stock baixo
              </p>
            </div>

            <p className="mt-1 text-lg font-semibold">
              {lowStockProducts.length}
            </p>

            <div className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <span>
                {lowStockProducts.length === 1
                  ? "produto"
                  : "produtos"}
              </span>

              <ArrowRight
                size={11}
                strokeWidth={1.8}
                className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            </div>
          </Link>

          <Link
            to="/stock"
            className="group border-l border-t border-[var(--border)] px-3 py-4 transition hover:bg-[var(--surface-muted)] sm:border-t-0 sm:px-4"
          >
            <div className="flex items-center gap-2">
              <Package
                size={15}
                strokeWidth={1.7}
                className="text-[var(--text-muted)]"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Esgotados
              </p>
            </div>

            <p className="mt-1 text-lg font-semibold">
              {outOfStockProducts.length}
            </p>

            <div className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <span>
                {outOfStockProducts.length === 1
                  ? "produto"
                  : "produtos"}
              </span>

              <ArrowRight
                size={11}
                strokeWidth={1.8}
                className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            </div>
          </Link>
        </section>


        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">

          <section className="overflow-hidden border-y border-[var(--border)]">

            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-medium">
                  Vendas recentes
                </h2>

              </div>

              <Link
                to="/vendas"
                className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
              >
                Ver todas...
              </Link>
            </div>

            {recentSales.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">

                <ShoppingCart
                  size={21}
                  strokeWidth={1.6}
                  className="text-[var(--text-muted)]"
                />

                <p className="mt-3 text-sm font-medium">
                  Ainda não existem vendas
                </p>

                

                <Link
                  to="/vendas"
                  className="mt-4 text-xs font-medium underline underline-offset-4 transition hover:opacity-70"
                >
                  Registar primeira venda
                </Link>
              </div>
            ) : (
              <>

                <div className="hidden sm:block">

                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-[var(--surface-soft)] px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    <span>
                      Produto
                    </span>

                    <span>
                      Hora
                    </span>

                    <span>
                      Total
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--border)]">

                    {recentSales.map(
                      (sale) => (
                        <div
                          key={sale.id}
                          className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 transition hover:bg-[var(--surface-muted)]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {sale.productName}
                            </p>

                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              {sale.quantity}{" "}
                              unidade
                              {sale.quantity !==
                              1
                                ? "s"
                                : ""}
                            </p>
                          </div>

                          <span className="text-xs text-[var(--text-muted)]">
                            {formatTime(
                              sale.createdAt,
                            )}
                          </span>

                          <span className="text-sm font-medium">
                            {formatMoney(
                              sale.total,
                            )}
                          </span>
                        </div>
                      ),
                    )}

                  </div>
                </div>


                <div className="divide-y divide-[var(--border)] sm:hidden">

                  {recentSales.map(
                    (sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between gap-4 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {sale.productName}
                          </p>

                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {sale.quantity}{" "}
                            unidade
                            {sale.quantity !==
                            1
                              ? "s"
                              : ""}

                            {" · "}

                            {formatTime(
                              sale.createdAt,
                            )}
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-medium">
                          {formatMoney(
                            sale.total,
                          )}
                        </span>
                      </div>
                    ),
                  )}

                </div>
              </>
            )}
          </section>


          <section className="overflow-hidden border-y border-[var(--border)]">

            <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">

              <div className="flex items-center gap-2">
                <CircleAlert
                  size={17}
                  strokeWidth={1.7}
                  className="text-[var(--text-muted)]"
                />

                <h2 className="text-sm font-medium">
                  Atenção
                </h2>
              </div>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Situação atual do stock.
              </p>
            </div>

            {!hasAlerts ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">

                <Package
                  size={21}
                  strokeWidth={1.6}
                  className="text-[var(--text-muted)]"
                />

                <p className="mt-3 text-sm font-medium">
                  Tudo em ordem
                </p>

                <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--text-muted)]">
                  Não existem produtos com stock baixo ou esgotados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">


                {outOfStockProducts.length >
                  0 && (
                  <Link
                    to="/stock"
                    className="block px-5 py-5 transition hover:bg-[var(--surface-muted)]"
                  >
                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">
                          <Package
                            size={15}
                            strokeWidth={1.7}
                            className="shrink-0 text-[var(--text-muted)]"
                          />

                          <p className="text-sm font-medium">
                            Produtos esgotados
                          </p>
                        </div>

                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {
                            outOfStockProducts.length
                          }{" "}
                          produto
                          {outOfStockProducts.length !==
                          1
                            ? "s"
                            : ""}{" "}
                          sem stock.
                        </p>
                      </div>

                      <ArrowRight
                        size={16}
                        strokeWidth={1.7}
                        className="mt-0.5 shrink-0 text-[var(--text-muted)]"
                      />
                    </div>
                  </Link>
                )}


                {lowStockProducts.length >
                  0 && (
                  <Link
                    to="/stock"
                    className="block px-5 py-5 transition hover:bg-[var(--surface-muted)]"
                  >
                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            size={15}
                            strokeWidth={1.7}
                            className="shrink-0 text-[var(--text-muted)]"
                          />

                          <p className="text-sm font-medium">
                            Stock baixo
                          </p>
                        </div>

                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {
                            lowStockProducts.length
                          }{" "}
                          produto
                          {lowStockProducts.length !==
                          1
                            ? "s"
                            : ""}{" "}
                          precisam de atenção.
                        </p>
                      </div>

                      <ArrowRight
                        size={16}
                        strokeWidth={1.7}
                        className="mt-0.5 shrink-0 text-[var(--text-muted)]"
                      />
                    </div>
                  </Link>
                )}

              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
import { useLiveQuery } from "dexie-react-hooks"
import {
  BarChart3,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { db } from "../db/database"

type Period = "hoje" | "7dias" | "30dias"

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "—"
  }

  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} MT`
}

function getPeriodStart(period: Period) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)

  if (period === "hoje") {
    return date
  }

  if (period === "7dias") {
    date.setDate(date.getDate() - 6)
    return date
  }

  date.setDate(date.getDate() - 29)
  return date
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "2-digit",
    month: "short",
  }).format(date)
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("pt-MZ", {
    weekday: "short",
  }).format(date)
}

function getPeriodLabel(period: Period) {
  if (period === "hoje") {
    return "Hoje"
  }

  if (period === "7dias") {
    return "Últimos 7 dias"
  }

  return "Últimos 30 dias"
}

export default function Relatorios() {
  const [period, setPeriod] = useState<Period>("7dias")

  const sales = useLiveQuery(
    () => db.sales.orderBy("createdAt").toArray(),
    [],
    [],
  )

  const products = useLiveQuery(
    () => db.products.toArray(),
    [],
    [],
  )


  const completedSales = useMemo(() => {
    return sales.filter(
      (sale) =>
        sale.status === undefined ||
        sale.status === "concluida",
    )
  }, [sales])

  const periodSales = useMemo(() => {
    const start = getPeriodStart(period)

    return completedSales.filter(
      (sale) =>
        new Date(sale.createdAt) >= start,
    )
  }, [completedSales, period])


  const cancelledSales = useMemo(() => {
    const start = getPeriodStart(period)

    return sales.filter(
      (sale) =>
        sale.status === "cancelada" &&
        new Date(sale.createdAt) >= start,
    )
  }, [sales, period])


  const revenue = periodSales.reduce(
    (sum, sale) =>
      sum +
      (Number.isFinite(sale.total)
        ? sale.total
        : 0),
    0,
  )

  const cost = periodSales.reduce(
    (sum, sale) =>
      sum +
      (Number.isFinite(sale.totalCost)
        ? sale.totalCost
        : 0),
    0,
  )

  const profit = periodSales.reduce(
    (sum, sale) =>
      sum +
      (Number.isFinite(sale.grossProfit)
        ? sale.grossProfit
        : 0),
    0,
  )

  const unitsSold = periodSales.reduce(
    (sum, sale) =>
      sum +
      (Number.isFinite(sale.quantity)
        ? sale.quantity
        : 0),
    0,
  )

  const averageTicket =
    periodSales.length > 0
      ? revenue / periodSales.length
      : 0

  const profitMargin =
    revenue > 0
      ? (profit / revenue) * 100
      : 0


  const activeProducts = products.filter(
    (product) => product.active,
  )

  const stockCost = activeProducts.reduce(
    (sum, product) =>
      sum +
      product.stock * product.purchasePrice,
    0,
  )

  const potentialRevenue =
    activeProducts.reduce(
      (sum, product) =>
        sum +
        product.stock * product.salePrice,
      0,
    )

  const potentialProfit =
    potentialRevenue - stockCost

  const normalStockProducts =
    activeProducts.filter(
      (product) =>
        product.stock > product.minimumStock,
    )

  const lowStockProducts =
    activeProducts.filter(
      (product) =>
        product.stock > 0 &&
        product.stock <= product.minimumStock,
    )

  const outOfStockProducts =
    activeProducts.filter(
      (product) => product.stock === 0,
    )


  const dailySales = useMemo(() => {
    const start = getPeriodStart(period)

    const days: {
      date: Date
      revenue: number
      profit: number
      units: number
    }[] = []

    const totalDays =
      period === "hoje"
        ? 1
        : period === "7dias"
          ? 7
          : 30

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start)

      date.setDate(
        start.getDate() + i,
      )

      days.push({
        date,
        revenue: 0,
        profit: 0,
        units: 0,
      })
    }

    periodSales.forEach((sale) => {
      const saleDate = new Date(
        sale.createdAt,
      )

      const day = days.find(
        (item) =>
          item.date.getFullYear() ===
            saleDate.getFullYear() &&
          item.date.getMonth() ===
            saleDate.getMonth() &&
          item.date.getDate() ===
            saleDate.getDate(),
      )

      if (!day) {
        return
      }

      day.revenue += Number.isFinite(
        sale.total,
      )
        ? sale.total
        : 0

      day.profit += Number.isFinite(
        sale.grossProfit,
      )
        ? sale.grossProfit
        : 0

      day.units += Number.isFinite(
        sale.quantity,
      )
        ? sale.quantity
        : 0
    })

    return days
  }, [period, periodSales])

  const topProducts = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string
        name: string
        quantity: number
        revenue: number
      }
    >()

    periodSales.forEach((sale) => {
      const existing = grouped.get(
        sale.productId,
      )

      const quantity = Number.isFinite(
        sale.quantity,
      )
        ? sale.quantity
        : 0

      const total = Number.isFinite(
        sale.total,
      )
        ? sale.total
        : 0

      if (existing) {
        existing.quantity += quantity
        existing.revenue += total
      } else {
        grouped.set(sale.productId, {
          id: sale.productId,
          name: sale.productName,
          quantity,
          revenue: total,
        })
      }
    })

    return Array.from(grouped.values())
      .sort(
        (a, b) =>
          b.quantity - a.quantity,
      )
      .slice(0, 5)
  }, [periodSales])


  const categorySales = useMemo(() => {
    const grouped = new Map<
      string,
      {
        category: string
        quantity: number
        revenue: number
      }
    >()

    periodSales.forEach((sale) => {
      const product = products.find(
        (item) =>
          item.id === sale.productId,
      )

      const category =
        product?.category?.trim() ||
        "Sem categoria"

      const quantity = Number.isFinite(
        sale.quantity,
      )
        ? sale.quantity
        : 0

      const total = Number.isFinite(
        sale.total,
      )
        ? sale.total
        : 0

      const existing =
        grouped.get(category)

      if (existing) {
        existing.quantity += quantity
        existing.revenue += total
      } else {
        grouped.set(category, {
          category,
          quantity,
          revenue: total,
        })
      }
    })

    return Array.from(grouped.values()).sort(
      (a, b) =>
        b.revenue - a.revenue,
    )
  }, [periodSales, products])


  const maxDailyRevenue = Math.max(
    ...dailySales.map(
      (day) => day.revenue,
    ),
    1,
  )

  const maxDailyProfit = Math.max(
    ...dailySales.map(
      (day) => day.profit,
    ),
    1,
  )

  const maxProductQuantity = Math.max(
    ...topProducts.map(
      (product) => product.quantity,
    ),
    1,
  )

  const maxCategoryRevenue = Math.max(
    ...categorySales.map(
      (category) => category.revenue,
    ),
    1,
  )

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-10 lg:px-10">

        <header className="mb-6">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-3xl">
                RELATÓRIOS
              </h1>

            </div>

            <BarChart3
              size={21}
              strokeWidth={1.7}
              className="shrink-0 text-[var(--text-muted)]"
            />
          </div>
        </header>


        <section className="mb-5">
          <div className="flex overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
            {(
              [
                ["hoje", "Hoje"],
                ["7dias", "7 dias"],
                ["30dias", "30 dias"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setPeriod(value)
                }
                className={`h-9 flex-1 rounded-md px-3 text-xs font-medium transition ${
                  period === value
                    ? "bg-[var(--button-bg)] text-[var(--button-text)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>


        <section className="mb-6 grid grid-cols-2 border-y border-[var(--border)] sm:grid-cols-5">

          <div className="px-3 py-4 sm:px-4">
            <div className="flex items-center gap-2">
              <ShoppingCart
                size={15}
                className="text-[var(--text-muted)]"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Receita
              </p>
            </div>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(revenue)}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {periodSales.length}{" "}
              {periodSales.length === 1
                ? "venda"
                : "vendas"}
            </p>
          </div>


          <div className="border-l border-[var(--border)] px-3 py-4 sm:px-4">
            <div className="flex items-center gap-2">
              <TrendingUp
                size={15}
                className="text-[var(--text-muted)]"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Lucro bruto
              </p>
            </div>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(profit)}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              margem {profitMargin.toFixed(1)}%
            </p>
          </div>

          <div className="border-t border-[var(--border)] px-3 py-4 sm:border-l sm:border-t-0 sm:px-4">
            <div className="flex items-center gap-2">
              <Package
                size={15}
                className="text-[var(--text-muted)]"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Unidades
              </p>
            </div>

            <p className="mt-1 text-lg font-semibold">
              {unitsSold}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              vendidas
            </p>
          </div>

          <div className="border-l border-t border-[var(--border)] px-3 py-4 sm:border-t-0 sm:px-4">
            <div className="flex items-center gap-2">
              <BarChart3
                size={15}
                className="text-[var(--text-muted)]"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Ticket médio
              </p>
            </div>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(averageTicket)}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              por venda
            </p>
          </div>

          <div className="border-t border-[var(--border)] px-3 py-4 sm:border-l sm:border-t-0 sm:px-4">
            <div className="flex items-center gap-2">
              <ShoppingCart
                size={15}
                className="text-[var(--text-muted)]"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Canceladas
              </p>
            </div>

            <p className="mt-1 text-lg font-semibold">
              {cancelledSales.length}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              no período
            </p>
          </div>
        </section>

        <section className="mb-6 overflow-hidden border-y border-[var(--border)]">

          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-medium">
                Receita por dia
              </h2>

              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Evolução da receita em{" "}
                {getPeriodLabel(period).toLowerCase()}.
              </p>
            </div>

            <span className="text-sm font-semibold">
              {formatMoney(revenue)}
            </span>
          </div>

          <div className="px-4 pb-5 pt-6 sm:px-5">
            {periodSales.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-center">
                <div>
                  <BarChart3
                    size={22}
                    className="mx-auto text-[var(--text-muted)]"
                    strokeWidth={1.7}
                  />

                  <p className="mt-3 text-sm font-medium">
                    Sem vendas
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Não existem vendas neste período.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">

                <div className="pointer-events-none absolute inset-x-0 top-0 h-48">
                  <div className="absolute inset-x-0 top-0 border-t border-[var(--border)]" />

                  <div className="absolute inset-x-0 top-1/3 border-t border-[var(--border)]" />

                  <div className="absolute inset-x-0 top-2/3 border-t border-[var(--border)]" />

                  <div className="absolute inset-x-0 bottom-0 border-t border-[var(--border)]" />
                </div>

                <div className="relative h-64 overflow-x-auto">
                  <div
                    className={`relative h-48 ${
                      period === "30dias"
                        ? "min-w-[720px]"
                        : "min-w-full"
                    }`}
                  >
                    <svg
                      viewBox="0 0 1000 240"
                      preserveAspectRatio="none"
                      className="absolute inset-0 h-full w-full overflow-visible"
                    >

                      <path
                        d={(() => {
                          const points =
                            dailySales.map(
                              (day, index) => {
                                const x =
                                  dailySales.length ===
                                  1
                                    ? 500
                                    : (index /
                                        (dailySales.length -
                                          1)) *
                                      1000

                                const y =
                                  220 -
                                  (day.revenue /
                                    maxDailyRevenue) *
                                    190

                                return `${x},${y}`
                              },
                            )

                          if (
                            points.length === 0
                          ) {
                            return ""
                          }

                          return `M ${points[0]} L ${points
                            .slice(1)
                            .join(
                              " L ",
                            )} L 1000,220 L 0,220 Z`
                        })()}
                        fill="currentColor"
                        className="text-[var(--primary)]"
                        opacity="0.15"
                      />


                      <polyline
                        points={dailySales
                          .map(
                            (day, index) => {
                              const x =
                                dailySales.length ===
                                1
                                  ? 500
                                  : (index /
                                      (dailySales.length -
                                        1)) *
                                    1000

                              const y =
                                220 -
                                (day.revenue /
                                  maxDailyRevenue) *
                                  190

                              return `${x},${y}`
                            },
                          )
                          .join(" ")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className="text-[var(--primary)]"
                      />


                      {dailySales.map(
                        (day, index) => {
                          const x =
                            dailySales.length ===
                            1
                              ? 500
                              : (index /
                                  (dailySales.length -
                                    1)) *
                                1000

                          const y =
                            220 -
                            (day.revenue /
                              maxDailyRevenue) *
                              190

                          return (
                            <circle
                              key={day.date.toISOString()}
                              cx={x}
                              cy={y}
                              r="5"
                              fill="currentColor"
                              className="text-[var(--primary)]"
                            />
                          )
                        },
                      )}
                    </svg>


                    <div className="absolute inset-x-0 top-0 flex h-48 justify-between">
                      {dailySales.map(
                        (day) => (
                          <div
                            key={day.date.toISOString()}
                            className="relative flex h-full flex-1 justify-center"
                          >
                            {day.revenue > 0 && (
                              <div
                                className="absolute -translate-y-5 whitespace-nowrap text-[10px] font-medium text-[var(--text-secondary)]"
                                style={{
                                  top: `${Math.max(
                                    0,
                                    100 -
                                      (day.revenue /
                                        maxDailyRevenue) *
                                        79,
                                  )}%`,
                                }}
                              >
                                {formatMoney(
                                  day.revenue,
                                )}
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>


                  <div
                    className={`mt-2 flex ${
                      period === "30dias"
                        ? "min-w-[720px]"
                        : "min-w-full"
                    }`}
                  >
                    {dailySales.map(
                      (day) => (
                        <div
                          key={day.date.toISOString()}
                          className="flex flex-1 justify-center text-[10px] text-[var(--text-muted)]"
                        >
                          {period ===
                          "30dias"
                            ? `${day.date.getDate()}/${day.date.getMonth() + 1}`
                            : period ===
                                "7dias"
                              ? formatDay(
                                  day.date,
                                )
                              : formatShortDate(
                                  day.date,
                                )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>


        <section className="mb-6 grid gap-6 lg:grid-cols-2">

          {/* LUCRO */}

          <section className="overflow-hidden border-y border-[var(--border)]">

            <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <h2 className="text-sm font-medium">
                Lucro bruto por dia
              </h2>

            </div>

            <div className="divide-y divide-[var(--border)]">
              {dailySales.map(
                (day) => {
                  const width =
                    day.profit > 0
                      ? (day.profit /
                          maxDailyProfit) *
                        100
                      : 0

                  return (
                    <div
                      key={day.date.toISOString()}
                      className="px-4 py-3.5 sm:px-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatShortDate(
                            day.date,
                          )}
                        </span>

                        <span className="text-xs font-medium">
                          {formatMoney(
                            day.profit,
                          )}
                        </span>
                      </div>

                      <div className="mt-2 h-1 overflow-hidden bg-[var(--surface-muted)]">
                        <div
                          className="h-full bg-[var(--primary)] transition-all"
                          style={{
                            width: `${width}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </section>


          <section className="overflow-hidden border-y border-[var(--border)]">

            <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <h2 className="text-sm font-medium">
                Produtos mais vendidos
              </h2>

            </div>

            {topProducts.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Package
                  size={20}
                  className="mx-auto text-[var(--text-muted)]"
                  strokeWidth={1.7}
                />

                <p className="mt-3 text-sm font-medium">
                  Nenhuma venda
                </p>

                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Não existem vendas neste período.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {topProducts.map(
                  (product, index) => {
                    const width =
                      (product.quantity /
                        maxProductQuantity) *
                      100

                    return (
                      <div
                        key={product.id}
                        className="px-4 py-4 sm:px-5"
                      >
                        <div className="flex items-center gap-3">

                          <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text-secondary)]">
                            {index + 1}
                          </span>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-medium">
                                {product.name}
                              </p>

                              <span className="shrink-0 text-xs font-semibold">
                                {product.quantity}{" "}
                                un.
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden bg-[var(--surface-muted)]">
                              <div
                                className="h-full bg-[var(--primary)] transition-all"
                                style={{
                                  width: `${width}%`,
                                }}
                              />
                            </div>

                            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                              {formatMoney(
                                product.revenue,
                              )}{" "}
                              em vendas
                            </p>

                          </div>
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            )}
          </section>
        </section>


        <section className="mb-6 overflow-hidden border-y border-[var(--border)]">

          <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
            <h2 className="text-sm font-medium">
              Vendas por categoria
            </h2>

          </div>

          {categorySales.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <BarChart3
                size={20}
                className="mx-auto text-[var(--text-muted)]"
                strokeWidth={1.7}
              />

              <p className="mt-3 text-sm font-medium">
                Nenhuma venda
              </p>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Não existem vendas neste período.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {categorySales.map(
                (category) => {
                  const width =
                    (category.revenue /
                      maxCategoryRevenue) *
                    100

                  return (
                    <div
                      key={category.category}
                      className="px-4 py-4 sm:px-5"
                    >
                      <div className="flex items-center justify-between gap-4">

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {category.category}
                          </p>

                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            {category.quantity}{" "}
                            unidade(s)
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-semibold">
                          {formatMoney(
                            category.revenue,
                          )}
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden bg-[var(--surface-muted)]">
                        <div
                          className="h-full bg-[var(--primary)] transition-all"
                          style={{
                            width: `${width}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          )}
        </section>


        <section className="mb-6 grid gap-6 lg:grid-cols-2">

          <section className="overflow-hidden border-y border-[var(--border)]">

            <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <h2 className="text-sm font-medium">
                Resumo financeiro
              </h2>

              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {getPeriodLabel(period)}
              </p>
            </div>

            <div className="divide-y divide-[var(--border)]">

              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <span className="text-sm text-[var(--text-muted)]">
                  Receita
                </span>

                <span className="text-sm font-semibold">
                  {formatMoney(revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <span className="text-sm text-[var(--text-muted)]">
                  Custo dos produtos
                </span>

                <span className="text-sm font-semibold">
                  {formatMoney(cost)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <span className="text-sm font-medium">
                  Lucro bruto
                </span>

                <span className="text-sm font-semibold">
                  {formatMoney(profit)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <span className="text-sm text-[var(--text-muted)]">
                  Margem
                </span>

                <span className="text-sm font-semibold">
                  {profitMargin.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <span className="text-sm text-[var(--text-muted)]">
                  Vendas canceladas
                </span>

                <span className="text-sm font-semibold">
                  {cancelledSales.length}
                </span>
              </div>

            </div>
          </section>

          {/* STOCK */}

          <section className="overflow-hidden border-y border-[var(--border)]">

            <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <h2 className="text-sm font-medium">
                Estado do stock
              </h2>

              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Produtos ativos.
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-[var(--border)]">

              <div className="px-3 py-4 sm:px-5">
                <p className="text-xs text-[var(--text-muted)]">
                  Normal
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {normalStockProducts.length}
                </p>
              </div>

              <div className="px-3 py-4 sm:px-5">
                <p className="text-xs text-[var(--text-muted)]">
                  Baixo
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {lowStockProducts.length}
                </p>
              </div>

              <div className="px-3 py-4 sm:px-5">
                <p className="text-xs text-[var(--text-muted)]">
                  Esgotado
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {outOfStockProducts.length}
                </p>
              </div>

            </div>

            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">

              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <span className="text-sm text-[var(--text-muted)]">
                  Valor ao custo
                </span>

                <span className="text-sm font-semibold">
                  {formatMoney(stockCost)}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <span className="text-sm text-[var(--text-muted)]">
                  Venda potencial
                </span>

                <span className="text-sm font-semibold">
                  {formatMoney(
                    potentialRevenue,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <span className="text-sm font-medium">
                  Lucro potencial
                </span>

                <span className="text-sm font-semibold">
                  {formatMoney(
                    potentialProfit,
                  )}
                </span>
              </div>

            </div>
          </section>
        </section>


        <div className="flex justify-end border-t border-[var(--border)] pt-4">
          <Link
            to="/stock"
            className="text-sm font-medium underline underline-offset-4 transition hover:opacity-70"
          >
            Ver gestão de stock →
          </Link>
        </div>
      </div>
    </main>
  )
}
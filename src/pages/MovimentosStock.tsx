import { useMemo, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  ArrowDownToLine,
  ArrowUpDown,
  ChevronRight,
  Clock3,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react"
import {
  db,
  type StockAdjustmentReason,
  type StockMovementType,
} from "../db/database"

type Period = "hoje" | "7dias" | "30dias" | "todos"

type TypeFilter =
  | "todos"
  | "entrada"
  | "venda"
  | "ajuste"

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

function isWithinPeriod(date: string, period: Period) {
  if (period === "todos") {
    return true
  }

  const now = new Date()
  const target = new Date(date)

  if (period === "hoje") {
    return (
      now.getFullYear() === target.getFullYear() &&
      now.getMonth() === target.getMonth() &&
      now.getDate() === target.getDate()
    )
  }

  const days = period === "7dias" ? 7 : 30

  const limit = new Date()
  limit.setDate(limit.getDate() - days)

  return target >= limit
}

function getMovementLabel(type: StockMovementType) {
  switch (type) {
    case "entrada":
      return "Entrada"
    case "venda":
      return "Venda"
    case "ajuste":
      return "Ajuste"
    default:
      return "Movimento"
  }
}

function getMovementIcon(type: StockMovementType) {
  switch (type) {
    case "entrada":
      return ArrowDownToLine
    case "venda":
      return ShoppingCart
    case "ajuste":
      return SlidersHorizontal
  }
}

function getMovementClass(type: StockMovementType) {
  switch (type) {
    case "entrada":
      return "bg-black text-white"
    case "venda":
      return "bg-neutral-100 text-neutral-700"
    case "ajuste":
      return "bg-neutral-100 text-neutral-500"
  }
}

function getQuantityPrefix(type: StockMovementType) {
  return type === "venda" ? "-" : "+"
}

function getReasonLabel(reason?: StockAdjustmentReason) {
  switch (reason) {
    case "correcao_contagem":
      return "Correção de contagem"
    case "perda_quebra":
      return "Perda / quebra"
    case "devolucao_cliente":
      return "Devolução do cliente"
    case "erro_registo":
      return "Erro de registo"
    case "outro":
      return "Outro"
    default:
      return "—"
  }
}

export default function MovimentosStock() {
  const movements = useLiveQuery(
    () =>
      db.stockMovements
        .orderBy("createdAt")
        .reverse()
        .toArray(),
    [],
    [],
  )

  const products = useLiveQuery(
    () => db.products.toArray(),
    [],
    [],
  )

  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<Period>("hoje")
  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>("todos")

  const [selectedMovementId, setSelectedMovementId] =
    useState<string | null>(null)

  const productMap = useMemo(() => {
    return new Map(
      products.map((product) => [product.id, product]),
    )
  }, [products])

  const filteredMovements = useMemo(() => {
    const term = search.trim().toLowerCase()

    return movements.filter((movement) => {
      const product = productMap.get(movement.productId)

      const productName =
        product?.name ?? "Produto removido"

      const matchesSearch =
        !term ||
        productName.toLowerCase().includes(term) ||
        movement.note.toLowerCase().includes(term)

      const matchesPeriod = isWithinPeriod(
        movement.createdAt,
        period,
      )

      const matchesType =
        typeFilter === "todos" ||
        movement.type === typeFilter

      return (
        matchesSearch &&
        matchesPeriod &&
        matchesType
      )
    })
  }, [
    movements,
    productMap,
    search,
    period,
    typeFilter,
  ])

  const totalMovements = filteredMovements.length

  const totalEntries = filteredMovements.filter(
    (movement) => movement.type === "entrada",
  ).length

  const totalSales = filteredMovements.filter(
    (movement) => movement.type === "venda",
  ).length

  const totalAdjustments = filteredMovements.filter(
    (movement) => movement.type === "ajuste",
  ).length

  const selectedMovement = movements.find(
    (movement) => movement.id === selectedMovementId,
  )

  const selectedProduct = selectedMovement
    ? productMap.get(selectedMovement.productId)
    : undefined

  return (
    <div className="space-y-5 pb-28 md:pb-8">
      {/* HEADER */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
            Stock
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-black">
            Movimentos de Stock
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Consulta o histórico de alterações do stock.
          </p>
        </div>
      </section>

      {/* RESUMO */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">
            Movimentos
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
            {totalMovements}
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            no período selecionado
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">
            Entradas
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
            {totalEntries}
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            reposições de stock
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">
            Vendas
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
            {totalSales}
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            saídas por venda
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">
            Ajustes
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-black">
            {totalAdjustments}
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            alterações manuais
          </p>
        </div>
      </section>

      {/* FILTROS */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Pesquisar por produto..."
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-3 text-sm text-black outline-none transition focus:border-black"
            />
          </div>

          <div className="flex overflow-x-auto rounded-lg border border-neutral-200 bg-white p-1">
            {[
              ["hoje", "Hoje"],
              ["7dias", "7 dias"],
              ["30dias", "30 dias"],
              ["todos", "Tudo"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setPeriod(value as Period)
                }
                className={`h-8 shrink-0 rounded-md px-3 text-xs font-medium transition ${
                  period === value
                    ? "bg-black text-white"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex overflow-x-auto rounded-lg border border-neutral-200 bg-white p-1 sm:w-fit">
          {[
            ["todos", "Todos"],
            ["entrada", "Entradas"],
            ["venda", "Vendas"],
            ["ajuste", "Ajustes"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setTypeFilter(value as TypeFilter)
              }
              className={`h-8 shrink-0 rounded-md px-4 text-xs font-medium transition ${
                typeFilter === value
                  ? "bg-black text-white"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* HISTÓRICO */}
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div>
            <h2 className="font-medium text-black">
              Histórico
            </h2>

            <p className="mt-0.5 text-xs text-neutral-400">
              {filteredMovements.length}{" "}
              {filteredMovements.length === 1
                ? "movimento"
                : "movimentos"}
            </p>
          </div>

          <ArrowUpDown
            size={17}
            className="text-neutral-400"
          />
        </div>

        {filteredMovements.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100">
              <ArrowUpDown
                size={19}
                className="text-neutral-500"
              />
            </div>

            <h3 className="mt-4 text-sm font-medium text-black">
              Nenhum movimento encontrado
            </h3>

            <p className="mt-1 max-w-xs text-sm text-neutral-500">
              As alterações de stock aparecerão aqui.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
                    <th className="px-4 py-3 font-medium">
                      Produto
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Tipo
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Quantidade
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Stock
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Motivo
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Data
                    </th>

                    <th />
                  </tr>
                </thead>

                <tbody>
                  {filteredMovements.map(
                    (movement) => {
                      const product = productMap.get(
                        movement.productId,
                      )

                      const MovementIcon =
                        getMovementIcon(
                          movement.type,
                        )

                      return (
                        <tr
                          key={movement.id}
                          onClick={() =>
                            setSelectedMovementId(
                              movement.id,
                            )
                          }
                          className="cursor-pointer border-b border-neutral-100 transition hover:bg-neutral-50 last:border-0"
                        >
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-medium text-black">
                              {product?.name ??
                                "Produto removido"}
                            </p>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                              <MovementIcon size={14} />
                              {getMovementLabel(
                                movement.type,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-sm font-semibold text-black">
                              {getQuantityPrefix(
                                movement.type,
                              )}
                              {movement.quantity} un.
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-sm text-neutral-600">
                            {movement.stockBefore} →{" "}
                            {movement.stockAfter}
                          </td>

                          <td className="max-w-48 px-4 py-3.5 text-sm text-neutral-500">
                            {movement.type ===
                            "ajuste"
                              ? getReasonLabel(
                                  movement.reason,
                                )
                              : "—"}
                          </td>

                          <td className="px-4 py-3.5 text-sm text-neutral-500">
                            {formatDate(
                              movement.createdAt,
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <ChevronRight
                              size={16}
                              className="text-neutral-300"
                            />
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}
            <div className="divide-y divide-neutral-100 md:hidden">
              {filteredMovements.map(
                (movement) => {
                  const product = productMap.get(
                    movement.productId,
                  )

                  const MovementIcon =
                    getMovementIcon(
                      movement.type,
                    )

                  return (
                    <button
                      key={movement.id}
                      type="button"
                      onClick={() =>
                        setSelectedMovementId(
                          movement.id,
                        )
                      }
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-neutral-50"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getMovementClass(
                          movement.type,
                        )}`}
                      >
                        <MovementIcon size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-black">
                          {product?.name ??
                            "Produto removido"}
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-neutral-500">
                            {getMovementLabel(
                              movement.type,
                            )}
                          </span>

                          <span className="text-xs font-medium text-black">
                            {getQuantityPrefix(
                              movement.type,
                            )}
                            {movement.quantity} un.
                          </span>
                        </div>

                        <p className="mt-1 text-[11px] text-neutral-400">
                          Stock:{" "}
                          {movement.stockBefore} →{" "}
                          {movement.stockAfter}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-[11px] text-neutral-400">
                          {formatDate(
                            movement.createdAt,
                          )}
                        </p>

                        <ChevronRight
                          size={16}
                          className="text-neutral-300"
                        />
                      </div>
                    </button>
                  )
                },
              )}
            </div>
          </>
        )}
      </section>

      {/* DETALHES */}
      {selectedMovement && (
        <div className="fixed inset-0 z-[11000] bg-black/60 backdrop-blur-[2px]">
          <div className="flex h-[100dvh] w-full items-stretch justify-center sm:items-center sm:p-5">
            <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[90dvh] sm:max-w-md sm:rounded-xl sm:border sm:border-neutral-200 sm:shadow-2xl">
              {/* HEADER */}
              <div className="flex shrink-0 items-start justify-between border-b border-neutral-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
                    Movimento
                  </p>

                  <h2 className="mt-1 truncate text-lg font-semibold text-black">
                    {selectedProduct?.name ??
                      "Produto removido"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedMovementId(null)
                  }
                  className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
                >
                  <X size={18} />
                </button>
              </div>

              {/* CONTEÚDO */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getMovementClass(
                        selectedMovement.type,
                      )}`}
                    >
                      {(() => {
                        const Icon =
                          getMovementIcon(
                            selectedMovement.type,
                          )

                        return <Icon size={18} />
                      })()}
                    </div>

                    <div>
                      <p className="text-xs text-neutral-500">
                        Tipo de movimento
                      </p>

                      <p className="mt-0.5 text-sm font-medium text-black">
                        {getMovementLabel(
                          selectedMovement.type,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between gap-4">
                        <span className="text-sm text-neutral-500">
                          Quantidade
                        </span>

                        <span className="text-sm font-semibold text-black">
                          {getQuantityPrefix(
                            selectedMovement.type,
                          )}
                          {selectedMovement.quantity} un.
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-sm text-neutral-500">
                          Stock antes
                        </span>

                        <span className="text-sm font-medium text-black">
                          {selectedMovement.stockBefore} un.
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-sm text-neutral-500">
                          Stock depois
                        </span>

                        <span className="text-sm font-medium text-black">
                          {selectedMovement.stockAfter} un.
                        </span>
                      </div>

                      {selectedMovement.type ===
                        "ajuste" && (
                        <div className="border-t border-neutral-100 pt-4">
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-neutral-500">
                              Motivo
                            </span>

                            <span className="text-right text-sm font-medium text-black">
                              {getReasonLabel(
                                selectedMovement.reason,
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-4">
                    <div className="flex items-start gap-3">
                      <Clock3
                        size={17}
                        className="mt-0.5 shrink-0 text-neutral-500"
                      />

                      <div className="min-w-0">
                        <p className="text-xs text-neutral-500">
                          Registado em
                        </p>

                        <p className="mt-0.5 text-sm font-medium text-black">
                          {formatDate(
                            selectedMovement.createdAt,
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedMovement.note && (
                      <div className="mt-4 border-t border-neutral-100 pt-4">
                        <p className="text-xs text-neutral-500">
                          Observação
                        </p>

                        <p className="mt-1 text-sm leading-5 text-neutral-700">
                          {selectedMovement.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div
                className="shrink-0 border-t border-neutral-100 bg-white p-3 sm:p-4"
                style={{
                  paddingBottom:
                    "max(0.75rem, env(safe-area-inset-bottom))",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMovementId(null)
                  }
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-black text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-[0.99]"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useLiveQuery } from "dexie-react-hooks"
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Banknote,
  Check,
  ShoppingCart,
  Smartphone,
  Trash2,
  Wallet,
  X,
  AlertCircle,
} from "lucide-react"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  db,
  type CashMovement,
  type PaymentMethod,
} from "../db/database"

type Period = "hoje" | "7dias" | "30dias" | "todos"
type TypeFilter =
  | "todos"
  | "vendas"
  | "entradas"
  | "saidas"
  | "transferencias"

type Mode = "entrada" | "saida" | "transferencia"

const METHODS: {
  value: PaymentMethod
  label: string
  icon: typeof Banknote
}[] = [
  {
    value: "dinheiro",
    label: "Dinheiro",
    icon: Banknote,
  },
  {
    value: "mpesa",
    label: "M-Pesa",
    icon: Smartphone,
  },
  {
    value: "emola",
    label: "e-Mola",
    icon: Smartphone,
  },
  {
    value: "banco",
    label: "Banco",
    icon: Banknote,
  },
]

const WITHDRAWAL = "Retirada pessoal"

const EXPENSE_REASONS = [
  "Transporte",
  "Alimentação",
  "Compras para a loja",
  "Pagamento",
  "Entrega",
  "Embalagens",
  "Internet/telefone",
  "Manutenção",
  WITHDRAWAL,
  "Outros",
]

const INCOME_REASONS = [
  "Reposição de caixa",
  "Saldo inicial",
  "Dinheiro pessoal",
  "Outros",
]

const PERIODS: [Period, string][] = [
  ["hoje", "Hoje"],
  ["7dias", "7 dias"],
  ["30dias", "30 dias"],
  ["todos", "Tudo"],
]

const TYPE_FILTERS: [TypeFilter, string][] = [
  ["todos", "Todos"],
  ["vendas", "Vendas"],
  ["entradas", "Entradas"],
  ["saidas", "Saídas"],
  ["transferencias", "Transf."],
]

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "—"

  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} MT`
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${hours % 12 || 12}:${minutes} ${
    hours >= 12 ? "PM" : "AM"
  }`
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatDayLabel(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date()

  yesterday.setDate(today.getDate() - 1)

  if (dayKey(date) === dayKey(today)) return "Hoje"
  if (dayKey(date) === dayKey(yesterday)) return "Ontem"

  return new Intl.DateTimeFormat("pt-MZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function getPeriodStart(period: Period) {
  if (period === "todos") return null

  const date = new Date()
  date.setHours(0, 0, 0, 0)

  if (period === "7dias") {
    date.setDate(date.getDate() - 6)
  }

  if (period === "30dias") {
    date.setDate(date.getDate() - 29)
  }

  return date
}

function getPeriodLabel(period: Period) {
  if (period === "hoje") return "Hoje"
  if (period === "7dias") return "Últimos 7 dias"
  if (period === "30dias") return "Últimos 30 dias"

  return "Todos os períodos"
}

function methodLabel(method: PaymentMethod) {
  return METHODS.find((item) => item.value === method)?.label ?? method
}

function safeNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

type Entry = {
  id: string
  kind: "venda" | "entrada" | "saida" | "transferencia"
  label: string
  method: PaymentMethod
  toMethod?: PaymentMethod
  amount: number
  createdAt: string
  note: string
  manual: boolean
}

export default function Caixa() {
  const sales = useLiveQuery(
    () => db.sales.toArray(),
    [],
    [],
  )

  const movements = useLiveQuery(
    () => db.cashMovements.toArray(),
    [],
    [] as CashMovement[],
  )

  const [period, setPeriod] = useState<Period>("hoje")
  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>("todos")

  const [mode, setMode] = useState<Mode | null>(null)

  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState(
    EXPENSE_REASONS[0],
  )

  const [method, setMethod] =
    useState<PaymentMethod>("dinheiro")

  const [toMethod, setToMethod] =
    useState<PaymentMethod>("mpesa")

  const [note, setNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const [countedCash, setCountedCash] = useState("")

  const [toast, setToast] = useState<{
    type: "ok" | "error"
    text: string
  } | null>(null)

  useEffect(() => {
    if (!mode) return

    const previous = document.body.style.overflow

    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previous
    }
  }, [mode])

  function notify(
    type: "ok" | "error",
    text: string,
  ) {
    setToast({
      type,
      text,
    })

    window.setTimeout(() => {
      setToast(null)
    }, 3000)
  }


  const completedSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          sale.status === undefined ||
          sale.status === "concluida",
      ),
    [sales],
  )


  const balances = useMemo(() => {
    const result: Record<
      PaymentMethod,
      number
    > = {
      dinheiro: 0,
      mpesa: 0,
      emola: 0,
      banco: 0,
    }

    for (const sale of completedSales) {
      const saleMethod =
        (sale.paymentMethod ??
          "dinheiro") as PaymentMethod

      if (result[saleMethod] !== undefined) {
        result[saleMethod] += safeNumber(
          sale.total,
        )
      }
    }

    for (const item of movements) {
      const value = safeNumber(item.amount)

      if (item.type === "entrada") {
        result[item.method] += value
      }

      if (item.type === "saida") {
        result[item.method] -= value
      }

      if (
        item.type === "transferencia" &&
        item.toMethod
      ) {
        result[item.method] -= value
        result[item.toMethod] += value
      }
    }

    return result
  }, [completedSales, movements])

  const totalBalance =
    Object.values(balances).reduce(
      (sum, value) => sum + value,
      0,
    )


  const entries = useMemo<Entry[]>(() => {
    const fromSales: Entry[] =
      completedSales.map((sale) => ({
        id: `sale-${sale.id}`,
        kind: "venda",
        label: `Venda · ${sale.productName}`,
        method: (sale.paymentMethod ??
          "dinheiro") as PaymentMethod,
        amount: safeNumber(sale.total),
        createdAt: sale.createdAt,
        note: "",
        manual: false,
      }))

    const fromMovements: Entry[] =
      movements.map((item) => ({
        id: item.id,
        kind: item.type,
        label: item.reason,
        method: item.method,
        toMethod: item.toMethod,
        amount: safeNumber(item.amount),
        createdAt: item.createdAt,
        note: item.note,
        manual: true,
      }))

    return [
      ...fromSales,
      ...fromMovements,
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
  }, [completedSales, movements])

  const periodEntries = useMemo(() => {
    const start = getPeriodStart(period)

    if (!start) return entries

    return entries.filter(
      (entry) =>
        new Date(entry.createdAt) >= start,
    )
  }, [entries, period])

  const salesIn = periodEntries
    .filter(
      (entry) => entry.kind === "venda",
    )
    .reduce(
      (sum, entry) => sum + entry.amount,
      0,
    )

  const manualIn = periodEntries
    .filter(
      (entry) => entry.kind === "entrada",
    )
    .reduce(
      (sum, entry) => sum + entry.amount,
      0,
    )

  const withdrawals = periodEntries
    .filter(
      (entry) =>
        entry.kind === "saida" &&
        entry.label === WITHDRAWAL,
    )
    .reduce(
      (sum, entry) => sum + entry.amount,
      0,
    )

  const expenses = periodEntries
    .filter(
      (entry) =>
        entry.kind === "saida" &&
        entry.label !== WITHDRAWAL,
    )
    .reduce(
      (sum, entry) => sum + entry.amount,
      0,
    )

  const totalIn = salesIn + manualIn
  const totalOut = expenses + withdrawals

  const expensePercent =
    salesIn > 0
      ? `${(
          (expenses / salesIn) *
          100
        ).toFixed(1)}%`
      : "-"

  const expensesByReason = useMemo(() => {
    const grouped = new Map<
      string,
      number
    >()

    for (const entry of periodEntries) {
      if (
        entry.kind !== "saida" ||
        entry.label === WITHDRAWAL
      ) {
        continue
      }

      grouped.set(
        entry.label,
        (grouped.get(entry.label) ?? 0) +
          entry.amount,
      )
    }

    return Array.from(grouped.entries())
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort(
        (a, b) => b.value - a.value,
      )
  }, [periodEntries])

  const maxExpense = Math.max(
    ...expensesByReason.map(
      (item) => item.value,
    ),
    1,
  )

  const visibleEntries = useMemo(() => {
    return periodEntries.filter(
      (entry) => {
        if (typeFilter === "todos") {
          return true
        }

        if (typeFilter === "vendas") {
          return entry.kind === "venda"
        }

        if (typeFilter === "entradas") {
          return entry.kind === "entrada"
        }

        if (typeFilter === "saidas") {
          return entry.kind === "saida"
        }

        return entry.kind === "transferencia"
      },
    )
  }, [periodEntries, typeFilter])

  const groupedEntries = useMemo(() => {
    const groups: {
      label: string
      items: Entry[]
    }[] = []

    for (const entry of visibleEntries) {
      const label = formatDayLabel(
        entry.createdAt,
      )

      const last =
        groups[groups.length - 1]

      if (
        last &&
        last.label === label
      ) {
        last.items.push(entry)
      } else {
        groups.push({
          label,
          items: [entry],
        })
      }
    }

    return groups
  }, [visibleEntries])


  const counted = Number(
    countedCash.replace(",", "."),
  )

  const cashDifference =
    countedCash.trim() !== "" &&
    Number.isFinite(counted)
      ? counted - balances.dinheiro
      : null

  function openModal(nextMode: Mode) {
    setMode(nextMode)
    setAmount("")
    setNote("")
    setFormError("")
    setMethod("dinheiro")
    setToMethod("mpesa")

    setReason(
      nextMode === "saida"
        ? EXPENSE_REASONS[0]
        : nextMode === "entrada"
          ? INCOME_REASONS[0]
          : "Transferência",
    )
  }

  function closeModal() {
    if (isSaving) return

    setMode(null)
  }

  async function saveMovement(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!mode || isSaving) return

    const value = Number(
      amount.replace(",", "."),
    )

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setFormError(
        "Indica um valor válido.",
      )
      return
    }

    if (
      mode === "transferencia" &&
      method === toMethod
    ) {
      setFormError(
        "Escolhe duas formas diferentes.",
      )
      return
    }


    if (
      mode !== "entrada" &&
      value > balances[method]
    ) {
      const proceed = window.confirm(
        `O saldo de ${methodLabel(
          method,
        )} (${formatMoney(
          balances[method],
        )}) é menor que ${formatMoney(
          value,
        )}.\n\nO saldo vai ficar negativo. Continuar?`,
      )

      if (!proceed) return
    }

    setFormError("")
    setIsSaving(true)

    try {
      await db.cashMovements.add({
        id: createId(),
        type: mode,
        amount: value,
        reason:
          mode === "transferencia"
            ? "Transferência"
            : reason,
        method,
        toMethod:
          mode === "transferencia"
            ? toMethod
            : undefined,
        note: note.trim(),
        createdAt:
          new Date().toISOString(),
      })

      setMode(null)

      notify(
        "ok",
        mode === "saida"
          ? "Saída registada."
          : mode === "entrada"
            ? "Entrada registada."
            : "Transferência registada.",
      )
    } catch (error) {
      console.error(
        "Erro ao registar movimento:",
        error,
      )

      setFormError(
        "Não foi possível registar. Tenta novamente.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function removeMovement(
    entry: Entry,
  ) {
    const confirmed = window.confirm(
      `Anular "${entry.label}" de ${formatMoney(
        entry.amount,
      )}?\n\nO saldo será recalculado.`,
    )

    if (!confirmed) return

    try {
      await db.cashMovements.delete(
        entry.id,
      )

      notify(
        "ok",
        "Movimento anulado.",
      )
    } catch (error) {
      console.error(
        "Erro ao anular movimento:",
        error,
      )

      notify(
        "error",
        "Não foi possível anular.",
      )
    }
  }


  const fieldClass =
    "h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"

  const segmentClass = (
    active: boolean,
  ) =>
    `h-8 rounded-md px-3 text-xs font-medium transition ${
      active
        ? "bg-[var(--button-bg)] text-[var(--button-text)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
    }`

  const reasons =
    mode === "entrada"
      ? INCOME_REASONS
      : EXPENSE_REASONS


  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-10 lg:px-10">

 

        <header className="mb-5">
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-3xl">
            CAIXA
          </h1>

        </header>

        <section className="mb-5 grid grid-cols-3 gap-2 sm:flex">
          <button
            type="button"
            onClick={() =>
              openModal("saida")
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--button-bg)] px-4 text-sm font-semibold text-[var(--button-text)] transition hover:bg-[var(--button-bg-hover)] active:opacity-80"
          >
            <ArrowUpFromLine size={17} />
            Saída
          </button>

          <button
            type="button"
            onClick={() =>
              openModal("entrada")
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium transition hover:border-[var(--primary)] hover:text-[var(--primary)] active:opacity-80"
          >
            <ArrowDownToLine size={17} />
            Entrada
          </button>

          <button
            type="button"
            onClick={() =>
              openModal("transferencia")
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium transition hover:border-[var(--primary)] hover:text-[var(--primary)] active:opacity-80"
          >
            <ArrowLeftRight size={17} />

            <span className="hidden sm:inline">
              Transferir
            </span>

            <span className="sm:hidden">
              Transf.
            </span>
          </button>
        </section>


        <section className="mb-5 rounded-lg bg-[var(--primary-soft)] px-5 py-5">
          <div className="flex items-center gap-2 text-[var(--primary)]">
            <Wallet
              size={17}
              strokeWidth={1.8}
            />

            <p className="text-xs font-medium">
              Saldo atual da loja
            </p>
          </div>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--primary)]">
            {formatMoney(totalBalance)}
          </p>
        </section>


        <section className="mb-5 grid grid-cols-2 border-y border-[var(--border)] lg:grid-cols-4">
          {METHODS.map(
            (item, index) => {
              const Icon = item.icon
              const value =
                balances[item.value]

              const share =
                totalBalance > 0
                  ? Math.max(
                      0,
                      (value /
                        totalBalance) *
                        100,
                    )
                  : 0

              return (
                <div
                  key={item.value}
                  className={`px-3 py-4 sm:px-4 ${
                    index % 2 === 1
                      ? "border-l"
                      : ""
                  } ${
                    index >= 2
                      ? "border-t lg:border-t-0"
                      : ""
                  } ${
                    index > 0
                      ? "lg:border-l"
                      : ""
                  } border-[var(--border)]`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      size={15}
                      strokeWidth={1.7}
                      className="text-[var(--primary)]"
                    />

                    <p className="text-xs text-[var(--text-muted)]">
                      {item.label}
                    </p>
                  </div>

                  <p
                    className={`mt-1 text-lg font-semibold ${
                      value < 0
                        ? "text-red-500"
                        : ""
                    }`}
                  >
                    {formatMoney(value)}
                  </p>

                  <div className="mt-2 h-1 overflow-hidden bg-[var(--surface-muted)]">
                    <div
                      className="h-full bg-[var(--primary)] transition-all"
                      style={{
                        width: `${share}%`,
                      }}
                    />
                  </div>
                </div>
              )
            },
          )}
        </section>


        <section className="mb-3 flex items-center justify-between gap-3">
          <div className="flex overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
            {PERIODS.map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPeriod(value)
                  }
                  className={segmentClass(
                    period === value,
                  )}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </section>


        <section className="mb-5 grid grid-cols-2 border-y border-[var(--border)] sm:grid-cols-4">
          <div className="px-3 py-4 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">
              Entradas
            </p>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(totalIn)}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {getPeriodLabel(period)}
            </p>
          </div>

          <div className="border-l border-[var(--border)] px-3 py-4 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">
              Despesas
            </p>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(expenses)}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {expensePercent} das vendas
            </p>
          </div>

          <div className="border-t border-[var(--border)] px-3 py-4 sm:border-l sm:border-t-0 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">
              Retiradas pessoais
            </p>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(withdrawals)}
            </p>

          </div>

          <div className="border-l border-t border-[var(--border)] px-3 py-4 sm:border-t-0 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">
              Resultado
            </p>

            <p
              className={`mt-1 text-lg font-semibold ${
                totalIn - totalOut <
                0
                  ? "text-red-500"
                  : ""
              }`}
            >
              {formatMoney(
                totalIn - totalOut,
              )}
            </p>

          </div>
        </section>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">

          <section className="overflow-hidden border-y border-[var(--border)]">
            <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <h2 className="text-sm font-medium">
                Para onde foi o dinheiro??
              </h2>

            </div>

            {expensesByReason.length ===
            0 ? (
              <div className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">
                Nenhuma despesa neste período.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {expensesByReason.map(
                  (item) => (
                    <div
                      key={item.name}
                      className="px-4 py-3.5 sm:px-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm">
                          {item.name}
                        </span>

                        <span className="text-sm font-semibold">
                          {formatMoney(
                            item.value,
                          )}
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden bg-[var(--surface-muted)]">
                        <div
                          className="h-full bg-[var(--primary)] transition-all"
                          style={{
                            width: `${
                              (item.value /
                                maxExpense) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>


          <section className="overflow-hidden border-y border-[var(--border)]">
            <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <h2 className="text-sm font-medium">
                Conferir o dinheiro
              </h2>
            </div>

            <div className="space-y-4 px-4 py-5 sm:px-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">
                  Dinheiro esperado
                </span>

                <span className="font-semibold">
                  {formatMoney(
                    balances.dinheiro,
                  )}
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={countedCash}
                  onChange={(event) =>
                    setCountedCash(
                      event.target.value,
                    )
                  }
                  placeholder="Quanto contaste?"
                  className={`${fieldClass} pr-12`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                  MT
                </span>
              </div>

              {cashDifference !== null && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    Math.abs(
                      cashDifference,
                    ) < 0.005
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "bg-[var(--surface-muted)] text-[var(--text)]"
                  }`}
                >
                  {Math.abs(
                    cashDifference,
                  ) < 0.005 ? (
                    <span className="font-medium">
                      Está tudo certo. Não há diferença.
                    </span>
                  ) : cashDifference >
                    0 ? (
                    <span>
                      Sobram{" "}
                      <strong>
                        {formatMoney(
                          cashDifference,
                        )}
                      </strong>{" "}
                      em relação ao sistema.
                    </span>
                  ) : (
                    <span>
                      Faltam{" "}
                      <strong>
                        {formatMoney(
                          Math.abs(
                            cashDifference,
                          ),
                        )}
                      </strong>
                      . Pode haver uma saída por registar.
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>


        <section className="overflow-hidden border-y border-[var(--border)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-medium">
                Movimentos
              </h2>

              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {visibleEntries.length}{" "}
                {visibleEntries.length ===
                1
                  ? "resultado"
                  : "resultados"}
              </p>
            </div>

            <div className="flex overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
              {TYPE_FILTERS.map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setTypeFilter(
                        value,
                      )
                    }
                    className={`${segmentClass(
                      typeFilter ===
                        value,
                    )} shrink-0`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>

          {groupedEntries.length ===
          0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary)]">
                <Wallet
                  size={20}
                  strokeWidth={1.7}
                />
              </div>

              <p className="mt-4 text-sm font-medium">
                Sem movimentos
              </p>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Nada registado neste período.
              </p>
            </div>
          ) : (
            groupedEntries.map(
              (group) => (
                <div
                  key={group.label}
                >
                  <p className="bg-[var(--surface-soft)] px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)] sm:px-5">
                    {group.label}
                  </p>

                  <div className="divide-y divide-[var(--border-soft)]">
                    {group.items.map(
                      (entry) => {
                        const isIn =
                          entry.kind ===
                            "venda" ||
                          entry.kind ===
                            "entrada"

                        const Icon =
                          entry.kind ===
                          "venda"
                            ? ShoppingCart
                            : entry.kind ===
                                "entrada"
                              ? ArrowDownToLine
                              : entry.kind ===
                                  "saida"
                                ? ArrowUpFromLine
                                : ArrowLeftRight

                        return (
                          <div
                            key={
                              entry.id
                            }
                            className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                              <Icon
                                size={
                                  16
                                }
                                strokeWidth={
                                  1.8
                                }
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {
                                  entry.label
                                }
                              </p>

                              <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                                {entry.kind ===
                                  "transferencia" &&
                                entry.toMethod
                                  ? `${methodLabel(
                                      entry.method,
                                    )} → ${methodLabel(
                                      entry.toMethod,
                                    )}`
                                  : methodLabel(
                                      entry.method,
                                    )}

                                {" · "}

                                {formatTime(
                                  entry.createdAt,
                                )}

                                {entry.note
                                  ? ` · ${entry.note}`
                                  : ""}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 text-sm font-semibold ${
                                isIn
                                  ? "text-[var(--primary)]"
                                  : ""
                              }`}
                            >
                              {entry.kind ===
                              "transferencia"
                                ? formatMoney(
                                    entry.amount,
                                  )
                                : `${
                                    isIn
                                      ? "+"
                                      : "−"
                                  } ${formatMoney(
                                    entry.amount,
                                  )}`}
                            </span>

                            {entry.manual ? (
                              <button
                                type="button"
                                onClick={() =>
                                  removeMovement(
                                    entry,
                                  )
                                }
                                aria-label="Anular movimento"
                                title="Anular"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-red-500"
                              >
                                <Trash2
                                  size={
                                    15
                                  }
                                />
                              </button>
                            ) : (
                              <span className="w-8 shrink-0" />
                            )}
                          </div>
                        )
                      },
                    )}
                  </div>
                </div>
              ),
            )
          )}
        </section>
      </div>

      {/* Toast */}

      {toast && (
        <div
          className={`fixed bottom-20 left-4 right-4 z-[90] mx-auto max-w-sm border border-[var(--border)] px-4 py-3 text-sm shadow-lg md:bottom-6 ${
            toast.type === "ok"
              ? "bg-[var(--button-bg)] text-[var(--button-text)]"
              : "bg-[var(--surface)] text-[var(--text)]"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "ok" ? (
              <Check size={17} />
            ) : (
              <AlertCircle
                size={17}
              />
            )}

            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {mode && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-[2px]">
          <div className="flex h-[100dvh] w-full items-stretch justify-center sm:items-center sm:p-5">
            <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--surface)] sm:h-auto sm:max-h-[90dvh] sm:max-w-md sm:rounded-xl sm:border sm:border-[var(--border)] sm:shadow-2xl">


              <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-lg font-semibold">
                  {mode === "saida"
                    ? "Registar saída"
                    : mode === "entrada"
                      ? "Registar entrada"
                      : "Transferir entre formas"}
                </h2>

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    isSaving
                  }
                  aria-label="Fechar"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                >
                  <X size={19} />
                </button>
              </div>

              <form
                id="cash-form"
                onSubmit={
                  saveMovement
                }
                className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 pb-28"
              >

                <div>
                  <label
                    htmlFor="cash-amount"
                    className="mb-2 block text-sm font-medium"
                  >
                    Valor
                  </label>

                  <div className="relative">
                    <input
                      id="cash-amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(
                        event,
                      ) =>
                        setAmount(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="0,00"
                      autoFocus
                      className={`${fieldClass} h-14 pr-12 text-xl font-medium`}
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                      MT
                    </span>
                  </div>
                </div>

                {mode !==
                  "transferencia" && (
                  <div>
                    <label
                      htmlFor="cash-reason"
                      className="mb-2 block text-sm font-medium"
                    >
                      Motivo
                    </label>

                    <select
                      id="cash-reason"
                      value={
                        reason
                      }
                      onChange={(
                        event,
                      ) =>
                        setReason(
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        fieldClass
                      }
                    >
                      {reasons.map(
                        (item) => (
                          <option
                            key={
                              item
                            }
                            value={
                              item
                            }
                          >
                            {item}
                          </option>
                        ),
                      )}
                    </select>

                    {mode ===
                      "saida" &&
                      reason ===
                        WITHDRAWAL && (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          Retiradas pessoais não contam como despesa da loja.
                        </p>
                      )}
                  </div>
                )}


                <div>
                  <p className="mb-2 text-sm font-medium">
                    {mode ===
                    "entrada"
                      ? "Entra em"
                      : "Sai de"}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {METHODS.map(
                      (item) => (
                        <button
                          key={
                            item.value
                          }
                          type="button"
                          onClick={() =>
                            setMethod(
                              item.value,
                            )
                          }
                          className={`flex h-11 flex-col items-start justify-center rounded-lg border px-3 text-left transition ${
                            method ===
                            item.value
                              ? "border-transparent bg-[var(--button-bg)] text-[var(--button-text)]"
                              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]"
                          }`}
                        >
                          <span className="text-sm font-medium leading-none">
                            {
                              item.label
                            }
                          </span>

                          <span
                            className={`mt-1 text-[10px] leading-none ${
                              method ===
                              item.value
                                ? "opacity-80"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            {formatMoney(
                              balances[
                                item.value
                              ],
                            )}
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {mode ===
                  "transferencia" && (
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      Entra em
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {METHODS.filter(
                        (item) =>
                          item.value !==
                          method,
                      ).map(
                        (item) => (
                          <button
                            key={
                              item.value
                            }
                            type="button"
                            onClick={() =>
                              setToMethod(
                                item.value,
                              )
                            }
                            className={`h-11 rounded-lg border px-3 text-sm font-medium transition ${
                              toMethod ===
                              item.value
                                ? "border-transparent bg-[var(--button-bg)] text-[var(--button-text)]"
                                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]"
                            }`}
                          >
                            {
                              item.label
                            }
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}


                <div>
                  <label
                    htmlFor="cash-note"
                    className="mb-2 block text-sm font-medium"
                  >
                    Observação (opcional)
                  </label>

                  <textarea
                    id="cash-note"
                    value={note}
                    onChange={(
                      event,
                    ) =>
                      setNote(
                        event.target
                          .value,
                      )
                    }
                    rows={3}
                    placeholder="Ex.: Comprar Credelec"
                    className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
                  />
                </div>


                {formError && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-red-500">
                    {
                      formError
                    }
                  </div>
                )}
              </form>


              <div
                className="absolute inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]"
                style={{
                  paddingBottom:
                    "env(safe-area-inset-bottom)",
                }}
              >
                <div className="flex gap-2 p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      isSaving
                    }
                    className="h-12 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold transition active:opacity-70"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    form="cash-form"
                    disabled={
                      isSaving
                    }
                    className="h-12 flex-1 rounded-lg bg-[var(--button-bg)] text-sm font-semibold text-[var(--button-text)] transition active:opacity-70 disabled:opacity-50"
                  >
                    {isSaving
                      ? "A guardar..."
                      : "Registar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
import { useMemo, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock3,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Undo2,
  X,
} from "lucide-react"
import { db, type Sale, type SaleStatus } from "../db/database"

type Period = "hoje" | "7dias" | "30dias" | "todos"

interface SaleSettings {
  allowSaleWithoutStock: boolean
  showProfitOnSale: boolean
  confirmSale: boolean
}

const DEFAULT_SALE_SETTINGS: SaleSettings = {
  allowSaleWithoutStock: false,
  showProfitOnSale: true,
  confirmSale: true,
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "—"
  }

  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} MT`
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-MZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16)

    crypto.getRandomValues(bytes)

    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    return [
      [...bytes.slice(0, 4)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
      [...bytes.slice(4, 6)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
      [...bytes.slice(6, 8)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
      [...bytes.slice(8, 10)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
      [...bytes.slice(10, 16)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
    ].join("-")
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
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

function getSaleStatus(sale: Sale): SaleStatus {
  return sale.status ?? "concluida"
}

function getSaleStatusLabel(sale: Sale) {
  return getSaleStatus(sale) === "cancelada"
    ? "Cancelada"
    : "Concluída"
}

function getStockStatus(stock: number, minimumStock: number) {
  if (stock <= 0) {
    return {
      label: "Sem stock",
      className: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
    }
  }

  if (stock <= minimumStock) {
    return {
      label: "Stock baixo",
      className: "bg-[var(--primary-soft)] text-[var(--primary)]",
    }
  }

  return {
    label: "Disponível",
    className: "bg-[var(--surface-soft)] text-[var(--text-secondary)]",
  }
}

function readSaleSettings(): SaleSettings {
  try {
    const saved = localStorage.getItem("diverse_settings")

    if (!saved) {
      return DEFAULT_SALE_SETTINGS
    }

    const parsed = JSON.parse(saved)

    return {
      allowSaleWithoutStock:
        typeof parsed.allowSaleWithoutStock === "boolean"
          ? parsed.allowSaleWithoutStock
          : DEFAULT_SALE_SETTINGS.allowSaleWithoutStock,

      showProfitOnSale:
        typeof parsed.showProfitOnSale === "boolean"
          ? parsed.showProfitOnSale
          : DEFAULT_SALE_SETTINGS.showProfitOnSale,

      confirmSale:
        typeof parsed.confirmSale === "boolean"
          ? parsed.confirmSale
          : DEFAULT_SALE_SETTINGS.confirmSale,
    }
  } catch {
    return DEFAULT_SALE_SETTINGS
  }
}

export default function Vendas() {
  const products = useLiveQuery(
    () => db.products.orderBy("name").toArray(),
    [],
    [],
  )

  const sales = useLiveQuery(
    () => db.sales.orderBy("createdAt").reverse().toArray(),
    [],
    [],
  )

  const [saleSettings, setSaleSettings] =
    useState<SaleSettings>(() => readSaleSettings())

  const [isModalOpen, setIsModalOpen] = useState(false)

  const [selectedSaleId, setSelectedSaleId] =
    useState<string | null>(null)

  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [productSearch, setProductSearch] = useState("")

  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<Period>("hoje")

  const [statusFilter, setStatusFilter] =
    useState<"todos" | "concluidas" | "canceladas">("todos")

  const [isSaving, setIsSaving] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const activeProducts = useMemo(
    () => products.filter((product) => product.active),
    [products],
  )

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [products, productId],
  )

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()

    if (!term) {
      return activeProducts
    }

    return activeProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term),
    )
  }, [activeProducts, productSearch])

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase()

    return sales.filter((sale) => {
      const status = getSaleStatus(sale)

      const matchesPeriod = isWithinPeriod(
        sale.createdAt,
        period,
      )

      const matchesSearch =
        !term ||
        sale.productName.toLowerCase().includes(term)

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "concluidas" &&
          status === "concluida") ||
        (statusFilter === "canceladas" &&
          status === "cancelada")

      return (
        matchesPeriod &&
        matchesSearch &&
        matchesStatus
      )
    })
  }, [sales, search, period, statusFilter])

  const completedSales = filteredSales.filter(
    (sale) => getSaleStatus(sale) === "concluida",
  )

  const totalSold = completedSales.reduce(
    (sum, sale) =>
      sum +
      (Number.isFinite(sale.total) ? sale.total : 0),
    0,
  )

  const totalProfit = completedSales.reduce(
    (sum, sale) =>
      sum +
      (Number.isFinite(sale.grossProfit)
        ? sale.grossProfit
        : 0),
    0,
  )

  const unitsSold = completedSales.reduce(
    (sum, sale) =>
      sum +
      (Number.isFinite(sale.quantity)
        ? sale.quantity
        : 0),
    0,
  )

  const averageTicket =
    completedSales.length > 0
      ? totalSold / completedSales.length
      : 0

  const selectedSale = sales.find(
    (sale) => sale.id === selectedSaleId,
  )

  const safeQuantity = Math.max(
    1,
    Math.floor(
      Number.isFinite(quantity) ? quantity : 1,
    ),
  )

  function showSuccess(message: string) {
    setSuccessMessage(message)
    setErrorMessage("")

    window.setTimeout(() => {
      setSuccessMessage("")
    }, 3000)
  }

  function showError(message: string) {
    setErrorMessage(message)
    setSuccessMessage("")

    window.setTimeout(() => {
      setErrorMessage("")
    }, 4000)
  }

  function openModal() {
    setSaleSettings(readSaleSettings())

    setProductId("")
    setQuantity(1)
    setProductSearch("")
    setErrorMessage("")
    setSuccessMessage("")
    setIsModalOpen(true)
  }

  function closeModal() {
    if (isSaving) {
      return
    }

    setIsModalOpen(false)
    setProductId("")
    setQuantity(1)
    setProductSearch("")
  }

  function selectProduct(id: string) {
    setProductId(id)
    setProductSearch("")
    setQuantity(1)
    setErrorMessage("")
  }

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, Math.floor(current) - 1),
    )
  }

  function increaseQuantity() {
    if (!selectedProduct) {
      return
    }

    if (saleSettings.allowSaleWithoutStock) {
      setQuantity((current) =>
        Math.max(1, Math.floor(current) + 1),
      )

      return
    }

    const stock = Math.max(
      0,
      Math.floor(Number(selectedProduct.stock) || 0),
    )

    if (stock <= 0) {
      return
    }

    setQuantity((current) =>
      Math.min(
        stock,
        Math.max(1, Math.floor(current) + 1),
      ),
    )
  }

  async function saveSale() {
    setErrorMessage("")
    setSuccessMessage("")

    if (!selectedProduct) {
      showError("Seleciona um produto.")
      return
    }

    const finalQuantity = Number(quantity)

    if (
      !Number.isInteger(finalQuantity) ||
      finalQuantity <= 0
    ) {
      return
    }

    const currentSettings = readSaleSettings()
    setSaleSettings(currentSettings)

    const stock = Math.max(
      0,
      Math.floor(Number(selectedProduct.stock) || 0),
    )

    if (
      !currentSettings.allowSaleWithoutStock &&
      stock <= 0
    ) {
      showError("Este produto está sem stock.")
      return
    }

    if (
      !currentSettings.allowSaleWithoutStock &&
      finalQuantity > stock
    ) {
      showError(
        `Stock insuficiente. Existem apenas ${stock} unidades.`,
      )
      return
    }

    const salePrice = Number(selectedProduct.salePrice)
    const purchasePrice = Number(
      selectedProduct.purchasePrice,
    )

    if (
      !Number.isFinite(salePrice) ||
      salePrice < 0
    ) {
      showError(
        "O preço de venda deste produto é inválido. Corrige-o em Produtos.",
      )
      return
    }

    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0
    ) {
      showError(
        "O preço de compra deste produto é inválido. Corrige-o em Produtos.",
      )
      return
    }

    const saleTotal = salePrice * finalQuantity

    // A confirmação acontece através do próprio botão
    // "Confirmar venda", por isso não usamos window.confirm aqui.
    void saleTotal

    setIsSaving(true)

    try {
      const now = new Date().toISOString()

      await db.transaction(
        "rw",
        db.products,
        db.sales,
        db.stockMovements,
        async () => {
          const currentProduct = await db.products.get(
            selectedProduct.id,
          )

          if (!currentProduct) {
            throw new Error(
              "Produto não encontrado.",
            )
          }

          const currentStock = Math.max(
            0,
            Math.floor(
              Number(currentProduct.stock) || 0,
            ),
          )

          if (
            !currentSettings.allowSaleWithoutStock &&
            currentStock <= 0
          ) {
            throw new Error(
              "Este produto está sem stock.",
            )
          }

          if (
            !currentSettings.allowSaleWithoutStock &&
            finalQuantity > currentStock
          ) {
            throw new Error(
              `Stock insuficiente. Existem apenas ${currentStock} unidades.`,
            )
          }

          const currentSalePrice = Number(
            currentProduct.salePrice,
          )

          const currentPurchasePrice = Number(
            currentProduct.purchasePrice,
          )

          if (
            !Number.isFinite(currentSalePrice) ||
            currentSalePrice < 0
          ) {
            throw new Error(
              "O preço de venda deste produto é inválido. Corrige-o em Produtos.",
            )
          }

          if (
            !Number.isFinite(currentPurchasePrice) ||
            currentPurchasePrice < 0
          ) {
            throw new Error(
              "O preço de compra deste produto é inválido. Corrige-o em Produtos.",
            )
          }

          const stockBefore = currentStock

          const stockAfter =
            currentSettings.allowSaleWithoutStock
              ? Math.max(
                  0,
                  stockBefore - finalQuantity,
                )
              : stockBefore - finalQuantity

          const finalTotal =
            currentSalePrice * finalQuantity

          const totalCost =
            currentPurchasePrice * finalQuantity

          const grossProfit =
            finalTotal - totalCost

          await db.products.update(
            currentProduct.id,
            {
              stock: stockAfter,
              updatedAt: now,
            },
          )

          await db.sales.add({
            id: createId(),
            productId: currentProduct.id,
            productName: currentProduct.name,
            quantity: finalQuantity,
            unitPrice: currentSalePrice,
            purchasePrice: currentPurchasePrice,
            total: finalTotal,
            totalCost,
            grossProfit,
            status: "concluida",
            createdAt: now,
          })

          await db.stockMovements.add({
            id: createId(),
            productId: currentProduct.id,
            type: "venda",
            quantity: finalQuantity,
            stockBefore,
            stockAfter,
            note:
              `Venda de ${finalQuantity} unidade${
                finalQuantity !== 1 ? "s" : ""
              }.`,
            createdAt: now,
          })
        },
      )

      closeModal()

      showSuccess(
        "Venda registada com sucesso.",
      )
    } catch (error) {
      console.error(
        "Erro ao registar venda:",
        error,
      )

      showError(
        error instanceof Error
          ? error.message
          : "Não foi possível registar a venda.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function cancelSale(sale: Sale) {
    if (getSaleStatus(sale) === "cancelada") {
      return
    }

    const confirmed = window.confirm(
      `Cancelar a venda de "${sale.productName}"?\n\n` +
        `Quantidade: ${sale.quantity} un.\n` +
        `Total: ${formatMoney(sale.total)}\n\n` +
        `O stock será devolvido ao produto e a venda ficará marcada como cancelada.`,
    )

    if (!confirmed) {
      return
    }

    setIsCancelling(true)

    try {
      const now = new Date().toISOString()

      await db.transaction(
        "rw",
        db.products,
        db.sales,
        db.stockMovements,
        async () => {
          const currentSale =
            await db.sales.get(sale.id)

          if (!currentSale) {
            throw new Error(
              "Venda não encontrada.",
            )
          }

          if (
            getSaleStatus(currentSale) ===
            "cancelada"
          ) {
            throw new Error(
              "Esta venda já foi cancelada.",
            )
          }

          const product =
            await db.products.get(
              currentSale.productId,
            )

          if (!product) {
            throw new Error(
              "O produto desta venda não foi encontrado.",
            )
          }

          const stockBefore = Math.max(
            0,
            Math.floor(
              Number(product.stock) || 0,
            ),
          )

          const saleQuantity = Math.max(
            1,
            Math.floor(
              Number(currentSale.quantity) || 0,
            ),
          )

          const stockAfter =
            stockBefore + saleQuantity

          await db.products.update(
            product.id,
            {
              stock: stockAfter,
              updatedAt: now,
            },
          )

          await db.sales.update(
            currentSale.id,
            {
              status: "cancelada",
              cancelledAt: now,
              cancellationNote:
                "Venda cancelada e stock devolvido.",
            },
          )

          await db.stockMovements.add({
            id: createId(),
            productId: product.id,
            type: "ajuste",
            quantity: saleQuantity,
            stockBefore,
            stockAfter,
            reason: "outro",
            note:
              `Estorno da venda ${currentSale.id}. ` +
              `${saleQuantity} unidade${
                saleQuantity !== 1 ? "s" : ""
              } devolvida${
                saleQuantity !== 1 ? "s" : ""
              } ao stock.`,
            createdAt: now,
          })
        },
      )

      setSelectedSaleId(null)

      showSuccess(
        "Venda cancelada e o stock devolvido.",
      )
    } catch (error) {
      console.error(
        "Erro ao cancelar venda:",
        error,
      )

      showError(
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar a venda.",
      )
    } finally {
      setIsCancelling(false)
    }
  }

  const canSaveSale =
    Boolean(selectedProduct) &&
    !isSaving &&
    safeQuantity >= 1

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-10 lg:px-10">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-3xl">
                VENDAS
              </h1>
            </div>

            <button
              type="button"
              onClick={openModal}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--button-bg)] px-3 text-sm font-medium text-[var(--button-text)] transition hover:bg-[var(--button-bg-hover)] active:opacity-80 sm:h-11 sm:px-4"
            >
              <Plus size={18} strokeWidth={2} />

              <span className="hidden sm:inline">
                Nova venda
              </span>

              <span className="sm:hidden">
                Nova Venda
              </span>
            </button>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-2 border-y border-[var(--border)] sm:grid-cols-4 lg:grid-cols-5">
          <div className="px-3 py-4 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">
              Total vendido
            </p>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(totalSold)}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {period === "hoje"
                ? "Hoje"
                : period === "7dias"
                  ? "Últimos 7 dias"
                  : period === "30dias"
                    ? "Últimos 30 dias"
                    : "Todos os períodos"}
            </p>
          </div>

          <div className="border-l border-[var(--border)] px-3 py-4 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">
              Vendas
            </p>

            <p className="mt-1 text-lg font-semibold">
              {completedSales.length}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              concluídas
            </p>
          </div>

          <div className="border-t border-[var(--border)] px-3 py-4 sm:border-l sm:border-t-0 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">
              Unidades
            </p>

            <p className="mt-1 text-lg font-semibold">
              {unitsSold}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              vendidas
            </p>
          </div>

          <div className="border-l border-t border-[var(--border)] px-3 py-4 sm:border-t-0 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">
              Lucro bruto
            </p>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(totalProfit)}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              vendas concluídas
            </p>
          </div>

          <div className="col-span-2 border-t border-[var(--border)] px-3 py-4 sm:col-span-4 lg:col-span-1 lg:border-l lg:border-t-0 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">
              Ticket médio
            </p>

            <p className="mt-1 text-lg font-semibold">
              {formatMoney(averageTicket)}
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              por venda
            </p>
          </div>
        </section>

        <section className="mb-5">
          <div className="relative">
            <Search
              size={18}
              strokeWidth={1.8}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Pesquisar..."
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text)]"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <div className="flex shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
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
                  className={`h-8 rounded-md px-3 text-xs font-medium transition ${
                    period === value
                      ? "bg-[var(--button-bg)] text-[var(--button-text)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
              {[
                ["todos", "Todas"],
                ["concluidas", "Concluídas"],
                ["canceladas", "Canceladas"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      value as
                        | "todos"
                        | "concluidas"
                        | "canceladas",
                    )
                  }
                  className={`h-8 rounded-md px-3 text-xs font-medium transition ${
                    statusFilter === value
                      ? "bg-[var(--button-bg)] text-[var(--button-text)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-y border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-medium">
                Histórico de vendas
              </h2>

              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {filteredSales.length}{" "}
                {filteredSales.length === 1
                  ? "resultado"
                  : "resultados"}
              </p>
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--text-muted)]">
                <ShoppingCart
                  size={20}
                  strokeWidth={1.7}
                />
              </div>

              <h3 className="mt-4 text-sm font-medium">
                Nenhuma venda encontrada
              </h3>

              <button
                type="button"
                onClick={openModal}
                className="mt-4 text-sm font-medium underline underline-offset-4"
              >
                Registar primeira venda
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)] text-left text-xs font-medium text-[var(--text-muted)]">
                      <th className="px-5 py-3">
                        Produto
                      </th>

                      <th className="px-5 py-3">
                        Estado
                      </th>

                      <th className="px-5 py-3">
                        Quantidade
                      </th>

                      <th className="px-5 py-3">
                        Total
                      </th>

                      <th className="px-5 py-3">
                        Lucro
                      </th>

                      <th className="px-5 py-3">
                        Data
                      </th>

                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSales.map((sale) => {
                      const cancelled =
                        getSaleStatus(sale) ===
                        "cancelada"

                      return (
                        <tr
                          key={sale.id}
                          onClick={() =>
                            setSelectedSaleId(
                              sale.id,
                            )
                          }
                          className="cursor-pointer border-b border-[var(--border-soft)] transition hover:bg-[var(--surface-soft)] last:border-b-0"
                        >
                          <td className="px-5 py-3.5">
                            <p
                              className={`text-sm font-medium ${
                                cancelled
                                  ? "text-[var(--text-muted)] line-through"
                                  : ""
                              }`}
                            >
                              {sale.productName}
                            </p>
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${
                                cancelled
                                  ? "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                                  : "bg-[var(--button-bg)] text-[var(--button-text)]"
                              }`}
                            >
                              {getSaleStatusLabel(
                                sale,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                            {sale.quantity} un.
                          </td>

                          <td className="px-5 py-3.5 text-sm font-medium">
                            {formatMoney(
                              sale.total,
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                            {cancelled
                              ? "—"
                              : formatMoney(
                                  sale.grossProfit,
                                )}
                          </td>

                          <td className="px-5 py-3.5 text-sm text-[var(--text-muted)]">
                            {formatDate(
                              sale.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <ChevronRight
                              size={17}
                              className="text-[var(--text-muted)]"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden">
                {filteredSales.map((sale) => {
                  const cancelled =
                    getSaleStatus(sale) ===
                    "cancelada"

                  return (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() =>
                        setSelectedSaleId(
                          sale.id,
                        )
                      }
                      className="flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-4 text-left transition active:bg-[var(--surface-soft)] last:border-b-0"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                          cancelled
                            ? "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                            : "bg-[var(--text)] text-[var(--bg)]"
                        }`}
                      >
                        {cancelled ? (
                          <Undo2
                            size={17}
                            strokeWidth={1.8}
                          />
                        ) : (
                          <ShoppingCart
                            size={17}
                            strokeWidth={1.8}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={`truncate text-sm font-medium ${
                                cancelled
                                  ? "text-[var(--text-muted)] line-through"
                                  : ""
                              }`}
                            >
                              {sale.productName}
                            </p>

                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              {sale.quantity} un. ·{" "}
                              {formatDate(
                                sale.createdAt,
                              )}
                            </p>
                          </div>

                          <ChevronRight
                            size={16}
                            className="mt-1 shrink-0 text-[var(--text-muted)]"
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                              cancelled
                                ? "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                                : "bg-[var(--text)] text-[var(--bg)]"
                            }`}
                          >
                            {getSaleStatusLabel(
                              sale,
                            )}
                          </span>

                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatMoney(
                                sale.total,
                              )}
                            </p>

                            {!cancelled && (
                              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                                Lucro{" "}
                                {formatMoney(
                                  sale.grossProfit,
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {successMessage && (
          <div className="fixed bottom-20 left-4 right-4 z-[90] mx-auto max-w-sm border border-[var(--border)] bg-[var(--text)] px-4 py-3 text-sm text-[var(--bg)] shadow-lg md:bottom-6">
            <div className="flex items-center gap-2">
              <Check size={17} />

              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="fixed bottom-20 left-4 right-4 z-[90] mx-auto max-w-sm border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] shadow-lg md:bottom-6">
            <div className="flex items-center gap-2">
              <AlertCircle
                size={17}
                className="shrink-0"
              />

              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-[2px]">
            <div className="flex h-[100dvh] w-full items-stretch justify-center sm:items-center sm:p-5">
              <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--surface)] sm:h-[90dvh] sm:max-h-[760px] sm:max-w-md sm:rounded-xl sm:border sm:border-[var(--border)] sm:shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Nova venda
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                  >
                    <X size={19} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
                  <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
                    {!selectedProduct ? (
                      <>
                        <div>
                          <div className="relative">
                            <Search
                              size={17}
                              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                            />

                            <input
                              type="search"
                              value={productSearch}
                              onChange={(event) =>
                                setProductSearch(
                                  event.target.value,
                                )
                              }
                              placeholder="Pesquisar produto ou SKU"
                              autoFocus
                              className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text)]"
                            />
                          </div>
                        </div>

                        <div className="overflow-hidden border-y border-[var(--border)]">
                          {filteredProducts.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                              <p className="text-sm font-medium">
                                Nenhum produto encontrado
                              </p>

                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                Verifique o nome ou SKU.
                              </p>
                            </div>
                          ) : (
                            <div className="max-h-72 overflow-y-auto">
                              {filteredProducts.map(
                                (product) => {
                                  const stock = Math.max(
                                    0,
                                    Math.floor(
                                      Number(
                                        product.stock,
                                      ) || 0,
                                    ),
                                  )

                                  const stockStatus =
                                    getStockStatus(
                                      stock,
                                      Number(
                                        product.minimumStock,
                                      ) || 0,
                                    )

                                  const unavailable =
                                    stock <= 0

                                  return (
                                    <button
                                      key={product.id}
                                      type="button"
                                      disabled={
                                        unavailable &&
                                        !saleSettings.allowSaleWithoutStock
                                      }
                                      onClick={() =>
                                        selectProduct(
                                          product.id,
                                        )
                                      }
                                      className="flex w-full items-center justify-between border-b border-[var(--border-soft)] px-3 py-3.5 text-left transition last:border-0 hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                          {product.name}
                                        </p>

                                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                          {product.sku ||
                                            "Sem SKU"}
                                        </p>

                                        <span
                                          className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${stockStatus.className}`}
                                        >
                                          {
                                            stockStatus.label
                                          }
                                        </span>
                                      </div>

                                      <div className="ml-4 shrink-0 text-right">
                                        <p className="text-sm font-medium">
                                          {formatMoney(
                                            Number(
                                              product.salePrice,
                                            ),
                                          )}
                                        </p>

                                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                          {unavailable
                                            ? saleSettings.allowSaleWithoutStock
                                              ? "Sem stock · permitido"
                                              : "Sem stock"
                                            : `${stock} un.`}
                                        </p>
                                      </div>
                                    </button>
                                  )
                                },
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <section>
                          <div className="flex items-center gap-3 border-y border-[var(--border)] py-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--text)]">
                              <ShoppingCart
                                size={17}
                                strokeWidth={1.7}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {selectedProduct.name}
                              </p>

                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                {Math.max(
                                  0,
                                  Math.floor(
                                    Number(
                                      selectedProduct.stock,
                                    ) || 0,
                                  ),
                                )}{" "}
                                unidades em stock
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setProductId("")
                                setQuantity(1)
                                setProductSearch("")
                              }}
                              className="shrink-0 text-xs font-medium text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--text)]"
                            >
                              Alterar
                            </button>
                          </div>
                        </section>

                        <section>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm font-medium">
                              Quantidade
                            </label>

                            <span className="text-xs text-[var(--text-muted)]">
                              {saleSettings.allowSaleWithoutStock
                                ? "Sem limite de stock"
                                : `Máximo: ${Math.max(
                                    0,
                                    Math.floor(
                                      Number(
                                        selectedProduct.stock,
                                      ) || 0,
                                    ),
                                  )}`}
                            </span>
                          </div>

                          <div className="flex h-11 items-center rounded-md border border-[var(--border)]">
                            <button
                              type="button"
                              onClick={decreaseQuantity}
                              disabled={
                                safeQuantity <= 1
                              }
                              className="flex h-full w-12 items-center justify-center text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] disabled:opacity-30"
                            >
                              <Minus size={17} />
                            </button>

                            <input
                              type="number"
                              min="1"
                              max={
                                saleSettings.allowSaleWithoutStock
                                  ? undefined
                                  : Math.max(
                                      0,
                                      Math.floor(
                                        Number(
                                          selectedProduct.stock,
                                        ) || 0,
                                      ),
                                    )
                              }
                              value={quantity}
                              onChange={(event) => {
                                const raw =
                                  event.target.value

                                if (raw === "") {
                                  setQuantity(1)
                                  return
                                }

                                const value =
                                  Number(raw)

                                if (
                                  !Number.isFinite(
                                    value,
                                  )
                                ) {
                                  return
                                }

                                const integerValue =
                                  Math.max(
                                    1,
                                    Math.floor(value),
                                  )

                                if (
                                  saleSettings.allowSaleWithoutStock
                                ) {
                                  setQuantity(
                                    integerValue,
                                  )
                                  return
                                }

                                const stock =
                                  Math.max(
                                    0,
                                    Math.floor(
                                      Number(
                                        selectedProduct.stock,
                                      ) || 0,
                                    ),
                                  )

                                if (stock <= 0) {
                                  setQuantity(1)
                                  return
                                }

                                setQuantity(
                                  Math.min(
                                    stock,
                                    integerValue,
                                  ),
                                )
                              }}
                              className="h-full min-w-0 flex-1 border-x border-[var(--border)] bg-transparent text-center text-sm font-medium outline-none"
                            />

                            <button
                              type="button"
                              onClick={increaseQuantity}
                              disabled={
                                !saleSettings.allowSaleWithoutStock &&
                                safeQuantity >=
                                  Math.max(
                                    0,
                                    Math.floor(
                                      Number(
                                        selectedProduct.stock,
                                      ) || 0,
                                    ),
                                  )
                              }
                              className="flex h-full w-12 items-center justify-center text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] disabled:opacity-30"
                            >
                              <Plus size={17} />
                            </button>
                          </div>
                        </section>

                        <section className="border-y border-[var(--border)] py-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-muted)]">
                              Preço unitário
                            </span>

                            <span className="font-medium">
                              {formatMoney(
                                Number(
                                  selectedProduct.salePrice,
                                ),
                              )}
                            </span>
                          </div>

                          <div className="mt-3 flex justify-between text-sm">
                            <span className="text-[var(--text-muted)]">
                              Quantidade
                            </span>

                            <span className="font-medium">
                              {safeQuantity} unidade(s)
                            </span>
                          </div>

                          {saleSettings.showProfitOnSale && (
                            <div className="mt-3 flex justify-between text-sm">
                              <span className="text-[var(--text-muted)]">
                                Custo
                              </span>

                              <span className="font-medium">
                                {formatMoney(
                                  Number(
                                    selectedProduct.purchasePrice,
                                  ) * safeQuantity,
                                )}
                              </span>
                            </div>
                          )}

                          <div className="my-4 border-t border-[var(--border)]" />

                          <div className="flex items-end justify-between">
                            <span className="font-medium">
                              Total
                            </span>

                            <span className="text-xl font-semibold tracking-tight">
                              {formatMoney(
                                Number(
                                  selectedProduct.salePrice,
                                ) * safeQuantity,
                              )}
                            </span>
                          </div>

                          {saleSettings.showProfitOnSale && (
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="text-[var(--text-muted)]">
                                Lucro bruto
                              </span>

                              <span className="font-medium">
                                {formatMoney(
                                  (
                                    Number(
                                      selectedProduct.salePrice,
                                    ) -
                                    Number(
                                      selectedProduct.purchasePrice,
                                    )
                                  ) * safeQuantity,
                                )}
                              </span>
                            </div>
                          )}
                        </section>

                        <div className="flex items-center justify-between border-y border-[var(--border)] py-3">
                          <span className="text-xs text-[var(--text-muted)]">
                            Stock depois da venda
                          </span>

                          <span className="text-sm font-semibold">
                            {Math.max(
                              0,
                              Math.floor(
                                Number(
                                  selectedProduct.stock,
                                ) || 0,
                              ) - safeQuantity,
                            )}{" "}
                            un.
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div
                  className="absolute inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]"
                  style={{
                    paddingBottom:
                      "env(safe-area-inset-bottom)",
                  }}
                >
                  <div className="p-3 sm:p-4">
                    <button
                      type="button"
                      onClick={saveSale}
                      disabled={!canSaveSale}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--button-bg)] text-sm font-semibold text-[var(--button-text)] transition active:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={18} />

                      {isSaving
                        ? "A registar..."
                        : selectedProduct
                          ? `Confirmar venda · ${formatMoney(
                              Number(
                                selectedProduct.salePrice,
                              ) * safeQuantity,
                            )}`
                          : "Seleciona um produto"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedSale && (
          <div className="fixed inset-0 z-[11000] bg-black/60 backdrop-blur-[2px]">
            <div className="flex h-[100dvh] w-full items-stretch justify-center sm:items-center sm:p-5">
              <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--surface)] sm:h-[90dvh] sm:max-h-[760px] sm:max-w-md sm:rounded-xl sm:border sm:border-[var(--border)] sm:shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                        Venda
                      </p>

                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          getSaleStatus(
                            selectedSale,
                          ) === "cancelada"
                            ? "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                            : "bg-[var(--text)] text-[var(--bg)]"
                        }`}
                      >
                        {getSaleStatusLabel(
                          selectedSale,
                        )}
                      </span>
                    </div>

                    <h2 className="mt-1 truncate text-lg font-semibold">
                      {selectedSale.productName}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSaleId(null)
                    }
                    className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                  >
                    <X size={19} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24">
                  <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
                    <section className="border-y border-[var(--border)] py-5">
                      <p className="text-xs text-[var(--text-muted)]">
                        Total da venda
                      </p>

                      <p className="mt-1 text-2xl font-semibold tracking-tight">
                        {formatMoney(
                          selectedSale.total,
                        )}
                      </p>
                    </section>

                    <section>
                      <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                        <div className="flex justify-between gap-4 py-3.5">
                          <span className="text-sm text-[var(--text-muted)]">
                            Quantidade
                          </span>

                          <span className="text-sm font-medium">
                            {selectedSale.quantity} un.
                          </span>
                        </div>

                        <div className="flex justify-between gap-4 py-3.5">
                          <span className="text-sm text-[var(--text-muted)]">
                            Preço unitário
                          </span>

                          <span className="text-sm font-medium">
                            {formatMoney(
                              selectedSale.unitPrice,
                            )}
                          </span>
                        </div>

                        {saleSettings.showProfitOnSale && (
                          <>
                            <div className="flex justify-between gap-4 py-3.5">
                              <span className="text-sm text-[var(--text-muted)]">
                                Custo unitário
                              </span>

                              <span className="text-sm font-medium">
                                {formatMoney(
                                  selectedSale.purchasePrice,
                                )}
                              </span>
                            </div>

                            <div className="flex justify-between gap-4 py-3.5">
                              <span className="text-sm text-[var(--text-muted)]">
                                Custo total
                              </span>

                              <span className="text-sm font-medium">
                                {formatMoney(
                                  selectedSale.totalCost,
                                )}
                              </span>
                            </div>

                            <div className="flex justify-between gap-4 py-3.5">
                              <span className="text-sm text-[var(--text-muted)]">
                                Lucro bruto
                              </span>

                              <span className="text-sm font-semibold">
                                {getSaleStatus(
                                  selectedSale,
                                ) === "cancelada"
                                  ? "—"
                                  : formatMoney(
                                      selectedSale.grossProfit,
                                    )}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </section>

                    <section>
                      <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                        <div className="flex items-center gap-3 py-4">
                          <Clock3
                            size={17}
                            className="shrink-0 text-[var(--text-muted)]"
                          />

                          <div>
                            <p className="text-xs text-[var(--text-muted)]">
                              Registada em
                            </p>

                            <p className="mt-0.5 text-sm font-medium">
                              {formatDate(
                                selectedSale.createdAt,
                              )}
                            </p>
                          </div>
                        </div>

                        {selectedSale.cancelledAt && (
                          <div className="py-4">
                            <p className="text-xs text-[var(--text-muted)]">
                              Cancelada em
                            </p>

                            <p className="mt-0.5 text-sm font-medium">
                              {formatDate(
                                selectedSale.cancelledAt,
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>

                    {getSaleStatus(
                      selectedSale,
                    ) === "cancelada" && (
                      <section className="border-y border-[var(--border)] py-4">
                        <div className="flex gap-3">
                          <Undo2
                            size={18}
                            className="mt-0.5 shrink-0 text-[var(--text-muted)]"
                          />

                          <div>
                            <p className="text-sm font-medium">
                              Venda estornada
                            </p>

                            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                              O stock desta venda foi devolvido ao produto.
                            </p>

                            {selectedSale.cancellationNote && (
                              <p className="mt-2 text-xs text-[var(--text-muted)]">
                                {
                                  selectedSale.cancellationNote
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                </div>

                <div
                  className="absolute inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]"
                  style={{
                    paddingBottom:
                      "env(safe-area-inset-bottom)",
                  }}
                >
                  <div className="p-3 sm:p-4">
                    {getSaleStatus(
                      selectedSale,
                    ) === "concluida" ? (
                      <button
                        type="button"
                        onClick={() =>
                          cancelSale(
                            selectedSale,
                          )
                        }
                        disabled={isCancelling}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text)] transition active:opacity-70 disabled:opacity-50"
                      >
                        <Undo2 size={17} />

                        {isCancelling
                          ? "A cancelar..."
                          : "Cancelar / estornar venda"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSaleId(null)
                        }
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--button-bg)] text-sm font-semibold text-[var(--button-text)] transition active:opacity-70"
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
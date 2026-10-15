import { useLiveQuery } from "dexie-react-hooks"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardPenLine,
  Plus,
  Search,
  X,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react"

import {
  db,
  type Product,
  type StockAdjustmentReason,
  type StockMovementType,
} from "../db/database"

const formatMoney = (value: number) =>
  `${new Intl.NumberFormat("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)} MT`
  
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-MZ", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))


const adjustmentReasons: StockAdjustmentReason[] = [
  "correcao_contagem",
  "perda_quebra",
  "devolucao_cliente",
  "erro_registo",
  "outro",
]

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

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`
}

function getStockStatus(
  stock: number,
  minimumStock: number,
) {
  if (stock <= 0) {
    return {
      label: "Esgotado",
      className: "text-red-600 dark:text-red-400",
    }
  }

  if (stock <= minimumStock) {
    return {
      label: "Stock baixo",
      className: "text-amber-600 dark:text-amber-400",
    }
  }

  return {
    label: "Normal",
    className: "text-neutral-500",
  }
}

function getMovementStyle(type: StockMovementType) {
  if (type === "entrada") {
    return {
      icon: ArrowDownToLine,
      label: "Entrada",
      className:
        "text-[var(--primary)]",
    }
  }

  if (type === "venda") {
    return {
      icon: ArrowUpFromLine,
      label: "Venda",
      className: "text-[var(--text-secondary)]",
    }
  }

  return {
    icon: ClipboardPenLine,
    label: "Ajuste",
    className: "text-[var(--primary)]",
  }
}

function getAdjustmentReasonLabel(
  reason: StockAdjustmentReason,
) {
  const labels: Record<
    StockAdjustmentReason,
    string
  > = {
    correcao_contagem: "Correção de contagem",
    perda_quebra: "Perda / quebra",
    devolucao_cliente: "Devolução de cliente",
    erro_registo: "Erro de registo",
    outro: "Outro",
  }

  return labels[reason]
}

function formatVariation(
  type: StockMovementType,
  quantity: number,
  stockBefore: number,
  stockAfter: number,
) {
  if (type === "entrada") {
    return `+${quantity}`
  }

  if (type === "venda") {
    return `-${quantity}`
  }

  const difference = stockAfter - stockBefore

  if (difference > 0) {
    return `+${difference}`
  }

  if (difference < 0) {
    return `${difference}`
  }

  return "0"
}

export default function Stock() {
  const products = useLiveQuery(
    () =>
      db.products
        .orderBy("name")
        .toArray(),
    [],
    [],
  )

  const movements = useLiveQuery(
    () =>
      db.stockMovements
        .orderBy("createdAt")
        .reverse()
        .toArray(),
    [],
    [],
  )

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] =
    useState("Todas")

  const [movementType, setMovementType] =
    useState<"todos" | StockMovementType>("todos")

  const [movementProductId, setMovementProductId] =
    useState("todos")

  const [isEntryModalOpen, setIsEntryModalOpen] =
    useState(false)

  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] =
    useState(false)

  const [selectedProductId, setSelectedProductId] =
    useState("")

  const [quantity, setQuantity] = useState("")
  const [adjustmentStock, setAdjustmentStock] =
    useState("")

  const [adjustmentReason, setAdjustmentReason] =
    useState<StockAdjustmentReason>(
      "correcao_contagem",
    )

  const [note, setNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const modalOpen =
      isEntryModalOpen ||
      isAdjustmentModalOpen

    if (!modalOpen) {
      return
    }

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [
    isEntryModalOpen,
    isAdjustmentModalOpen,
  ])

  const categories = useMemo(() => {
    return [
      "Todas",
      ...Array.from(
        new Set(
          products
            .map((product) => product.category)
            .filter(Boolean),
        ),
      ).sort((a, b) =>
        a.localeCompare(b, "pt"),
      ),
    ]
  }, [products])

  const productMap = useMemo(() => {
    const map = new Map<string, Product>()

    for (const product of products) {
      map.set(product.id, product)
    }

    return map
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name
          .toLowerCase()
          .includes(query) ||
        product.sku
          .toLowerCase()
          .includes(query)

      const matchesCategory =
        categoryFilter === "Todas" ||
        product.category === categoryFilter

      return (
        matchesSearch &&
        matchesCategory
      )
    })
  }, [
    products,
    search,
    categoryFilter,
  ])

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const matchesType =
        movementType === "todos" ||
        movement.type === movementType

      const matchesProduct =
        movementProductId === "todos" ||
        movement.productId ===
          movementProductId

      return (
        matchesType &&
        matchesProduct
      )
    })
  }, [
    movements,
    movementType,
    movementProductId,
  ])

  const activeProducts = products.filter(
    (product) => product.active,
  )

  const lowStockProducts =
    activeProducts.filter(
      (product) =>
        product.stock > 0 &&
        product.stock <=
          product.minimumStock,
    )

  const outOfStockProducts =
    activeProducts.filter(
      (product) => product.stock <= 0,
    )

  const totalUnits = activeProducts.reduce(
    (sum, product) =>
      sum + product.stock,
    0,
  )

  const totalCostValue =
    activeProducts.reduce(
      (sum, product) =>
        sum +
        product.stock *
          product.purchasePrice,
      0,
    )

  const totalSaleValue =
    activeProducts.reduce(
      (sum, product) =>
        sum +
        product.stock *
          product.salePrice,
      0,
    )

  const selectedProduct =
    productMap.get(selectedProductId)

  function openEntryModal(
    product?: Product,
  ) {
    const target =
      product ??
      activeProducts[0]

    if (!target) {
      setError(
        "Não existem produtos ativos para adicionar stock.",
      )
      return
    }

    setSelectedProductId(
      target.id,
    )

    setQuantity("")
    setNote("")
    setError("")
    setIsEntryModalOpen(true)
  }

  function closeEntryModal() {
    if (isSaving) return

    setIsEntryModalOpen(false)
    setSelectedProductId("")
    setQuantity("")
    setNote("")
    setError("")
  }

  function openAdjustmentModal(
    product?: Product,
  ) {
    const target =
      product ??
      activeProducts[0]

    if (!target) {
      setError(
        "Não existem produtos ativos para editar.",
      )
      return
    }

    setSelectedProductId(
      target.id,
    )

    setAdjustmentStock(
      String(target.stock),
    )

    setAdjustmentReason(
      "correcao_contagem",
    )

    setNote("")
    setError("")
    setIsAdjustmentModalOpen(true)
  }

  function closeAdjustmentModal() {
    if (isSaving) return

    setIsAdjustmentModalOpen(false)
    setSelectedProductId("")
    setAdjustmentStock("")
    setAdjustmentReason(
      "correcao_contagem",
    )
    setNote("")
    setError("")
  }

  function selectProductForMovements(
    productId: string,
  ) {
    setMovementProductId(
      productId,
    )

    window.setTimeout(() => {
      document
        .getElementById(
          "stock-movements",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
    }, 0)
  }

  async function saveEntry(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isSaving) return

    if (!selectedProduct) {
      setError(
        "Seleciona um produto.",
      )
      return
    }

    const parsedQuantity = Number(
      quantity.replace(",", "."),
    )

    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError(
        "Indica uma quantidade válida.",
      )
      return
    }

    if (
      !Number.isInteger(parsedQuantity)
    ) {
      setError(
        "A quantidade deve ser um número inteiro.",
      )
      return
    }

    setError("")
    setIsSaving(true)

    const now =
      new Date().toISOString()

    try {
      await db.transaction(
        "rw",
        db.products,
        db.stockMovements,
        async () => {
          const currentProduct =
            await db.products.get(
              selectedProduct.id,
            )

          if (!currentProduct) {
            throw new Error(
              "Produto não encontrado.",
            )
          }

          const stockBefore =
            currentProduct.stock

          const stockAfter =
            stockBefore +
            parsedQuantity

          await db.products.update(
            currentProduct.id,
            {
              stock: stockAfter,
              updatedAt: now,
            },
          )

          await db.stockMovements.add(
            {
              id: createId(),
              productId:
                currentProduct.id,
              type: "entrada",
              quantity:
                parsedQuantity,
              stockBefore,
              stockAfter,
              note: note.trim(),
              createdAt: now,
            },
          )
        },
      )

      closeEntryModal()
    } catch (error) {
      console.error(
        "Erro ao registar entrada:",
        error,
      )

      setError(
        "Não foi possível registar a entrada. Tenta novamente.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function saveAdjustment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isSaving) return

    if (!selectedProduct) {
      setError(
        "Seleciona um produto.",
      )
      return
    }

    const parsedStock = Number(
      adjustmentStock.replace(",", "."),
    )

    if (
      !Number.isFinite(parsedStock) ||
      parsedStock < 0
    ) {
      setError(
        "Indica uma quantidade de stock válida.",
      )
      return
    }

    if (!Number.isInteger(parsedStock)) {
      setError(
        "O stock deve ser um número inteiro.",
      )
      return
    }

    const stockBefore =
      selectedProduct.stock

    if (
      parsedStock === stockBefore &&
      !note.trim()
    ) {
      setError(
        "O stock não mudou. Indica uma observação ou altera a quantidade.",
      )
      return
    }

    setError("")
    setIsSaving(true)

    const now =
      new Date().toISOString()

    try {
      await db.transaction(
        "rw",
        db.products,
        db.stockMovements,
        async () => {
          const currentProduct =
            await db.products.get(
              selectedProduct.id,
            )

          if (!currentProduct) {
            throw new Error(
              "Produto não encontrado.",
            )
          }

          const currentStock =
            currentProduct.stock

          await db.products.update(
            currentProduct.id,
            {
              stock: parsedStock,
              updatedAt: now,
            },
          )

          await db.stockMovements.add(
            {
              id: createId(),
              productId:
                currentProduct.id,
              type: "ajuste",
              quantity: Math.abs(
                parsedStock -
                  currentStock,
              ),
              stockBefore:
                currentStock,
              stockAfter:
                parsedStock,
              reason:
                adjustmentReason,
              note: note.trim(),
              createdAt: now,
            },
          )
        },
      )

      closeAdjustmentModal()
    } catch (error) {
      console.error(
        "Erro ao ajustar stock:",
        error,
      )

      setError(
        "Não foi possível ajustar o stock. Tente novamente.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>

              <h1 className="text-[26px] font-semibold tracking - [-0.03em] sm:text-3xl">
                STOCK
              </h1>

            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  openAdjustmentModal()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-soft)] active:scale-[0.98]"
              >
                <ClipboardPenLine
                  size={17}
                />
                <span>
                  Editar stock
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  openEntryModal()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--button-bg)] px-3 text-sm font-semibold text-[var(--button-text)] transition active:scale-[0.98]"
              >
                <Plus size={17} />
                <span>
                  Adicionar
                </span>
              </button>
            </div>
          </div>
        </header>

        <section className="mb-7 grid grid-cols-2 border-y border-[var(--border)] sm:grid-cols-3 lg:grid-cols-6">
          <div className="border-b border-r border-[var(--border)] px-4 py-4 sm:border-b-0">
            <p className="text-xs text-[var(--text-muted)]">
              Produtos ativos
            </p>
            <p className="mt-1 text-xl font-semibold">
              {activeProducts.length}
            </p>
          </div>

          <div className="border-b border-[var(--border)] px-4 py-4 sm:border-b-0 sm:border-r">
            <p className="text-xs text-[var(--text-muted)]">
              Unidades
            </p>
            <p className="mt-1 text-xl font-semibold">
              {totalUnits}
            </p>
          </div>

          <div className="border-b border-r border-[var(--border)] px-4 py-4 sm:border-b-0">
            <p className="text-xs text-[var(--text-muted)]">
              Stock baixo
            </p>
            <p className="mt-1 text-xl font-semibold">
              {lowStockProducts.length}
            </p>
          </div>

          <div className="border-b border-[var(--border)] px-4 py-4 sm:border-b-0 sm:border-r">
            <p className="text-xs text-[var(--text-muted)]">
              Esgotados
            </p>
            <p className="mt-1 text-xl font-semibold">
              {outOfStockProducts.length}
            </p>
          </div>

          <div className="border-r border-[var(--border)] px-4 py-4">
            <p className="text-xs text-[var(--text-muted)]">
              Custo do stock
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {formatMoney(
                totalCostValue,
              )}
            </p>
          </div>

          <div className="px-4 py-4">
            <p className="text-xs text-[var(--text-muted)]">
              Valor de venda
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {formatMoney(
                totalSaleValue,
              )}
            </p>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                Stock atual
              </h2>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Pesquisar produto ou SKU..."
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text)]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value,
                )
              }
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
            >
              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ),
              )}
            </select>
          </div>


          <div className="space-y-2 md:hidden">
            {filteredProducts.length ===
            0 ? (
              <div className="border-y border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                Nenhum produto
                encontrado.
              </div>
            ) : (
              filteredProducts.map(
                (product) => {
                  const status =
                    getStockStatus(
                      product.stock,
                      product.minimumStock,
                    )

                  return (
                    <div
                      key={product.id}
                      className="border-y border-[var(--border)] bg-[var(--surface)] px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {product.name}
                          </p>

                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            {product.sku ||
                              "Sem SKU"}
                          </p>

                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {product.category}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xl font-semibold">
                            {product.stock}
                          </p>

                          <p className="text-[11px] text-[var(--text-muted)]">
                            unidades
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEntryModal(
                                product,
                              )
                            }
                            disabled={
                              !product.active
                            }
                            className="h-9 rounded-md border border-[var(--border)] px-3 text-xs font-medium transition active:opacity-70 disabled:opacity-40"
                          >
                            Adicionar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openAdjustmentModal(
                                product,
                              )
                            }
                            disabled={
                              !product.active
                            }
                            className="h-9 rounded-md bg-[var(--button-bg)] px-3 text-xs font-semibold text-[var(--button-text)] transition active:opacity-70 disabled:opacity-40"
                          >
                            Editar
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-3">
                        <span className="text-xs text-[var(--text-muted)]">
                          Mínimo:{" "}
                          {product.minimumStock}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            selectProductForMovements(
                              product.id,
                            )
                          }
                          className="text-xs font-medium text-[var(--text-secondary)] underline underline-offset-4"
                        >
                          Ver movimentos
                        </button>
                      </div>
                    </div>
                  )
                },
              )
            )}
          </div>

          <div className="hidden overflow-hidden border-y border-[var(--border)] md:block">
            <div className="grid grid-cols-[minmax(220px,2fr)_1fr_.8fr_1fr_1fr_110px] border-b border-[var(--border)] bg-[var(--surface-soft)] px-5 py-3 text-xs font-medium text-[var(--text-muted)]">
              <span>Produto</span>
              <span>Categoria</span>
              <span>Stock</span>
              <span>Mínimo</span>
              <span>Estado</span>
              <span />
            </div>

            {filteredProducts.length ===
            0 ? (
              <div className="px-5 py-16 text-center text-sm text-[var(--text-muted)]">
                Nenhum produto
                encontrado.
              </div>
            ) : (
              filteredProducts.map(
                (product) => {
                  const status =
                    getStockStatus(
                      product.stock,
                      product.minimumStock,
                    )

                  return (
                    <div
                      key={product.id}
                      className={`grid grid-cols-[minmax(220px,2fr)_1fr_.8fr_1fr_1fr_110px] items-center border-b border-[var(--border-soft)] px-5 py-3.5 last:border-b-0 ${
                        !product.active
                          ? "opacity-45"
                          : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {product.name}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                          {product.sku ||
                            "Sem SKU"}
                        </p>
                      </div>

                      <span className="truncate text-sm text-[var(--text-secondary)]">
                        {product.category}
                      </span>

                      <span className="text-sm font-semibold">
                        {product.stock}
                      </span>

                      <span className="text-sm text-[var(--text-secondary)]">
                        {product.minimumStock}
                      </span>

                      <span
                        className={`text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>

                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openEntryModal(
                              product,
                            )
                          }
                          disabled={
                            !product.active
                          }
                          title="Adicionar entrada"
                          className="inline-flex h-8 items-center justify-center rounded-md bg-[var(--button-bg)] px-3 text-xs font-semibold text-[var(--button-text)] transition hover:bg-[var(--button-bg-hover)] active:opacity-70 disabled:opacity-40"
                        >
                          Entrada
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openAdjustmentModal(
                              product,
                            )
                          }
                          disabled={
                            !product.active
                          }
                          title="Ajustar stock"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] transition hover:bg-[var(--surface-soft)] active:opacity-70 disabled:opacity-40"
                        >
                          <ClipboardPenLine
                            size={15}
                          />
                        </button>
                      </div>
                    </div>
                  )
                },
              )
            )}
          </div>
        </section>

        <section
          id="stock-movements"
          className="scroll-mt-6"
        >
          <div className="mb-4">
            <h2 className="text-base font-semibold">
              Movimentos de stock
            </h2>

          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <select
              value={movementType}
              onChange={(event) =>
                setMovementType(
                  event.target.value as
                    | "todos"
                    | StockMovementType,
                )
              }
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
            >
              <option value="todos">
                Todos os movimentos
              </option>

              <option value="entrada">
                Entradas
              </option>

              <option value="venda">
                Vendas
              </option>

              <option value="ajuste">
                Ajustes
              </option>
            </select>

            <select
              value={movementProductId}
              onChange={(event) =>
                setMovementProductId(
                  event.target.value,
                )
              }
              className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
            >
              <option value="todos">
                Todos os produtos
              </option>

              {products.map(
                (product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                ),
              )}
            </select>
          </div>

          {filteredMovements.length ===
          0 ? (
            <div className="border-y border-[var(--border)] px-4 py-14 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Nenhum movimento
                encontrado.
              </p>

            </div>
          ) : (
            <div className="overflow-hidden border-y border-[var(--border)]">
              {filteredMovements.map(
                (movement) => {
                  const product =
                    productMap.get(
                      movement.productId,
                    )

                  const style =
                    getMovementStyle(
                      movement.type,
                    )

                  const Icon =
                    style.icon

                  const variation =
                    formatVariation(
                      movement.type,
                      movement.quantity,
                      movement.stockBefore,
                      movement.stockAfter,
                    )

                  return (
                    <div
                      key={movement.id}
                      className="border-b border-[var(--border-soft)] px-4 py-4 last:border-b-0 sm:px-5"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] ${style.className}`}
                        >
                          <Icon size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {product?.name ??
                                  "Produto removido"}
                              </p>

                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                {style.label}
                                {" · "}
                                {formatDate(
                                  movement.createdAt,
                                )}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 text-sm font-semibold ${style.className}`}
                            >
                              {variation}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                            <span>
                              {movement.stockBefore}
                              {" → "}
                              {movement.stockAfter}
                              {" un."}
                            </span>

                            {movement.type ===
                              "ajuste" &&
                              movement.reason && (
                                <span>
                                  {getAdjustmentReasonLabel(
                                    movement.reason,
                                  )}
                                </span>
                              )}
                          </div>

                          {movement.note && (
                            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                              {movement.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          )}
        </section>
      </div>

      {isEntryModalOpen &&
        selectedProduct && (
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-[2px]">
            <div className="flex h-[100dvh] w-full items-stretch justify-center sm:items-center sm:p-5">
              <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--surface)] sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-xl sm:border sm:border-[var(--border)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 sm:px-5">
                  <div>
                    <h2 className="text-base font-semibold">
                      Adicionar entrada
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={
                      closeEntryModal
                    }
                    disabled={isSaving}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] active:opacity-70 disabled:opacity-40"
                    aria-label="Fechar"
                  >
                    <X size={19} />
                  </button>
                </div>

                <form
                  id="stock-entry-form"
                  onSubmit={saveEntry}
                  className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28 sm:px-5"
                >
                  <div className="space-y-5">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                        Produto
                      </label>

                      <select
                        value={
                          selectedProductId
                        }
                        onChange={(event) => {
                          const product =
                            productMap.get(
                              event.target
                                .value,
                            )

                          setSelectedProductId(
                            event.target
                              .value,
                          )

                          if (product) {
                            setError("")
                          }
                        }}
                        className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
                      >
                        {activeProducts.map(
                          (product) => (
                            <option
                              key={
                                product.id
                              }
                              value={
                                product.id
                              }
                            >
                              {product.name}
                              {" - "}
                              {product.stock}
                              {" un."}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                          Stock atual
                        </label>

                        <div className="flex h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm">
                          {
                            selectedProduct.stock
                          }{" "}
                          unidades
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="stock-entry-quantity"
                          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                        >
                          Quantidade
                        </label>

                        <input
                          id="stock-entry-quantity"
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={
                            quantity
                          }
                          onChange={(
                            event,
                          ) =>
                            setQuantity(
                              event.target
                                .value,
                            )
                          }
                          placeholder="0"
                          autoFocus
                          className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="stock-entry-note"
                        className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Observação
                      </label>

                      <textarea
                        id="stock-entry-note"
                        value={note}
                        onChange={(
                          event,
                        ) =>
                          setNote(
                            event.target
                              .value,
                          )
                        }
                        rows={4}
                        placeholder="Ex.: Compra ao fornecedor..."
                        className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text)]"
                      />
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                        {error}
                      </div>
                    )}
                  </div>
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
                        closeEntryModal
                      }
                      disabled={isSaving}
                      className="flex h-12 flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text)] transition active:opacity-70"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      form="stock-entry-form"
                      disabled={isSaving}
                      className="flex h-12 flex-1 items-center justify-center rounded-lg bg-[var(--button-bg)] text-sm font-semibold text-[var(--button-text)] transition active:opacity-70 disabled:opacity-50"
                    >
                      {isSaving
                        ? "A guardar..."
                        : "Registar entrada"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {isAdjustmentModalOpen &&
        selectedProduct && (
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-[2px]">
            <div className="flex h-[100dvh] w-full items-stretch justify-center sm:items-center sm:p-5">
              <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--surface)] sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-xl sm:border sm:border-[var(--border)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 sm:px-5">
                  <div>
                    <h2 className="text-base font-semibold">
                      Ajustar stock
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={
                      closeAdjustmentModal
                    }
                    disabled={isSaving}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] active:opacity-70 disabled:opacity-40"
                    aria-label="Fechar"
                  >
                    <X size={19} />
                  </button>
                </div>

                <form
                  id="stock-adjustment-form"
                  onSubmit={
                    saveAdjustment
                  }
                  className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28 sm:px-5"
                >
                  <div className="space-y-5">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                        Produto
                      </label>

                      <select
                        value={
                          selectedProductId
                        }
                        onChange={(event) => {
                          const product =
                            productMap.get(
                              event.target
                                .value,
                            )

                          setSelectedProductId(
                            event.target
                              .value,
                          )

                          if (product) {
                            setAdjustmentStock(
                              String(
                                product.stock,
                              ),
                            )
                            setError("")
                          }
                        }}
                        className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
                      >
                        {activeProducts.map(
                          (product) => (
                            <option
                              key={
                                product.id
                              }
                              value={
                                product.id
                              }
                            >
                              {product.name}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                          Stock atual
                        </label>

                        <div className="flex h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm">
                          {
                            selectedProduct.stock
                          }{" "}
                          unidades
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="adjustment-stock"
                          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                        >
                          Nova quantidade
                        </label>

                        <input
                          id="adjustment-stock"
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={
                            adjustmentStock
                          }
                          onChange={(
                            event,
                          ) =>
                            setAdjustmentStock(
                              event.target
                                .value,
                            )
                          }
                          autoFocus
                          className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="adjustment-reason"
                        className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Motivo
                      </label>

                      <select
                        id="adjustment-reason"
                        value={
                          adjustmentReason
                        }
                        onChange={(event) =>
                          setAdjustmentReason(
                            event.target
                              .value as StockAdjustmentReason,
                          )
                        }
                        className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
                      >
                        {adjustmentReasons.map(
                          (reason) => (
                            <option
                              key={reason}
                              value={reason}
                            >
                              {getAdjustmentReasonLabel(
                                reason,
                              )}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="adjustment-note"
                        className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                      >
                        Observação
                      </label>

                      <textarea
                        id="adjustment-note"
                        value={note}
                        onChange={(
                          event,
                        ) =>
                          setNote(
                            event.target
                              .value,
                          )
                        }
                        rows={4}
                        placeholder="Ex.: Contagem física do stock..."
                        className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text)]"
                      />
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                        {error}
                      </div>
                    )}

                    <div className="border-t border-[var(--border)] pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--text-muted)]">
                          Alteração
                        </span>

                        <span
                          className={`font-semibold ${
                            Number(
                              adjustmentStock,
                            ) -
                              selectedProduct.stock >
                            0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : Number(
                                    adjustmentStock,
                                  ) -
                                    selectedProduct.stock <
                                  0
                                ? "text-red-600 dark:text-red-400"
                                : "text-[var(--text-muted)]"
                          }`}
                        >
                          {(() => {
                            const difference =
                              Number(
                                adjustmentStock,
                              ) -
                              selectedProduct.stock

                            if (
                              !Number.isFinite(
                                difference,
                              )
                            ) {
                              return "0"
                            }

                            if (
                              difference > 0
                            ) {
                              return `+${difference}`
                            }

                            return String(
                              difference,
                            )
                          })()}{" "}
                          un.
                        </span>
                      </div>
                    </div>
                  </div>
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
                        closeAdjustmentModal
                      }
                      disabled={isSaving}
                      className="flex h-12 flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text)] transition active:opacity-70"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      form="stock-adjustment-form"
                      disabled={isSaving}
                      className="flex h-12 flex-1 items-center justify-center rounded-lg bg-[var(--button-bg)] text-sm font-semibold text-[var(--button-text)] transition active:opacity-70 disabled:opacity-50"
                    >
                      {isSaving
                        ? "A guardar..."
                        : "Guardar ajuste"}
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
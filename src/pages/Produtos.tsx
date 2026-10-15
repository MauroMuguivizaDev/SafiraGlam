import { useLiveQuery } from "dexie-react-hooks"
import {
  Archive,
  Camera,
  ChevronDown,
  Edit3,
  ImagePlus,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { db, type Product } from "../db/database"

const categories = [
  "Roupas",
  "Cuidados da pele",
  "Vernizes",
  "Bolsas",
  "Perfumes",
  "Maquilhagem",
  "Calçados",
  "Acessórios",
  "+18",
  "Outros",
]

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    maximumFractionDigits: 2,
  }).format(value)

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

    const hex = (start: number, end: number) =>
      [...bytes.slice(start, end)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")

    return [
      hex(0, 4),
      hex(4, 6),
      hex(6, 8),
      hex(8, 10),
      hex(10, 16),
    ].join("-")
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getStockStatus(stock: number, minimumStock: number) {
  if (stock <= 0) {
    return { label: "Esgotado", type: "danger" }
  }

  if (stock <= minimumStock) {
    return { label: "Stock baixo", type: "warning" }
  }

  return { label: "Normal", type: "normal" }
}

function getStatusClass(type: string) {
  if (type === "danger") return "text-red-500"
  if (type === "warning") return "text-[var(--primary)]"
  return "text-[var(--text-muted)]"
}

function getMargin(purchasePrice: number, salePrice: number) {
  if (salePrice <= 0) return 0

  return ((salePrice - purchasePrice) / salePrice) * 100
}

type ProductForm = {
  name: string
  category: string
  purchasePrice: string
  salePrice: string
  stock: string
  minimumStock: string
  sku: string
  description: string
  image?: string
}

const emptyForm: ProductForm = {
  name: "",
  category: "Outros",
  purchasePrice: "",
  salePrice: "",
  stock: "",
  minimumStock: "0",
  sku: "",
  description: "",
  image: "",
}

const inputClass =
  "h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"

async function compressImage(file: File) {
  const bitmap = await createImageBitmap(file)

  const maxSize = 900

  let width = bitmap.width
  let height = bitmap.height

  if (width > height && width > maxSize) {
    height = Math.round((height * maxSize) / width)
    width = maxSize
  }

  if (height > width && height > maxSize) {
    width = Math.round((width * maxSize) / height)
    height = maxSize
  }

  const canvas = document.createElement("canvas")

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("Não foi possível processar a imagem.")
  }

  context.drawImage(bitmap, 0, 0, width, height)

  return canvas.toDataURL("image/jpeg", 0.82)
}

function getDefaultMinimumStock() {
  try {
    const saved = localStorage.getItem("diverse_settings")

    if (!saved) {
      return "5"
    }

    const settings = JSON.parse(saved)

    const minimumStock = Number(settings.defaultMinimumStock)

    if (!Number.isFinite(minimumStock) || minimumStock < 0) {
      return "5"
    }

    return String(minimumStock)
  } catch {
    return "5"
  }
}

export default function Produtos() {
  const products = useLiveQuery(
    () => db.products.orderBy("updatedAt").reverse().toArray(),
    [],
    [],
  )

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("Todas")
  const [showInactive, setShowInactive] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null)

  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [imageError, setImageError] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isModalOpen) return

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isModalOpen])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)

      const matchesCategory =
        categoryFilter === "Todas" ||
        product.category === categoryFilter

      const matchesActive = showInactive || product.active

      return matchesSearch && matchesCategory && matchesActive
    })
  }, [products, search, categoryFilter, showInactive])

  const activeProducts = products.filter((product) => product.active)

  const lowStockProducts = activeProducts.filter(
    (product) =>
      product.stock > 0 && product.stock <= product.minimumStock,
  )

  const outOfStockProducts = activeProducts.filter(
    (product) => product.stock <= 0,
  )

  function openCreateModal() {
    setEditingProduct(null)
    setForm({
      ...emptyForm,
      minimumStock: getDefaultMinimumStock(),
    })
    setImageError("")
    setIsModalOpen(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)

    setForm({
      name: product.name,
      category: product.category,
      purchasePrice: String(product.purchasePrice),
      salePrice: String(product.salePrice),
      stock: String(product.stock),
      minimumStock: String(product.minimumStock),
      sku: product.sku,
      description: product.description,
      image: product.image ?? "",
    })

    setImageError("")
    setIsModalOpen(true)
  }

  function closeModal() {
    if (isSaving) return

    setIsModalOpen(false)
    setEditingProduct(null)
    setForm(emptyForm)
    setImageError("")
  }

  async function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    setImageError("")

    if (!file.type.startsWith("image/")) {
      setImageError("Escolhe uma imagem válida.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError("A imagem deve ter no máximo 10 MB.")
      return
    }

    try {
      const compressed = await compressImage(file)

      setForm((current) => ({
        ...current,
        image: compressed,
      }))
    } catch (error) {
      console.error(error)
      setImageError("Não foi possível carregar a imagem.")
    } finally {
      event.target.value = ""
    }
  }

  function removeImage() {
    setForm((current) => ({
      ...current,
      image: "",
    }))
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSaving) return

    const name = form.name.trim()

    if (!name) {
      setImageError("Insira o nome do produto.")
      return
    }

    const purchasePrice = Number(form.purchasePrice.replace(",", "."))
    const salePrice = Number(form.salePrice.replace(",", "."))
    const stock = Number(form.stock.replace(",", "."))
    const minimumStock = Number(form.minimumStock.replace(",", "."))

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      setImageError("Insira um preço de compra válido.")
      return
    }

    if (!Number.isFinite(salePrice) || salePrice < 0) {
      setImageError("Insira um preço de venda válido.")
      return
    }

    if (!Number.isFinite(stock) || stock < 0) {
      setImageError("Insira um stock válido.")
      return
    }

    if (!Number.isFinite(minimumStock) || minimumStock < 0) {
      setImageError("Insira um stock mínimo válido.")
      return
    }

    setImageError("")
    setIsSaving(true)

    const now = new Date().toISOString()

    try {
      await db.transaction(
        "rw",
        db.products,
        db.priceHistory,
        async () => {
          if (editingProduct) {
            const pricesChanged =
              editingProduct.purchasePrice !== purchasePrice ||
              editingProduct.salePrice !== salePrice

            await db.products.update(editingProduct.id, {
              name,
              category: form.category,
              purchasePrice,
              salePrice,
              stock,
              minimumStock,
              sku: form.sku.trim(),
              description: form.description.trim(),
              image: form.image || "",
              updatedAt: now,
            })

            if (pricesChanged) {
              await db.priceHistory.add({
                id: createId(),
                productId: editingProduct.id,
                purchasePrice,
                salePrice,
                changedAt: now,
              })
            }
          } else {
            const productId = createId()

            const newProduct: Product = {
              id: productId,
              name,
              category: form.category,
              purchasePrice,
              salePrice,
              stock,
              minimumStock,
              sku: form.sku.trim(),
              description: form.description.trim(),
              image: form.image || "",
              active: true,
              createdAt: now,
              updatedAt: now,
            }

            await db.products.add(newProduct)

            await db.priceHistory.add({
              id: createId(),
              productId,
              purchasePrice,
              salePrice,
              changedAt: now,
            })
          }
        },
      )

      setIsModalOpen(false)
      setEditingProduct(null)
      setForm({ ...emptyForm })
      setImageError("")
    } catch (error) {
      console.error("Erro ao guardar produto:", error)

      setImageError(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar o produto. Tenta novamente.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleProduct(product: Product) {
    try {
      await db.products.update(product.id, {
        active: !product.active,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Erro ao alterar estado:", error)
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Eliminar "${product.name}"?\n\nEsta ação não pode ser desfeita.`,
    )

    if (!confirmed) return

    try {
      await db.transaction(
        "rw",
        db.products,
        db.priceHistory,
        async () => {
          await db.products.delete(product.id)

          await db.priceHistory
            .where("productId")
            .equals(product.id)
            .delete()
        },
      )
    } catch (error) {
      console.error("Erro ao eliminar produto:", error)
      window.alert("Não foi possível eliminar o produto. Tente novamente.")
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-10 lg:px-10">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-3xl">
                PRODUTOS
              </h1>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {activeProducts.length} produto(s) ativos
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--button-bg)] px-3 text-sm font-medium text-[var(--button-text)] transition hover:bg-[var(--button-bg-hover)] active:opacity-80 sm:h-11 sm:px-4"
            >
              <Plus size={18} strokeWidth={2} />
              <span>Adicionar</span>
            </button>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-3 border-y border-[var(--border)]">
          <div className="px-2 py-4 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">Ativos</p>
            <p className="mt-1 text-lg font-semibold">
              {activeProducts.length}
            </p>
          </div>

          <div className="border-l border-[var(--border)] px-2 py-4 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">Stock baixo</p>
            <p className="mt-1 text-lg font-semibold">
              {lowStockProducts.length}
            </p>
          </div>

          <div className="border-l border-[var(--border)] px-2 py-4 sm:px-4">
            <p className="text-xs text-[var(--text-muted)]">Esgotados</p>
            <p className="mt-1 text-lg font-semibold">
              {outOfStockProducts.length}
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar produto ou SKU"
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <div className="relative shrink-0">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-9 appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 pr-8 text-xs text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
              >
                <option value="Todas">Todas as categorias</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowInactive((current) => !current)}
              className={`h-9 shrink-0 rounded-md border px-3 text-xs transition ${
                showInactive
                  ? "border-transparent bg-[var(--button-bg)] text-[var(--button-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              }`}
            >
              {showInactive ? "Ocultar inativos" : "Mostrar inativos"}
            </button>
          </div>
        </section>

        {/* Computador */}
        <section className="hidden overflow-hidden border-y border-[var(--border)] md:block">
          <div className="grid grid-cols-[minmax(240px,2fr)_1.1fr_.8fr_1fr_.8fr_120px] border-b border-[var(--border)] bg-[var(--surface-soft)] px-5 py-3 text-xs font-medium text-[var(--text-muted)]">
            <span>Produto</span>
            <span>Categoria</span>
            <span>Stock</span>
            <span>Preço</span>
            <span>Margem</span>
            <span />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-[var(--text-muted)]">
              Nenhum produto encontrado.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const status = getStockStatus(
                product.stock,
                product.minimumStock,
              )

              const margin = getMargin(
                product.purchasePrice,
                product.salePrice,
              )

              return (
                <div
                  key={product.id}
                  className={`grid grid-cols-[minmax(240px,2fr)_1.1fr_.8fr_1fr_.8fr_120px] items-center border-b border-[var(--border-soft)] px-5 py-3.5 last:border-b-0 ${
                    !product.active ? "opacity-45" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-muted)]">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                          <Package size={18} strokeWidth={1.7} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {product.name}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                        {product.sku || "Sem SKU"}
                      </p>
                    </div>
                  </div>

                  <span className="truncate text-sm text-[var(--text-secondary)]">
                    {product.category}
                  </span>

                  <div>
                    <span className="text-sm font-medium">
                      {product.stock}
                    </span>

                    <span className="ml-1 text-xs text-[var(--text-muted)]">
                      un.
                    </span>

                    <p
                      className={`mt-0.5 text-xs ${getStatusClass(status.type)}`}
                    >
                      {status.label}
                      {!product.active && " · Inativo"}
                    </p>
                  </div>

                  <span className="text-sm text-[var(--text-secondary)]">
                    {formatMoney(product.salePrice)}
                  </span>

                  <span className="text-sm text-[var(--text-secondary)]">
                    {margin.toFixed(1)}%
                  </span>

                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                      title="Editar"
                    >
                      <Edit3 size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleProduct(product)}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                      title={product.active ? "Desativar" : "Ativar"}
                      aria-label={
                        product.active
                          ? "Desativar produto"
                          : "Ativar produto"
                      }
                    >
                      <Archive size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteProduct(product)}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </section>

        <section className="md:hidden">
          {filteredProducts.length === 0 ? (
            <div className="border-y border-[var(--border)] py-16 text-center text-sm text-[var(--text-muted)]">
              Nenhum produto encontrado.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const status = getStockStatus(
                product.stock,
                product.minimumStock,
              )

              return (
                <div
                  key={product.id}
                  className={`flex gap-3 border-b border-[var(--border)] py-4 ${
                    !product.active ? "opacity-45" : ""
                  }`}
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-muted)]">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                        <Package size={21} strokeWidth={1.6} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-medium">
                          {product.name}
                        </h2>

                        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                          {product.category}
                          {product.sku ? ` · ${product.sku}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleProduct(product)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                          title={product.active ? "Desativar" : "Ativar"}
                          aria-label={
                            product.active
                              ? "Desativar produto"
                              : "Ativar produto"
                          }
                        >
                          <Archive size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteProduct(product)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">
                          Stock
                        </p>

                        <p className="mt-0.5 text-sm font-medium">
                          {product.stock} unidades
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-[var(--text-muted)]">
                          Preço
                        </p>

                        <p className="mt-0.5 text-sm font-medium">
                          {formatMoney(product.salePrice)}
                        </p>
                      </div>
                    </div>

                    <p
                      className={`mt-2 text-xs ${getStatusClass(status.type)}`}
                    >
                      {status.label}
                      {!product.active && " · Inativo"}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-[2px]">
          <div className="flex h-[100dvh] w-full items-stretch justify-center sm:items-center sm:p-5">
            <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--surface)] sm:h-[90dvh] sm:max-h-[760px] sm:max-w-2xl sm:rounded-xl sm:border sm:border-[var(--border)] sm:shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
                <h2 className="text-lg font-semibold">
                  {editingProduct ? "Editar produto" : "Novo produto"}
                </h2>

                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                id="product-form"
                noValidate
                onSubmit={saveProduct}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
                  <div className="space-y-6 px-4 py-5 pb-6 sm:px-6 sm:py-6">
                    <section>
                      <div className="flex items-center gap-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
                          {form.image ? (
                            <img
                              src={form.image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--text-muted)]">
                              <ImagePlus size={23} />
                              <span className="text-[10px]">Sem foto</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-medium">
                            Foto do produto
                          </p>

                          <p className="mt-1 max-w-[230px] text-xs leading-5 text-[var(--text-muted)]">
                            Opcional.
                          </p>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs font-medium transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                            >
                              <Camera size={15} />

                              {form.image ? "Trocar foto" : "Adicionar foto"}
                            </button>

                            {form.image && (
                              <button
                                type="button"
                                onClick={removeImage}
                                className="h-9 rounded-md px-2.5 text-xs text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                              >
                                Remover
                              </button>
                            )}
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {imageError && (
                        <p className="mt-2 text-xs text-red-500">
                          {imageError}
                        </p>
                      )}
                    </section>


                    <div>
                      <label
                        htmlFor="product-name"
                        className="mb-2 block text-sm font-medium"
                      >
                        Nome
                      </label>

                      <input
                        id="product-name"
                        type="text"
                        value={form.name}
                        onChange={(event) =>
                          setForm({ ...form, name: event.target.value })
                        }
                        placeholder="Ex.: Máscara Facial"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="product-category"
                        className="mb-2 block text-sm font-medium"
                      >
                        Categoria
                      </label>

                      <div className="relative">
                        <select
                          id="product-category"
                          value={form.category}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              category: event.target.value,
                            })
                          }
                          className={`${inputClass} appearance-none pr-10`}
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="purchase-price"
                          className="mb-2 block text-sm font-medium"
                        >
                          Compra
                        </label>

                        <div className="relative">
                          <input
                            id="purchase-price"
                            type="text"
                            inputMode="decimal"
                            value={form.purchasePrice}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                purchasePrice: event.target.value,
                              })
                            }
                            placeholder="0,00"
                            className={`${inputClass} pr-12`}
                          />

                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                            MT
                          </span>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="sale-price"
                          className="mb-2 block text-sm font-medium"
                        >
                          Venda
                        </label>

                        <div className="relative">
                          <input
                            id="sale-price"
                            type="text"
                            inputMode="decimal"
                            value={form.salePrice}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                salePrice: event.target.value,
                              })
                            }
                            placeholder="0,00"
                            className={`${inputClass} pr-12`}
                          />

                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                            MT
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="product-stock"
                          className="mb-2 block text-sm font-medium"
                        >
                          Stock
                        </label>

                        <input
                          id="product-stock"
                          type="number"
                          min="0"
                          step="1"
                          value={form.stock}
                          onChange={(event) =>
                            setForm({ ...form, stock: event.target.value })
                          }
                          placeholder="0"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="minimum-stock"
                          className="mb-2 block text-sm font-medium"
                        >
                          Stock mínimo
                        </label>

                        <input
                          id="minimum-stock"
                          type="number"
                          min="0"
                          step="1"
                          value={form.minimumStock}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              minimumStock: event.target.value,
                            })
                          }
                          placeholder="0"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="product-sku"
                        className="mb-2 block text-sm font-medium"
                      >
                        SKU (Opcional)
                      </label>

                      <input
                        id="product-sku"
                        type="text"
                        value={form.sku}
                        onChange={(event) =>
                          setForm({ ...form, sku: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="product-description"
                        className="mb-2 block text-sm font-medium"
                      >
                        Descrição (Opcional)
                      </label>

                      <textarea
                        id="product-description"
                        value={form.description}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            description: event.target.value,
                          })
                        }
                        rows={4}
                        className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="absolute inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]"
                  style={{
                    paddingBottom: "env(safe-area-inset-bottom)",
                  }}
                >
                  <div className="flex gap-2 p-3 sm:p-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSaving}
                      className="h-12 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text)] transition active:opacity-70"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      form="product-form"
                      disabled={isSaving}
                      className="h-12 flex-1 rounded-lg bg-[var(--button-bg)] text-sm font-semibold text-[var(--button-text)] transition active:opacity-70 disabled:opacity-50"
                    >
                      {isSaving ? "A guardar..." : "Guardar"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
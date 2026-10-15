import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  ChevronRight,
  Download,
  FileSpreadsheet,
  HardDrive,
  Moon,
  Palette,
  RotateCcw,
  Settings2,
  Share2,
  ShieldCheck,
  Store,
  Sun,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  db,
  type CashMovement,
  type PriceHistory,
  type Product,
  type Sale,
  type StockMovement,
} from "../db/database"
type Theme = "light" | "dark"

interface Settings {
  storeName: string
  phone: string
  theme: Theme
  defaultMinimumStock: number
  allowSaleWithoutStock: boolean
  showProfitOnSale: boolean
  confirmSale: boolean
  lowStockAlerts: boolean
  outOfStockAlerts: boolean
}

const DEFAULT_SETTINGS: Settings = {
  storeName: "Diverse",
  phone: "",
  theme: "light",
  defaultMinimumStock: 5,
  allowSaleWithoutStock: false,
  showProfitOnSale: true,
  confirmSale: true,
  lowStockAlerts: true,
  outOfStockAlerts: true,
}

type Section = "loja" | "vendas" | "stock" | "aparencia" | "dados" | null

type NoticeState = { type: "ok" | "error"; text: string } | null

const SETTINGS_KEY = "diverse_settings"
const BACKUP_KEY = "diverse_last_backup"
const BACKUP_VERSION = 1
const BACKUP_REMINDER_DAYS = 7


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(
  data: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = data[key]
  return typeof value === "string" ? value : fallback
}

function readBoolean(
  data: Record<string, unknown>,
  key: string,
  fallback: boolean,
) {
  const value = data[key]
  return typeof value === "boolean" ? value : fallback
}

function sanitizeSettings(value: unknown): Settings {
  if (!isRecord(value)) return DEFAULT_SETTINGS

  const minimum = value.defaultMinimumStock

  return {
    storeName: readString(value, "storeName", DEFAULT_SETTINGS.storeName),
    phone: readString(value, "phone", DEFAULT_SETTINGS.phone),
    theme: value.theme === "dark" ? "dark" : "light",
    defaultMinimumStock:
      typeof minimum === "number" && Number.isFinite(minimum) && minimum >= 0
        ? minimum
        : DEFAULT_SETTINGS.defaultMinimumStock,
    allowSaleWithoutStock: readBoolean(
      value,
      "allowSaleWithoutStock",
      DEFAULT_SETTINGS.allowSaleWithoutStock,
    ),
    showProfitOnSale: readBoolean(
      value,
      "showProfitOnSale",
      DEFAULT_SETTINGS.showProfitOnSale,
    ),
    confirmSale: readBoolean(
      value,
      "confirmSale",
      DEFAULT_SETTINGS.confirmSale,
    ),
    lowStockAlerts: readBoolean(
      value,
      "lowStockAlerts",
      DEFAULT_SETTINGS.lowStockAlerts,
    ),
    outOfStockAlerts: readBoolean(
      value,
      "outOfStockAlerts",
      DEFAULT_SETTINGS.outOfStockAlerts,
    ),
  }
}

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? sanitizeSettings(JSON.parse(saved)) : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* armazenamento cheio ou bloqueado: ignora */
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("pt-MZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function daysSince(iso: string) {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY
  return Math.floor((Date.now() - time) / 86_400_000)
}

function describeLastBackup(iso: string | null) {
  if (!iso) return "nunca"

  const days = daysSince(iso)
  if (days <= 0) return "hoje"
  if (days === 1) return "ontem"
  return `há ${days} dias`
}

function getLastBackup(): string | null {
  try {
    return localStorage.getItem(BACKUP_KEY)
  } catch {
    return null
  }
}


async function readAllData() {
  return db.transaction(
    "r",
    [db.products, db.priceHistory, db.stockMovements, db.sales, db.cashMovements],
    async () => ({
      products: await db.products.toArray(),
      priceHistory: await db.priceHistory.toArray(),
      stockMovements: await db.stockMovements.toArray(),
      sales: await db.sales.toArray(),
      cashMovements: await db.cashMovements.toArray(),
    }),
  )
}

type BackupData = Awaited<ReturnType<typeof readAllData>>

interface BackupFile {
  app: "diverse"
  version: number
  exportedAt: string
  settings: Settings
  data: BackupData
}

async function buildBackup(settings: Settings): Promise<BackupFile> {
  return {
    app: "diverse",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    data: await readAllData(),
  }
}

function rowsWithId<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (row): row is T =>
      isRecord(row) && typeof row.id === "string" && row.id !== "",
  )
}

function parseBackup(text: string): BackupFile {
  const raw: unknown = JSON.parse(text)

  if (!isRecord(raw) || raw.app !== "diverse" || !isRecord(raw.data)) {
    throw new Error("Ficheiro que não é um backup do Diverse.")
  }

  const data = raw.data

  return {
    app: "diverse",
    version: typeof raw.version === "number" ? raw.version : 1,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    settings: sanitizeSettings(raw.settings),
    data: {
      products: rowsWithId<Product>(data.products),
      priceHistory: rowsWithId<PriceHistory>(data.priceHistory),
      stockMovements: rowsWithId<StockMovement>(data.stockMovements),
      sales: rowsWithId<Sale>(data.sales),
      cashMovements: rowsWithId<CashMovement>(data.cashMovements),
    },
  }
}

function backupFileName() {
  return `diverse-backup-${dateStamp()}.json`
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function supportsFileShare() {
  try {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({
        files: [new File(["{}"], "teste.json", { type: "application/json" })],
      })
    )
  } catch {
    return false
  }
}

function limitExcelText(value: unknown, maxLength = 32767) {
  const text = typeof value === "string" ? value : String(value ?? "")

  return text.length <= maxLength
    ? text
    : `${text.slice(0, maxLength - 20)}... [cortado]`
}

async function exportExcelFile() {
  const XLSX = await import("xlsx")
  const data = await readAllData()
  const names = new Map(data.products.map((product) => [product.id, product.name]))
  const workbook = XLSX.utils.book_new()

  const addSheet = (name: string, rows: Record<string, unknown>[]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name)
  }

  addSheet(
    "Produtos",
    data.products.map((product) => ({
      Nome: limitExcelText(product.name),
      Categoria: limitExcelText(product.category),
      "Preço de compra": product.purchasePrice,
      "Preço de venda": product.salePrice,
      Stock: product.stock,
      "Stock mínimo": product.minimumStock,
      Código: limitExcelText(product.sku),
      Activo: product.active ? "Sim" : "Não",
      Actualizado: product.updatedAt,
    })),
  )

  addSheet(
    "Vendas",
    data.sales.map((sale) => ({
      Data: sale.createdAt,
      Produto: limitExcelText(sale.productName),
      Quantidade: sale.quantity,
      "Preço unitário": sale.unitPrice,
      Total: sale.total,
      Custo: sale.totalCost,
      Lucro: sale.grossProfit,
      Pagamento: sale.paymentMethod ?? "dinheiro",
      Estado: sale.status,
    })),
  )

  addSheet(
    "Caixa",
    data.cashMovements.map((movement) => ({
      Data: movement.createdAt,
      Tipo: movement.type,
      Motivo: limitExcelText(movement.reason),
      Valor: movement.amount,
      Forma: movement.method,
      Para: movement.toMethod ?? "",
      Nota: limitExcelText(movement.note),
    })),
  )

  addSheet(
    "Movimentos de stock",
    data.stockMovements.map((movement) => ({
      Data: movement.createdAt,
      Produto: limitExcelText(
        names.get(movement.productId) ?? movement.productId,
      ),
      Tipo: movement.type,
      Quantidade: movement.quantity,
      "Stock antes": movement.stockBefore,
      "Stock depois": movement.stockAfter,
      Motivo: movement.reason ?? "",
      Nota: limitExcelText(movement.note),
    })),
  )

  addSheet(
    "Histórico de preços",
    data.priceHistory.map((history) => ({
      Data: history.changedAt,
      Produto: limitExcelText(
        names.get(history.productId) ?? history.productId,
      ),
      "Preço de compra": history.purchasePrice,
      "Preço de venda": history.salePrice,
    })),
  )

  XLSX.writeFile(workbook, `diverse-relatorio-${dateStamp()}.xlsx`)
}


function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) ${
        checked ? "bg-(--text)" : "bg-(--border)"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-(--surface) shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

function SettingRow({
  title,
  description,
  children,
  onClick,
  chevron = true,
  danger = false,
  disabled = false,
}: {
  title: string
  description?: string
  children?: ReactNode
  onClick?: () => void
  chevron?: boolean
  danger?: boolean
  disabled?: boolean
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            danger ? "text-red-600" : "text-(--text)"
          }`}
        >
          {title}
        </p>

        {description && (
          <p className="mt-1 text-xs leading-5 text-(--text-muted)">
            {description}
          </p>
        )}
      </div>

      {children}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center gap-4 border-b border-(--border) px-4 py-4 text-left transition last:border-b-0 hover:bg-(--surface-muted) disabled:opacity-50"
      >
        {content}

        {chevron && (
          <ChevronRight
            size={18}
            strokeWidth={1.7}
            className="shrink-0 text-(--text-muted)"
          />
        )}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-4 border-b border-(--border) px-4 py-4 last:border-b-0">
      {content}
    </div>
  )
}

function Group({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-(--text-muted)">
        {title}
      </h2>

      <div className="overflow-hidden border-y border-(--border)">
        {children}
      </div>
    </section>
  )
}

function Header({
  title,
  subtitle,
  onBack,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
}) {
  return (
    <header className="mb-7 flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-(--text-muted) transition hover:bg-(--surface-muted) hover:text-(--text)"
        >
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text)">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1 text-sm text-(--text-muted)">{subtitle}</p>
        )}
      </div>
    </header>
  )
}

function Notice({ notice }: { notice: NoticeState }) {
  if (!notice) return null

  return (
    <p
      role="status"
      className={`mb-5 rounded-lg px-4 py-3 text-sm ${
        notice.type === "ok"
          ? "bg-(--primary-soft) text-(--primary)"
          : "bg-(--surface-muted) text-red-600"
      }`}
    >
      {notice.text}
    </p>
  )
}

const fieldClass =
  "mt-2 w-full border-b border-(--border) bg-transparent py-2 text-sm text-(--text) outline-none focus:border-(--text)"

const THEME_OPTIONS: {
  value: Theme
  label: string
  description: string
  icon: LucideIcon
}[] = [
  { value: "light", label: "Claro", description: "Interface clara.", icon: Sun },
  { value: "dark", label: "Escuro", description: "Interface escura.", icon: Moon },
]


export default function Definicoes() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [section, setSection] = useState<Section>(null)
  const [notice, setNotice] = useState<NoticeState>(null)
  const [busy, setBusy] = useState(false)

  const [lastBackup, setLastBackup] = useState<string | null>(() =>
    getLastBackup(),
  )
  const [canShare] = useState(() => supportsFileShare())
  const [persisted, setPersisted] = useState<boolean | null>(null)

  const [pending, setPending] = useState<{
    fileName: string
    backup: BackupFile
  } | null>(null)

  const [showDelete, setShowDelete] = useState(false)
  const [deleteText, setDeleteText] = useState("")

  const counts = useLiveQuery(async () => {
    const [products, sales, cash, movements] = await Promise.all([
      db.products.count(),
      db.sales.count(),
      db.cashMovements.count(),
      db.stockMovements.count(),
    ])

    return { products, sales, cash, movements }
  }, [])

  const hasData = counts
    ? counts.products + counts.sales + counts.cash > 0
    : false

  const backupOverdue =
    hasData &&
    (lastBackup === null || daysSince(lastBackup) >= BACKUP_REMINDER_DAYS)

  useEffect(() => {
    applyTheme(settings.theme)
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.storage?.persisted !== "function"
    ) {
      return
    }

    navigator.storage
      .persisted()
      .then(setPersisted)
      .catch(() => setPersisted(null))
  }, [])

  function notify(type: "ok" | "error", text: string) {
    setNotice({ type, text })
  }

  function openSection(next: Section) {
    setNotice(null)
    setPending(null)
    setShowDelete(false)
    setDeleteText("")
    setSection(next)
  }

  function updateSetting<K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Restaurar todas as definições para os valores padrão?",
    )

    if (!confirmed) return

    setSettings(DEFAULT_SETTINGS)
    notify("ok", "Definições restauradas.")
  }

  function markBackupDone() {
    const now = new Date().toISOString()

    try {
      localStorage.setItem(BACKUP_KEY, now)
    } catch {
      /* ignora */
    }

    setLastBackup(now)
  }

  async function handleDownloadBackup() {
    try {
      setBusy(true)
      setNotice(null)

      const backup = await buildBackup(settings)
      const blob = new Blob([JSON.stringify(backup)], {
        type: "application/json",
      })

      downloadBlob(blob, backupFileName())
      markBackupDone()
      notify("ok", "Backup guardado no dispositivo.")
    } catch (error) {
      console.error(error)
      notify("error", "Não foi possível criar o backup.")
    } finally {
      setBusy(false)
    }
  }

  async function handleShareBackup() {
    try {
      setBusy(true)
      setNotice(null)

      const backup = await buildBackup(settings)
      const file = new File([JSON.stringify(backup)], backupFileName(), {
        type: "application/json",
      })

      await navigator.share({ files: [file], title: "Backup Diverse" })

      markBackupDone()
      notify("ok", "Backup partilhado.")
    } catch (error) {
      // O utilizador fechou a janela de partilha: não é um erro.
      if (error instanceof DOMException && error.name === "AbortError") return

      console.error(error)
      notify("error", "Não foi possível partilhar o backup.")
    } finally {
      setBusy(false)
    }
  }

  async function handleExportExcel() {
    try {
      setBusy(true)
      setNotice(null)

      await exportExcelFile()
      notify("ok", "Relatório Excel exportado.")
    } catch (error) {
      console.error(error)
      notify("error", "Não foi possível exportar o relatório.")
    } finally {
      setBusy(false)
    }
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    event.target.value = ""

    if (!file) return

    try {
      setNotice(null)

      const backup = parseBackup(await file.text())

      setPending({ fileName: file.name, backup })
    } catch (error) {
      console.error(error)
      setPending(null)
      notify(
        "error",
        "Este ficheiro não é um backup válido do Diverse. Use um ficheiro .json criado nesta página.",
      )
    }
  }

  async function confirmRestore() {
    if (!pending) return

    try {
      setBusy(true)

      const { data } = pending.backup

      await db.transaction(
        "rw",
        [
          db.products,
          db.priceHistory,
          db.stockMovements,
          db.sales,
          db.cashMovements,
        ],
        async () => {
          await db.products.clear()
          await db.priceHistory.clear()
          await db.stockMovements.clear()
          await db.sales.clear()
          await db.cashMovements.clear()

          await db.products.bulkPut(data.products)
          await db.priceHistory.bulkPut(data.priceHistory)
          await db.stockMovements.bulkPut(data.stockMovements)
          await db.sales.bulkPut(data.sales)
          await db.cashMovements.bulkPut(data.cashMovements)
        },
      )

      setSettings(pending.backup.settings)
      setPending(null)
      notify("ok", "Dados restaurados com sucesso.")
    } catch (error) {
      console.error(error)
      notify(
        "error",
        "Não foi possível restaurar. Os dados actuais não foram alterados.",
      )
    } finally {
      setBusy(false)
    }
  }

  async function protectStorage() {
    try {
      const granted = await navigator.storage.persist()

      setPersisted(granted)
      notify(
        granted ? "ok" : "error",
        granted
          ? "Dados protegidos neste dispositivo."
          : "O navegador não autorizou. Instale a app no ecrã inicial e tente de novo.",
      )
    } catch {
      notify("error", "Não foi possível pedir protecção.")
    }
  }

  async function deleteAllData() {
    if (deleteText.trim().toUpperCase() !== "APAGAR") return

    try {
      setBusy(true)

      await db.transaction(
        "rw",
        [
          db.products,
          db.priceHistory,
          db.stockMovements,
          db.sales,
          db.cashMovements,
        ],
        async () => {
          await db.products.clear()
          await db.priceHistory.clear()
          await db.stockMovements.clear()
          await db.sales.clear()
          await db.cashMovements.clear()
        },
      )

      setShowDelete(false)
      setDeleteText("")
      notify("ok", "Todos os dados foram apagados.")
    } catch (error) {
      console.error(error)
      notify("error", "Não foi possível apagar os dados.")
    } finally {
      setBusy(false)
    }
  }


  function renderLoja() {
    return (
      <Group title="">
        <div className="border-b border-(--border) px-4 py-4">
          <label
            htmlFor="store-name"
            className="block text-sm font-medium text-(--text)"
          >
            Nome da loja
          </label>

          <input
            id="store-name"
            type="text"
            value={settings.storeName}
            onChange={(event) => updateSetting("storeName", event.target.value)}
            className={fieldClass}
            placeholder="Nome da loja"
          />
        </div>

        <div className="px-4 py-4">
          <label
            htmlFor="store-phone"
            className="block text-sm font-medium text-(--text)"
          >
            Telefone
          </label>

          <input
            id="store-phone"
            type="tel"
            inputMode="tel"
            value={settings.phone}
            onChange={(event) => updateSetting("phone", event.target.value)}
            className={fieldClass}
            placeholder="Contacto da loja"
          />
        </div>
      </Group>
    )
  }

  function renderVendas() {
    return (
      <Group title="">
        <SettingRow
          title="Vender sem stock"
          description="Permitir vendas mesmo quando o stock disponível não é suficiente."
        >
          <Toggle
            label="Vender sem stock"
            checked={settings.allowSaleWithoutStock}
            onChange={(value) => updateSetting("allowSaleWithoutStock", value)}
          />
        </SettingRow>

        <SettingRow
          title="Mostrar lucro"
          description="Mostrar custo e lucro durante a venda e nos detalhes."
        >
          <Toggle
            label="Mostrar lucro"
            checked={settings.showProfitOnSale}
            onChange={(value) => updateSetting("showProfitOnSale", value)}
          />
        </SettingRow>

        <SettingRow
          title="Confirmar venda"
          description="Pedir confirmação antes de concluir uma venda."
        >
          <Toggle
            label="Confirmar venda"
            checked={settings.confirmSale}
            onChange={(value) => updateSetting("confirmSale", value)}
          />
        </SettingRow>
      </Group>
    )
  }

  function renderStock() {
    return (
      <>
        <Group title="">
          <div className="px-4 py-4">
            <label
              htmlFor="minimum-stock"
              className="block text-sm font-medium text-(--text)"
            >
              Stock mínimo padrão
            </label>

            <p className="mt-1 text-xs text-(--text-muted)">
              Valor usado ao criar novos produtos.
            </p>

            <input
              id="minimum-stock"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={settings.defaultMinimumStock}
              onChange={(event) => {
                const value = Number(event.target.value)

                updateSetting(
                  "defaultMinimumStock",
                  Number.isFinite(value) ? Math.max(0, value) : 0,
                )
              }}
              className={`${fieldClass} max-w-xs`}
            />
          </div>
        </Group>

        <Group title="">
          <SettingRow
            title="Stock baixo"
            description="Avisar quando o stock atingir o mínimo definido."
          >
            <Toggle
              label="Alerta de stock baixo"
              checked={settings.lowStockAlerts}
              onChange={(value) => updateSetting("lowStockAlerts", value)}
            />
          </SettingRow>

          <SettingRow
            title="Produto esgotado"
            description="Avisar quando um produto ficar sem stock."
          >
            <Toggle
              label="Alerta de produto esgotado"
              checked={settings.outOfStockAlerts}
              onChange={(value) => updateSetting("outOfStockAlerts", value)}
            />
          </SettingRow>
        </Group>
      </>
    )
  }

  function renderAparencia() {
    return (
      <Group title="">
        <div role="radiogroup" aria-label="Tema">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon
            const selected = settings.theme === option.value

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => updateSetting("theme", option.value)}
                className="flex w-full items-center gap-4 border-b border-(--border) px-4 py-4 text-left transition last:border-b-0 hover:bg-(--surface-muted)"
              >
                <Icon
                  size={19}
                  strokeWidth={1.8}
                  className="text-(--text-muted)"
                />

                <div className="flex-1">
                  <p className="text-sm font-medium text-(--text)">
                    {option.label}
                  </p>

                  <p className="mt-1 text-xs text-(--text-muted)">
                    {option.description}
                  </p>
                </div>

                <span
                  className={`h-4 w-4 rounded-full border ${
                    selected
                      ? "border-(--text) bg-(--text)"
                      : "border-(--border) bg-transparent"
                  }`}
                />
              </button>
            )
          })}
        </div>
      </Group>
    )
  }

  function renderDados() {
    return (
      <>
        <Notice notice={notice} />

        <section className="mb-7 rounded-lg bg-(--primary-soft) px-5 py-5">
          <div className="flex items-center gap-2 text-(--primary)">
            <ShieldCheck size={17} strokeWidth={1.8} />
            <p className="text-xs font-medium">Último backup</p>
          </div>

          <p className="mt-2 text-xl font-semibold capitalize text-(--primary)">
            {describeLastBackup(lastBackup)}
          </p>

          {lastBackup && (
            <p className="mt-1 text-xs text-(--text-muted)">
              {formatDateTime(lastBackup)}
            </p>
          )}

          {counts && (
            <p className="mt-3 text-xs text-(--text-muted)">
              {counts.products} produtos · {counts.sales} vendas ·{" "}
              {counts.cash} movimentos de caixa
            </p>
          )}
        </section>

        <div className="space-y-7">
          <Group title="Backup">
            <SettingRow
              title="Guardar backup"
              
              onClick={handleDownloadBackup}
              chevron={false}
              disabled={busy}
            >
              <Download
                size={19}
                strokeWidth={1.8}
                className="text-(--text-muted)"
              />
            </SettingRow>

            {canShare && (
              <SettingRow
                title="Partilhar backup"
                description="Enviar por WhatsApp, e-mail ou guardar na nuvem."
                onClick={handleShareBackup}
                chevron={false}
                disabled={busy}
              >
                <Share2
                  size={19}
                  strokeWidth={1.8}
                  className="text-(--text-muted)"
                />
              </SettingRow>
            )}

            <label className="flex cursor-pointer items-center gap-4 px-4 py-4 transition hover:bg-(--surface-muted)">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-(--text)">
                  Restaurar backup
                </p>

              </div>

              <Upload
                size={19}
                strokeWidth={1.8}
                className="shrink-0 text-(--text-muted)"
              />

              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={busy}
                onChange={handleFileSelected}
              />
            </label>
          </Group>

          {pending && (
            <section className="rounded-lg border border-(--border) px-4 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={18}
                  strokeWidth={1.8}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-(--text)">
                    {pending.fileName}
                  </p>

                  {pending.backup.exportedAt && (
                    <p className="mt-1 text-xs text-(--text-muted)">
                      Criado em {formatDateTime(pending.backup.exportedAt)}
                    </p>
                  )}

                  <p className="mt-2 text-xs leading-5 text-(--text-muted)">
                    {pending.backup.data.products.length} produtos ·{" "}
                    {pending.backup.data.sales.length} vendas ·{" "}
                    {pending.backup.data.cashMovements.length} movimentos de
                    caixa · {pending.backup.data.stockMovements.length}{" "}
                    movimentos de stock
                  </p>

                  <p className="mt-2 text-xs font-medium text-red-600">
                    Os dados actuais serão substituídos.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  disabled={busy}
                  className="h-11 flex-1 rounded-lg border border-(--border) bg-(--surface) text-sm font-medium transition active:opacity-70"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmRestore}
                  disabled={busy}
                  className="h-11 flex-1 rounded-lg bg-(--button-bg) text-sm font-semibold text-(--button-text) transition active:opacity-70 disabled:opacity-50"
                >
                  {busy ? "A restaurar..." : "Restaurar"}
                </button>
              </div>
            </section>
          )}

          <Group title="">
            <SettingRow
              title="Exportar para Excel"
              onClick={handleExportExcel}
              chevron={false}
              disabled={busy}
            >
              <FileSpreadsheet
                size={19}
                strokeWidth={1.8}
                className="text-(--text-muted)"
              />
            </SettingRow>
          </Group>

          {persisted !== null && (
            <Group title="">
              <SettingRow
                title={
                  persisted ? "Dados protegidos" : "Proteger dados no dispositivo"
                }
                description={
                  persisted
                    ? "O sistema não vai apagar os dados da loja sozinho."
                    : ""
                }
                onClick={persisted ? undefined : protectStorage}
                chevron={false}
              >
                <HardDrive
                  size={19}
                  strokeWidth={1.8}
                  className={
                    persisted ? "text-(--primary)" : "text-(--text-muted)"
                  }
                />
              </SettingRow>
            </Group>
          )}

          <Group title="">
            <SettingRow
              title="Restaurar definições"
              description=""
              onClick={resetSettings}
              chevron={false}
            >
              <RotateCcw
                size={18}
                strokeWidth={1.8}
                className="text-(--text-muted)"
              />
            </SettingRow>
          </Group>

          <Group title="">
            <SettingRow
              title="Apagar todos os dados"
              onClick={() => setShowDelete((current) => !current)}
              chevron={false}
              danger
            >
              <Trash2 size={18} strokeWidth={1.8} className="text-red-600" />
            </SettingRow>

            {showDelete && (
              <div className="border-t border-(--border) px-4 py-4">
                <label
                  htmlFor="delete-confirm"
                  className="block text-sm text-(--text)"
                >
                  Escreve <strong>APAGAR</strong> para confirmar.
                </label>

                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteText}
                  onChange={(event) => setDeleteText(event.target.value)}
                  autoComplete="off"
                  className={fieldClass}
                  placeholder="APAGAR"
                />

                <button
                  type="button"
                  onClick={deleteAllData}
                  disabled={
                    busy || deleteText.trim().toUpperCase() !== "APAGAR"
                  }
                  className="mt-4 h-11 w-full rounded-lg bg-red-600 text-sm font-semibold text-white transition active:opacity-80 disabled:opacity-40"
                >
                  Apagar tudo
                </button>
              </div>
            )}
          </Group>
        </div>
      </>
    )
  }

  function renderSection(current: Exclude<Section, null>) {
    const titles: Record<Exclude<Section, null>, string> = {
      loja: "Loja",
      vendas: "Vendas",
      stock: "Stock",
      aparencia: "Aparência",
      dados: "Dados",
    }

    return (
      <>
        <Header title={titles[current]} onBack={() => openSection(null)} />

        {current === "dados" ? (
          renderDados()
        ) : (
          <div className="space-y-7">
            {current === "loja" && renderLoja()}
            {current === "vendas" && renderVendas()}
            {current === "stock" && renderStock()}
            {current === "aparencia" && renderAparencia()}
          </div>
        )}
      </>
    )
  }

  function renderHome() {
    return (
      <>
        <Header
          title="Definições"
        />

        <div className="space-y-7">
          {backupOverdue && (
            <button
              type="button"
              onClick={() => openSection("dados")}
              className="flex w-full items-center gap-3 rounded-lg bg-(--primary-soft) px-4 py-3 text-left text-(--primary) transition active:opacity-80"
            >
              <ShieldCheck size={18} strokeWidth={1.8} className="shrink-0" />

              <span className="min-w-0 flex-1 text-sm">
                {lastBackup
                  ? `O último backup foi ${describeLastBackup(lastBackup)}. `
                  : "Ainda não tens nenhum backup. "}
              </span>

              <ChevronRight size={18} strokeWidth={1.7} className="shrink-0" />
            </button>
          )}

          <Group title="">
            <SettingRow
              title="Loja"
              description={settings.storeName || "Nome e contacto da loja."}
              onClick={() => openSection("loja")}
            >
              <Store
                size={19}
                strokeWidth={1.8}
                className="text-(--text-muted)"
              />
            </SettingRow>
          </Group>

          <Group title="">
            <SettingRow
              title="Vendas"
              onClick={() => openSection("vendas")}
            >
              <Settings2
                size={19}
                strokeWidth={1.8}
                className="text-(--text-muted)"
              />
            </SettingRow>

            <SettingRow
              title="Stock"
              onClick={() => openSection("stock")}
            >
              <Boxes
                size={19}
                strokeWidth={1.8}
                className="text-(--text-muted)"
              />
            </SettingRow>
          </Group>

          <Group title="">
            <SettingRow
              title="Aparência"
              description={
                settings.theme === "dark" ? "Tema escuro" : "Tema claro"
              }
              onClick={() => openSection("aparencia")}
            >
              <Palette
                size={19}
                strokeWidth={1.8}
                className="text-(--text-muted)"
              />
            </SettingRow>

            <SettingRow
              title="Dados"
              onClick={() => openSection("dados")}
            >
              <HardDrive
                size={19}
                strokeWidth={1.8}
                className="text-(--text-muted)"
              />
            </SettingRow>
          </Group>
        </div>
      </>
    )
  }

  return (
    <main className="min-h-full bg-(--bg) text-(--text)">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        {section ? renderSection(section) : renderHome()}
      </div>
    </main>
  )
}
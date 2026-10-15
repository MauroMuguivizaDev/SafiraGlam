import { ArrowDownUp, Copy, Check, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"

type Currency = {
  code: string
  name: string
  symbol: string
}

type RateResponse = {
  date: string
  base: string
  quote: string
  rate: number
}

const currencies: Currency[] = [
  { code: "MZN", name: "Metical", symbol: "MT" },
  { code: "USD", name: "Dólar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "ZAR", name: "Rand", symbol: "R" },
  { code: "GBP", name: "Libra", symbol: "£" },
  { code: "BRL", name: "Real", symbol: "R$" },
  { code: "AOA", name: "Kwanza", symbol: "Kz" },
]

const quickAmounts = [100, 500, 1000, 5000]

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatRate(value: number) {
  return new Intl.NumberFormat("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-MZ", {
    dateStyle: "medium",
  }).format(new Date(`${date}T12:00:00`))
}

export default function Cambio() {
  const [fromCurrency, setFromCurrency] = useState("MZN")
  const [toCurrency, setToCurrency] = useState("USD")
  const [amount, setAmount] = useState("1000")

  const [rateData, setRateData] = useState<{
    key: string
    rate: number
    date: string
  } | null>(null)

  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const pairKey = `${fromCurrency}-${toCurrency}-${reloadKey}`
  const sameCurrency = fromCurrency === toCurrency
  const hasData = rateData?.key === pairKey

  const rate = sameCurrency ? 1 : hasData && rateData ? rateData.rate : null
  const rateDate = !sameCurrency && hasData && rateData ? rateData.date : null
  const hasError = !sameCurrency && errorKey === pairKey
  const isLoading = !sameCurrency && !hasData && !hasError
  const error = hasError
    ? "Não foi possível atualizar a taxa. Verifica a ligação e tenta novamente."
    : ""

  const from = currencies.find((c) => c.code === fromCurrency)
  const to = currencies.find((c) => c.code === toCurrency)

  const numericAmount = Number(amount.replace(",", "."))

  const result =
    rate !== null && Number.isFinite(numericAmount)
      ? numericAmount * rate
      : null

  useEffect(() => {
    if (fromCurrency === toCurrency) return

    const key = `${fromCurrency}-${toCurrency}-${reloadKey}`
    let cancelled = false

    fetch(
      `https://api.frankfurter.dev/v2/rate/${fromCurrency.toLowerCase()}/${toCurrency.toLowerCase()}`,
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Não foi possível obter a taxa de câmbio.")
        }

        return response.json() as Promise<RateResponse>
      })
      .then((data) => {
        if (!Number.isFinite(data.rate) || data.rate <= 0) {
          throw new Error("A API devolveu uma taxa inválida.")
        }

        if (!cancelled) {
          setRateData({ key, rate: data.rate, date: data.date })
        }
      })
      .catch((err) => {
        if (cancelled) return

        console.error(err)
        setErrorKey(key)
      })

    return () => {
      cancelled = true
    }
  }, [fromCurrency, toCurrency, reloadKey])

  function swapCurrencies() {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  async function copyResult() {
    if (result === null) return

    try {
      await navigator.clipboard.writeText(formatNumber(result))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const fieldClass =
    "h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-10 lg:px-10">

        <header className="mb-6">
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-3xl">
            CÂMBIO
          </h1>
        </header>

        <section className="mb-5 border-y border-[var(--border)] py-6">
          <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-start">
            <div>
              <label
                htmlFor="from-currency"
                className="mb-2 block text-xs font-medium text-[var(--text-muted)]"
              >
                De
              </label>

              <select
                id="from-currency"
                value={fromCurrency}
                onChange={(event) => setFromCurrency(event.target.value)}
                className={fieldClass}
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>

              <div className="relative mt-3">
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0,00"
                  className="h-14 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 pr-16 text-xl font-medium text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-muted)]">
                  {from?.symbol}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {quickAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className={`h-8 rounded-md border px-3 text-xs font-medium transition ${
                      numericAmount === value
                        ? "border-transparent bg-[var(--button-bg)] text-[var(--button-text)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    }`}
                  >
                    {new Intl.NumberFormat("de-DE").format(value)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center md:mt-[5.5rem]">
              <button
                type="button"
                onClick={swapCurrencies}
                aria-label="Trocar moedas"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--button-bg)] text-[var(--button-text)] transition hover:bg-[var(--button-bg-hover)] active:scale-95"
              >
                <ArrowDownUp size={17} strokeWidth={1.8} />
              </button>
            </div>

            <div>
              <label
                htmlFor="to-currency"
                className="mb-2 block text-xs font-medium text-[var(--text-muted)]"
              >
                Para
              </label>

              <select
                id="to-currency"
                value={toCurrency}
                onChange={(event) => setToCurrency(event.target.value)}
                className={fieldClass}
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex h-14 items-center justify-between gap-3 rounded-lg bg-[var(--primary-soft)] px-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>A atualizar...</span>
                  </div>
                ) : result !== null ? (
                  <>
                    <span className="truncate text-xl font-semibold tracking-tight text-[var(--primary)]">
                      {formatNumber(result)} {to?.symbol}
                    </span>

                    <button
                      type="button"
                      onClick={copyResult}
                      aria-label="Copiar resultado"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--primary)] transition hover:bg-[var(--surface-muted)] active:opacity-70"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </>
                ) : (
                  <span className="text-xl text-[var(--text-muted)]">—</span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--text-secondary)]">{error}</p>

              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="h-8 shrink-0 rounded-md bg-[var(--button-bg)] px-3 text-xs font-semibold text-[var(--button-text)] transition hover:bg-[var(--button-bg-hover)] active:opacity-70"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </section>

        {rate !== null && (
          <section className="grid grid-cols-2 border-y border-[var(--border)] sm:grid-cols-3">
            <div className="px-3 py-4 sm:px-4">
              <p className="text-xs text-[var(--text-muted)]">Taxa</p>

              <p className="mt-1 text-sm font-semibold">
                1 {fromCurrency} = {formatRate(rate)} {toCurrency}
              </p>
            </div>

            <div className="border-l border-[var(--border)] px-3 py-4 sm:px-4">
              <p className="text-xs text-[var(--text-muted)]">Taxa inversa</p>

              <p className="mt-1 text-sm font-semibold">
                1 {toCurrency} = {formatRate(1 / rate)} {fromCurrency}
              </p>
            </div>

            <div className="col-span-2 border-t border-[var(--border)] px-3 py-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:px-4">
              <p className="text-xs text-[var(--text-muted)]">Atualizada em</p>

              <p className="mt-1 text-sm font-semibold">
                {rateDate ? formatDate(rateDate) : "—"}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
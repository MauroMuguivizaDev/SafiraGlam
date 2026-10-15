import Dexie, { type Table } from "dexie"

export interface Product {
  id: string
  name: string
  category: string
  purchasePrice: number
  salePrice: number
  stock: number
  minimumStock: number
  sku: string
  description: string
  image?: string
  active: boolean
  createdAt: string
  updatedAt: string
}
export type PaymentMethod = "dinheiro" | "mpesa" | "emola" | "banco"

export type CashMovement = {
  id: string
  type: "entrada" | "saida" | "transferencia"
  amount: number
  reason: string
  method: PaymentMethod
  toMethod?: PaymentMethod
  note: string
  createdAt: string
}

export type SaleStatus = "concluida" | "cancelada"

export interface Sale {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  purchasePrice: number
  total: number
  totalCost: number
  grossProfit: number
  status: SaleStatus
  createdAt: string
  cancelledAt?: string
  cancellationNote?: string
  paymentMethod?: PaymentMethod
}

export interface PriceHistory {
  id: string
  productId: string
  purchasePrice: number
  salePrice: number
  changedAt: string
}

export type StockMovementType =
  | "entrada"
  | "venda"
  | "ajuste"

export type StockAdjustmentReason =
  | "correcao_contagem"
  | "perda_quebra"
  | "devolucao_cliente"
  | "erro_registo"
  | "outro"

export interface StockMovement {
  id: string
  productId: string
  type: StockMovementType
  quantity: number
  stockBefore: number
  stockAfter: number
  reason?: StockAdjustmentReason
  note: string
  createdAt: string
}

class DiverseDatabase extends Dexie {
  products!: Table<Product, string>
  priceHistory!: Table<PriceHistory, string>
  stockMovements!: Table<StockMovement, string>
  sales!: Table<Sale, string>
  cashMovements!: Table<CashMovement, string>

  constructor() {
    super("diverse_database")

    this.version(1).stores({
      products:
        "id, name, category, sku, active, updatedAt",
      priceHistory:
        "id, productId, changedAt",
    })

    this.version(2).stores({
      products:
        "id, name, category, sku, active, updatedAt",
      priceHistory:
        "id, productId, changedAt",
      stockMovements:
        "id, productId, type, createdAt",
    })

    this.version(3).stores({
      products:
        "id, name, category, sku, active, updatedAt",
      priceHistory:
        "id, productId, changedAt",
      stockMovements:
        "id, productId, type, reason, createdAt",
      sales:
        "id, productId, createdAt",
    })

    

    this.version(4).stores({
  products:
    "id, name, category, sku, active, updatedAt",
  priceHistory:
    "id, productId, changedAt",
  stockMovements:
    "id, productId, type, reason, createdAt",
  sales:
    "id, productId, status, createdAt",
})

  this.version(5).stores({
  cashMovements: "id, type, method, createdAt",
})
  }
}

export const db = new DiverseDatabase()
export interface TaxItem {
  unitPrice: number | null
  quantity: number
  taxable?: boolean
  taxRate?: number
}

export const defaultTaxRate = 10

export function isValidTaxRate(rate: unknown): rate is number {
  return typeof rate === "number" && Number.isFinite(rate) && rate >= 0 && rate <= 100
    && Math.abs(rate * 100 - Math.round(rate * 100)) < 0.000001
}

export function itemAmounts(item: TaxItem) {
  const price = Number(item.unitPrice)
  const quantity = Number(item.quantity)
  if (!Number.isInteger(price) || price < 0 || price > 100000000 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
    return { subtotal: 0, tax: 0, total: 0 }
  }
  const subtotal = price * quantity
  const tax = item.taxable && isValidTaxRate(item.taxRate)
    ? Number(BigInt(subtotal) * BigInt(Math.round(item.taxRate * 100)) / 10000n)
    : 0
  return { subtotal, tax, total: subtotal + tax }
}

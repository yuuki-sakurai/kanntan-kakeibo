import type { CreateExpenseInput } from "./expense"

export type CsvEncoding = "UTF-8" | "SJIS-win"

export interface ExpenseImportPreview {
  count: number
  total: number
  rows: Array<CreateExpenseInput & { line: number; categoryName?: string }>
  unknownCategories: string[]
  alreadyImported: boolean
}

export interface ExpenseImportResult {
  importedCount: number
  alreadyImported: boolean
}

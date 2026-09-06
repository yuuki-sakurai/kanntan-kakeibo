/// <reference types="vite/client" />
import type { CreateExpenseInput, Expense, MonthlySummary } from "@/types/expense"

export interface ExpenseApi {
  getMonthlySummary(year: number, month: number): Promise<MonthlySummary>
  getDailyExpenses(date: string): Promise<Expense[]>
  createExpense(input: CreateExpenseInput): Promise<Expense>
  getStoreSuggestions(): Promise<string[]>
}

export class ExpenseApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "ExpenseApiError"
  }
}

export class HttpExpenseApi implements ExpenseApi {
  private readonly baseUrl: string

  constructor(baseUrl = import.meta.env?.VITE_API_BASE_URL || "/api/v1") {
    this.baseUrl = baseUrl.replace(/\/+$/, "")
  }

  private async request<T>(path: string, input?: CreateExpenseInput): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: input ? "POST" : "GET",
        headers: { Accept: "application/json", ...(input ? { "Content-Type": "application/json" } : {}) },
        ...(input ? { body: JSON.stringify(input) } : {}),
        signal: AbortSignal.timeout(15000),
      })
    } catch {
      throw new ExpenseApiError(input
        ? "保存結果を確認できませんでした。明細を確認してから再度お試しください。"
        : "通信できませんでした。接続を確認して再度お試しください。", 0)
    }
    if (!response.ok) {
      if (response.status === 422) {
        throw new ExpenseApiError("入力内容を確認してください。日付・カテゴリ、255文字以内の店舗・品目名、単価0〜100,000,000円、個数1〜10,000（整数）、品目100件以内で入力してください。", 422)
      }
      throw new ExpenseApiError("データを処理できませんでした。時間をおいて再度お試しください。", response.status)
    }
    try {
      return await response.json() as T
    } catch {
      throw new ExpenseApiError("応答を確認できませんでした。保存操作の場合は明細を確認してください。", response.status)
    }
  }

  getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    return this.request(`/monthly-summary?${new URLSearchParams({ year: String(year), month: String(month) })}`)
  }

  getDailyExpenses(date: string): Promise<Expense[]> {
    return this.request(`/expenses?${new URLSearchParams({ date })}`)
  }

  createExpense(input: CreateExpenseInput): Promise<Expense> {
    return this.request("/expenses", input)
  }

  getStoreSuggestions(): Promise<string[]> {
    return this.request("/stores")
  }
}

export const expenseApi: ExpenseApi = new HttpExpenseApi()

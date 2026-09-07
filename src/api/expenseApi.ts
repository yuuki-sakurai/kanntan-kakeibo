/// <reference types="vite/client" />
import type { CreateExpenseInput, Expense, ExpenseCategory, MonthlySummary } from "@/types/expense"
import type { CsvEncoding, ExpenseImportPreview, ExpenseImportResult } from "@/types/expenseImport"

export interface AuthUser { id: number; name: string; email: string }
export interface AuthSession { user: AuthUser | null; csrfToken: string }

export interface ExpenseApi {
  getSession(): Promise<AuthSession>
  login(email: string, password: string): Promise<AuthSession>
  register(name: string, email: string, password: string, password_confirmation: string): Promise<AuthSession>
  logout(): Promise<AuthSession>
  getMonthlySummary(year: number, month: number): Promise<MonthlySummary>
  getDailyExpenses(date: string): Promise<Expense[]>
  getExpense(id: string): Promise<Expense>
  updateExpense(id: string, input: CreateExpenseInput): Promise<Expense>
  createExpense(input: CreateExpenseInput): Promise<Expense>
  getStoreSuggestions(): Promise<string[]>
  getCategories(): Promise<ExpenseCategory[]>
  createCategory(name: string): Promise<ExpenseCategory>
  previewCsv(file: File, encoding: CsvEncoding): Promise<ExpenseImportPreview>
  importCsv(file: File, encoding: CsvEncoding, approvedCategories?: string[]): Promise<ExpenseImportResult>
}

export class ExpenseApiError extends Error {
  constructor(message: string, readonly status: number, readonly details: string[] = []) {
    super(message)
    this.name = "ExpenseApiError"
  }
}

export class HttpExpenseApi implements ExpenseApi {
  private readonly baseUrl: string
  private csrfToken = ""

  constructor(baseUrl = import.meta.env?.VITE_API_BASE_URL || "/api/v1") {
    this.baseUrl = baseUrl.replace(/\/+$/, "")
  }

  private async request<T>(path: string, input?: CreateExpenseInput | FormData | Record<string, string>, method = input ? "POST" : "GET"): Promise<T> {
    if (input && !this.csrfToken) await this.getSession()
    const isUpload = input instanceof FormData
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", ...(input ? { "X-CSRF-TOKEN": this.csrfToken } : {}), ...(input && !isUpload ? { "Content-Type": "application/json" } : {}) },
        ...(input ? { body: isUpload ? input : JSON.stringify(input) } : {}),
        signal: AbortSignal.timeout(isUpload ? 60000 : 15000),
      })
    } catch {
      throw new ExpenseApiError(isUpload
        ? "通信結果を確認できませんでした。同じCSVで再度お試しください。取り込み済みの場合は重複登録されません。"
        : input
        ? "保存結果を確認できませんでした。明細を確認してから再度お試しください。"
        : "通信できませんでした。接続を確認して再度お試しください。", 0)
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 419) {
        this.csrfToken = ""
        if (typeof window !== "undefined") window.dispatchEvent(new Event("auth-expired"))
        throw new ExpenseApiError("ログインの有効期限が切れました。もう一度ログインしてください。", response.status)
      }
      if (response.status === 429) throw new ExpenseApiError("試行回数が多すぎます。1分ほど待ってからお試しください。", 429)
      if (path.startsWith("/auth/") && response.status === 422) {
        throw new ExpenseApiError(path === "/auth/login"
          ? "メールアドレスまたはパスワードが違います。"
          : "入力内容を確認してください。メールアドレスが登録済みか、名前・パスワードの条件を満たしていません。", 422)
      }
      if (path === "/categories" && response.status === 422) {
        const body: unknown = await response.json().catch(() => null)
        let message = "カテゴリ名を確認してください。"
        if (body && typeof body === "object" && "errors" in body && body.errors && typeof body.errors === "object" && "name" in body.errors && Array.isArray(body.errors.name) && typeof body.errors.name[0] === "string") {
          message = body.errors.name[0]
        }
        throw new ExpenseApiError(message, 422)
      }
      if (isUpload && response.status === 422) {
        const body: unknown = await response.json().catch(() => null)
        const details: string[] = []
        if (body && typeof body === "object" && "errors" in body && body.errors && typeof body.errors === "object") {
          for (const value of Object.values(body.errors)) {
            if (Array.isArray(value)) details.push(...value.filter((message): message is string => typeof message === "string"))
          }
        }
        throw new ExpenseApiError("CSVの内容を確認してください。支出は登録されていません。", 422, details.slice(0, 50))
      }
      if (isUpload && response.status === 413) {
        throw new ExpenseApiError("ファイルが大きすぎます。2MB以内のCSVを選択してください。", 413)
      }
      if (response.status === 422) {
        throw new ExpenseApiError("入力内容を確認してください。日付・カテゴリ、255文字以内の店舗・品目名、単価0〜100,000,000円、個数1〜10,000（整数）、品目100件以内で入力してください。", 422)
      }
      throw new ExpenseApiError("データを処理できませんでした。時間をおいて再度お試しください。", response.status)
    }
    try {
      const data = await response.json()
      if (path.startsWith("/auth/") && typeof data.csrfToken === "string") this.csrfToken = data.csrfToken
      return data as T
    } catch {
      throw new ExpenseApiError("応答を確認できませんでした。保存操作の場合は明細を確認してください。", response.status)
    }
  }

  getSession(): Promise<AuthSession> { return this.request("/auth/session") }
  login(email: string, password: string): Promise<AuthSession> { return this.request("/auth/login", { email, password }) }
  register(name: string, email: string, password: string, password_confirmation: string): Promise<AuthSession> {
    return this.request("/auth/register", { name, email, password, password_confirmation })
  }
  logout(): Promise<AuthSession> { return this.request("/auth/logout", {}) }

  getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    return this.request(`/monthly-summary?${new URLSearchParams({ year: String(year), month: String(month) })}`)
  }

  getDailyExpenses(date: string): Promise<Expense[]> {
    return this.request(`/expenses?${new URLSearchParams({ date })}`)
  }

  getExpense(id: string): Promise<Expense> {
    return this.request(`/expenses/${encodeURIComponent(id)}`)
  }

  updateExpense(id: string, input: CreateExpenseInput): Promise<Expense> {
    return this.request(`/expenses/${encodeURIComponent(id)}`, input, "PUT")
  }

  createExpense(input: CreateExpenseInput): Promise<Expense> {
    return this.request("/expenses", input)
  }

  getStoreSuggestions(): Promise<string[]> {
    return this.request("/stores")
  }

  getCategories(): Promise<ExpenseCategory[]> {
    return this.request("/categories")
  }

  createCategory(name: string): Promise<ExpenseCategory> {
    return this.request("/categories", { name })
  }

  private csvForm(file: File, encoding: CsvEncoding): FormData {
    const form = new FormData()
    form.append("file", file)
    form.append("encoding", encoding)
    return form
  }

  previewCsv(file: File, encoding: CsvEncoding): Promise<ExpenseImportPreview> {
    return this.request("/expense-imports/preview", this.csvForm(file, encoding))
  }

  importCsv(file: File, encoding: CsvEncoding, approvedCategories: string[] = []): Promise<ExpenseImportResult> {
    const form = this.csvForm(file, encoding)
    approvedCategories.forEach(name => form.append("approved_categories[]", name))
    return this.request("/expense-imports", form)
  }
}

export const expenseApi: ExpenseApi = new HttpExpenseApi()

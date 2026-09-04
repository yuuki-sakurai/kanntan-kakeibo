import type {
  CategoryId,
  CategoryTotal,
  CreateExpenseInput,
  DailyTotal,
  Expense,
  MonthlySummary,
} from "@/types/expense"

export interface ExpenseApi {
  getMonthlySummary(year: number, month: number): Promise<MonthlySummary>
  getDailyExpenses(date: string): Promise<Expense[]>
  createExpense(input: CreateExpenseInput): Promise<Expense>
  getStoreSuggestions(): Promise<string[]>
}

const makeItem = (id: string, name: string, unitPrice: number, quantity = 1) => ({
  id,
  name,
  unitPrice,
  quantity,
})

let expenses: Expense[] = [
  { id: "e01", date: "2026-09-01", store: "住宅ローン", category: "housing", items: [makeItem("i01", "住宅ローン返済", 92000)], total: 92000 },
  { id: "e02", date: "2026-09-01", store: "モバイルSuica", category: "transport", items: [makeItem("i02", "交通費チャージ", 5000)], total: 5000 },
  { id: "e03", date: "2026-09-02", store: "オーケー", category: "food", items: [makeItem("i03", "食料品", 4860)], total: 4860 },
  { id: "e04", date: "2026-09-03", store: "家系ラーメン", category: "dining", items: [makeItem("i04", "ラーメン", 1000), makeItem("i05", "味玉", 200)], total: 1200 },
  { id: "e05", date: "2026-09-03", store: "クリエイト", category: "daily", items: [makeItem("i06", "洗剤・日用品", 2380)], total: 2380 },
  { id: "e06", date: "2026-09-04", store: "駅前カフェ", category: "dining", items: [makeItem("i07", "アイスコーヒー", 680)], total: 680 },
  { id: "e07", date: "2026-09-05", store: "セブン-イレブン", category: "food", items: [makeItem("i08", "飲み物・軽食", 980)], total: 980 },
  { id: "e08", date: "2026-09-07", store: "炭火焼き とり屋", category: "dining", items: [makeItem("i09", "夕食", 6300)], total: 6300 },
  { id: "e09", date: "2026-09-08", store: "東京電力", category: "utilities", items: [makeItem("i10", "電気料金", 7400)], total: 7400 },
  { id: "e10", date: "2026-09-10", store: "ユニクロ", category: "shopping", items: [makeItem("i11", "衣類", 5990)], total: 5990 },
  { id: "e11", date: "2026-09-12", store: "Amazon", category: "shopping", items: [makeItem("i12", "生活雑貨", 3980)], total: 3980 },
  { id: "e12", date: "2026-09-13", store: "オーケー", category: "food", items: [makeItem("i13", "食料品", 5620)], total: 5620 },
  { id: "e13", date: "2026-09-15", store: "通信会社", category: "utilities", items: [makeItem("i14", "携帯料金", 4980)], total: 4980 },
  { id: "e14", date: "2026-09-17", store: "東京ガス", category: "utilities", items: [makeItem("i15", "ガス料金", 3200)], total: 3200 },
  { id: "e15", date: "2026-09-20", store: "居酒屋 つばき", category: "dining", items: [makeItem("i16", "飲食代", 7600)], total: 7600 },
  { id: "e16", date: "2026-09-21", store: "オーケー", category: "food", items: [makeItem("i17", "食料品", 5100)], total: 5100 },
  { id: "e17", date: "2026-09-25", store: "スポーツジム", category: "health", items: [makeItem("i18", "月会費", 8250)], total: 8250 },
  { id: "e18", date: "2026-09-27", store: "映画館", category: "leisure", items: [makeItem("i19", "映画チケット", 2100)], total: 2100 },
  { id: "e19", date: "2026-09-29", store: "オーケー", category: "food", items: [makeItem("i20", "食料品", 4930)], total: 4930 },
  { id: "e20", date: "2026-09-30", store: "クリエイト", category: "health", items: [makeItem("i21", "医薬品", 1980)], total: 1980 },
]

const wait = <T>(value: T, delay = 180) =>
  new Promise<T>((resolve) => window.setTimeout(() => resolve(value), delay))

const getTotal = (expense: Expense) =>
  expense.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

class MockExpenseApi implements ExpenseApi {
  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const monthKey = `${year}-${String(month).padStart(2, "0")}`
    const target = expenses.filter((expense) => expense.date.startsWith(monthKey))
    const total = target.reduce((sum, expense) => sum + expense.total, 0)

    const dailyMap = new Map<string, DailyTotal>()
    const categoryMap = new Map<CategoryId, number>()

    target.forEach((expense) => {
      const day = dailyMap.get(expense.date)
      dailyMap.set(expense.date, {
        date: expense.date,
        amount: (day?.amount ?? 0) + expense.total,
        count: (day?.count ?? 0) + 1,
      })
      categoryMap.set(
        expense.category,
        (categoryMap.get(expense.category) ?? 0) + expense.total,
      )
    })

    const categoryTotals: CategoryTotal[] = [...categoryMap.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total === 0 ? 0 : Math.round((amount / total) * 1000) / 10,
      }))
      .sort((a, b) => b.amount - a.amount)

    return wait({
      year,
      month,
      total,
      dailyTotals: [...dailyMap.values()],
      categoryTotals,
    })
  }

  async getDailyExpenses(date: string): Promise<Expense[]> {
    return wait(
      expenses
        .filter((expense) => expense.date === date)
        .map((expense) => ({ ...expense, items: expense.items.map((item) => ({ ...item })) })),
    )
  }

  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    const id = `e${Date.now()}`
    const expense: Expense = {
      ...input,
      id,
      items: input.items.map((item, index) => ({ ...item, id: `${id}-${index}` })),
      total: 0,
    }
    expense.total = getTotal(expense)
    expenses = [...expenses, expense]
    return wait({ ...expense }, 300)
  }

  async getStoreSuggestions(): Promise<string[]> {
    return wait([...new Set(expenses.map((expense) => expense.store))].sort(), 80)
  }
}

// Laravel API完成後は、この実装をHTTP版へ差し替えるだけで画面側は変更不要です。
export const expenseApi: ExpenseApi = new MockExpenseApi()

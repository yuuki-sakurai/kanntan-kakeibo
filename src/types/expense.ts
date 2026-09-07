export type CategoryId = string

export interface ExpenseCategory {
  id: CategoryId
  name: string
}

export interface ExpenseItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
}

export interface Expense {
  id: string
  date: string
  store: string
  category: CategoryId
  items: ExpenseItem[]
  total: number
}

export interface CategoryTotal {
  category: CategoryId
  amount: number
  percentage: number
}

export interface DailyTotal {
  date: string
  amount: number
  count: number
}

export interface MonthlySummary {
  year: number
  month: number
  total: number
  dailyTotals: DailyTotal[]
  categoryTotals: CategoryTotal[]
}

export interface CreateExpenseInput {
  date: string
  store: string
  category: CategoryId
  items: Array<Pick<ExpenseItem, "name" | "unitPrice" | "quantity">>
}

export const defaultCategoryMeta: Record<
  CategoryId,
  { label: string; color: string; softColor: string }
> = {
  housing: { label: "住居", color: "#52606d", softColor: "#e8edf1" },
  food: { label: "食費", color: "#f06b4f", softColor: "#fff0ec" },
  dining: { label: "外食", color: "#ef9b3d", softColor: "#fff4e5" },
  transport: { label: "交通", color: "#356cb6", softColor: "#eaf1fb" },
  utilities: { label: "水道・光熱", color: "#3a9d8f", softColor: "#e6f6f3" },
  daily: { label: "日用品", color: "#8b67b8", softColor: "#f2ebfa" },
  shopping: { label: "買い物", color: "#d05c86", softColor: "#fbeaf0" },
  health: { label: "健康", color: "#45a06d", softColor: "#e8f6ee" },
  leisure: { label: "趣味・娯楽", color: "#7869d3", softColor: "#eeecfb" },
}

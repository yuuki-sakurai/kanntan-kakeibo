import { ref } from "vue"
import { expenseApi } from "@/api/expenseApi"
import { defaultCategoryMeta, type ExpenseCategory } from "@/types/expense"

export const categories = ref<ExpenseCategory[]>([])
export const categoriesError = ref("")
export const categoriesLoading = ref(false)
let pending: Promise<void> | null = null

export function loadCategories(): Promise<void> {
  if (pending) return pending
  categoriesLoading.value = true
  categoriesError.value = ""
  pending = expenseApi.getCategories().then((result) => {
    categories.value = result
  }).catch(() => {
    categoriesError.value = "カテゴリを読み込めませんでした。再読み込みしてください。"
  }).finally(() => {
    categoriesLoading.value = false
    pending = null
  })
  return pending
}

export async function addCategory(name: string): Promise<ExpenseCategory> {
  if (pending) await pending
  const category = await expenseApi.createCategory(name)
  categories.value = [...categories.value.filter(item => item.id !== category.id), category]
  return category
}

export function getCategoryMeta(id: string) {
  const category = categories.value.find(item => item.id === id)
  const style = defaultCategoryMeta[id] ?? { color: "#8b67b8", softColor: "#f2ebfa", label: "未取得のカテゴリ" }
  return { ...style, label: category?.name ?? style.label }
}

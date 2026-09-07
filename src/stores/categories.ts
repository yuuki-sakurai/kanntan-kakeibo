import { ref } from "vue"
import { expenseApi } from "@/api/expenseApi"
import { defaultCategoryMeta, type ExpenseCategory } from "@/types/expense"

export const categories = ref<ExpenseCategory[]>([])
export const categoriesError = ref("")
export const categoriesLoading = ref(false)
let generation = 0
export function resetCategories() { generation++; categories.value = []; categoriesError.value = ""; categoriesLoading.value = false; pending = null }
let pending: Promise<void> | null = null

export function loadCategories(): Promise<void> {
  if (pending) return pending
  const current = generation
  categoriesLoading.value = true
  categoriesError.value = ""
  pending = expenseApi.getCategories().then((result) => {
    if (current === generation) categories.value = result
  }).catch(() => {
    if (current === generation) categoriesError.value = "カテゴリを読み込めませんでした。再読み込みしてください。"
  }).finally(() => {
    if (current === generation) { categoriesLoading.value = false; pending = null }
  })
  return pending
}

export async function addCategory(name: string): Promise<ExpenseCategory> {
  const current = generation
  if (pending) await pending
  const category = await expenseApi.createCategory(name)
  if (current === generation) categories.value = [...categories.value.filter(item => item.id !== category.id), category]
  return category
}

export function getCategoryMeta(id: string) {
  const category = categories.value.find(item => item.id === id)
  const style = defaultCategoryMeta[id] ?? { color: "#8b67b8", softColor: "#f2ebfa", label: "未取得のカテゴリ" }
  return { ...style, label: category?.name ?? style.label }
}

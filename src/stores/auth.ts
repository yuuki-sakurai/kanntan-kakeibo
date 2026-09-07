import { ref } from "vue"
import { expenseApi, type AuthUser } from "@/api/expenseApi"
import { resetCategories } from "@/stores/categories"

export const user = ref<AuthUser | null>(null)
export const authError = ref("")
let pending: Promise<void> | null = null

export function refreshSession(): Promise<void> {
  if (pending) return pending
  pending = expenseApi.getSession().then(session => {
    if (user.value?.id !== session.user?.id) resetCategories()
    user.value = session.user
    authError.value = ""
  }).catch(error => {
    authError.value = "接続できませんでした。接続を確認して再度お試しください。"
    throw error
  }).finally(() => { pending = null })
  return pending
}

export async function logout() {
  await expenseApi.logout()
  user.value = null
  resetCategories()
}

window.addEventListener("auth-expired", () => { user.value = null; resetCategories() })

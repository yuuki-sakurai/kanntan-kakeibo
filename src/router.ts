import { createRouter, createWebHashHistory } from "vue-router"
import AuthView from "@/views/AuthView.vue"
import { refreshSession, user, authError } from "@/stores/auth"
import DashboardView from "@/views/DashboardView.vue"
import DayDetailView from "@/views/DayDetailView.vue"
import ExpenseFormView from "@/views/ExpenseFormView.vue"
import SettingsView from "@/views/SettingsView.vue"
import CsvImportView from "@/views/CsvImportView.vue"
import CategorySettingsView from "@/views/CategorySettingsView.vue"

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/login", name: "login", component: AuthView },
    { path: "/register", name: "register", component: AuthView },
    { path: "/", name: "dashboard", component: DashboardView },
    { path: "/days/:date", name: "day-detail", component: DayDetailView },
    { path: "/expenses/:id/edit", name: "expense-edit", component: ExpenseFormView },
    { path: "/expenses/new", name: "expense-new", component: ExpenseFormView },
    {
      path: "/settings",
      component: SettingsView,
      children: [
        { path: "", redirect: { name: "csv-import" } },
        { path: "import", name: "csv-import", component: CsvImportView },
        { path: "categories", name: "category-settings", component: CategorySettingsView },
      ],
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const publicPage = to.name === "login" || to.name === "register"
  try { await refreshSession() } catch { /* The login page offers a retry on connection errors. */ }
  if (!publicPage && (!user.value || authError.value)) return { name: "login", query: { redirect: to.fullPath } }
  if (publicPage && user.value && !authError.value) return { name: "dashboard" }
})

window.addEventListener("auth-expired", () => {
  user.value = null
  void router.replace({ name: "login", query: { expired: "1" } })
})

export default router

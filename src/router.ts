import { createRouter, createWebHashHistory } from "vue-router"
import DashboardView from "@/views/DashboardView.vue"
import DayDetailView from "@/views/DayDetailView.vue"
import ExpenseFormView from "@/views/ExpenseFormView.vue"
import SettingsView from "@/views/SettingsView.vue"
import CsvImportView from "@/views/CsvImportView.vue"
import CategorySettingsView from "@/views/CategorySettingsView.vue"

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
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

export default router

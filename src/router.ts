import { createRouter, createWebHashHistory } from "vue-router"
import DashboardView from "@/views/DashboardView.vue"
import DayDetailView from "@/views/DayDetailView.vue"
import ExpenseFormView from "@/views/ExpenseFormView.vue"

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "dashboard", component: DashboardView },
    { path: "/days/:date", name: "day-detail", component: DayDetailView },
    { path: "/expenses/new", name: "expense-new", component: ExpenseFormView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router

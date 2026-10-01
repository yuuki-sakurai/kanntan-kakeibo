<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import CategoryBreakdown from "@/components/CategoryBreakdown.vue"
import MonthCalendar from "@/components/MonthCalendar.vue"
import { expenseApi } from "@/api/expenseApi"
import { getCategoryMeta } from "@/stores/categories"
import type { MonthlyBudget, MonthlySummary } from "@/types/expense"
import { formatCurrency } from "@/utils/format"

const viewDate = ref(new Date())
const summary = ref<MonthlySummary | null>(null)
const budget = ref<MonthlyBudget | null>(null)
const loading = ref(true)
const error = ref("")
const budgetError = ref("")

const year = computed(() => viewDate.value.getFullYear())
const month = computed(() => viewDate.value.getMonth() + 1)
const monthLabel = computed(() => `${year.value}年 ${month.value}月`)
const recordedDays = computed(() => summary.value?.dailyTotals.length ?? 0)
const average = computed(() =>
  recordedDays.value ? Math.round((summary.value?.total ?? 0) / recordedDays.value) : 0,
)
const hasBudget = computed(() => budget.value !== null && (budget.value.amount !== null || budget.value.categoryBudgets.length > 0))
const remainingBudget = computed(() => budget.value?.amount === null || !budget.value ? null : budget.value.amount - (summary.value?.total ?? 0))
const overallProgress = computed(() => {
  const amount = budget.value?.amount
  if (amount === null || amount === undefined || amount === 0) return amount === 0 && (summary.value?.total ?? 0) > 0 ? 100 : 0
  return Math.min(100, Math.round((summary.value!.total / amount) * 100))
})
const categoryBudgetProgress = (category: string, amount: number) => {
  const spent = summary.value?.categoryTotals.find((item) => item.category === category)?.amount ?? 0
  const percent = amount === 0 ? (spent > 0 ? 100 : 0) : Math.min(100, Math.round(spent / amount * 100))
  return { spent, percent, remaining: amount - spent }
}

let requestId = 0
const loadSummary = async () => {
  const currentRequest = ++requestId
  summary.value = null
  loading.value = true
  error.value = ""
  budgetError.value = ""
  try {
    const result = await expenseApi.getMonthlySummary(year.value, month.value)
    if (currentRequest !== requestId) return
    summary.value = result
    try {
      budget.value = await expenseApi.getMonthlyBudget(year.value, month.value)
    } catch {
      if (currentRequest !== requestId) return
      budget.value = null
      budgetError.value = "予算情報を読み込めませんでした。"
    }
  } catch {
    if (currentRequest !== requestId) return
    error.value = "支出データを読み込めませんでした。"
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

const moveMonth = (difference: number) => {
  viewDate.value = new Date(year.value, month.value - 1 + difference, 1)
}

watch(viewDate, loadSummary)
onMounted(loadSummary)
</script>

<template>
  <main class="page dashboard-page">
    <div class="page-topline">
      <div>
        <p class="eyebrow">MONTHLY OVERVIEW</p>
        <h1>今月の支出</h1>
      </div>
      <div class="month-switcher" aria-label="表示月を変更">
        <button type="button" aria-label="前の月" @click="moveMonth(-1)">‹</button>
        <strong>{{ monthLabel }}</strong>
        <button type="button" aria-label="次の月" @click="moveMonth(1)">›</button>
      </div>
    </div>

    <p v-if="error" class="error-banner" role="alert">{{ error }}</p>

    <div v-if="loading" class="loading-panel" aria-live="polite">
      <span class="loader"></span> 支出データを読み込んでいます
    </div>

    <template v-else-if="summary">
      <section class="monthly-overview" aria-label="月間支出概要">
        <div class="total-card">
          <p>月の合計</p>
          <strong>{{ formatCurrency(summary.total) }}</strong>
          <div class="total-card-rule"></div>
          <dl class="summary-stats">
            <div>
              <dt>記録した日</dt>
              <dd>{{ recordedDays }}日</dd>
            </div>
            <div>
              <dt>1日平均</dt>
              <dd>{{ formatCurrency(average) }}</dd>
            </div>
          </dl>
          <RouterLink class="total-add-link" to="/expenses/new">
            <span aria-hidden="true">＋</span> 支出を入力する
          </RouterLink>
        </div>

        <div class="calendar-card">
          <div class="calendar-card-heading">
            <div>
              <h2>{{ month }}月のカレンダー</h2>
              <p>日付を選ぶと、その日の明細を確認できます</p>
            </div>
            <span class="calendar-hint">金額は税込</span>
          </div>
          <MonthCalendar
            :year="summary.year"
            :month="summary.month"
            :daily-totals="summary.dailyTotals"
          />
        </div>
      </section>

      <section class="budget-panel" aria-labelledby="monthly-budget-title">
        <div class="budget-panel-heading">
          <div>
            <p class="eyebrow">BUDGET CHECK</p>
            <h2 id="monthly-budget-title">予算の進み具合</h2>
          </div>
          <RouterLink class="budget-edit-link" :to="{ name: 'monthly-budget-settings' }">予算を編集 <span aria-hidden="true">↗</span></RouterLink>
        </div>

        <div v-if="budgetError" class="budget-load-error" role="status">
          <span>{{ budgetError }}</span>
          <button type="button" @click="loadSummary">再読み込み</button>
        </div>

        <div v-else-if="hasBudget" class="budget-overview-grid" :class="{ 'total-only': !budget?.categoryBudgets.length }">
          <article v-if="budget && budget.amount !== null" class="budget-total-overview" :class="{ 'over-budget': (remainingBudget ?? 0) < 0 }">
            <div class="budget-total-topline">
              <span>月全体の予算</span>
              <strong v-if="(remainingBudget ?? 0) < 0" class="budget-state">予算超過</strong>
              <strong v-else class="budget-state">残り {{ formatCurrency(remainingBudget ?? 0) }}</strong>
            </div>
            <div class="budget-large-numbers">
              <strong>{{ formatCurrency(summary.total) }}</strong>
              <span>/ {{ formatCurrency(budget.amount ?? 0) }}</span>
            </div>
            <div class="budget-progress-track" role="progressbar" :aria-valuenow="overallProgress" aria-valuemin="0" aria-valuemax="100" :aria-label="`月予算の${overallProgress}%を使用`">
              <span :style="{ width: `${overallProgress}%` }"></span>
            </div>
            <p class="budget-progress-caption">予算の {{ overallProgress }}% を使用</p>
          </article>

          <div v-if="budget && budget.categoryBudgets.length" class="category-budget-overview" :class="{ 'category-only': budget.amount === null }">
            <h3>カテゴリ別</h3>
            <article v-for="item in budget.categoryBudgets" :key="item.category" class="category-budget-row" :class="{ 'over-budget': categoryBudgetProgress(item.category, item.amount).remaining < 0 }">
              <div class="category-budget-copy">
                <strong>{{ getCategoryMeta(item.category).label }}</strong>
                <span>{{ formatCurrency(categoryBudgetProgress(item.category, item.amount).spent) }} <small>/ {{ formatCurrency(item.amount) }}</small></span>
              </div>
              <div class="budget-progress-track" role="progressbar" :aria-valuenow="categoryBudgetProgress(item.category, item.amount).percent" aria-valuemin="0" aria-valuemax="100" :aria-label="`${getCategoryMeta(item.category).label}予算の${categoryBudgetProgress(item.category, item.amount).percent}%を使用`">
                <span :style="{ width: `${categoryBudgetProgress(item.category, item.amount).percent}%`, background: getCategoryMeta(item.category).color }"></span>
              </div>
              <p>{{ categoryBudgetProgress(item.category, item.amount).remaining < 0 ? `超過 ${formatCurrency(Math.abs(categoryBudgetProgress(item.category, item.amount).remaining))}` : `残り ${formatCurrency(categoryBudgetProgress(item.category, item.amount).remaining)}` }}</p>
            </article>
          </div>
        </div>
        <RouterLink v-else-if="!budgetError" class="budget-empty-prompt" :to="{ name: 'monthly-budget-settings' }">
          <span class="budget-empty-icon" aria-hidden="true">＋</span>
          <span><strong>{{ month }}月の予算を決める</strong><small>月全体と、気になるカテゴリの予算を設定できます。</small></span>
          <span class="budget-empty-arrow" aria-hidden="true">→</span>
        </RouterLink>
      </section>

      <CategoryBreakdown :totals="summary.categoryTotals" />
    </template>
  </main>
</template>

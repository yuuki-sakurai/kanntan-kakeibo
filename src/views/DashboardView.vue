<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import CategoryBreakdown from "@/components/CategoryBreakdown.vue"
import MonthCalendar from "@/components/MonthCalendar.vue"
import { expenseApi } from "@/api/expenseApi"
import type { MonthlySummary } from "@/types/expense"
import { formatCurrency } from "@/utils/format"

const viewDate = ref(new Date(2026, 8, 1))
const summary = ref<MonthlySummary | null>(null)
const loading = ref(true)
const error = ref("")

const year = computed(() => viewDate.value.getFullYear())
const month = computed(() => viewDate.value.getMonth() + 1)
const monthLabel = computed(() => `${year.value}年 ${month.value}月`)
const recordedDays = computed(() => summary.value?.dailyTotals.length ?? 0)
const average = computed(() =>
  recordedDays.value ? Math.round((summary.value?.total ?? 0) / recordedDays.value) : 0,
)

const loadSummary = async () => {
  loading.value = true
  error.value = ""
  try {
    summary.value = await expenseApi.getMonthlySummary(year.value, month.value)
  } catch {
    error.value = "支出データを読み込めませんでした。"
  } finally {
    loading.value = false
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

      <CategoryBreakdown :totals="summary.categoryTotals" />
    </template>
  </main>
</template>

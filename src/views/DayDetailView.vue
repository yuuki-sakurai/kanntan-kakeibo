<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { expenseApi } from "@/api/expenseApi"
import type { Expense } from "@/types/expense"
import { getCategoryMeta } from "@/stores/categories"
import { formatCurrency, formatDateLong } from "@/utils/format"

const route = useRoute()
const expenses = ref<Expense[]>([])
const loading = ref(true)
const error = ref("")

const date = computed(() => String(route.params.date))
const total = computed(() => expenses.value.reduce((sum, expense) => sum + expense.total, 0))

let requestId = 0
const loadExpenses = async () => {
  const currentRequest = ++requestId
  expenses.value = []
  loading.value = true
  error.value = ""
  try {
    const result = await expenseApi.getDailyExpenses(date.value)
    if (currentRequest !== requestId) return
    expenses.value = result
  } catch {
    if (currentRequest !== requestId) return
    error.value = "この日の明細を読み込めませんでした。"
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

watch(date, loadExpenses)
onMounted(loadExpenses)
</script>

<template>
  <main class="page narrow-page">
    <RouterLink class="back-link" to="/"><span aria-hidden="true">←</span> 月間一覧へ戻る</RouterLink>

    <div class="detail-heading">
      <div>
        <p class="eyebrow">DAILY DETAIL</p>
        <h1>{{ formatDateLong(date) }}</h1>
      </div>
      <RouterLink class="primary-button" :to="{ name: 'expense-new', query: { date } }">
        <span aria-hidden="true">＋</span> この日の支出を追加
      </RouterLink>
    </div>

    <p v-if="error" class="error-banner" role="alert">{{ error }}</p>
    <p v-if="route.query.saved === '1'" class="success-banner" role="status">{{ route.query.updated === "1" ? "支出を更新しました。" : "支出を保存しました。" }}</p>
    <div v-if="loading" class="loading-panel"><span class="loader"></span> 明細を読み込んでいます</div>

    <template v-else-if="!error">
      <section class="daily-total-card" aria-label="この日の支出合計">
        <div>
          <span>この日の合計</span>
          <strong>{{ formatCurrency(total) }}</strong>
        </div>
        <span>{{ expenses.length }}件の記録</span>
      </section>

      <section v-if="expenses.length" class="expense-list" aria-label="支出明細">
        <RouterLink v-for="expense in expenses" :key="expense.id" class="expense-card expense-edit-link" :to="{ name: 'expense-edit', params: { id: expense.id } }" :aria-label="`${expense.store}の支出を編集`">
          <div
            class="expense-category-mark"
            :style="{ color: getCategoryMeta(expense.category).color, background: getCategoryMeta(expense.category).softColor }"
          >
            {{ getCategoryMeta(expense.category).label.slice(0, 1) }}
          </div>
          <div class="expense-main">
            <div class="expense-title-row">
              <div>
                <h2>{{ expense.store }}</h2>
                <span>{{ getCategoryMeta(expense.category).label }}</span>
              </div>
              <strong>{{ formatCurrency(expense.total) }}</strong>
            </div>
            <p class="edit-hint">クリックして編集 →</p>
            <ul class="item-list">
              <li v-for="item in expense.items" :key="item.id">
                <span>{{ item.name }}</span>
                <span>{{ formatCurrency(item.unitPrice) }} × {{ item.quantity }}</span>
              </li>
            </ul>
          </div>
        </RouterLink>
      </section>

      <section v-else class="empty-state">
        <span aria-hidden="true">○</span>
        <h2>この日の支出はありません</h2>
        <p>使った金額を記録すると、ここに明細が表示されます。</p>
        <RouterLink class="primary-button" :to="{ name: 'expense-new', query: { date } }">支出を入力する</RouterLink>
      </section>
    </template>
  </main>
</template>

<style scoped>
.expense-edit-link { color: inherit; text-decoration: none; transition: border-color 0.15s; }
.expense-edit-link:hover { border-color: #368368; }
.expense-edit-link:focus-visible { outline: 3px solid #368368; outline-offset: 3px; }
.edit-hint { font-size: 12px; color: #368368; margin: 8px 0; }
</style>

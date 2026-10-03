<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { ExpenseApiError, expenseApi } from "@/api/expenseApi"
import { categories, loadCategories, getCategoryMeta } from "@/stores/categories"
import type { MonthlyBudget } from "@/types/expense"
import { formatCurrency } from "@/utils/format"

const selectedMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const amount = ref("")
const categoryAmounts = ref<Record<string, string>>({})
const loading = ref(true)
const saving = ref(false)
const error = ref("")
const success = ref("")
const year = computed(() => selectedMonth.value.getFullYear())
const month = computed(() => selectedMonth.value.getMonth() + 1)
const monthLabel = computed(() => `${year.value}年${month.value}月`)
let requestId = 0

function moveMonth(difference: number) {
  selectedMonth.value = new Date(year.value, month.value - 1 + difference, 1)
}

async function loadBudget() {
  const current = ++requestId
  loading.value = true
  error.value = ""
  success.value = ""
  try {
    const budget = await expenseApi.getMonthlyBudget(year.value, month.value)
    if (current !== requestId) return
    applyBudget(budget)
  } catch {
    if (current === requestId) error.value = "予算を読み込めませんでした。時間をおいて再読み込みしてください。"
  } finally {
    if (current === requestId) loading.value = false
  }
}

function applyBudget(budget: MonthlyBudget) {
  amount.value = budget.amount === null ? "" : String(budget.amount)
  categoryAmounts.value = Object.fromEntries(budget.categoryBudgets.map((item) => [item.category, String(item.amount)]))
}

function parsedAmount(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 999_999_999_999) {
    throw new Error("予算は0円以上の整数で入力してください。")
  }
  return parsed
}

async function saveBudget() {
  if (saving.value) return
  error.value = ""
  success.value = ""
  let totalAmount: number | null
  let categoryBudgets: MonthlyBudget["categoryBudgets"]
  try {
    totalAmount = parsedAmount(amount.value)
    categoryBudgets = Object.entries(categoryAmounts.value)
      .filter(([, value]) => value.trim() !== "")
      .map(([category, value]) => {
        const parsed = parsedAmount(value)
        if (parsed === null) throw new Error("カテゴリ別予算を確認してください。")
        return { category, amount: parsed }
      })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "予算額を確認してください。"
    return
  }

  saving.value = true
  try {
    const saved = await expenseApi.saveMonthlyBudget({ year: year.value, month: month.value, amount: totalAmount, categoryBudgets })
    applyBudget(saved)
    success.value = `${monthLabel.value}の予算を保存しました。`
  } catch (cause) {
    error.value = cause instanceof ExpenseApiError ? cause.message : "予算を保存できませんでした。再度お試しください。"
  } finally {
    saving.value = false
  }
}

watch(selectedMonth, loadBudget)
onMounted(() => { void Promise.all([loadCategories(), loadBudget()]) })
</script>

<template>
  <section class="budget-settings" aria-labelledby="budget-settings-title">
    <div class="budget-settings-header">
      <div>
        <p class="eyebrow">PLAN YOUR MONTH</p>
        <h2 id="budget-settings-title">月ごとの予算を設定</h2>
        <p class="budget-intro">月全体の上限と、気になるカテゴリの目安を決めておけます。</p>
      </div>
      <div class="month-switcher" aria-label="設定する月を変更">
        <button type="button" aria-label="前の月" @click="moveMonth(-1)">‹</button>
        <strong>{{ monthLabel }}</strong>
        <button type="button" aria-label="次の月" @click="moveMonth(1)">›</button>
      </div>
    </div>

    <p v-if="error" class="error-banner" role="alert">{{ error }}</p>
    <p v-if="success" class="success-banner" role="status">{{ success }}</p>
    <div v-if="loading" class="loading-panel" role="status"><span class="loader"></span>予算を読み込んでいます</div>

    <form v-else class="budget-form" @submit.prevent="saveBudget">
      <div class="budget-total-field">
        <label for="monthly-budget-amount">月全体の予算 <span>任意</span></label>
        <div class="budget-input-wrap"><span>¥</span><input id="monthly-budget-amount" v-model="amount" type="number" min="0" max="999999999999" step="1" inputmode="numeric" placeholder="例：250000" /></div>
        <small>空欄にすると月全体の予算は設定せず、カテゴリ別予算だけを使えます。</small>
      </div>

      <div class="budget-category-heading">
        <div><h3>カテゴリ別の予算</h3><p>設定したい項目だけ入力してください。</p></div>
        <span>{{ categories.length }}カテゴリ</span>
      </div>
      <div class="budget-category-list">
        <label v-for="category in categories" :key="category.id" class="budget-category-field">
          <span class="budget-category-name">
            <i :style="{ background: getCategoryMeta(category.id).color }" aria-hidden="true"></i>
            {{ category.name }}
          </span>
          <span class="budget-input-wrap"><span>¥</span><input v-model="categoryAmounts[category.id]" type="number" min="0" max="999999999999" step="1" inputmode="numeric" :aria-label="`${category.name}の月予算`" placeholder="設定しない" /></span>
        </label>
      </div>
      <div class="budget-form-actions"><p>予算は月ごとに保存されます。</p><button class="primary-button" type="submit" :disabled="saving">{{ saving ? "保存しています…" : "予算を保存" }}</button></div>
    </form>
  </section>
</template>

<style scoped>
.budget-settings { padding: 30px; border: 1px solid var(--line); border-radius: 22px; background: var(--paper); box-shadow: var(--shadow); }
.budget-settings-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 25px; }
.budget-settings-header h2 { margin: 0; color: var(--navy); font-size: 1.3rem; }
.budget-intro, .budget-category-heading p { margin: 8px 0 0; color: var(--muted); font-size: .9rem; line-height: 1.7; }
.budget-total-field { max-width: 520px; padding: 22px; border-radius: 16px; background: #f4f5ed; }
.budget-total-field label { display: block; margin-bottom: 10px; color: var(--navy); font-weight: 700; }
.budget-total-field label span { margin-left: 8px; color: var(--muted); font-size: .75rem; font-weight: 500; }
.budget-total-field small { display: block; margin-top: 10px; color: var(--muted); line-height: 1.6; }
.budget-input-wrap { min-width: 0; height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 13px; border: 1px solid var(--line); border-radius: 11px; background: var(--paper); color: var(--muted); }
.budget-input-wrap:focus-within { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(83,138,114,.13); }
.budget-input-wrap input { width: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 1rem; }
.budget-category-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 32px 0 14px; }
.budget-category-heading h3 { margin: 0; color: var(--navy); }
.budget-category-heading > span { color: var(--muted); font-size: .8rem; }
.budget-category-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 28px; }
.budget-category-field { min-width: 0; min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border-top: 1px solid var(--line-light); }
.budget-category-name { min-width: 0; display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 600; }
.budget-category-name i { width: 10px; height: 10px; flex: 0 0 auto; border-radius: 50%; }
.budget-category-field .budget-input-wrap { width: min(205px, 50%); height: 42px; }
.budget-category-field input { font-size: .9rem; }
.budget-form-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 26px; padding-top: 22px; border-top: 1px solid var(--line); }
.budget-form-actions p { margin: 0; color: var(--muted); font-size: .82rem; }
.budget-form-actions button { min-width: 160px; }
.budget-form-actions button:disabled { opacity: .6; cursor: wait; }
@media (max-width: 720px) {
  .budget-settings { padding: 22px 17px; }
  .budget-settings-header { align-items: stretch; flex-direction: column; }
  .budget-category-list { grid-template-columns: 1fr; }
  .budget-category-field { min-height: 66px; }
  .budget-form-actions { align-items: stretch; flex-direction: column; }
  .budget-form-actions button { width: 100%; min-height: 50px; }
}
</style>

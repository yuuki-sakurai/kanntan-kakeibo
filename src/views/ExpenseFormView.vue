<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { expenseApi, ExpenseApiError } from "@/api/expenseApi"
import type { CategoryId } from "@/types/expense"
import { categories } from "@/stores/categories"
import { formatCurrency } from "@/utils/format"

interface FormItem {
  key: number
  name: string
  unitPrice: number | null
  quantity: number
}

const route = useRoute()
const router = useRouter()
const editing = route.name === "expense-edit"
const expenseId = String(route.params.id ?? "")
const loading = ref(editing)
const loadError = ref("")
const originalDate = ref("")
const cancelTo = computed(() => editing && originalDate.value ? { name: "day-detail", params: { date: originalDate.value } } : { name: "dashboard" })
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

const date = ref(typeof route.query.date === "string" ? route.query.date : today)
const store = ref("")
const category = ref<CategoryId>("food")
const items = ref<FormItem[]>([{ key: 1, name: "", unitPrice: null, quantity: 1 }])
const stores = ref<string[]>([])
const saving = ref(false)
const storesError = ref("")
const submitError = ref("")

const total = computed(() =>
  items.value.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0,
  ),
)

const addItem = () => {
  if (items.value.length >= 100) return
  items.value.push({ key: Math.max(...items.value.map((item) => item.key)) + 1, name: "", unitPrice: null, quantity: 1 })
}

const removeItem = (key: number) => {
  if (items.value.length === 1) return
  items.value = items.value.filter((item) => item.key !== key)
}

const submit = async () => {
  if (saving.value || loading.value || loadError.value) return
  if (!categories.value.some(item => item.id === category.value)) {
    submitError.value = "カテゴリを選択してください。"
    return
  }
  submitError.value = ""
  if (!date.value || !store.value.trim() || items.value.some((item) => !item.name.trim() || item.unitPrice === null || !Number.isInteger(item.unitPrice) || Number(item.unitPrice) < 0 || Number(item.unitPrice) > 100000000 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000)) {
    submitError.value = "必須項目と単価・個数の入力範囲を確認してください。"
    return
  }

  saving.value = true
  try {
    const input = {
      date: date.value,
      store: store.value.trim(),
      category: category.value,
      items: items.value.map((item) => ({
        name: item.name.trim(),
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
      })),
    }
    const saved = editing ? await expenseApi.updateExpense(expenseId, input) : await expenseApi.createExpense(input)
    await router.push({ name: "day-detail", params: { date: saved.date }, query: { saved: "1", ...(editing ? { updated: "1" } : {}) } })
  } catch (error) {
    submitError.value = error instanceof ExpenseApiError ? error.message : "保存結果を確認できませんでした。明細を確認してください。"
  } finally {
    saving.value = false
  }
}

const loadExpense = async () => {
  loading.value = true
  loadError.value = ""
  try {
    const expense = await expenseApi.getExpense(expenseId)
    originalDate.value = expense.date
    date.value = expense.date
    store.value = expense.store
    category.value = expense.category
    items.value = expense.items.map((item, index) => ({ key: index + 1, name: item.name, unitPrice: item.unitPrice, quantity: item.quantity }))
  } catch (error) {
    loadError.value = error instanceof ExpenseApiError && error.status === 404
      ? "この支出は見つかりませんでした。明細一覧を確認してください。"
      : "支出を読み込めませんでした。再読み込みしてください。"
  } finally {
    loading.value = false
  }
}

onMounted(() => { if (editing) void loadExpense() })

onMounted(async () => {
  try {
    stores.value = await expenseApi.getStoreSuggestions()
  } catch {
    storesError.value = "店舗候補を読み込めませんでした。店舗名は直接入力できます。"
  }
})
</script>

<template>
  <main class="page form-page">
    <RouterLink class="back-link" :to="cancelTo"><span aria-hidden="true">←</span> {{ editing && originalDate ? "明細へ戻る" : "月間一覧へ戻る" }}</RouterLink>

    <div class="form-heading">
      <p class="eyebrow">{{ editing ? "EDIT EXPENSE" : "NEW EXPENSE" }}</p>
      <h1>{{ editing ? "支出を編集" : "支出を入力" }}</h1>
      <p>{{ editing ? "カテゴリ・内容・金額などを修正できます。" : "レシートを見ながら、使った内容を記録しましょう。" }}</p>
    </div>

    <p v-if="storesError" class="error-banner" role="status">{{ storesError }}</p>

    <div v-if="loading" class="loading-panel">支出を読み込んでいます…</div>
    <div v-else-if="loadError" class="error-banner" role="alert">{{ loadError }} <button type="button" @click="loadExpense">再読み込み</button></div>
    <form v-else class="expense-form" @submit.prevent="submit">
      <section class="form-section">
        <div class="form-section-number">01</div>
        <div class="form-section-content">
          <div class="form-section-heading">
            <h2>いつ・どこで</h2>
            <span>基本情報</span>
          </div>
          <div class="field-grid two-columns">
            <label class="field">
              <span>日付 <em>必須</em></span>
              <input v-model="date" type="date" min="1000-01-01" max="9999-12-31" required />
            </label>
            <label class="field">
              <span>使ったお店 <em>必須</em></span>
              <input v-model="store" type="text" maxlength="255" list="store-list" placeholder="例：オーケー" required />
              <datalist id="store-list">
                <option v-for="storeName in stores" :key="storeName" :value="storeName" />
              </datalist>
            </label>
          </div>
          <label class="field category-field">
            <span>カテゴリ <em>必須</em></span>
            <select v-model="category" required :disabled="!categories.length">
              <option v-if="!categories.length" value="food">カテゴリを読み込んでいます…</option>
              <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
            <RouterLink :to="{ name: 'category-settings' }">カテゴリを追加する</RouterLink>
          </label>
        </div>
      </section>

      <section class="form-section">
        <div class="form-section-number">02</div>
        <div class="form-section-content">
          <div class="form-section-heading item-heading">
            <div>
              <h2>買ったもの</h2>
              <span>品目ごとに単価と個数を入力</span>
            </div>
            <button class="secondary-button" type="button" :disabled="items.length >= 100" @click="addItem"><span>＋</span> 品目を追加</button>
          </div>

          <div class="form-items">
            <div v-for="(item, index) in items" :key="item.key" class="form-item">
              <span class="form-item-index">{{ String(index + 1).padStart(2, "0") }}</span>
              <label class="field item-name-field">
                <span>内容・品目 <em>必須</em></span>
                <input v-model="item.name" type="text" maxlength="255" placeholder="例：食料品" required />
              </label>
              <label class="field">
                <span>単価 <em>必須</em></span>
                <div class="currency-input">
                  <span>¥</span>
                  <input v-model.number="item.unitPrice" type="number" min="0" max="100000000" step="1" inputmode="numeric" placeholder="0" required />
                </div>
              </label>
              <label class="field quantity-field">
                <span>個数 <em>必須</em></span>
                <input v-model.number="item.quantity" type="number" min="1" max="10000" step="1" inputmode="numeric" required />
              </label>
              <button class="remove-item" type="button" :disabled="items.length === 1" aria-label="この品目を削除" @click="removeItem(item.key)">×</button>
            </div>
          </div>
        </div>
      </section>

      <section class="form-total" aria-live="polite">
        <div>
          <span>合計金額</span>
          <small>単価 × 個数から自動計算</small>
        </div>
        <strong>{{ formatCurrency(total) }}</strong>
      </section>

      <p v-if="submitError" class="error-banner" role="alert">{{ submitError }}</p>

      <div class="form-actions">
        <RouterLink class="cancel-button" :to="cancelTo">キャンセル</RouterLink>
        <button class="primary-button submit-button" type="submit" :disabled="saving">
          {{ saving ? "保存しています…" : editing ? "変更を保存する" : "この内容で保存する" }}
        </button>
      </div>
    </form>
  </main>
</template>

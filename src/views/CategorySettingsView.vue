<script setup lang="ts">
import { ref } from "vue"
import { ExpenseApiError } from "@/api/expenseApi"
import { categories, categoriesLoading, addCategory, getCategoryMeta } from "@/stores/categories"

const name = ref("")
const saving = ref(false)
const error = ref("")
const success = ref("")

async function submit() {
  if (saving.value) return
  error.value = ""
  success.value = ""
  if (!name.value.trim()) {
    error.value = "カテゴリ名を入力してください。"
    return
  }
  saving.value = true
  try {
    const category = await addCategory(name.value.trim())
    success.value = `「${category.name}」を追加しました。支出入力とCSVインポートで使用できます。`
    name.value = ""
  } catch (cause) {
    error.value = cause instanceof ExpenseApiError && cause.status === 422
      ? cause.message
      : "追加結果を確認できませんでした。カテゴリ一覧を再読み込みして確認してください。"
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="category-settings" aria-labelledby="settings-category-title">
    <h2 id="settings-category-title">カテゴリを管理</h2>
    <p class="intro">お酒や酒肴品など、暮らしに合わせたカテゴリを追加できます。</p>
    <form @submit.prevent="submit">
      <label for="category-name">新しいカテゴリ名 <span>50文字以内</span></label>
      <div class="add-category-row">
        <input id="category-name" v-model="name" type="text" maxlength="50" required placeholder="例：お酒、酒肴品" :disabled="saving" />
        <button type="submit" class="primary-button" :disabled="saving">{{ saving ? '追加しています…' : 'カテゴリを追加' }}</button>
      </div>
    </form>
    <p v-if="error" class="error-banner" role="alert">{{ error }}</p>
    <p v-if="success" class="success-banner" role="status">{{ success }}</p>
    <div class="category-list-heading"><h3>登録済みのカテゴリ</h3><span>{{ categories.length }}件</span></div>
    <p v-if="categoriesLoading && !categories.length" role="status">読み込んでいます…</p>
    <ul class="settings-category-list">
      <li v-for="category in categories" :key="category.id">
        <span class="category-dot" :style="{ background: getCategoryMeta(category.id).color }" aria-hidden="true"></span>
        {{ category.name }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.category-settings { padding: 28px; border: 1px solid var(--line); border-radius: 18px; background: var(--paper); box-shadow: var(--shadow); }
h2 { margin: 0; font-size: 1.25rem; color: var(--navy); }
.intro { color: var(--muted); line-height: 1.8; margin: 10px 0 28px; }
label { display: block; font-weight: 700; font-size: .9rem; margin-bottom: 10px; }
label span { margin-left: 12px; color: var(--muted); font-weight: 400; }
.add-category-row { display: flex; gap: 12px; }
input { min-width: 0; flex: 1; border: 1px solid var(--line); border-radius: 8px; padding: 14px; font-size: 1rem; }
button { flex-shrink: 0; }
button:disabled { opacity: .55; cursor: not-allowed; }
.category-list-heading { margin: 30px 0 16px; padding-top: 24px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
h3 { margin: 0; font-size: 1rem; }
.category-list-heading span { color: var(--muted); }
.settings-category-list { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; padding: 0; margin: 0; }
li { padding: 14px; border-radius: 8px; background: var(--canvas); display: flex; align-items: center; gap: 10px; overflow-wrap: anywhere; }
.category-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
@media (max-width: 600px) { .category-settings { padding: 20px 16px; } .add-category-row { flex-direction: column; } }
</style>

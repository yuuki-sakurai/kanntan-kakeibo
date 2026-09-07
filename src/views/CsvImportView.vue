<script setup lang="ts">
import { ref } from "vue"
import { expenseApi, ExpenseApiError } from "@/api/expenseApi"
import type { CsvEncoding, ExpenseImportPreview, ExpenseImportResult } from "@/types/expenseImport"
import { categories, getCategoryMeta, loadCategories } from "@/stores/categories"
import { formatCurrency } from "@/utils/format"

const file = ref<File | null>(null)
const encoding = ref<CsvEncoding>("UTF-8")
const preview = ref<ExpenseImportPreview | null>(null)
const result = ref<ExpenseImportResult | null>(null)
const busy = ref<"preview" | "import" | null>(null)
const error = ref("")
const details = ref<string[]>([])

function reset() {
  preview.value = null
  result.value = null
  error.value = ""
  details.value = []
}

function selectFile(event: Event) {
  reset()
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  if (file.value && (file.value.size > 2 * 1024 * 1024 || file.value.size === 0)) {
    error.value = "内容のある2MB以内のCSVファイルを選択してください。"
    file.value = null
  }
}

function showError(cause: unknown) {
  error.value = cause instanceof ExpenseApiError ? cause.message : "処理できませんでした。同じCSVで再度お試しください。"
  details.value = cause instanceof ExpenseApiError ? cause.details : []
}

async function checkFile() {
  if (!file.value || busy.value) return
  reset()
  busy.value = "preview"
  try {
    preview.value = await expenseApi.previewCsv(file.value, encoding.value)
  } catch (cause) {
    showError(cause)
  } finally {
    busy.value = null
  }
}

async function importFile(approveNewCategories = false) {
  if (!file.value || !preview.value || preview.value.alreadyImported || result.value || busy.value) return
  if (preview.value.unknownCategories.length && !approveNewCategories) return
  busy.value = "import"
  error.value = ""
  details.value = []
  try {
    result.value = await expenseApi.importCsv(file.value, encoding.value, approveNewCategories ? preview.value.unknownCategories : [])
    await loadCategories()
  } catch (cause) {
    showError(cause)
  } finally {
    busy.value = null
  }
}

function downloadTemplate() {
  const csv = "\uFEFF日付,店舗,カテゴリ,品目,単価,数量\r\n2026-09-01,スーパー,食費,りんご,150,2\r\n2026-09-02,駅前カフェ,外食,コーヒー,450,1\r\n"
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "家計簿インポートテンプレート.csv"
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <section class="import-card" aria-labelledby="import-title" :aria-busy="busy !== null">
    <div class="import-heading">
      <div><h2 id="import-title">CSVから支出を取り込む</h2><p>ファイルの内容を確認してから、まとめて登録できます。</p></div>
      <button type="button" class="secondary-button" @click="downloadTemplate">テンプレートをダウンロード</button>
    </div>

    <details class="format-guide">
      <summary>CSVの作り方・使えるカテゴリ</summary>
      <p>列の順序は「日付,店舗,カテゴリ,品目,単価,数量」です。テンプレートのサンプル2行は、ご自身のデータに置き換えてください。</p>
      <p>1行につき1件の支出として登録します。同じ日付・店舗の行も別の支出になります。1ファイル1,000件・2MBまで。</p>
      <p>日付は2026-09-01の形式、単価は0〜100,000,000円、数量は1〜10,000の整数で入力してください。金額に「円」「¥」や桁区切りのカンマは付けません。</p>
      <p>カテゴリ：{{ categories.map(item => item.name).join('、') || '読み込み中' }}</p>
      <p>未登録のカテゴリがある場合は、確認画面で承認すると支出と一緒に追加できます。<RouterLink :to="{ name: 'category-settings' }">カテゴリ設定</RouterLink>からも追加できます。</p>
      <p>UTF-8（BOM付きも可）またはShift_JISに対応しています。空行は無視します。</p>
    </details>

    <form class="upload-form" @submit.prevent="checkFile">
      <label class="file-field">CSVファイル
        <input type="file" accept=".csv,text/csv" :disabled="busy !== null" @change="selectFile" required />
      </label>
      <label class="encoding-field">文字コード
        <select v-model="encoding" :disabled="busy !== null" @change="reset">
          <option value="UTF-8">UTF-8（テンプレートはこちら）</option>
          <option value="SJIS-win">Shift_JIS（WindowsのCSV）</option>
        </select>
      </label>
      <button class="primary-button" type="submit" :disabled="!file || busy !== null">{{ busy === 'preview' ? '確認しています…' : '内容を確認する' }}</button>
    </form>

    <div v-if="error" class="error-banner" role="alert">
      <p>{{ error }}</p>
      <ul v-if="details.length" class="import-errors"><li v-for="(detail, index) in details" :key="index">{{ detail }}</li></ul>
      <p v-if="details.length === 50">エラーは先頭50件まで表示しています。</p>
    </div>

    <div v-if="result" class="success-banner" role="status">
      <p>{{ result.alreadyImported ? 'この内容はすでに取り込み済みです。追加登録はしていません。' : `${result.importedCount}件の支出を取り込みました。` }}</p>
      <RouterLink to="/" class="result-link">月間一覧で確認する →</RouterLink>
    </div>

    <section v-if="preview && !result" class="preview-section" aria-labelledby="preview-title">
      <div class="preview-heading"><h3 id="preview-title">取り込み内容</h3><strong>{{ preview.count }}件 · {{ formatCurrency(preview.total) }}</strong></div>
      <p v-if="preview.alreadyImported" class="success-banner" role="status">この内容はすでに取り込み済みです。追加登録はしません。</p>
      <p v-else class="preview-note">まだ登録されていません。先頭{{ preview.rows.length }}件を表示しています。</p>
      <div class="preview-scroll" tabindex="0" role="region" aria-label="CSVのプレビュー表">
        <table>
          <thead><tr><th scope="col">行</th><th scope="col">日付</th><th scope="col">店舗 / 品目</th><th scope="col">カテゴリ</th><th scope="col">単価 × 数量</th><th scope="col">金額</th></tr></thead>
          <tbody><tr v-for="row in preview.rows" :key="row.line">
            <td>{{ row.line }}</td><td>{{ row.date }}</td>
            <td class="text-cell">{{ row.store }}<small>{{ row.items[0]?.name }}</small></td>
            <td>{{ row.categoryName ?? getCategoryMeta(row.category).label }}<small v-if="row.categoryName">新規カテゴリ</small></td>
            <td>{{ formatCurrency(row.items[0]?.unitPrice ?? 0) }} × {{ row.items[0]?.quantity }}</td>
            <td>{{ formatCurrency((row.items[0]?.unitPrice ?? 0) * (row.items[0]?.quantity ?? 0)) }}</td>
          </tr></tbody>
        </table>
      </div>
      <section v-if="!preview.alreadyImported && preview.unknownCategories.length" class="category-confirmation" aria-labelledby="category-confirmation-title">
        <h3 id="category-confirmation-title">未登録のカテゴリがあります</h3>
        <p>以下の{{ preview.unknownCategories.length }}件を新しいカテゴリとして追加し、CSVの支出を取り込んでもよいですか？</p>
        <ul><li v-for="name in preview.unknownCategories" :key="name">{{ name }}</li></ul>
        <div class="confirmation-actions">
          <button type="button" class="secondary-button" :disabled="busy !== null" @click="reset">キャンセル</button>
          <button type="button" class="primary-button" :disabled="busy !== null" @click="importFile(true)">{{ busy === 'import' ? '取り込んでいます…' : 'OK：カテゴリを追加して取り込む' }}</button>
        </div>
      </section>
      <div v-else-if="!preview.alreadyImported" class="import-actions">
        <p>すべての行をまとめて登録します。同じ内容のCSVを再送しても重複登録されません。</p>
        <button type="button" class="primary-button" :disabled="busy !== null" @click="importFile(false)">{{ busy === 'import' ? '取り込んでいます…' : `${preview.count}件を取り込む` }}</button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.import-card { background: var(--paper); border: 1px solid var(--line); border-radius: 18px; padding: 28px; box-shadow: var(--shadow); }
.import-heading, .preview-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
h2 { margin: 0; font-size: 1.25rem; color: var(--navy); }
h3 { font-size: 1.1rem; margin: 0; }
p { line-height: 1.8; margin: 8px 0; }
.import-heading p, .preview-note, .import-actions p { color: var(--muted); font-size: .9rem; }
.format-guide { margin: 24px 0; padding: 16px 20px; border-radius: 10px; background: var(--canvas); font-size: .9rem; }
summary { cursor: pointer; font-weight: 700; }
.upload-form { display: flex; gap: 20px; flex-wrap: wrap; align-items: end; margin-bottom: 24px; }
label { display: grid; gap: 10px; font-size: .9rem; font-weight: 700; min-width: 0; }
.file-field { flex: 1 1 280px; }
input, select { width: 100%; min-width: 0; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: white; font-size: .9rem; }
input::file-selector-button { border: 0; border-radius: 5px; padding: 7px 12px; margin-right: 12px; background: var(--canvas); color: var(--navy); cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; }
.preview-section { border-top: 1px solid var(--line); margin-top: 24px; padding-top: 24px; }
.preview-heading strong { color: var(--navy); }
.preview-scroll { overflow-x: auto; margin-top: 16px; border: 1px solid var(--line); border-radius: 10px; }
table { width: 100%; border-collapse: collapse; font-size: .9rem; }
th, td { padding: 14px 16px; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--line-light); }
th { background: var(--canvas); color: var(--muted); font-weight: 600; }
.text-cell { min-width: 160px; max-width: 280px; white-space: normal; overflow-wrap: anywhere; }
small { display: block; color: var(--muted); margin-top: 5px; font-size: .875rem; }
.import-actions { display: flex; gap: 20px; justify-content: space-between; align-items: center; margin-top: 20px; }
.import-actions button { flex-shrink: 0; }
.import-errors { padding-left: 22px; max-height: 280px; overflow-y: auto; line-height: 1.8; }
.result-link { font-weight: 700; text-decoration: underline; }
.category-confirmation { margin-top: 24px; padding: 20px; border: 1px solid #e1bb64; border-radius: 12px; background: #fff9e9; }
.category-confirmation ul { padding-left: 24px; max-height: 200px; overflow-y: auto; overflow-wrap: anywhere; line-height: 1.8; }
.confirmation-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12px; margin-top: 20px; }
@media (max-width: 650px) {
  .import-card { padding: 20px 16px; }
  .import-heading { align-items: stretch; }
  .import-heading button, .upload-form button, .encoding-field { width: 100%; }
  .import-actions { flex-direction: column; align-items: stretch; }
}
</style>

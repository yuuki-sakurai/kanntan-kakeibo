<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { expenseApi, ExpenseApiError } from "@/api/expenseApi"
import { user, authError } from "@/stores/auth"
import { resetCategories } from "@/stores/categories"

const route = useRoute()
const router = useRouter()
const registering = computed(() => route.name === "register")
const name = ref("")
const email = ref("")
const password = ref("")
const confirmation = ref("")
const showPassword = ref(false)
const saving = ref(false)
const error = ref("")

async function submit() {
  if (saving.value) return
  error.value = ""
  if (registering.value && password.value !== confirmation.value) {
    error.value = "確認用パスワードが一致しません。"
    return
  }
  if (new TextEncoder().encode(password.value).length > 72) {
    error.value = "パスワードを短くしてください。半角英数字の場合は72文字までです。"
    return
  }
  saving.value = true
  try {
    const session = registering.value
      ? await expenseApi.register(name.value.trim(), email.value.trim(), password.value, confirmation.value)
      : await expenseApi.login(email.value.trim(), password.value)
    resetCategories()
    user.value = session.user
    authError.value = ""
    password.value = ""
    confirmation.value = ""
    const redirect = route.query.redirect
    const target = typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("\\") && !/^\/(login|register)(?:[/?#]|$)/.test(redirect) ? redirect : "/"
    await router.replace(target)
  } catch (cause) {
    error.value = cause instanceof ExpenseApiError ? cause.message : "ログインできませんでした。再度お試しください。"
  } finally { saving.value = false }
}
</script>

<template>
  <main class="auth-page">
    <div class="auth-brand"><span class="brand-mark" aria-hidden="true">家</span><strong>家計簿</strong><span>暮らしのお金</span></div>
    <section class="auth-card" :aria-labelledby="'auth-title'">
      <p class="eyebrow">{{ registering ? 'CREATE ACCOUNT' : 'WELCOME BACK' }}</p>
      <h1 id="auth-title">{{ registering ? 'アカウントを作成' : 'ログイン' }}</h1>
      <p class="auth-intro">{{ registering ? 'あなた専用の家計簿をはじめましょう。' : '日々の記録を、今日もここから。' }}</p>
      <p v-if="route.query.expired === '1'" class="error-banner" role="status">もう一度ログインしてください。</p>
      <p v-if="authError" class="error-banner" role="alert">{{ authError }}</p>
      <form @submit.prevent="submit">
        <fieldset :disabled="saving">
          <label v-if="registering" class="field"><span>お名前</span><input v-model="name" autocomplete="name" maxlength="100" required placeholder="例：桜井 ゆうき" /></label>
          <label class="field"><span>メールアドレス</span><input v-model="email" type="email" autocomplete="username" maxlength="255" required placeholder="you@example.com" /></label>
          <label class="field"><span>パスワード</span><input v-model="password" :type="showPassword ? 'text' : 'password'" :autocomplete="registering ? 'new-password' : 'current-password'" :minlength="registering ? 12 : undefined" maxlength="72" required :aria-describedby="registering ? 'password-help' : undefined" /></label>
          <p v-if="registering" id="password-help" class="password-help">12文字以上で入力してください（半角英数字なら72文字まで）。</p>
          <label v-if="registering" class="field"><span>パスワード（確認）</span><input v-model="confirmation" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="12" maxlength="72" required /></label>
          <label class="password-toggle"><input v-model="showPassword" type="checkbox" />パスワードを表示</label>
          <p v-if="error" class="error-banner" role="alert">{{ error }}</p>
          <button class="primary-button auth-submit" type="submit">{{ saving ? '処理しています…' : registering ? 'アカウントを作成する' : 'ログインする' }}</button>
        </fieldset>
      </form>
      <p class="auth-switch">{{ registering ? 'アカウントをお持ちの方' : 'はじめてご利用の方' }}<RouterLink :to="{ name: registering ? 'login' : 'register' }">{{ registering ? 'ログイン' : '新規登録' }}</RouterLink></p>
    </section>
    <p class="auth-footer">毎日の小さな記録が、暮らしの見通しに。</p>
  </main>
</template>

<style scoped>
.auth-page { min-height: 100dvh; padding: 48px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.auth-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; color: var(--navy); }
.auth-brand strong { font-size: 24px; }.auth-brand > span:last-child { font-size: 12px; color: var(--muted); }
.auth-card { width: 100%; max-width: 460px; padding: 36px; border: 1px solid var(--line); border-radius: 20px; background: var(--paper); box-shadow: var(--shadow); }
h1 { font-size: 28px; margin: 8px 0 12px; }.auth-intro { color: var(--muted); line-height: 1.8; margin-bottom: 28px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }.field { margin-bottom: 20px; }
.password-help { margin: -10px 0 20px; color: var(--muted); font-size: 12px; }.password-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; margin: 8px 0 24px; }
.auth-submit { width: 100%; justify-content: center; }.auth-switch { border-top: 1px solid var(--line); margin: 28px 0 0; padding-top: 24px; text-align: center; font-size: 13px; }.auth-switch a { display: inline-block; margin-left: 12px; color: var(--navy); font-weight: 700; text-decoration: underline; }
.auth-footer { color: var(--muted); font-size: 12px; margin-top: 28px; }fieldset:disabled { opacity: .65; }
@media(max-width: 600px) { .auth-page { padding: 28px 16px; }.auth-card { padding: 28px 22px; } }
</style>

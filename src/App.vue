<script setup lang="ts">
import { useRoute, useRouter } from "vue-router"
import { watch, ref } from "vue"
import { categoriesError, categoriesLoading, loadCategories } from "@/stores/categories"

import { user, logout } from "@/stores/auth"
const router = useRouter()
const loggingOut = ref(false)
const logoutError = ref("")
async function signOut() {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutError.value = ""
  try { await logout(); await router.replace({ name: "login" }) }
  catch { logoutError.value = "ログアウトできませんでした。もう一度お試しください。" }
  finally { loggingOut.value = false }
}
const route = useRoute()
watch(() => route.fullPath, () => { if (user.value && route.name !== "login" && route.name !== "register") void loadCategories() }, { immediate: true })
</script>

<template>
  <div class="app-shell">
    <header v-if="user && route.name !== 'login' && route.name !== 'register'" class="app-header">
      <div class="header-inner">
        <RouterLink class="brand" to="/" aria-label="家計簿 ホーム">
          <span class="brand-mark" aria-hidden="true">家</span>
          <span>
            <strong>家計簿</strong>
            <small>暮らしのお金</small>
          </span>
        </RouterLink>

        <nav class="desktop-nav" aria-label="メインメニュー">
          <RouterLink to="/" :class="{ active: route.name === 'dashboard' || route.name === 'day-detail' }">
            月間一覧
          </RouterLink>
          <RouterLink to="/expenses/new" :class="{ active: route.name === 'expense-new' }">
            支出を入力
          </RouterLink>
          <RouterLink to="/settings" :class="{ active: route.path.startsWith('/settings') }">
            設定
          </RouterLink>
        </nav>

        <button class="header-add-button logout-button" type="button" :disabled="loggingOut" @click="signOut">{{ loggingOut ? "ログアウト中…" : "ログアウト" }}</button>
      </div>
    </header>

    <p v-if="logoutError" class="error-banner" role="alert">{{ logoutError }}</p>
    <div v-if="user && categoriesError" class="category-load-error" role="alert">
      {{ categoriesError }}
      <button type="button" :disabled="categoriesLoading" @click="loadCategories">再読み込み</button>
    </div>
    <RouterView :key="route.path" />

    <nav v-if="user && route.name !== 'login' && route.name !== 'register'" class="mobile-nav" aria-label="モバイルメニュー">
      <RouterLink to="/" :class="{ active: route.name === 'dashboard' || route.name === 'day-detail' }">
        <span class="mobile-nav-icon" aria-hidden="true">▦</span>
        月間一覧
      </RouterLink>
      <RouterLink class="mobile-add" to="/expenses/new" aria-label="支出を入力">
        <span aria-hidden="true">＋</span>
      </RouterLink>
      <RouterLink to="/settings" :class="{ active: route.path.startsWith('/settings') }">
        <span class="mobile-nav-icon" aria-hidden="true">⚙</span>
        設定
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.logout-button { display: inline-flex; font-size: 12px; padding: 10px 14px; }
.category-load-error { max-width: 1120px; margin: 16px auto; padding: 16px; background: #fff0ec; color: #932e19; }
.category-load-error button { margin-left: 16px; text-decoration: underline; font-weight: 700; }
</style>

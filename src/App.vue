<script setup lang="ts">
import { useRoute } from "vue-router"
import { watch } from "vue"
import { categoriesError, categoriesLoading, loadCategories } from "@/stores/categories"

const route = useRoute()
watch(() => route.fullPath, () => { void loadCategories() }, { immediate: true })
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
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

        <RouterLink class="header-add-button" to="/expenses/new">
          <span aria-hidden="true">＋</span> 支出を入力
        </RouterLink>
      </div>
    </header>

    <div v-if="categoriesError" class="category-load-error" role="alert">
      {{ categoriesError }}
      <button type="button" :disabled="categoriesLoading" @click="loadCategories">再読み込み</button>
    </div>
    <RouterView :key="route.path" />

    <nav class="mobile-nav" aria-label="モバイルメニュー">
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
.category-load-error { max-width: 1120px; margin: 16px auto; padding: 16px; background: #fff0ec; color: #932e19; }
.category-load-error button { margin-left: 16px; text-decoration: underline; font-weight: 700; }
</style>

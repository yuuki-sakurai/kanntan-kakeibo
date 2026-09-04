<script setup lang="ts">
import { useRoute } from "vue-router"

const route = useRoute()
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
        </nav>

        <RouterLink class="header-add-button" to="/expenses/new">
          <span aria-hidden="true">＋</span> 支出を入力
        </RouterLink>
      </div>
    </header>

    <RouterView />

    <nav class="mobile-nav" aria-label="モバイルメニュー">
      <RouterLink to="/" :class="{ active: route.name === 'dashboard' || route.name === 'day-detail' }">
        <span class="mobile-nav-icon" aria-hidden="true">▦</span>
        月間一覧
      </RouterLink>
      <RouterLink class="mobile-add" to="/expenses/new" aria-label="支出を入力">
        <span aria-hidden="true">＋</span>
      </RouterLink>
      <RouterLink to="/expenses/new" :class="{ active: route.name === 'expense-new' }">
        <span class="mobile-nav-icon" aria-hidden="true">✎</span>
        支出入力
      </RouterLink>
    </nav>
  </div>
</template>

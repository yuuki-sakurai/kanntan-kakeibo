<template>
  <main class="page settings-page">
    <div class="page-topline">
      <div><p class="eyebrow">SETTINGS</p><h1>設定</h1></div>
    </div>
    <nav class="settings-menu" aria-label="設定メニュー">
      <RouterLink :to="{ name: 'csv-import' }" active-class="active">CSVインポート</RouterLink>
      <RouterLink :to="{ name: 'category-settings' }" active-class="active">カテゴリ</RouterLink>
    </nav>
    <RouterView />
  </main>
</template>

<style scoped>
.settings-page { max-width: 1080px; }
.settings-menu { display: flex; gap: 24px; margin-bottom: 24px; border-bottom: 1px solid var(--line); }
.settings-menu a { padding: 14px 2px; color: var(--muted); font-weight: 700; }
.settings-menu a.active { color: var(--navy); border-bottom: 3px solid var(--coral); }
</style>

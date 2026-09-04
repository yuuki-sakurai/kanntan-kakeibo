<script setup lang="ts">
import { computed } from "vue"
import type { CategoryTotal } from "@/types/expense"
import { categoryMeta } from "@/types/expense"
import { formatCurrency } from "@/utils/format"

const props = defineProps<{ totals: CategoryTotal[] }>()
const maxAmount = computed(() => Math.max(...props.totals.map((item) => item.amount), 1))
</script>

<template>
  <section class="category-section" aria-labelledby="category-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">CATEGORY</p>
        <h2 id="category-title">カテゴリ別の支出</h2>
      </div>
      <span>{{ totals.length }}カテゴリ</span>
    </div>

    <div v-if="totals.length" class="category-grid">
      <article v-for="item in totals" :key="item.category" class="category-row">
        <div
          class="category-icon"
          :style="{ color: categoryMeta[item.category].color, background: categoryMeta[item.category].softColor }"
          aria-hidden="true"
        >
          {{ categoryMeta[item.category].label.slice(0, 1) }}
        </div>
        <div class="category-info">
          <div class="category-label-row">
            <strong>{{ categoryMeta[item.category].label }}</strong>
            <span>{{ item.percentage }}%</span>
          </div>
          <div class="category-bar" aria-hidden="true">
            <span
              :style="{
                width: `${Math.max((item.amount / maxAmount) * 100, 4)}%`,
                background: categoryMeta[item.category].color,
              }"
            ></span>
          </div>
        </div>
        <strong class="category-amount">{{ formatCurrency(item.amount) }}</strong>
      </article>
    </div>
    <p v-else class="empty-message">この月の支出はまだありません。</p>
  </section>
</template>

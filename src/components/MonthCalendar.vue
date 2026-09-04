<script setup lang="ts">
import { computed } from "vue"
import { useRouter } from "vue-router"
import type { DailyTotal } from "@/types/expense"
import { formatCurrency, toDateKey } from "@/utils/format"

const props = defineProps<{
  year: number
  month: number
  dailyTotals: DailyTotal[]
}>()

const router = useRouter()
const weekDays = ["日", "月", "火", "水", "木", "金", "土"]

const dayMap = computed(
  () => new Map(props.dailyTotals.map((daily) => [daily.date, daily])),
)

const cells = computed(() => {
  const firstDay = new Date(props.year, props.month - 1, 1).getDay()
  const daysInMonth = new Date(props.year, props.month, 0).getDate()
  const previousMonthDays = new Date(props.year, props.month - 1, 0).getDate()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  return Array.from({ length: totalCells }, (_, index) => {
    let day = index - firstDay + 1
    let cellYear = props.year
    let cellMonth = props.month
    let muted = false

    if (day <= 0) {
      day = previousMonthDays + day
      cellMonth -= 1
      muted = true
      if (cellMonth === 0) {
        cellMonth = 12
        cellYear -= 1
      }
    } else if (day > daysInMonth) {
      day -= daysInMonth
      cellMonth += 1
      muted = true
      if (cellMonth === 13) {
        cellMonth = 1
        cellYear += 1
      }
    }

    const date = toDateKey(cellYear, cellMonth, day)
    return { day, date, muted, summary: dayMap.value.get(date) }
  })
})

const openDay = (date: string) => {
  void router.push({ name: "day-detail", params: { date } })
}
</script>

<template>
  <div class="calendar" aria-label="月間支出カレンダー">
    <div
      v-for="(weekDay, index) in weekDays"
      :key="weekDay"
      class="calendar-weekday"
      :class="{ sunday: index === 0, saturday: index === 6 }"
    >
      {{ weekDay }}
    </div>

    <button
      v-for="cell in cells"
      :key="cell.date"
      class="calendar-day"
      :class="{ muted: cell.muted, 'has-expense': cell.summary }"
      type="button"
      :aria-label="`${cell.date}${cell.summary ? ` ${formatCurrency(cell.summary.amount)}` : ''}`"
      @click="openDay(cell.date)"
    >
      <span class="day-number">{{ cell.day }}</span>
      <span v-if="cell.summary" class="day-amount">
        {{ formatCurrency(cell.summary.amount) }}
      </span>
      <span v-if="cell.summary" class="expense-dot" aria-hidden="true"></span>
    </button>
  </div>
</template>

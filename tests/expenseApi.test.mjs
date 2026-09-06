import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/api/expenseApi.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
const { HttpExpenseApi, ExpenseApiError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('HTTP client sends all four API requests and preserves JSON contracts', async (t) => {
  const calls = []
  const expense = { id: '1', date: '2026-09-06', store: 'スーパー', category: 'food', items: [{ id: '2', name: '商品', unitPrice: 150, quantity: 2 }], total: 300 }
  const summary = { year: 2026, month: 9, total: 300, dailyTotals: [], categoryTotals: [] }
  const responses = [summary, [expense], expense, ['スーパー']]
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    return Response.json(responses.shift())
  })
  const api = new HttpExpenseApi('/api/v1/')
  assert.deepEqual(await api.getMonthlySummary(2026, 9), summary)
  assert.deepEqual(await api.getDailyExpenses('2026-09-06'), [expense])
  const input = { date: expense.date, store: expense.store, category: expense.category, items: [{ name: '商品', unitPrice: 150, quantity: 2 }] }
  assert.deepEqual(await api.createExpense(input), expense)
  assert.deepEqual(await api.getStoreSuggestions(), ['スーパー'])
  assert.deepEqual(calls.map(c => c.url), ['/api/v1/monthly-summary?year=2026&month=9', '/api/v1/expenses?date=2026-09-06', '/api/v1/expenses', '/api/v1/stores'])
  assert.equal(calls[2].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[2].init.body), input)
  assert.equal(calls[2].init.headers['Content-Type'], 'application/json')
})

test('errors reject, hide server internals, and never silently return mock data', async (t) => {
  const api = new HttpExpenseApi('/api/v1')
  const fetchMock = t.mock.method(globalThis, 'fetch')
  for (const status of [422, 500]) {
    fetchMock.mock.mockImplementation(async () => Response.json({ message: 'SQL secret' }, { status }))
    await assert.rejects(api.getStoreSuggestions(), e => e instanceof ExpenseApiError && e.status === status && !e.message.includes('SQL secret'))
  }
  fetchMock.mock.mockImplementation(async () => new Response('<html>proxy error</html>'))
  await assert.rejects(api.getStoreSuggestions(), ExpenseApiError)
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('network failed') })
  await assert.rejects(api.createExpense({ date: '2026-09-06', store: '店', category: 'food', items: [] }), /明細を確認/)
})

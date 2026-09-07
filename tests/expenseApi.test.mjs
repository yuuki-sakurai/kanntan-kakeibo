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

test('CSV uses multipart uploads, encoding and separate preview and import endpoints', async (t) => {
  const calls = []
  const preview = { count: 1, total: 300, rows: [], alreadyImported: false }
  const result = { importedCount: 1, alreadyImported: false }
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    return Response.json(calls.length === 1 ? preview : result)
  })
  const api = new HttpExpenseApi('/api/v1')
  const file = new File(['日付,店舗,カテゴリ,品目,単価,数量'], 'data.csv', { type: 'text/csv' })
  assert.deepEqual(await api.previewCsv(file, 'UTF-8'), preview)
  assert.deepEqual(await api.importCsv(file, 'UTF-8', ['お酒', '酒肴品']), result)
  assert.deepEqual(calls[0].init.body.getAll('approved_categories[]'), [])
  assert.deepEqual(calls[1].init.body.getAll('approved_categories[]'), ['お酒', '酒肴品'])
  assert.deepEqual(calls.map(call => call.url), ['/api/v1/expense-imports/preview', '/api/v1/expense-imports'])
  for (const { init } of calls) {
    assert.equal(init.method, 'POST')
    assert.equal(init.headers['Content-Type'], undefined)
    assert.equal(init.body.get('file').name, 'data.csv')
    assert.equal(init.body.get('encoding'), 'UTF-8')
  }
})

test('CSV row errors are shown and failed requests are never retried automatically', async (t) => {
  const api = new HttpExpenseApi('/api/v1')
  const file = new File(['csv'], 'data.csv')
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ errors: { rows: ['3行目: 日付を確認してください。'] } }, { status: 422 }))
  await assert.rejects(api.previewCsv(file, 'UTF-8'), error => error.status === 422 && error.details[0].startsWith('3行目:'))
  mock.mock.mockImplementation(async () => { throw new TypeError('connection lost') })
  await assert.rejects(api.importCsv(file, 'UTF-8'), /重複登録されません/)
  assert.equal(mock.mock.callCount(), 2)
})

test('category creation and listing preserve custom IDs and validation messages', async (t) => {
  const category = { id: '01CUSTOMCATEGORY', name: 'お酒' }
  const calls = []
  const mock = t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    return Response.json(init.method === 'POST' ? category : [category])
  })
  const api = new HttpExpenseApi('/api/v1')
  assert.deepEqual(await api.createCategory('お酒'), category)
  assert.deepEqual(JSON.parse(calls[0].init.body), { name: 'お酒' })
  assert.equal(calls[0].url, '/api/v1/categories')
  assert.deepEqual(await api.getCategories(), [category])
  mock.mock.mockImplementation(async () => Response.json({ errors: { name: ['このカテゴリ名はすでに使用されています。'] } }, { status: 422 }))
  await assert.rejects(api.createCategory('お酒'), error => error.status === 422 && error.message === 'このカテゴリ名はすでに使用されています。')
})


test('existing expenses use GET and PUT with the complete edited payload', async (t) => {
  const calls = []
  const input = { date: '2026-09-07', store: '店', category: 'leisure', items: [{ name: 'ビール', unitPrice: 230, quantity: 2 }] }
  const expense = { ...input, id: '12', total: 460 }
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    return Response.json(expense)
  })
  const api = new HttpExpenseApi('/api/v1')
  assert.deepEqual(await api.getExpense('12'), expense)
  assert.deepEqual(await api.updateExpense('12', input), expense)
  assert.deepEqual(calls.map(c => [c.url, c.init.method]), [['/api/v1/expenses/12', 'GET'], ['/api/v1/expenses/12', 'PUT']])
  assert.deepEqual(JSON.parse(calls[1].init.body), input)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/utils/expenseTax.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
const { itemAmounts, isValidTaxRate } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('mixed taxable and non-taxable items round down per item', () => {
  const amounts = [
    { unitPrice: 199, quantity: 2, taxable: true, taxRate: 10 },
    { unitPrice: 101, quantity: 1, taxable: true, taxRate: 8 },
    { unitPrice: 500, quantity: 1, taxable: false, taxRate: 10 },
  ].map(itemAmounts)
  assert.deepEqual(amounts.map(item => item.tax), [39, 8, 0])
  assert.equal(amounts.reduce((sum, item) => sum + item.total, 0), 1046)
})

test('editable rates, zero rates, legacy items and maximum amounts', () => {
  assert.equal(itemAmounts({ unitPrice: 1000, quantity: 1, taxable: true, taxRate: 12.25 }).total, 1122)
  assert.equal(itemAmounts({ unitPrice: 1000, quantity: 1, taxable: true, taxRate: 0 }).total, 1000)
  assert.equal(itemAmounts({ unitPrice: 1000, quantity: 1 }).total, 1000)
  assert.equal(itemAmounts({ unitPrice: 100000000, quantity: 10000, taxable: true, taxRate: 99.99 }).tax, 999900000000)
})

test('invalid and empty rates cannot pass validation', () => {
  for (const rate of ['', null, undefined, -1, 101, NaN, Infinity, 8.123]) assert.equal(isValidTaxRate(rate), false)
  for (const rate of [0, 8, 10, 12.25, 100]) assert.equal(isValidTaxRate(rate), true)
})

import assert from 'node:assert/strict'
import {describe,it} from 'node:test'
import {parseOutput} from '../app/lib/import-manager/automatic.ts'

const valid={kind:'invoice',supplierName:null,invoiceNumber:null,invoiceDate:null,
 declarationNumber:null,declarationDate:null,currency:'USD',rateToGel:null,
 invoiceTotal:null,grossTotalKg:null,products:[],expenses:[],warnings:[]}

describe('AI structured output parsing',()=>{
 it('accepts a complete valid extraction',()=>{
  assert.equal(parseOutput(JSON.stringify(valid)).currency,'USD')
 })
 it('returns a useful error for malformed JSON',()=>{
  assert.throws(()=>parseOutput('{"kind":"invoice",'),/არასრული JSON/)
 })
})

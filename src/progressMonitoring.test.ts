import { describe, expect, it } from 'vitest'
import { phases, phaseProgress, routeLabels } from './progressMonitoring'

describe('preview monitoring progress penghapusan BMN',()=>{
 it('memiliki jalur lelang, senpi, dan amunisi yang terpisah',()=>{
  expect(routeLabels.lelang).toContain('Lelang')
  expect(routeLabels.senpi).toContain('senjata api')
  expect(routeLabels.amunisi).toContain('manual')
  expect(phases.lelang).toHaveLength(8)
  expect(phases.senpi).toHaveLength(10)
  expect(phases.amunisi).toHaveLength(7)
 })
 it('menghitung progress dari fase terakhir tanpa menerima persen manual',()=>{
  expect(phaseProgress('lelang',-1)).toBe(0)
  expect(phaseProgress('lelang',0)).toBe(13)
  expect(phaseProgress('lelang',7)).toBe(100)
  expect(phaseProgress('senpi',4)).toBe(50)
  expect(phaseProgress('amunisi',6)).toBe(100)
 })
})

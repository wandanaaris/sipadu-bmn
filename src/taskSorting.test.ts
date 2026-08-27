import { describe, expect, it } from 'vitest'
import { sortSatkerWorkItems } from './taskSorting'

describe('urutan pekerjaan satker',()=>{
 it('menempatkan seluruh progress di bawah 100 sebelum progress 100',()=>{
  const items=[
   {name:'Selesai A',assignment:{progress:100,status:'selesai'}},
   {name:'Belum A',assignment:{progress:0,status:'belum'}},
   {name:'Selesai B',assignment:{progress:100,status:'selesai'}},
   {name:'Proses',assignment:{progress:70,status:'proses'}},
   {name:'Belum B',assignment:{progress:0,status:'belum'}},
  ]
  expect(sortSatkerWorkItems(items).map(x=>x.name)).toEqual(['Belum A','Proses','Belum B','Selesai A','Selesai B'])
 })

 it('tidak mengubah array sumber',()=>{
  const items=[{name:'Selesai',assignment:{progress:100,status:'selesai'}},{name:'Belum',assignment:{progress:0,status:'belum'}}]
  sortSatkerWorkItems(items)
  expect(items.map(x=>x.name)).toEqual(['Selesai','Belum'])
 })
})

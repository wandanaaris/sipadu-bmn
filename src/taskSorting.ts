type WorkItem={assignment:{progress:number}}

/** Menjaga urutan asli dalam tiap kelompok; hanya memindahkan progress 100% ke bawah. */
export function sortSatkerWorkItems<T extends WorkItem>(items:readonly T[]):T[]{
 return items.map((item,index)=>({item,index,completed:item.assignment.progress>=100})).sort((a,b)=>Number(a.completed)-Number(b.completed)||a.index-b.index).map(x=>x.item)
}

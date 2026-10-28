// Isi ulang .local-data/lelang.sqlite dari basis_data_lelang.csv:
//   node --experimental-strip-types local-api/seedLelang.ts
import { LelangSqliteStore } from './lelangSqlite.ts';

const store = new LelangSqliteStore('./.local-data/lelang.sqlite');
const count = store.seed('./basis_data_lelang.csv');
console.log('Seeded ' + count + ' rows');

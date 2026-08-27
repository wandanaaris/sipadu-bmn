import type { MitraDataRepository } from './mitraDataRepository'
import { localMitraRepository } from './localMitraRepository'
import { supabaseMitraRepository } from './mitraRepository'

const unavailable: MitraDataRepository={
 async loadOne(){throw new Error('Supabase Akun Mitra belum dikonfigurasi.')},async loadAll(){throw new Error('Supabase Akun Mitra belum dikonfigurasi.')},async save(){throw new Error('Supabase Akun Mitra belum dikonfigurasi.')},async review(){throw new Error('Supabase Akun Mitra belum dikonfigurasi.')},async updateAccepted(){throw new Error('Supabase Akun Mitra belum dikonfigurasi.')},async savePhoto(){throw new Error('Supabase Akun Mitra belum dikonfigurasi.')},async getPhoto(){throw new Error('Supabase Akun Mitra belum dikonfigurasi.')},
}
export const activeMitraRepository: MitraDataRepository=(import.meta.env.DEV||import.meta.env.MODE==='test')?localMitraRepository:(supabaseMitraRepository??unavailable)

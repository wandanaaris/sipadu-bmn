-- Reset assignments and insert clean stage_states using to_jsonb('text'::text) (proper jsonb string format)
with target_tasks as (
  select id, task_key, jsonb_array_length(sync_config->'stages') as n
  from public.tasks
  where task_key in ('persediaan-usang-amunisi-2026','persediaan-usang-non-amunisi-2026')
  and sync_config->'stages' is not null
),
satker_list as (
  select code, id as satker_id from public.satkers where is_active
),
amunisi_satkers as (
  select code from (values ('692308'),('692309'),('692311'),('692312'),('692314'),('692315'),('692316'),('692317'),('692484'),('692537'),('692781'),('692794'),('692519')) as v(code)
),
non_amunisi_satkers as (
  select code from (values ('692308'),('692309'),('692311'),('692316'),('692317'),('692484'),('692794'),('692519')) as v(code)
),
amunisi_requirements as (
  select jsonb_agg(x order by i) as arr from (values (1,'Persetujuan Pengguna Barang'),(2,'Rekomendasi pemusnahan dari Polda Riau'),(3,'Izin pemusnahan dari Kapolri c.q. Baintelkam Polri'),(4,'Berita Acara Pemusnahan ditandatangani tim yang ditunjuk Kapolda Riau'),(5,'Laporan kepada KPKNL dan Kepala Biro BMN dengan tembusan sesuai persetujuan')) as v(i,x)
),
non_amunisi_requirements as (
  select jsonb_agg(x order by i) as arr from (values (1,'Persetujuan Pengguna Barang'),(2,'Berita Acara Pemusnahan internal'),(3,'SK Penghapusan karena Pemusnahan'),(4,'Laporan kepada KPKNL dan Kepala Biro BMN dengan tembusan sesuai persetujuan')) as v(i,x)
)
insert into public.task_assignments (task_id, satker_id, progress, status, missing, current_stage, stage_states, updated_at)
select
  t.id,
  sl.satker_id,
  0,
  'belum',
  case when t.task_key = 'persediaan-usang-amunisi-2026' then (select arr from amunisi_requirements) else (select arr from non_amunisi_requirements) end,
  0,
  (select jsonb_agg(case when i=0 then to_jsonb('terbuka'::text) else to_jsonb('terkunci'::text) end) from generate_series(0,t.n-1) as i),
  now()
from target_tasks t
join (select code from amunisi_satkers union all select code from non_amunisi_satkers) s on true
join satker_list sl on sl.code = s.code
where (t.task_key = 'persediaan-usang-amunisi-2026' and s.code in (select code from amunisi_satkers))
   or (t.task_key = 'persediaan-usang-non-amunisi-2026' and s.code in (select code from non_amunisi_satkers))
on conflict (task_id, satker_id) do update set
  stage_states = excluded.stage_states,
  current_stage = 0,
  status = 'belum',
  progress = 0,
  missing = excluded.missing,
  updated_at = now()
returning id, stage_states;

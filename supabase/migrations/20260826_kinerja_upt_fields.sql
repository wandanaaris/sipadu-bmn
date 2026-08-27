-- Upgrade get_active_portal: tambah dueDate, submittedAt, completedAt untuk modul Kinerja UPT
CREATE OR REPLACE FUNCTION public.get_active_portal()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      tk.task_key AS id,
      coalesce(tk.due_label,'Belum ditentukan') AS due,
      tk.due_date AS "dueDate",
      tk.source_url AS link,
      tk.title,
      tk.is_active AS active,
      coalesce(tk.source_letter,'') AS letter,
      tk.method::text AS method,
      tk.priority,
      tk.description,
      COALESCE((
        SELECT json_agg(json_build_object(
          'satker', s.code,
          'status', ta.status::text,
          'missing', COALESCE(ta.missing,'[]'::jsonb),
          'updated', ta.updated_at,
          'progress', ta.progress,
          'revisionCount', ta.revision_count,
          'submittedAt', ta.submitted_at,
          'completedAt', ta.completed_at
          ORDER BY s.code))
        FROM task_assignments ta JOIN satkers s ON s.id=ta.satker_id
        WHERE ta.task_id=tk.id
      ),'[]'::json) AS assignments,
      COALESCE((
        SELECT json_agg(json_build_object('key',tr.requirement_key,'label',tr.label,'track',tr.track,'required',tr.is_required)
          ORDER BY tr.display_order)
        FROM task_requirements tr WHERE tr.task_id=tk.id
      ),'[]'::json) AS requirements
    FROM tasks tk
    WHERE tk.is_active = true
    ORDER BY tk.due_date NULLS LAST
  ) t
$$;

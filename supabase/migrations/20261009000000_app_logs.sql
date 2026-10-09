-- =============================================================================
-- Logs techniques de l'application (débogage) — distincts du journal d'activité
-- métier (activity_logs). Écrits par le serveur après chaque action, lisibles
-- par l'admin sur /admin/logs.
-- =============================================================================

create table public.app_logs (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  level        text not null check (level in ('info', 'warn', 'error')),
  action       text not null,                 -- ex: 'projects.update', 'read:project_overview'
  ref          text not null,                 -- référence courte affichée dans les messages d'erreur
  user_id      uuid references public.profiles(id) on delete set null default auth.uid(),
  duration_ms  integer,
  context      jsonb not null default '{}'::jsonb,
  error        text
);
create index app_logs_created_at_idx on public.app_logs (created_at desc);
create index app_logs_level_idx on public.app_logs (level, created_at desc);
create index app_logs_ref_idx on public.app_logs (ref);

alter table public.app_logs enable row level security;

-- Tout utilisateur connecté peut écrire ses propres logs (actions client comprises).
create policy "app_logs: insert own" on public.app_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "app_logs: admin read" on public.app_logs
  for select to authenticated
  using ((select public.is_admin()));

create policy "app_logs: admin delete" on public.app_logs
  for delete to authenticated
  using ((select public.is_admin()));

revoke all on public.app_logs from anon;
revoke update on public.app_logs from authenticated;
grant select, insert, delete on public.app_logs to authenticated;

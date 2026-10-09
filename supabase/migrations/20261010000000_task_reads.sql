-- =============================================================================
-- Suivi de lecture des tâches : sert au badge « non lu » (nouveaux commentaires
-- depuis la dernière ouverture de la tâche). Une ligne par utilisateur et tâche.
-- =============================================================================

create table public.task_reads (
  user_id       uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  primary key (user_id, task_id)
);
create index task_reads_task_id_idx on public.task_reads (task_id);

alter table public.task_reads enable row level security;

-- Chacun ne voit et n'écrit que ses propres lignes, sur des tâches auxquelles il a accès.
create policy "task_reads: select own" on public.task_reads
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "task_reads: insert own" on public.task_reads
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_task_access(task_id));

create policy "task_reads: update own" on public.task_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.has_task_access(task_id));

revoke all on public.task_reads from anon;
grant select, insert, update on public.task_reads to authenticated;

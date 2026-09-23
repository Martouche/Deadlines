-- =============================================================================
-- Portail Client / CRM — schéma initial
-- Rôles : admin (toi) = tout ; client = lecture seule sur ses projets +
--         commentaires, téléchargement des livrables, validation d'étape.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Types
-- -----------------------------------------------------------------------------
create type public.user_role        as enum ('admin', 'client');
create type public.project_status   as enum ('draft', 'active', 'on_hold', 'completed', 'archived');
create type public.financial_status as enum ('quote_sent', 'deposit_paid', 'in_delivery', 'balance_due', 'balance_paid');
create type public.task_status      as enum ('backlog', 'todo', 'in_progress', 'review', 'done');
create type public.task_priority    as enum ('low', 'medium', 'high', 'urgent');
create type public.document_kind    as enum ('file', 'invoice', 'spec', 'access', 'figma', 'staging', 'link');

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

-- Fiche CRM (entreprise / contact principal). Jamais visible par les clients
-- (contient des notes privées).
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text,
  email       text not null,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Un profil par utilisateur Supabase Auth. Créé automatiquement (trigger).
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        public.user_role not null default 'client',
  client_id   uuid references public.clients(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_client_id_idx on public.profiles (client_id);

create table public.projects (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete restrict,
  title             text not null,
  description       text,
  status            public.project_status   not null default 'active',
  financial_status  public.financial_status not null default 'quote_sent',
  budget_cents      integer check (budget_cents >= 0),
  currency          char(3) not null default 'EUR',
  start_date        date,
  deadline          date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index projects_client_id_idx on public.projects (client_id);

-- Attribution explicite d'un utilisateur client à un projet.
-- C'est CETTE table qui ouvre l'accès d'un client à un projet.
create table public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, profile_id)
);
create index project_members_profile_id_idx on public.project_members (profile_id);

create table public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects(id) on delete cascade,
  title                text not null,
  description          text,                                  -- Markdown
  status               public.task_status   not null default 'backlog',
  priority             public.task_priority not null default 'medium',
  deadline             date,
  position             double precision not null default 0,   -- ordre dans la colonne Kanban
  client_validated_at  timestamptz,
  client_validated_by  uuid references public.profiles(id) on delete set null,
  created_by           uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index tasks_project_status_pos_idx on public.tasks (project_id, status, position);
create index tasks_project_deadline_idx   on public.tasks (project_id, deadline);

-- Étiquettes globales réutilisables (Frontend, API, Bug, Design…)
create table public.labels (
  id     uuid primary key default gen_random_uuid(),
  name   text not null unique,
  color  text not null check (color ~ '^#[0-9a-fA-F]{6}$')
);

create table public.task_labels (
  task_id   uuid not null references public.tasks(id)  on delete cascade,
  label_id  uuid not null references public.labels(id) on delete cascade,
  primary key (task_id, label_id)
);
create index task_labels_label_id_idx on public.task_labels (label_id);

-- Sous-tâches / checklist
create table public.task_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  title       text not null,
  is_done     boolean not null default false,
  position    double precision not null default 0,
  created_at  timestamptz not null default now()
);
create index task_checklist_items_task_id_idx on public.task_checklist_items (task_id, position);

create table public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index task_comments_task_id_idx on public.task_comments (task_id, created_at);

-- Fichiers (Supabase Storage) OU liens externes (Figma, staging…)
create table public.project_documents (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  kind               public.document_kind not null default 'file',
  title              text not null,
  description        text,
  storage_path       text unique,          -- '<project_id>/<uuid>-<nom>' dans le bucket project-files
  url                text,                 -- lien externe
  mime_type          text,
  size_bytes         bigint,
  visible_to_client  boolean not null default true,
  uploaded_by        uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  constraint document_has_target check (storage_path is not null or url is not null)
);
create index project_documents_project_id_idx on public.project_documents (project_id, created_at desc);

-- Journal d'activité : alimenté UNIQUEMENT par des triggers.
create table public.activity_logs (
  id                 bigint generated always as identity primary key,
  project_id         uuid not null references public.projects(id) on delete cascade,
  task_id            uuid references public.tasks(id) on delete set null,
  actor_id           uuid references public.profiles(id) on delete set null,
  action             text not null,        -- ex: 'task.status_changed'
  meta               jsonb not null default '{}'::jsonb,
  visible_to_client  boolean not null default true,
  created_at         timestamptz not null default now()
);
create index activity_logs_project_idx on public.activity_logs (project_id, created_at desc);

-- Gestion du temps (admin uniquement). ended_at null = chrono en cours.
create table public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete set null,
  user_id     uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  minutes     integer generated always as (
                (extract(epoch from (ended_at - started_at)) / 60)::integer
              ) stored,
  note        text,
  billable    boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint time_entry_order check (ended_at is null or ended_at >= started_at)
);
create index time_entries_project_idx on public.time_entries (project_id, started_at desc);
create index time_entries_task_idx    on public.time_entries (task_id);
-- Un seul chrono en cours par utilisateur
create unique index time_entries_one_running_idx on public.time_entries (user_id) where ended_at is null;

-- -----------------------------------------------------------------------------
-- 3. Fonctions d'aide pour la RLS
--    SECURITY DEFINER : lisent profiles/project_members sans déclencher la RLS
--    (évite la récursion infinie entre politiques).
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and profile_id = (select auth.uid())
  );
$$;

create or replace function public.has_project_access(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or public.is_project_member(p_project_id);
$$;

create or replace function public.has_task_access(p_task_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = p_task_id and public.has_project_access(t.project_id)
  );
$$;

-- Vrai si l'utilisateur courant et p_profile_id sont membres d'un même projet.
create or replace function public.shares_project_with(p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members mine
    join public.project_members theirs on theirs.project_id = mine.project_id
    where mine.profile_id = (select auth.uid()) and theirs.profile_id = p_profile_id
  );
$$;

revoke execute on function public.shares_project_with(uuid) from anon, public;
grant  execute on function public.shares_project_with(uuid) to authenticated;
revoke execute on function public.is_admin()                from anon, public;
revoke execute on function public.is_project_member(uuid)   from anon, public;
revoke execute on function public.has_project_access(uuid)  from anon, public;
revoke execute on function public.has_task_access(uuid)     from anon, public;
grant  execute on function public.is_admin()                to authenticated;
grant  execute on function public.is_project_member(uuid)   to authenticated;
grant  execute on function public.has_project_access(uuid)  to authenticated;
grant  execute on function public.has_task_access(uuid)     to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Triggers utilitaires
-- -----------------------------------------------------------------------------

-- updated_at automatique
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clients_updated_at       before update on public.clients       for each row execute function public.set_updated_at();
create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger projects_updated_at      before update on public.projects      for each row execute function public.set_updated_at();
create trigger tasks_updated_at         before update on public.tasks         for each row execute function public.set_updated_at();
create trigger task_comments_updated_at before update on public.task_comments for each row execute function public.set_updated_at();

-- Création du profil à l'inscription / invitation. Toujours 'client' :
-- le rôle admin se donne à la main (voir fin de fichier).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un utilisateur peut éditer son nom/avatar, mais jamais son rôle ni son client_id.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.client_id is distinct from old.client_id
     or new.email is distinct from old.email then
    raise exception 'Modification non autorisée' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Si l'admin renvoie une tâche validée en développement, la validation saute.
create or replace function public.reset_task_validation()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status in ('backlog', 'todo', 'in_progress') and old.status is distinct from new.status then
    new.client_validated_at := null;
    new.client_validated_by := null;
  end if;
  return new;
end;
$$;

create trigger tasks_reset_validation
  before update of status on public.tasks
  for each row execute function public.reset_task_validation();

-- -----------------------------------------------------------------------------
-- 5. Journal d'activité (triggers)
--    L'UI formate : "Martin a passé la tâche X en 'En révision' le 14/10"
--    à partir de action + meta + actor_id + created_at.
-- -----------------------------------------------------------------------------
create or replace function public.log_task_activity()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_logs (project_id, task_id, actor_id, action, meta)
    values (new.project_id, new.id, auth.uid(), 'task.created', jsonb_build_object('title', new.title));

  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.activity_logs (project_id, task_id, actor_id, action, meta)
      values (new.project_id, new.id, auth.uid(), 'task.status_changed',
              jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status));
    end if;
    if new.deadline is distinct from old.deadline then
      insert into public.activity_logs (project_id, task_id, actor_id, action, meta)
      values (new.project_id, new.id, auth.uid(), 'task.deadline_changed',
              jsonb_build_object('title', new.title, 'from', old.deadline, 'to', new.deadline));
    end if;
    if new.client_validated_at is not null and old.client_validated_at is null then
      insert into public.activity_logs (project_id, task_id, actor_id, action, meta)
      values (new.project_id, new.id, auth.uid(), 'task.validated', jsonb_build_object('title', new.title));
    end if;

  elsif tg_op = 'DELETE' then
    -- Pas de log si la suppression vient de la suppression du projet (cascade).
    if exists (select 1 from public.projects where id = old.project_id) then
      insert into public.activity_logs (project_id, task_id, actor_id, action, meta)
      values (old.project_id, null, auth.uid(), 'task.deleted', jsonb_build_object('title', old.title));
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger tasks_activity
  after insert or update or delete on public.tasks
  for each row execute function public.log_task_activity();

create or replace function public.log_comment_activity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id = new.task_id;
  insert into public.activity_logs (project_id, task_id, actor_id, action, meta)
  values (v_task.project_id, v_task.id, auth.uid(), 'comment.created',
          jsonb_build_object('title', v_task.title, 'comment_id', new.id));
  return new;
end;
$$;

create trigger task_comments_activity
  after insert on public.task_comments
  for each row execute function public.log_comment_activity();

create or replace function public.log_document_activity()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.activity_logs (project_id, actor_id, action, meta, visible_to_client)
  values (new.project_id, auth.uid(), 'document.added',
          jsonb_build_object('title', new.title, 'kind', new.kind),
          new.visible_to_client);
  return new;
end;
$$;

create trigger project_documents_activity
  after insert on public.project_documents
  for each row execute function public.log_document_activity();

create or replace function public.log_project_activity()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.financial_status is distinct from old.financial_status then
    insert into public.activity_logs (project_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'project.financial_status_changed',
            jsonb_build_object('from', old.financial_status, 'to', new.financial_status));
  end if;
  if new.status is distinct from old.status then
    insert into public.activity_logs (project_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'project.status_changed',
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create trigger projects_activity
  after update on public.projects
  for each row execute function public.log_project_activity();

-- -----------------------------------------------------------------------------
-- 6. RPC : validation d'une étape par le client
--    Le client n'a AUCUN droit UPDATE sur tasks ; il passe par cette fonction
--    qui ne touche que client_validated_at / client_validated_by.
-- -----------------------------------------------------------------------------
create or replace function public.validate_task(p_task_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_project uuid;
  v_status  public.task_status;
begin
  select project_id, status into v_project, v_status
  from public.tasks where id = p_task_id;

  if v_project is null or not public.is_project_member(v_project) then
    raise exception 'Tâche introuvable' using errcode = 'P0002';
  end if;
  if v_status <> 'review' then
    raise exception 'Seules les tâches en révision peuvent être validées' using errcode = '22023';
  end if;

  update public.tasks
     set client_validated_at = now(),
         client_validated_by = auth.uid()
   where id = p_task_id and client_validated_at is null;
end;
$$;

revoke execute on function public.validate_task(uuid) from anon, public;
grant  execute on function public.validate_task(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Droits de base + Row Level Security
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Commentaires : seul le texte est modifiable après coup.
revoke update on public.task_comments from authenticated;
grant  update (body) on public.task_comments to authenticated;

-- Journal : écrit uniquement par les triggers.
revoke insert, update, delete on public.activity_logs from authenticated;

alter table public.clients              enable row level security;
alter table public.profiles             enable row level security;
alter table public.projects             enable row level security;
alter table public.project_members      enable row level security;
alter table public.tasks                enable row level security;
alter table public.labels               enable row level security;
alter table public.task_labels          enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.task_comments        enable row level security;
alter table public.project_documents    enable row level security;
alter table public.activity_logs        enable row level security;
alter table public.time_entries         enable row level security;

-- clients : admin uniquement -------------------------------------------------
create policy "clients: admin all" on public.clients
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- profiles -------------------------------------------------------------------
-- On voit : soi-même, les admins, et les membres des projets qu'on partage.
create policy "profiles: select" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or role = 'admin'
    or (select public.is_admin())
    or public.shares_project_with(id)
  );

create policy "profiles: update self or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles: admin delete" on public.profiles
  for delete to authenticated
  using ((select public.is_admin()));

-- projects -------------------------------------------------------------------
create policy "projects: select if access" on public.projects
  for select to authenticated
  using (public.has_project_access(id));

create policy "projects: admin insert" on public.projects
  for insert to authenticated with check ((select public.is_admin()));
create policy "projects: admin update" on public.projects
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "projects: admin delete" on public.projects
  for delete to authenticated using ((select public.is_admin()));

-- project_members ------------------------------------------------------------
create policy "project_members: select" on public.project_members
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

create policy "project_members: admin write" on public.project_members
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- tasks ----------------------------------------------------------------------
create policy "tasks: select if access" on public.tasks
  for select to authenticated
  using (public.has_project_access(project_id));

create policy "tasks: admin insert" on public.tasks
  for insert to authenticated with check ((select public.is_admin()));
create policy "tasks: admin update" on public.tasks
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "tasks: admin delete" on public.tasks
  for delete to authenticated using ((select public.is_admin()));

-- labels ---------------------------------------------------------------------
create policy "labels: read" on public.labels
  for select to authenticated using (true);
create policy "labels: admin write" on public.labels
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- task_labels ----------------------------------------------------------------
create policy "task_labels: select if access" on public.task_labels
  for select to authenticated using (public.has_task_access(task_id));
create policy "task_labels: admin write" on public.task_labels
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- task_checklist_items -------------------------------------------------------
create policy "checklist: select if access" on public.task_checklist_items
  for select to authenticated using (public.has_task_access(task_id));
create policy "checklist: admin write" on public.task_checklist_items
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- task_comments : lecture + écriture pour tous les membres du projet ---------
create policy "comments: select if access" on public.task_comments
  for select to authenticated using (public.has_task_access(task_id));

create policy "comments: insert own if access" on public.task_comments
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.has_task_access(task_id));

create policy "comments: update own" on public.task_comments
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "comments: delete own or admin" on public.task_comments
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

-- project_documents ----------------------------------------------------------
create policy "documents: select" on public.project_documents
  for select to authenticated
  using ((select public.is_admin()) or (visible_to_client and public.is_project_member(project_id)));

create policy "documents: admin write" on public.project_documents
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- activity_logs --------------------------------------------------------------
create policy "activity: select" on public.activity_logs
  for select to authenticated
  using ((select public.is_admin()) or (visible_to_client and public.is_project_member(project_id)));

-- time_entries : admin uniquement --------------------------------------------
create policy "time_entries: admin all" on public.time_entries
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- 8. Vues (security_invoker : la RLS de l'appelant s'applique)
-- -----------------------------------------------------------------------------
create view public.project_overview
with (security_invoker = true)
as
select
  p.id,
  p.client_id,
  p.title,
  p.description,
  p.status,
  p.financial_status,
  p.budget_cents,
  p.currency,
  p.start_date,
  p.deadline,
  p.updated_at,
  c.name    as client_name,      -- null pour un client (pas d'accès à clients)
  c.company as client_company,
  count(t.id)                                              as tasks_total,
  count(t.id) filter (where t.status = 'done')             as tasks_done,
  case when count(t.id) = 0 then 0
       else round(100.0 * count(t.id) filter (where t.status = 'done') / count(t.id))::int
  end                                                      as progress,
  min(t.deadline) filter (where t.status <> 'done' and t.deadline >= current_date) as next_deadline,
  count(t.id) filter (where t.status <> 'done' and t.deadline < current_date)      as overdue_tasks,
  count(t.id) filter (where t.status = 'review' and t.client_validated_at is null) as awaiting_validation,
  case
    when p.deadline < current_date and count(t.id) filter (where t.status <> 'done') > 0 then 'off_track'
    when count(t.id) filter (where t.status <> 'done' and t.deadline < current_date) > 2   then 'off_track'
    when count(t.id) filter (where t.status <> 'done' and t.deadline < current_date) > 0   then 'at_risk'
    when p.deadline <= current_date + 7
         and count(t.id) filter (where t.status <> 'done') > 0                              then 'at_risk'
    else 'on_track'
  end                                                      as health
from public.projects p
left join public.clients c on c.id = p.client_id
left join public.tasks   t on t.project_id = p.id
group by p.id, c.id;

-- Rentabilité : réservée à l'admin (time_entries est admin-only de toute façon).
create view public.project_time_summary
with (security_invoker = true)
as
select
  p.id as project_id,
  p.budget_cents,
  coalesce(sum(te.minutes), 0)                                  as total_minutes,
  coalesce(sum(te.minutes) filter (where te.billable), 0)       as billable_minutes,
  case when coalesce(sum(te.minutes), 0) = 0 or p.budget_cents is null then null
       else round(p.budget_cents / (sum(te.minutes) / 60.0))::int
  end                                                           as effective_hourly_rate_cents
from public.projects p
left join public.time_entries te on te.project_id = p.id
where public.is_admin()
group by p.id;

grant select on public.project_overview, public.project_time_summary to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Storage : bucket privé 'project-files'
--    Chemin des objets : '<project_id>/<uuid>-<nom-fichier>'
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Lecture : l'objet doit correspondre à un document que l'utilisateur peut voir
-- (la RLS de project_documents s'applique dans la sous-requête).
create policy "project-files: read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-files'
    and exists (select 1 from public.project_documents d where d.storage_path = storage.objects.name)
  );

create policy "project-files: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-files' and (select public.is_admin()));
create policy "project-files: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-files' and (select public.is_admin()));
create policy "project-files: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-files' and (select public.is_admin()));

-- -----------------------------------------------------------------------------
-- 10. Realtime (commentaires et Kanban en direct)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.tasks, public.task_comments;

-- -----------------------------------------------------------------------------
-- 11. Données de départ
-- -----------------------------------------------------------------------------
insert into public.labels (name, color) values
  ('Frontend', '#3b82f6'),
  ('API',      '#8b5cf6'),
  ('Bug',      '#ef4444'),
  ('Design',   '#ec4899'),
  ('Contenu',  '#f59e0b'),
  ('Infra',    '#10b981')
on conflict (name) do nothing;

-- Après ta première connexion, promeus-toi admin (SQL Editor) :
--   update public.profiles set role = 'admin' where email = 'toi@exemple.com';

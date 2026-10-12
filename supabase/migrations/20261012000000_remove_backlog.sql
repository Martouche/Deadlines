-- =============================================================================
-- Suppression de la colonne « Backlog » : les tâches passent en « À faire ».
-- La valeur reste dans l'enum task_status (retirer une valeur d'enum Postgres
-- impose de recréer le type) mais l'application ne l'utilise plus.
-- =============================================================================

-- Bascule silencieuse : sans le trigger, pas de « X a passé la tâche en À faire »
-- dans le journal d'activité pour chaque tâche migrée.
alter table public.tasks disable trigger tasks_activity;
update public.tasks set status = 'todo' where status = 'backlog';
alter table public.tasks enable trigger tasks_activity;

alter table public.tasks alter column status set default 'todo';

# Portail Client — Architecture & guide d'implémentation

Stack : Next.js (App Router) · Tailwind · shadcn/ui · @hello-pangea/dnd · Lucide · Supabase (Postgres, Auth, Storage, RLS).

Schéma SQL complet : [`supabase/migrations/20260923000000_init_portal.sql`](../supabase/migrations/20260923000000_init_portal.sql).

---

## 1. Modèle de données

```
auth.users ─1:1─ profiles ──(client_id)──► clients ◄── projects
                     │                                   │
                     └──── project_members ◄─────────────┤   ← ouvre l'accès client
                                                         ├── tasks ── task_labels ── labels
                                                         │     ├── task_checklist_items
                                                         │     ├── task_comments
                                                         │     └── time_entries (admin)
                                                         ├── project_documents (+ Storage)
                                                         └── activity_logs (triggers)
```

| Table | Rôle | Client peut… |
|---|---|---|
| `profiles` | Utilisateur + `role` (admin/client) | lire soi-même, l'admin, les co-membres ; éditer nom/avatar |
| `clients` | Fiche CRM (notes privées) | rien |
| `projects` | Projet, budget, statut financier | lire ses projets |
| `project_members` | Attribution client ↔ projet | lire ses lignes |
| `tasks` | Cartes Kanban | lire ; valider via RPC `validate_task()` |
| `labels`, `task_labels` | Étiquettes couleur | lire |
| `task_checklist_items` | Sous-tâches | lire |
| `task_comments` | Fil de discussion | lire, poster, éditer/supprimer les siens |
| `project_documents` | Fichiers & liens | lire ceux où `visible_to_client = true` |
| `activity_logs` | Audit log | lire (hors événements privés) |
| `time_entries` | Temps passé | rien |

Vues : `project_overview` (progression %, prochaine deadline, tâches en retard, santé calculée) et `project_time_summary` (rentabilité, admin uniquement).

### Principes de sécurité retenus

- **Toute l'autorisation est dans Postgres.** L'UI masque les boutons, mais c'est la RLS qui bloque. Un client qui appelle l'API Supabase à la main ne peut rien modifier.
- **Le client n'a aucun droit `UPDATE` sur `tasks`.** La validation passe par la fonction `validate_task(task_id)` (SECURITY DEFINER), qui ne touche que `client_validated_at/by`, uniquement pour une tâche en `review` d'un projet dont il est membre.
- **Le journal est écrit uniquement par des triggers** : impossible à falsifier depuis le client.
- **Le rôle ne peut pas être auto-attribué** (trigger `protect_profile_fields`). Tout nouvel utilisateur est `client`.
- **Fichiers** : bucket privé, téléchargement par URL signée courte ; la politique Storage vérifie qu'il existe un `project_documents` visible pointant sur l'objet.
- **Pas d'inscription publique** : les clients sont invités par toi. Désactive « Allow new users to sign up » dans Supabase et utilise `shouldCreateUser: false` pour le Magic Link.
- **Onglet « Accès »** : ne stocke pas de mots de passe en clair dans `description`. Préfère un lien vers un gestionnaire partagé (Bitwarden Send, 1Password share) ou un document `visible_to_client = false`.

---

## 2. Routes Next.js

```
app/
├── (auth)/
│   ├── login/page.tsx                 Magic Link + mot de passe
│   └── auth/confirm/route.ts          Échange du token (lien e-mail) → session
│
├── (portal)/
│   ├── layout.tsx                     Garde : session requise, charge le profil, sidebar
│   ├── page.tsx                       Redirige : admin → /admin, client → /projects
│   │
│   ├── admin/                         Garde : role = 'admin' (sinon notFound())
│   │   ├── layout.tsx
│   │   ├── page.tsx                   Dashboard : cartes projets (santé, deadline, finance)
│   │   ├── clients/page.tsx           Table CRM (nom, entreprise, e-mail, projets actifs)
│   │   ├── clients/[clientId]/page.tsx  Fiche client + invitation d'utilisateurs
│   │   └── projects/new/page.tsx
│   │
│   └── projects/
│       ├── page.tsx                   Liste des projets accessibles (RLS filtre seule)
│       └── [projectId]/
│           ├── layout.tsx             En-tête (titre, progression, deadline, badge finance) + onglets
│           ├── page.tsx               Tâches : ?view=kanban|list, fiche tâche en modale via ?task=<id>
│           ├── documents/page.tsx
│           ├── activity/page.tsx
│           ├── time/page.tsx          Admin uniquement (notFound() pour un client)
│           └── settings/page.tsx      Admin : édition projet, membres
│
├── proxy.ts                           (middleware.ts avant Next 16) rafraîchit la session Supabase
│
lib/
├── supabase/
│   ├── server.ts                      createServerClient (cookies) — Server Components & Actions
│   ├── client.ts                      createBrowserClient — Realtime, upload
│   ├── proxy.ts                       updateSession()
│   └── admin.ts                       client service role (invitations) — server only
├── auth.ts                            getProfile(), requireUser(), requireAdmin()
├── actions/
│   ├── tasks.ts                       createTask, updateTask, moveTask, deleteTask, validateTask
│   ├── comments.ts                    addComment, editComment, deleteComment
│   ├── documents.ts                   addLink, registerUpload, deleteDocument, getDownloadUrl
│   ├── projects.ts                    createProject, updateProject, addMember
│   ├── clients.ts                     createClient, inviteClientUser
│   └── time.ts                        startTimer, stopTimer, addManualEntry
├── activity.ts                        formatActivity(log) → "Martin a passé « X » en « En révision » le 14/10"
└── constants.ts                       Libellés FR des statuts/priorités/couleurs
components/
├── kanban/ (Board, Column, TaskCard)  ├── task/ (TaskDetail, CommentThread, Checklist, Markdown)
├── project/ (ProjectHeader, Tabs, FinancialBadge, HealthBadge)
└── ui/ (shadcn)
types/database.ts                      Généré par `supabase gen types`
```

Règle d'or : **les Server Components lisent, les Server Actions écrivent**, toutes deux avec le client Supabase de l'utilisateur (jamais le service role, sauf pour inviter un utilisateur). Ainsi la RLS s'applique partout.

---

## 3. Guide d'implémentation, étape par étape

### Étape 0 — Projet Supabase
1. Crée un projet Supabase (région EU).
2. **Authentication → Providers → Email** : active Magic Link + Password ; **désactive « Allow new users to sign up »**.
3. **Authentication → URL Configuration** : `Site URL = https://portail.tondomaine.fr`, ajoute `http://localhost:3000/**` aux redirections.
4. **Email templates → Magic Link / Invite** : remplace le lien par
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/` (type `invite` pour le template d'invitation).
5. Configure un SMTP (Resend, Brevo…) : le SMTP par défaut est limité à quelques e-mails par heure.

### Étape 1 — Next.js + dépendances
```bash
npx create-next-app@latest portail --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*"
npm i @supabase/supabase-js @supabase/ssr @hello-pangea/dnd lucide-react react-markdown remark-gfm date-fns zod
npx shadcn@latest init
npx shadcn@latest add button card badge dialog sheet tabs input textarea select dropdown-menu progress avatar table sonner calendar popover checkbox tooltip
```
`.env.local` :
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...         # publique, protégée par la RLS
SUPABASE_SERVICE_ROLE_KEY=...              # service role (invitations) — jamais préfixé NEXT_PUBLIC
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Étape 2 — Base de données
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase gen types typescript --linked > types/database.ts
```
Connecte-toi une première fois (crée ton utilisateur dans **Authentication → Users → Add user**), puis dans le SQL Editor :
```sql
update public.profiles set role = 'admin' where email = 'toi@tondomaine.fr';
```

### Étape 3 — Clients Supabase & session
`lib/supabase/server.ts` :
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* appelé depuis un Server Component : le proxy s'en charge */ }
        },
      },
    },
  )
}
```
`proxy.ts` (racine) appelle `updateSession(request)` du guide officiel `@supabase/ssr` et redirige vers `/login` si pas d'utilisateur (sauf `/login` et `/auth/*`).

`lib/auth.ts` :
```ts
import { cache } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const getProfile = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
})

export async function requireUser()  { const p = await getProfile(); if (!p) redirect('/login'); return p }
export async function requireAdmin() { const p = await requireUser(); if (p.role !== 'admin') notFound(); return p }
```
⚠️ Chaque Server Action d'admin commence par `await requireAdmin()` — c'est pour l'UX et des erreurs propres ; la RLS reste la vraie barrière.

### Étape 4 — Connexion
- `login/page.tsx` : deux onglets. Magic Link :
  ```ts
  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${SITE_URL}/auth/confirm` } })
  ```
  Mot de passe : `signInWithPassword`.
- `auth/confirm/route.ts` : `supabase.auth.verifyOtp({ type, token_hash })` puis `redirect(next)`.
- Page « Définir mon mot de passe » accessible après une invitation (`supabase.auth.updateUser({ password })`).

### Étape 5 — CRM admin & invitations
- `admin/clients` : table shadcn sur `clients` + `count` des projets actifs.
- `inviteClientUser(clientId, projectIds, email)` (Server Action, `lib/supabase/admin.ts`) :
  1. `admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE_URL + '/auth/confirm' })`
  2. `update profiles set client_id = … where id = newUser.id`
  3. `insert into project_members` pour chaque projet.
- `admin/page.tsx` : `select * from project_overview where status = 'active' order by next_deadline` → grille de cartes avec `HealthBadge`, prochaine deadline, `FinancialBadge`, barre de progression.

### Étape 6 — En-tête de projet & onglets
`projects/[projectId]/layout.tsx` charge `project_overview` pour l'id ; si aucune ligne → `notFound()` (la RLS a filtré). Onglets = liens (`Tâches`, `Documents`, `Journal`, `Temps` si admin, `Paramètres` si admin).

Libellés du badge financier (`lib/constants.ts`) :
`quote_sent` Devis envoyé · `deposit_paid` Acompte payé · `in_delivery` En cours de livraison · `balance_due` Solde à régler · `balance_paid` Solde réglé.

### Étape 7 — Kanban & liste
- Chargement : `tasks` + `task_labels(labels(*))` + nombre de commentaires/checklist, triés par `position`.
- `Board` (client component) avec `DragDropContext` — **`isDragDisabled={!isAdmin}`** sur chaque `Draggable`.
- Au drop : mise à jour optimiste locale, puis `moveTask(taskId, status, position)`.
  Position fractionnaire : `position = (avant + après) / 2` (ou `avant + 1024` en fin de colonne) → une seule ligne modifiée par déplacement.
- Vue liste : même données, groupées par semaine d'échéance (`date-fns`), tâches en retard en tête.
- Switch via `?view=` (`useSearchParams` + `router.replace`) pour que la vue soit partageable.
- Realtime (optionnel) : `supabase.channel('tasks').on('postgres_changes', { table: 'tasks', filter: 'project_id=eq.' + id }, …)` pour que le client voie bouger les cartes.

### Étape 8 — Modale de tâche
- Paramètre `?task=<id>` : la page charge le détail côté serveur et ouvre un `Dialog` ; lien partageable, fermeture = retrait du paramètre.
- Admin : champs éditables (titre, Markdown avec aperçu, deadline, priorité, étiquettes, checklist).
- Client : rendu lecture seule — `react-markdown` + `remark-gfm` (**sans** `rehype-raw`, pour ne jamais injecter de HTML).
- Bouton **« Valider cette étape »** visible pour un client si `status = 'review'` et non validée → `supabase.rpc('validate_task', { p_task_id })`.
- `CommentThread` : liste + formulaire, `addComment` puis `revalidatePath`. Realtime sur `task_comments` pour la conversation en direct.

### Étape 9 — Documents & livrables
- Upload admin côté navigateur : `supabase.storage.from('project-files').upload(`${projectId}/${crypto.randomUUID()}-${file.name}`, file)` puis Server Action `registerUpload` qui insère la ligne `project_documents`.
- Liens (Figma, staging, recette) : `kind` + `url`, sans fichier.
- Téléchargement : Server Action `getDownloadUrl(documentId)` → `createSignedUrl(path, 60, { download: true })`. Si l'utilisateur n'a pas le droit, la RLS Storage renvoie une erreur.
- Toggle « Visible par le client » pour les documents internes.

### Étape 10 — Journal d'activité
Rien à écrire côté serveur : les triggers alimentent la table. Page = `activity_logs` + `profiles(full_name)` paginée, formatée par `formatActivity()` :
```ts
case 'task.status_changed':
  return `${actor} a passé « ${meta.title} » en « ${STATUS_LABEL[meta.to]} » le ${format(date, 'dd/MM')}`
```

### Étape 11 — Gestion du temps (admin)
- Chrono : `startTimer(taskId)` insère une entrée sans `ended_at` (un seul chrono actif garanti par index unique) ; `stopTimer()` pose `ended_at = now()`. `minutes` est calculé par Postgres.
- Saisie manuelle : début + fin (ou date + durée convertie).
- Page : tableau par tâche + `project_time_summary` → heures totales, taux horaire effectif (budget ÷ heures).

### Étape 12 — Mise en production
- Déploiement Vercel ; `NEXT_PUBLIC_SITE_URL` et `Site URL` Supabase = `https://portail.tondomaine.fr` ; CNAME du sous-domaine vers Vercel.
- **Test de sécurité à faire avant d'inviter un vrai client** : crée un compte client de test, et depuis la console du navigateur essaie `supabase.from('tasks').update({ title: 'x' })`, `supabase.from('clients').select()`, `supabase.from('time_entries').select()` — tout doit renvoyer vide ou une erreur.
- Supabase **Advisors → Security** : aucun avertissement RLS ne doit rester.

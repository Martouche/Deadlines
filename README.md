# Deadlines

Portail client / CRM de suivi de projet (Next.js 16 · Supabase · shadcn/ui).
Architecture et feuille de route : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Démarrage

```bash
cp .env.example .env.local   # puis renseigner les valeurs Supabase
npm install
npx supabase link --project-ref <ref>
npx supabase db push         # applique supabase/migrations
npm run dev
```

Après la première connexion, se promouvoir admin (SQL Editor Supabase) :

```sql
update public.profiles set role = 'admin' where email = 'toi@exemple.fr';
```

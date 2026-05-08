-- ============================================================
-- CLUB DE ESCRITURA - Supabase Schema
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Tabla de perfiles de usuario (extiende auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Tabla de retos mensuales
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  theme text not null,
  description text,
  max_words int default 1000,
  phase text not null default 'submission'
    check (phase in ('submission', 'commenting', 'voting', 'reveal')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  submission_deadline timestamptz,
  voting_deadline timestamptz
);

-- Tabla de historias enviadas
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade,
  author_id uuid references public.profiles(id),
  title text not null,
  file_url text not null,        -- URL del archivo .docx o .pdf en Storage
  file_name text not null,       -- Nombre original del archivo
  file_type text not null,       -- 'pdf' | 'docx'
  word_count int,                -- Declarado por el escritor
  genre text,
  cover_image_url text,          -- URL pública de la imagen de portada
  created_at timestamptz default now()
);

-- ============================================================
-- STORAGE: bucket para portadas de historias
-- Ejecuta esto también en el SQL Editor
-- ============================================================
insert into storage.buckets (id, name, public)
values ('story-covers', 'story-covers', true)
on conflict do nothing;

-- Bucket para los archivos de historias (PDF / DOCX)
-- No es público: se accede mediante URLs firmadas temporales
insert into storage.buckets (id, name, public)
values ('story-files', 'story-files', false)
on conflict do nothing;

-- Política: cualquiera puede ver las imágenes (son públicas)
create policy "covers_public_read" on storage.objects
  for select using (bucket_id = 'story-covers');

-- Política: usuarios autenticados pueden subir sus propias imágenes
create policy "covers_authenticated_upload" on storage.objects
  for insert with check (
    bucket_id = 'story-covers' and auth.role() = 'authenticated'
  );

-- Política: el autor puede borrar su propia imagen
create policy "covers_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'story-covers' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Políticas para story-files (archivos privados)
-- Solo usuarios autenticados pueden leer (se generan URLs firmadas en la app)
create policy "files_authenticated_read" on storage.objects
  for select using (
    bucket_id = 'story-files' and auth.role() = 'authenticated'
  );

create policy "files_authenticated_upload" on storage.objects
  for insert with check (
    bucket_id = 'story-files' and auth.role() = 'authenticated'
  );

create policy "files_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'story-files' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Tabla de comentarios
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade,
  author_id uuid references public.profiles(id),
  content text not null,
  created_at timestamptz default now(),
  unique(story_id, author_id)  -- Un comentario por historia por usuario
);

-- Tabla de votos principales (puntos escalonados)
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade,
  voter_id uuid references public.profiles(id),
  story_id uuid references public.stories(id) on delete cascade,
  points int not null check (points > 0),
  created_at timestamptz default now(),
  unique(challenge_id, voter_id, story_id),
  unique(challenge_id, voter_id, points)  -- No repetir puntaje por votante
);

-- Tabla de votos por subcategoría
create table public.category_votes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade,
  voter_id uuid references public.profiles(id),
  story_id uuid references public.stories(id) on delete cascade,
  category text not null check (category in ('best_character', 'best_plot', 'best_opening')),
  created_at timestamptz default now(),
  unique(challenge_id, voter_id, category)  -- Un voto por categoría por votante
);

-- Tabla de participantes del reto (escritores + lectores)
create table public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade,
  user_id uuid references public.profiles(id),
  role text not null default 'reader' check (role in ('writer', 'reader')),
  created_at timestamptz default now(),
  unique(challenge_id, user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.stories enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.category_votes enable row level security;
alter table public.challenge_participants enable row level security;

-- Profiles: todos pueden ver, solo el dueño edita
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Challenges: todos ven, solo admin crea/edita
create policy "challenges_select" on public.challenges for select using (true);
create policy "challenges_insert" on public.challenges for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "challenges_update" on public.challenges for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Stories: durante voting/commenting se oculta author_id en la app (no en DB)
-- Solo el autor ve su propia historia antes de reveal; todos ven en reveal
create policy "stories_select" on public.stories for select using (true);
create policy "stories_insert" on public.stories for insert with check (auth.uid() = author_id);

-- Comments: todos ven, usuarios autenticados crean
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = author_id);

-- Votes: usuario solo ve y crea sus propios votos
create policy "votes_select" on public.votes for select using (auth.uid() = voter_id);
create policy "votes_insert" on public.votes for insert with check (auth.uid() = voter_id);
create policy "votes_delete" on public.votes for delete using (auth.uid() = voter_id);

-- Category votes
create policy "cat_votes_select" on public.category_votes for select using (auth.uid() = voter_id);
create policy "cat_votes_insert" on public.category_votes for insert with check (auth.uid() = voter_id);
create policy "cat_votes_delete" on public.category_votes for delete using (auth.uid() = voter_id);

-- Participants: todos ven, usuarios autenticados se inscriben
create policy "participants_select" on public.challenge_participants for select using (true);
create policy "participants_insert" on public.challenge_participants for insert with check (auth.uid() = user_id);

-- ============================================================
-- FUNCIÓN: auto-crear perfil al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

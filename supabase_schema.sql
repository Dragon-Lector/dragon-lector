-- ============================================================
-- CLUB DE ESCRITURA - Supabase Schema
-- Sistema de auth: SOLO usuario + contraseña (sin email).
-- La app usa internamente un email sintético "username@dragonlector.local"
-- y el trigger auto_confirm_user marca el email como confirmado.
-- ============================================================

-- ------------------------------------------------------------
-- TABLA: profiles (extiende auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- TABLA: challenges (retos mensuales)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- TABLA: stories (historias enviadas)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- TABLA: comments
-- ------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete cascade,
  author_id uuid references public.profiles(id),
  content text not null,
  created_at timestamptz default now(),
  unique(story_id, author_id)
);

-- ------------------------------------------------------------
-- TABLA: votes (puntos escalonados)
-- ------------------------------------------------------------
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade,
  voter_id uuid references public.profiles(id),
  story_id uuid references public.stories(id) on delete cascade,
  points int not null check (points > 0),
  created_at timestamptz default now(),
  unique(challenge_id, voter_id, story_id),
  unique(challenge_id, voter_id, points)
);

-- ------------------------------------------------------------
-- TABLA: category_votes
-- ------------------------------------------------------------
create table public.category_votes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade,
  voter_id uuid references public.profiles(id),
  story_id uuid references public.stories(id) on delete cascade,
  category text not null check (category in ('best_character', 'best_plot', 'best_opening')),
  created_at timestamptz default now(),
  unique(challenge_id, voter_id, category)
);

-- ------------------------------------------------------------
-- TABLA: challenge_participants
-- ------------------------------------------------------------
create table public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete cascade,
  user_id uuid references public.profiles(id),
  role text not null default 'reader' check (role in ('writer', 'reader')),
  created_at timestamptz default now(),
  unique(challenge_id, user_id)
);

-- ============================================================
-- STORAGE
-- ============================================================
insert into storage.buckets (id, name, public)
values ('story-covers', 'story-covers', true)
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('story-files', 'story-files', false)
on conflict do nothing;

-- Storage policies: covers (público)
create policy "covers_public_read" on storage.objects
  for select using (bucket_id = 'story-covers');

create policy "covers_authenticated_upload" on storage.objects
  for insert with check (
    bucket_id = 'story-covers' and auth.role() = 'authenticated'
  );

create policy "covers_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'story-covers' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies: files (privado, URLs firmadas)
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

-- Profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Challenges
create policy "challenges_select" on public.challenges for select using (true);
create policy "challenges_insert" on public.challenges for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "challenges_update" on public.challenges for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Stories
create policy "stories_select" on public.stories for select using (true);
create policy "stories_insert" on public.stories for insert with check (auth.uid() = author_id);

-- Comments
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = author_id);

-- Votes
create policy "votes_select" on public.votes for select using (auth.uid() = voter_id);
create policy "votes_insert" on public.votes for insert with check (auth.uid() = voter_id);
create policy "votes_delete" on public.votes for delete using (auth.uid() = voter_id);

-- Category votes
create policy "cat_votes_select" on public.category_votes for select using (auth.uid() = voter_id);
create policy "cat_votes_insert" on public.category_votes for insert with check (auth.uid() = voter_id);
create policy "cat_votes_delete" on public.category_votes for delete using (auth.uid() = voter_id);

-- Participants
create policy "participants_select" on public.challenge_participants for select using (true);
create policy "participants_insert" on public.challenge_participants for insert with check (auth.uid() = user_id);

-- ============================================================
-- AUTH: auto-confirmar email (usamos emails sintéticos)
-- Trigger BEFORE INSERT en auth.users que marca email_confirmed_at = now()
-- para que el flujo "solo usuario + contraseña" funcione sin enviar correos.
-- ============================================================
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

-- ============================================================
-- AUTH: crear perfil al registrarse (toma username de metadata)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, username)
  values (new.id, v_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

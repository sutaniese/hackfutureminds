-- teñ / Buzhai shared class persistence
-- Accounts, classes, membership, learning progress, custom topics, clip events.
-- Role lives in public.profiles (RLS-protected) and is mirrored to auth.users.raw_app_meta_data.
-- Never authorize off user_metadata.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null check (role in ('student', 'parent', 'teacher')),
  accessibility_support jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create unique index if not exists profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- classes + membership
-- ---------------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  invite_code text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists classes_invite_code_idx on public.classes (upper(invite_code));
create index if not exists classes_teacher_idx on public.classes (teacher_id);

create table if not exists public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create index if not exists class_members_student_idx on public.class_members (student_id);

-- ---------------------------------------------------------------------------
-- learning
-- ---------------------------------------------------------------------------
create table if not exists public.learning_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  grade int not null check (grade between 7 and 12),
  subject_id text not null,
  goals jsonb not null default '[]'::jsonb,
  exam_date date,
  minutes_per_day int not null default 30,
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  diagnostic jsonb,
  topics jsonb not null default '{}'::jsonb,
  attempts jsonb not null default '[]'::jsonb,
  next_reviews jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_topics (
  id text primary key,
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  topic jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_topics_class_idx on public.custom_topics (class_id);

create table if not exists public.clip_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  clip_id text not null,
  topic_id text not null,
  event text not null check (event in ('start', 'complete', 'drop', 'quiz_wrong', 'quiz_right')),
  created_at timestamptz not null default now()
);

create index if not exists clip_events_user_idx on public.clip_events (user_id, created_at desc);
create index if not exists clip_events_topic_idx on public.clip_events (topic_id);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists agent_messages_thread_idx
  on public.agent_messages (teacher_id, student_id, created_at);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'profile role is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Mirror role into app_metadata so clients never authorize off user_metadata.
create or replace function public.sync_profile_role_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_role on public.profiles;
create trigger trg_sync_profile_role
  after insert or update of role on public.profiles
  for each row execute function public.sync_profile_role_to_app_metadata();

create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.is_member_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = p_class_id and m.student_id = auth.uid()
  );
$$;

create or replace function public.teacher_can_see_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = p_student_id and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.join_class_by_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  my_role text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select role into my_role from public.profiles where id = auth.uid();
  if my_role is distinct from 'student' then
    raise exception 'only students can join a class';
  end if;

  select id into cid
  from public.classes
  where upper(invite_code) = upper(trim(p_code));

  if cid is null then
    raise exception 'class not found';
  end if;

  insert into public.class_members (class_id, student_id)
  values (cid, auth.uid())
  on conflict do nothing;

  return cid;
end;
$$;

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  for i in 1..40 loop
    code := 'TN-';
    code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    if not exists (select 1 from public.classes where upper(invite_code) = code) then
      return code;
    end if;
  end loop;
  return 'TN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.learning_profiles enable row level security;
alter table public.learning_state enable row level security;
alter table public.custom_topics enable row level security;
alter table public.clip_events enable row level security;
alter table public.agent_messages enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.teacher_can_see_student(id)
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role in ('student', 'parent', 'teacher')
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- classes
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated
  using (
    teacher_id = auth.uid()
    or public.is_member_of_class(id)
  );

drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes
  for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher')
  );

drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes
  for update to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes
  for delete to authenticated
  using (teacher_id = auth.uid());

-- class_members: students join only via RPC; teachers read/remove their class
drop policy if exists class_members_select on public.class_members;
create policy class_members_select on public.class_members
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_teacher_of_class(class_id)
  );

drop policy if exists class_members_delete on public.class_members;
create policy class_members_delete on public.class_members
  for delete to authenticated
  using (public.is_teacher_of_class(class_id) or student_id = auth.uid());

-- learning_profiles
drop policy if exists learning_profiles_select on public.learning_profiles;
create policy learning_profiles_select on public.learning_profiles
  for select to authenticated
  using (user_id = auth.uid() or public.teacher_can_see_student(user_id));

drop policy if exists learning_profiles_upsert on public.learning_profiles;
create policy learning_profiles_insert on public.learning_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists learning_profiles_update on public.learning_profiles;
create policy learning_profiles_update on public.learning_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- learning_state
drop policy if exists learning_state_select on public.learning_state;
create policy learning_state_select on public.learning_state
  for select to authenticated
  using (user_id = auth.uid() or public.teacher_can_see_student(user_id));

drop policy if exists learning_state_insert on public.learning_state;
create policy learning_state_insert on public.learning_state
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists learning_state_update on public.learning_state;
create policy learning_state_update on public.learning_state
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- custom_topics
drop policy if exists custom_topics_select on public.custom_topics;
create policy custom_topics_select on public.custom_topics
  for select to authenticated
  using (
    public.is_teacher_of_class(class_id)
    or public.is_member_of_class(class_id)
  );

drop policy if exists custom_topics_insert on public.custom_topics;
create policy custom_topics_insert on public.custom_topics
  for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and public.is_teacher_of_class(class_id)
  );

drop policy if exists custom_topics_update on public.custom_topics;
create policy custom_topics_update on public.custom_topics
  for update to authenticated
  using (teacher_id = auth.uid() and public.is_teacher_of_class(class_id))
  with check (teacher_id = auth.uid() and public.is_teacher_of_class(class_id));

drop policy if exists custom_topics_delete on public.custom_topics;
create policy custom_topics_delete on public.custom_topics
  for delete to authenticated
  using (teacher_id = auth.uid() and public.is_teacher_of_class(class_id));

-- clip_events
drop policy if exists clip_events_select on public.clip_events;
create policy clip_events_select on public.clip_events
  for select to authenticated
  using (user_id = auth.uid() or public.teacher_can_see_student(user_id));

drop policy if exists clip_events_insert on public.clip_events;
create policy clip_events_insert on public.clip_events
  for insert to authenticated
  with check (user_id = auth.uid());

-- agent_messages
drop policy if exists agent_messages_select on public.agent_messages;
create policy agent_messages_select on public.agent_messages
  for select to authenticated
  using (teacher_id = auth.uid() and public.teacher_can_see_student(student_id));

drop policy if exists agent_messages_insert on public.agent_messages;
create policy agent_messages_insert on public.agent_messages
  for insert to authenticated
  with check (teacher_id = auth.uid() and public.teacher_can_see_student(student_id));

drop policy if exists agent_messages_delete on public.agent_messages;
create policy agent_messages_delete on public.agent_messages
  for delete to authenticated
  using (teacher_id = auth.uid());

grant execute on function public.join_class_by_invite(text) to authenticated;
grant execute on function public.is_teacher_of_class(uuid) to authenticated;
grant execute on function public.is_member_of_class(uuid) to authenticated;
grant execute on function public.teacher_can_see_student(uuid) to authenticated;
grant execute on function public.generate_invite_code() to authenticated;

-- Direct inserts into class_members are not granted: join goes through RPC.
revoke insert on public.class_members from authenticated, anon;

grant select, insert, update, delete on table
  public.profiles,
  public.classes,
  public.learning_profiles,
  public.learning_state,
  public.custom_topics,
  public.clip_events,
  public.agent_messages
to authenticated;

grant select, delete on table public.class_members to authenticated;
grant all on table
  public.profiles,
  public.classes,
  public.class_members,
  public.learning_profiles,
  public.learning_state,
  public.custom_topics,
  public.clip_events,
  public.agent_messages
to service_role;

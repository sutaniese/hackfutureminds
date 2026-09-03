-- teñ / Buzhai — paste into Supabase SQL Editor (one run).
-- Idempotent: safe to re-run. Role lives in public.profiles and is mirrored to
-- auth.users.raw_app_meta_data. Never authorize off user_metadata (user-editable).
-- Homework = published custom_topics. Attempts live in learning_state.attempts.
-- Exams/deadlines = learning_profiles.exam_date + class_deadlines.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- tables
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

-- Parent ↔ child. A parent sees only a linked child.
create table if not exists public.parent_links (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, child_id),
  check (parent_id <> child_id)
);

create index if not exists parent_links_child_idx on public.parent_links (child_id);

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

-- Teacher-published homework (topic jsonb). Students in the class can read it.
create table if not exists public.custom_topics (
  id text primary key,
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  topic jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_topics_class_idx on public.custom_topics (class_id);

-- Live teacher clip: scene JSON on the topic row. Owning teacher writes via
-- custom_topics_* policies; students in the class read the same row.
alter table public.custom_topics
  add column if not exists clip_script jsonb;

-- Teacher-set exams / deadlines (source = 'teacher' in the class overview).
create table if not exists public.class_deadlines (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  due_on date not null,
  created_at timestamptz not null default now()
);

create index if not exists class_deadlines_class_idx on public.class_deadlines (class_id, due_on);

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
-- helpers (auth.uid() wrapped in (select …) per current RLS docs)
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
    where c.id = p_class_id and c.teacher_id = (select auth.uid())
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
    where m.class_id = p_class_id and m.student_id = (select auth.uid())
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
    where m.student_id = p_student_id and c.teacher_id = (select auth.uid())
  );
$$;

create or replace function public.parent_can_see_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_links l
    where l.parent_id = (select auth.uid())
      and l.child_id = p_child_id
  );
$$;

create or replace function public.student_can_see_teacher(p_teacher_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classes c
    join public.class_members m on m.class_id = c.id
    where m.student_id = (select auth.uid())
      and c.teacher_id = p_teacher_id
  );
$$;

create or replace function public.student_shares_class_with(p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_members me
    join public.class_members them on them.class_id = me.class_id
    where me.student_id = (select auth.uid())
      and them.student_id = p_target
      and me.student_id <> them.student_id
  );
$$;

create or replace function public.student_class_member_count(p_class_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_member_of_class(p_class_id) then (
      select count(*)::int from public.class_members where class_id = p_class_id
    )
    else 0
  end;
$$;

-- Join goes only through this RPC. Direct INSERT on class_members is revoked.
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
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  select role into my_role from public.profiles where id = (select auth.uid());
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
  values (cid, (select auth.uid()))
  on conflict do nothing;

  return cid;
end;
$$;

create or replace function public.link_child_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  my_role text;
  child uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  select role into my_role from public.profiles where id = (select auth.uid());
  if my_role is distinct from 'parent' then
    raise exception 'only parents can link a child';
  end if;

  select id into child
  from public.profiles
  where lower(email) = lower(trim(p_email))
    and role = 'student';

  if child is null then
    raise exception 'student not found';
  end if;

  insert into public.parent_links (parent_id, child_id)
  values ((select auth.uid()), child)
  on conflict do nothing;

  return child;
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
alter table public.parent_links enable row level security;
alter table public.learning_profiles enable row level security;
alter table public.learning_state enable row level security;
alter table public.custom_topics enable row level security;
alter table public.class_deadlines enable row level security;
alter table public.clip_events enable row level security;
alter table public.agent_messages enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.classes from anon, authenticated;
revoke all on table public.class_members from anon, authenticated;
revoke all on table public.parent_links from anon, authenticated;
revoke all on table public.learning_profiles from anon, authenticated;
revoke all on table public.learning_state from anon, authenticated;
revoke all on table public.custom_topics from anon, authenticated;
revoke all on table public.class_deadlines from anon, authenticated;
revoke all on table public.clip_events from anon, authenticated;
revoke all on table public.agent_messages from anon, authenticated;

-- profiles (UPDATE needs SELECT or it silently updates 0 rows)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.teacher_can_see_student(id)
    or public.parent_can_see_child(id)
    or public.student_can_see_teacher(id)
    or public.student_shares_class_with(id)
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and role in ('student', 'parent', 'teacher')
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- classes: teacher owns; student members can read name / invite / teacher_id
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or public.is_member_of_class(id)
  );

drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'teacher'
    )
  );

drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes
  for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- class_members: no direct INSERT (join_class_by_invite only)
drop policy if exists class_members_select on public.class_members;
create policy class_members_select on public.class_members
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or public.is_teacher_of_class(class_id)
    or public.is_member_of_class(class_id)
  );

drop policy if exists class_members_delete on public.class_members;
create policy class_members_delete on public.class_members
  for delete to authenticated
  using (
    public.is_teacher_of_class(class_id)
    or student_id = (select auth.uid())
  );

-- parent_links
drop policy if exists parent_links_select on public.parent_links;
create policy parent_links_select on public.parent_links
  for select to authenticated
  using (
    parent_id = (select auth.uid())
    or child_id = (select auth.uid())
  );

drop policy if exists parent_links_delete on public.parent_links;
create policy parent_links_delete on public.parent_links
  for delete to authenticated
  using (
    parent_id = (select auth.uid())
    or child_id = (select auth.uid())
  );

-- learning_profiles
drop policy if exists learning_profiles_select on public.learning_profiles;
create policy learning_profiles_select on public.learning_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.teacher_can_see_student(user_id)
    or public.parent_can_see_child(user_id)
  );

drop policy if exists learning_profiles_upsert on public.learning_profiles;
drop policy if exists learning_profiles_insert on public.learning_profiles;
create policy learning_profiles_insert on public.learning_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists learning_profiles_update on public.learning_profiles;
create policy learning_profiles_update on public.learning_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- learning_state (progress + attempts jsonb)
drop policy if exists learning_state_select on public.learning_state;
create policy learning_state_select on public.learning_state
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.teacher_can_see_student(user_id)
    or public.parent_can_see_child(user_id)
  );

drop policy if exists learning_state_insert on public.learning_state;
create policy learning_state_insert on public.learning_state
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists learning_state_update on public.learning_state;
create policy learning_state_update on public.learning_state
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- custom_topics = published homework / assignments
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
    teacher_id = (select auth.uid())
    and public.is_teacher_of_class(class_id)
  );

drop policy if exists custom_topics_update on public.custom_topics;
create policy custom_topics_update on public.custom_topics
  for update to authenticated
  using (teacher_id = (select auth.uid()) and public.is_teacher_of_class(class_id))
  with check (teacher_id = (select auth.uid()) and public.is_teacher_of_class(class_id));

drop policy if exists custom_topics_delete on public.custom_topics;
create policy custom_topics_delete on public.custom_topics
  for delete to authenticated
  using (teacher_id = (select auth.uid()) and public.is_teacher_of_class(class_id));

-- class_deadlines
drop policy if exists class_deadlines_select on public.class_deadlines;
create policy class_deadlines_select on public.class_deadlines
  for select to authenticated
  using (
    public.is_teacher_of_class(class_id)
    or public.is_member_of_class(class_id)
  );

drop policy if exists class_deadlines_insert on public.class_deadlines;
create policy class_deadlines_insert on public.class_deadlines
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and public.is_teacher_of_class(class_id)
  );

drop policy if exists class_deadlines_update on public.class_deadlines;
create policy class_deadlines_update on public.class_deadlines
  for update to authenticated
  using (teacher_id = (select auth.uid()) and public.is_teacher_of_class(class_id))
  with check (teacher_id = (select auth.uid()) and public.is_teacher_of_class(class_id));

drop policy if exists class_deadlines_delete on public.class_deadlines;
create policy class_deadlines_delete on public.class_deadlines
  for delete to authenticated
  using (teacher_id = (select auth.uid()) and public.is_teacher_of_class(class_id));

-- clip_events
drop policy if exists clip_events_select on public.clip_events;
create policy clip_events_select on public.clip_events
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.teacher_can_see_student(user_id)
    or public.parent_can_see_child(user_id)
  );

drop policy if exists clip_events_insert on public.clip_events;
create policy clip_events_insert on public.clip_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- agent_messages
drop policy if exists agent_messages_select on public.agent_messages;
create policy agent_messages_select on public.agent_messages
  for select to authenticated
  using (teacher_id = (select auth.uid()) and public.teacher_can_see_student(student_id));

drop policy if exists agent_messages_insert on public.agent_messages;
create policy agent_messages_insert on public.agent_messages
  for insert to authenticated
  with check (teacher_id = (select auth.uid()) and public.teacher_can_see_student(student_id));

drop policy if exists agent_messages_delete on public.agent_messages;
create policy agent_messages_delete on public.agent_messages
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- grants (service_role stays server-side; never put it in a client bundle)
-- ---------------------------------------------------------------------------
grant execute on function public.join_class_by_invite(text) to authenticated;
grant execute on function public.link_child_by_email(text) to authenticated;
grant execute on function public.is_teacher_of_class(uuid) to authenticated;
grant execute on function public.is_member_of_class(uuid) to authenticated;
grant execute on function public.teacher_can_see_student(uuid) to authenticated;
grant execute on function public.parent_can_see_child(uuid) to authenticated;
grant execute on function public.student_can_see_teacher(uuid) to authenticated;
grant execute on function public.student_shares_class_with(uuid) to authenticated;
grant execute on function public.student_class_member_count(uuid) to authenticated;
grant execute on function public.generate_invite_code() to authenticated;

revoke insert on public.class_members from authenticated, anon;
revoke insert on public.parent_links from authenticated, anon;

grant select, insert, update, delete on table
  public.profiles,
  public.classes,
  public.learning_profiles,
  public.learning_state,
  public.custom_topics,
  public.class_deadlines,
  public.clip_events,
  public.agent_messages
to authenticated;

grant select, delete on table public.class_members to authenticated;
grant select, delete on table public.parent_links to authenticated;

grant all on table
  public.profiles,
  public.classes,
  public.class_members,
  public.parent_links,
  public.learning_profiles,
  public.learning_state,
  public.custom_topics,
  public.class_deadlines,
  public.clip_events,
  public.agent_messages
to service_role;

-- Teacher-authored live clip JSON (played in the browser / Expo, never encoded to MP4).
alter table public.custom_topics
  add column if not exists live_clip jsonb;

comment on column public.custom_topics.live_clip is
  'Teacher-authored live clip script (scenes JSON). Students in the class can read; teacher owner can write.';

alter table public.clip_events drop constraint if exists clip_events_event_check;
alter table public.clip_events add constraint clip_events_event_check
  check (event in ('start', 'complete', 'drop', 'quiz_wrong', 'quiz_right', 'stuck'));

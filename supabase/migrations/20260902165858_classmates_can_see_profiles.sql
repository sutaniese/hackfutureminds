-- Students can see their teacher's display name, count classmates,
-- and (if RLS allows) classmate display names — not emails beyond what profiles expose.

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
    where m.student_id = auth.uid()
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
    where me.student_id = auth.uid()
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

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.teacher_can_see_student(id)
    or public.student_can_see_teacher(id)
    or public.student_shares_class_with(id)
  );

drop policy if exists class_members_select on public.class_members;
create policy class_members_select on public.class_members
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_teacher_of_class(class_id)
    or public.is_member_of_class(class_id)
  );

grant execute on function public.student_can_see_teacher(uuid) to authenticated;
grant execute on function public.student_shares_class_with(uuid) to authenticated;
grant execute on function public.student_class_member_count(uuid) to authenticated;

-- Habel Kidz | Initial schema + RLS + Storage + safe quiz submission RPC
-- Run this file in Supabase SQL Editor (or with Supabase CLI migrations).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Guru',
  role text not null check (role in ('admin', 'teacher')),
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER helpers prevent recursive profile RLS lookups.
create or replace function private.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_profiles as tp
    where tp.user_id = (select auth.uid())
      and tp.role in ('admin', 'teacher')
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teacher_profiles as tp
    where tp.user_id = (select auth.uid())
      and tp.role = 'admin'
  );
$$;

revoke all on function private.is_teacher() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_teacher() to anon, authenticated;
grant execute on function private.is_admin() to authenticated;

create table if not exists public.grades (
  id text primary key,
  name text not null,
  level text not null check (level in ('SD', 'SMP')),
  grade_number smallint not null check (grade_number between 1 and 9),
  sort_order smallint not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  grade_id text not null references public.grades(id) on delete cascade,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grade_id, name)
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  grade_id text not null references public.grades(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  content text not null default '',
  image_path text,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  type text not null check (type in ('mc', 'short')),
  prompt text not null,
  image_path text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null check (label in ('A', 'B', 'C', 'D')),
  option_text text not null default '',
  image_path text,
  sort_order smallint not null check (sort_order between 0 and 3),
  unique (question_id, label),
  unique (question_id, sort_order),
  unique (id, question_id)
);

-- Keys are deliberately isolated from the public question/option tables.
create table if not exists public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_option_id uuid,
  accepted_answer text,
  updated_at timestamptz not null default now(),
  constraint question_key_shape check (
    (correct_option_id is not null and accepted_answer is null)
    or (correct_option_id is null and accepted_answer is not null)
  ),
  constraint correct_option_belongs_to_question
    foreign key (correct_option_id, question_id)
    references public.question_options(id, question_id)
    deferrable initially deferred
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete restrict,
  student_name text,
  score numeric(5,2) not null default 0 check (score between 0 and 100),
  question_count integer not null check (question_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  submitted_at timestamptz not null default now()
);

create table if not exists public.quiz_attempt_answers (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  selected_option_id uuid,
  text_answer text,
  is_correct boolean not null default false,
  primary key (attempt_id, question_id),
  constraint selected_option_belongs_to_question
    foreign key (selected_option_id, question_id)
    references public.question_options(id, question_id)
);

create index if not exists idx_subjects_grade on public.subjects(grade_id, sort_order);
create index if not exists idx_materials_grade_published on public.materials(grade_id, is_published, created_at desc);
create index if not exists idx_questions_material on public.questions(material_id, is_published, sort_order);
create index if not exists idx_question_options_question on public.question_options(question_id, sort_order);
create index if not exists idx_quiz_attempts_material on public.quiz_attempts(material_id, submitted_at desc);

-- updated_at trigger helper
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;
grant execute on function private.touch_updated_at() to authenticated;

drop trigger if exists subjects_touch_updated_at on public.subjects;
create trigger subjects_touch_updated_at before update on public.subjects
for each row execute function private.touch_updated_at();
drop trigger if exists materials_touch_updated_at on public.materials;
create trigger materials_touch_updated_at before update on public.materials
for each row execute function private.touch_updated_at();
drop trigger if exists questions_touch_updated_at on public.questions;
create trigger questions_touch_updated_at before update on public.questions
for each row execute function private.touch_updated_at();
drop trigger if exists question_keys_touch_updated_at on public.question_keys;
create trigger question_keys_touch_updated_at before update on public.question_keys
for each row execute function private.touch_updated_at();

-- Enable RLS on every exposed application table.
alter table public.teacher_profiles enable row level security;
alter table public.grades enable row level security;
alter table public.subjects enable row level security;
alter table public.materials enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;

-- Remove broad default privileges, then grant only the operations needed.
revoke all on public.teacher_profiles, public.grades, public.subjects, public.materials,
  public.questions, public.question_options, public.question_keys,
  public.quiz_attempts, public.quiz_attempt_answers from anon, authenticated;

grant select on public.teacher_profiles to authenticated;
grant insert, update, delete on public.teacher_profiles to authenticated;
grant select on public.grades, public.subjects, public.materials,
  public.questions, public.question_options to anon, authenticated;
grant insert, update, delete on public.grades, public.subjects, public.materials,
  public.questions, public.question_options to authenticated;
grant select, insert, update, delete on public.question_keys to authenticated;
grant select on public.quiz_attempts, public.quiz_attempt_answers to authenticated;

-- Profiles: users can read their own profile; only an existing admin can manage roles/profiles.
drop policy if exists teacher_profiles_read_self_or_admin on public.teacher_profiles;
create policy teacher_profiles_read_self_or_admin on public.teacher_profiles
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists teacher_profiles_admin_manage on public.teacher_profiles;
create policy teacher_profiles_admin_manage on public.teacher_profiles
for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Public can read active grades and published learning content only.
drop policy if exists grades_read_active on public.grades;
create policy grades_read_active on public.grades
for select to anon, authenticated using (is_active = true or (select private.is_teacher()));
drop policy if exists grades_teacher_manage on public.grades;
create policy grades_teacher_manage on public.grades
for all to authenticated using ((select private.is_teacher()))
with check ((select private.is_teacher()));

drop policy if exists subjects_read_published on public.subjects;
create policy subjects_read_published on public.subjects
for select to anon, authenticated using (is_published = true or (select private.is_teacher()));
drop policy if exists subjects_teacher_manage on public.subjects;
create policy subjects_teacher_manage on public.subjects
for all to authenticated using ((select private.is_teacher()))
with check ((select private.is_teacher()));

drop policy if exists materials_read_published on public.materials;
create policy materials_read_published on public.materials
for select to anon, authenticated using (is_published = true or (select private.is_teacher()));
drop policy if exists materials_teacher_manage on public.materials;
create policy materials_teacher_manage on public.materials
for all to authenticated using ((select private.is_teacher()))
with check ((select private.is_teacher()));

drop policy if exists questions_read_published on public.questions;
create policy questions_read_published on public.questions
for select to anon, authenticated using (
  is_published = true
  and exists (
    select 1 from public.materials m
    where m.id = questions.material_id and m.is_published = true
  )
  or (select private.is_teacher())
);
drop policy if exists questions_teacher_manage on public.questions;
create policy questions_teacher_manage on public.questions
for all to authenticated using ((select private.is_teacher()))
with check ((select private.is_teacher()));

drop policy if exists question_options_read_published on public.question_options;
create policy question_options_read_published on public.question_options
for select to anon, authenticated using (
  exists (
    select 1 from public.questions q
    join public.materials m on m.id = q.material_id
    where q.id = question_options.question_id
      and q.is_published = true and m.is_published = true
  )
  or (select private.is_teacher())
);
drop policy if exists question_options_teacher_manage on public.question_options;
create policy question_options_teacher_manage on public.question_options
for all to authenticated using ((select private.is_teacher()))
with check ((select private.is_teacher()));

-- Answer keys and attempt details are visible to teachers only.
drop policy if exists question_keys_teacher_read on public.question_keys;
drop policy if exists question_keys_teacher_manage on public.question_keys;
create policy question_keys_teacher_manage on public.question_keys
for all to authenticated
using ((select private.is_teacher()))
with check ((select private.is_teacher()));
drop policy if exists quiz_attempts_teacher_read on public.quiz_attempts;
create policy quiz_attempts_teacher_read on public.quiz_attempts
for select to authenticated using ((select private.is_teacher()));
drop policy if exists quiz_attempt_answers_teacher_read on public.quiz_attempt_answers;
create policy quiz_attempt_answers_teacher_read on public.quiz_attempt_answers
for select to authenticated using ((select private.is_teacher()));

-- Students submit answers only through this function. It scores on the database side,
-- stores the attempt, and returns correctness flags only (never the answer key).
create or replace function public.submit_quiz(
  p_material_id uuid,
  p_student_name text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_received integer;
  v_distinct integer;
  v_correct integer := 0;
  v_attempt_id uuid;
  v_answer jsonb;
  v_question_id uuid;
  v_selected_option_id uuid;
  v_text_answer text;
  v_question_type text;
  v_correct_option_id uuid;
  v_accepted_answer text;
  v_is_correct boolean;
  v_review jsonb := '[]'::jsonb;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Format jawaban tidak valid.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.materials m
    where m.id = p_material_id and m.is_published = true
  ) then
    raise exception 'Materi tidak tersedia.' using errcode = '42501';
  end if;

  select count(*) into v_total
  from public.questions q
  where q.material_id = p_material_id and q.is_published = true;

  select count(*), count(distinct (a.value->>'question_id'))
    into v_received, v_distinct
  from jsonb_array_elements(p_answers) as a(value);

  if v_total = 0 or v_received <> v_total or v_distinct <> v_total then
    raise exception 'Jumlah jawaban tidak sesuai dengan jumlah soal aktif.' using errcode = '22023';
  end if;

  insert into public.quiz_attempts(material_id, student_name, question_count)
  values (p_material_id, nullif(left(trim(coalesce(p_student_name, '')), 80), ''), v_total)
  returning id into v_attempt_id;

  for v_answer in select a.value from jsonb_array_elements(p_answers) as a(value)
  loop
    v_question_id := nullif(v_answer->>'question_id', '')::uuid;
    v_selected_option_id := nullif(v_answer->>'selected_option_id', '')::uuid;
    v_text_answer := nullif(trim(coalesce(v_answer->>'text_answer', '')), '');

    select q.type into v_question_type
    from public.questions q
    where q.id = v_question_id
      and q.material_id = p_material_id
      and q.is_published = true;
    if not found then
      raise exception 'Ada soal yang tidak termasuk dalam materi ini.' using errcode = '22023';
    end if;

    if v_selected_option_id is not null and not exists (
      select 1 from public.question_options qo
      where qo.id = v_selected_option_id and qo.question_id = v_question_id
    ) then
      raise exception 'Pilihan jawaban tidak valid.' using errcode = '22023';
    end if;

    select qk.correct_option_id, qk.accepted_answer
      into v_correct_option_id, v_accepted_answer
    from public.question_keys qk
    where qk.question_id = v_question_id;

    if v_question_type = 'mc' then
      v_is_correct := v_selected_option_id is not null
        and v_selected_option_id = v_correct_option_id;
    else
      v_is_correct := v_text_answer is not null
        and v_accepted_answer is not null
        and lower(btrim(v_text_answer)) = lower(btrim(v_accepted_answer));
    end if;

    insert into public.quiz_attempt_answers(
      attempt_id, question_id, selected_option_id, text_answer, is_correct
    ) values (
      v_attempt_id, v_question_id, v_selected_option_id, v_text_answer, coalesce(v_is_correct, false)
    );

    if coalesce(v_is_correct, false) then
      v_correct := v_correct + 1;
    end if;

    v_review := v_review || jsonb_build_array(jsonb_build_object(
      'question_id', v_question_id,
      'is_correct', coalesce(v_is_correct, false)
    ));
  end loop;

  update public.quiz_attempts
  set correct_count = v_correct,
      score = round((100.0 * v_correct) / v_total, 2)
  where id = v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score', round((100.0 * v_correct) / v_total, 2),
    'correct_count', v_correct,
    'question_count', v_total,
    'review', v_review
  );
end;
$$;

revoke all on function public.submit_quiz(uuid, text, jsonb) from public;
grant execute on function public.submit_quiz(uuid, text, jsonb) to anon, authenticated;

-- Publicly readable learning assets; only teacher accounts can upload/change/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'habel-kidz-media',
  'habel-kidz-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists habel_kidz_media_public_read on storage.objects;
create policy habel_kidz_media_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'habel-kidz-media');
drop policy if exists habel_kidz_media_teacher_insert on storage.objects;
create policy habel_kidz_media_teacher_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'habel-kidz-media' and (select private.is_teacher()));
drop policy if exists habel_kidz_media_teacher_update on storage.objects;
create policy habel_kidz_media_teacher_update on storage.objects
for update to authenticated
using (bucket_id = 'habel-kidz-media' and (select private.is_teacher()))
with check (bucket_id = 'habel-kidz-media' and (select private.is_teacher()));
drop policy if exists habel_kidz_media_teacher_delete on storage.objects;
create policy habel_kidz_media_teacher_delete on storage.objects
for delete to authenticated
using (bucket_id = 'habel-kidz-media' and (select private.is_teacher()));

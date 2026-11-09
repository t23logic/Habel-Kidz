-- Seed the nine levels and the sample lessons/questions from the original base code.
insert into public.grades (id, name, level, grade_number, sort_order)
values
  ('sd_1', 'Kelas 1 SD', 'SD', 1, 1),
  ('sd_2', 'Kelas 2 SD', 'SD', 2, 2),
  ('sd_3', 'Kelas 3 SD', 'SD', 3, 3),
  ('sd_4', 'Kelas 4 SD', 'SD', 4, 4),
  ('sd_5', 'Kelas 5 SD', 'SD', 5, 5),
  ('sd_6', 'Kelas 6 SD', 'SD', 6, 6),
  ('smp_1', 'Kelas 7 SMP', 'SMP', 7, 7),
  ('smp_2', 'Kelas 8 SMP', 'SMP', 8, 8),
  ('smp_3', 'Kelas 9 SMP', 'SMP', 9, 9)
on conflict (id) do update set
  name = excluded.name,
  level = excluded.level,
  grade_number = excluded.grade_number,
  sort_order = excluded.sort_order;

-- Idempotent demo seed: rerunning the script does not duplicate these demo lessons.
do $$
declare
  v_grade record;
  v_material_id uuid;
  v_question_id uuid;
  v_option_id uuid;
  v_correct_option_id uuid;
  v_title text;
  v_content text;
  v_prompt text;
  v_options text[];
  v_label text;
  v_index integer;
begin
  for v_grade in select * from public.grades order by sort_order loop
    if v_grade.level = 'SD' then
      v_title := 'Matematika Ceria Kelas ' || v_grade.grade_number;
      v_content := '🌟 Selamat datang di materi Matematika Kelas ' || v_grade.grade_number || ' SD! Mari belajar berhitung dengan gembira dan penuh warna bersama Habel Kidz.';
      v_prompt := 'Berapakah hasil dari 5 + ' || v_grade.grade_number || ' ?';
      v_options := array[
        (5 + v_grade.grade_number)::text,
        (4 + v_grade.grade_number)::text,
        (6 + v_grade.grade_number)::text,
        (3 + v_grade.grade_number)::text
      ];
    else
      v_title := 'IPA Seru Kelas ' || v_grade.grade_number;
      v_content := '🚀 Pelajaran Ilmu Pengetahuan Alam (IPA) interaktif untuk tingkat SMP Kelas ' || v_grade.grade_number || '. Mari eksplorasi alam semesta!';
      v_prompt := 'Pusat tata surya kita adalah ...';
      v_options := array['Matahari', 'Bumi', 'Bulan', 'Mars'];
    end if;

    select m.id into v_material_id
    from public.materials m
    where m.grade_id = v_grade.id and m.title = v_title
    order by m.created_at
    limit 1;

    if v_material_id is null then
      insert into public.materials (grade_id, title, content, is_published)
      values (v_grade.id, v_title, v_content, true)
      returning id into v_material_id;
    end if;

    select q.id into v_question_id
    from public.questions q
    where q.material_id = v_material_id and q.prompt = v_prompt
    limit 1;

    if v_question_id is null then
      insert into public.questions (material_id, type, prompt, sort_order, is_published)
      values (v_material_id, 'mc', v_prompt, 0, true)
      returning id into v_question_id;
    end if;

    v_correct_option_id := null;
    for v_index in 1..4 loop
      v_label := chr(64 + v_index);
      select qo.id into v_option_id
      from public.question_options qo
      where qo.question_id = v_question_id and qo.label = v_label;

      if v_option_id is null then
        insert into public.question_options (question_id, label, option_text, sort_order)
        values (v_question_id, v_label, v_options[v_index], v_index - 1)
        returning id into v_option_id;
      end if;

      if v_index = 1 then
        v_correct_option_id := v_option_id;
      end if;
      v_option_id := null;
    end loop;

    insert into public.question_keys (question_id, correct_option_id, accepted_answer)
    values (v_question_id, v_correct_option_id, null)
    on conflict (question_id) do update set
      correct_option_id = excluded.correct_option_id,
      accepted_answer = null;

    v_material_id := null;
    v_question_id := null;
  end loop;
end;
$$;

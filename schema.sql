-- ════════════════════════════════════════════════════════════════════════════
--  SAT Golden Trio — database schema
--  Paste this whole file into Supabase → SQL Editor → Run.
--  Safe to re-run: it uses "if not exists" everywhere.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Users (one row per friend) ───────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  name          text not null,
  goal_score    int,
  current_score int,
  motto         text,
  created_at    timestamptz default now()
);

-- ── Section 1: Shared study plan ─────────────────────────────────────────────
create table if not exists plan_days (
  day            date primary key,
  task           text,
  last_edited_by text,
  last_edited_at timestamptz
);

create table if not exists plan_notes (
  id         bigint generated always as identity primary key,
  day        date not null,
  user_name  text not null,
  content    text not null,
  created_at timestamptz default now()
);

create table if not exists mastery (
  id         bigint generated always as identity primary key,
  day        date not null,
  user_email text not null,
  user_name  text not null,
  rate       int  not null default 0,
  created_at timestamptz default now(),
  unique (day, user_email)
);

-- ── Section 2: Question bank ─────────────────────────────────────────────────
create table if not exists questions (
  id          bigint generated always as identity primary key,
  user_name   text not null,
  question    text not null,
  answer      text not null,
  explanation text,
  skill_tag   text,
  status      text default 'open',   -- open | solved | need_help
  created_at  timestamptz default now()
);

create table if not exists question_comments (
  id          bigint generated always as identity primary key,
  question_id bigint not null,
  user_name   text not null,
  content     text not null,
  created_at  timestamptz default now()
);

create table if not exists question_attempts (
  id          bigint generated always as identity primary key,
  question_id bigint not null,
  user_name   text not null,
  created_at  timestamptz default now(),
  unique (question_id, user_name)
);

-- ── Section 3: Vocabulary ────────────────────────────────────────────────────
create table if not exists vocab_words (
  id         bigint generated always as identity primary key,
  user_name  text not null,
  word       text not null,
  definition text,
  example    text,
  image_url  text,
  created_at timestamptz default now()
);

-- per-user spaced-repetition schedule for each word
create table if not exists vocab_reviews (
  id            bigint generated always as identity primary key,
  word_id       bigint not null,
  user_email    text not null,
  user_name     text,
  due_date      date,
  interval_days int  default 0,
  status        text default 'new',   -- new | struggling | learning | mastered
  last_reviewed timestamptz,
  unique (word_id, user_email)
);

create table if not exists affixes (
  id         bigint generated always as identity primary key,
  kind       text not null,           -- prefix | suffix
  affix      text not null,
  meaning    text,
  example    text,
  added_by   text,
  created_at timestamptz default now()
);

-- ── Section 4: Shared mistake log ────────────────────────────────────────────
create table if not exists mistakes (
  id             bigint generated always as identity primary key,
  user_name      text not null,
  skill_tag      text,
  wrong_answer   text,
  correct_answer text,
  why            text,
  created_at     timestamptz default now()
);

create table if not exists mistake_comments (
  id         bigint generated always as identity primary key,
  mistake_id bigint not null,
  user_name  text not null,
  content    text not null,
  created_at timestamptz default now()
);

-- ── Section 5: Practice test tracker ─────────────────────────────────────────
create table if not exists practice_tests (
  id         bigint generated always as identity primary key,
  user_name  text not null,
  taken_on   date not null,
  rw_score   int,
  math_score int,
  total      int,
  notes      text,
  created_at timestamptz default now()
);

create table if not exists test_comments (
  id         bigint generated always as identity primary key,
  test_id    bigint not null,
  user_name  text not null,
  content    text not null,
  created_at timestamptz default now()
);

-- ── Section 6: Group chat ────────────────────────────────────────────────────
create table if not exists chat_messages (
  id         bigint generated always as identity primary key,
  user_name  text not null,
  content    text not null,
  created_at timestamptz default now()
);

-- ── Section 8: Activity feed ─────────────────────────────────────────────────
create table if not exists activity (
  id          bigint generated always as identity primary key,
  user_name   text not null,
  kind        text,
  description text not null,
  created_at  timestamptz default now()
);

-- ── Weekly reflections ───────────────────────────────────────────────────────
create table if not exists retrospectives (
  id         bigint generated always as identity primary key,
  user_name  text not null,
  week_start date not null,
  learned    text,
  missed     text,
  plan_next  text,
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════════════════
--  Open access for the shared app (small trusted group, anon key only)
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'users','plan_days','plan_notes','mastery','questions','question_comments',
    'question_attempts','vocab_words','vocab_reviews','affixes','mistakes',
    'mistake_comments','practice_tests','test_comments','chat_messages',
    'activity','retrospectives'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists shared_all on %I;', t);
    execute format(
      'create policy shared_all on %I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ── Realtime (live chat + live activity feed) ────────────────────────────────
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table activity;

-- ── Pre-fill common SAT prefixes & suffixes ──────────────────────────────────
insert into affixes (kind, affix, meaning, example, added_by) values
  ('prefix','un-','not / opposite of','unhappy, unable','seed'),
  ('prefix','re-','again / back','redo, return','seed'),
  ('prefix','pre-','before','preview, predict','seed'),
  ('prefix','dis-','not / apart','disagree, disconnect','seed'),
  ('prefix','mis-','wrongly','misjudge, mislead','seed'),
  ('prefix','in-/im-','not','invisible, impossible','seed'),
  ('prefix','sub-','under / below','submarine, subpar','seed'),
  ('prefix','inter-','between','interact, international','seed'),
  ('prefix','trans-','across','transport, translate','seed'),
  ('prefix','anti-','against','antibody, antisocial','seed'),
  ('prefix','de-','remove / reduce','devalue, deactivate','seed'),
  ('prefix','over-','too much','overestimate, overflow','seed'),
  ('suffix','-tion','act / state of','creation, attention','seed'),
  ('suffix','-able/-ible','capable of','readable, flexible','seed'),
  ('suffix','-ous','full of','dangerous, nervous','seed'),
  ('suffix','-ity','state / quality','clarity, ability','seed'),
  ('suffix','-ment','result / action','movement, argument','seed'),
  ('suffix','-ful','full of','helpful, hopeful','seed'),
  ('suffix','-less','without','careless, hopeless','seed'),
  ('suffix','-ness','state of being','kindness, darkness','seed'),
  ('suffix','-ist','one who','scientist, artist','seed'),
  ('suffix','-ize','to make','realize, organize','seed'),
  ('suffix','-ly','in the manner of','quickly, happily','seed')
on conflict do nothing;

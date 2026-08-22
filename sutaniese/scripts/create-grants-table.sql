create table if not exists public.grants (
  id text primary key,
  name text not null,
  name_kz text,
  country text not null,
  type text not null check (type in ('monthly', 'full', 'one-time')),
  amount_kzt integer,
  amount_usd integer,
  amount_label text,
  level text not null check (level in ('bachelor', 'master', 'phd', 'any')),
  fields text[] not null default '{}',
  eligible text[] not null default '{}',
  gpa_min numeric,
  language_req text,
  deadline_month text,
  deadline_label text,
  url text not null,
  source text not null,
  last_updated date not null
);

create index if not exists grants_fields_idx on public.grants using gin (fields);
create index if not exists grants_level_idx on public.grants (level);
create index if not exists grants_type_idx on public.grants (type);
create index if not exists grants_country_idx on public.grants (country);

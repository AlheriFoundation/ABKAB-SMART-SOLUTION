-- ABKAB CMS migration
-- Non-destructive: creates only CMS/storage objects. public.requests is not touched.
create extension if not exists pgcrypto;

create table if not exists public.homepage_content (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  eyebrow text not null default '',
  headline text not null default '',
  description text not null default '',
  primary_cta_text text not null default '',
  primary_cta_url text not null default '',
  secondary_cta_text text not null default '',
  secondary_cta_url text not null default '',
  content text not null default '',
  image_id uuid,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_content_section_key_check check (section_key in ('hero','positioning','why_abkab','process','final_cta')),
  constraint homepage_content_section_key_unique unique (section_key)
);

-- This block also upgrades the earlier local CMS draft safely if it was applied.
alter table public.homepage_content add column if not exists section_key text;
alter table public.homepage_content add column if not exists eyebrow text not null default '';
alter table public.homepage_content add column if not exists headline text not null default '';
alter table public.homepage_content add column if not exists description text not null default '';
alter table public.homepage_content add column if not exists primary_cta_text text not null default '';
alter table public.homepage_content add column if not exists primary_cta_url text not null default '';
alter table public.homepage_content add column if not exists secondary_cta_text text not null default '';
alter table public.homepage_content add column if not exists secondary_cta_url text not null default '';
alter table public.homepage_content add column if not exists content text not null default '';
alter table public.homepage_content add column if not exists image_id uuid;
alter table public.homepage_content add column if not exists is_published boolean not null default false;
alter table public.homepage_content add column if not exists created_at timestamptz not null default now();
alter table public.homepage_content add column if not exists updated_at timestamptz not null default now();
alter table public.homepage_content add column if not exists body text not null default '';
alter table public.homepage_content add column if not exists primary_cta_link text not null default '';
alter table public.homepage_content add column if not exists secondary_cta_link text not null default '';
alter table public.homepage_content add column if not exists status text not null default 'DRAFT';

-- If an earlier single-row draft exists, preserve its values as the hero record.
update public.homepage_content
set section_key = 'hero',
    description = case when description = '' then coalesce(body, '') else description end,
    primary_cta_url = case when primary_cta_url = '' then coalesce(primary_cta_link, '') else primary_cta_url end,
    secondary_cta_url = case when secondary_cta_url = '' then coalesce(secondary_cta_link, '') else secondary_cta_url end,
    is_published = case when status = 'PUBLISHED' then true else is_published end
where section_key is null;
delete from public.homepage_content a using public.homepage_content b
where a.section_key = 'hero' and b.section_key = 'hero' and a.id > b.id;
alter table public.homepage_content alter column section_key set not null;
create unique index if not exists homepage_content_section_key_idx on public.homepage_content(section_key);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_content_section_key_check') then
    alter table public.homepage_content add constraint homepage_content_section_key_check check (section_key in ('hero','positioning','why_abkab','process','final_cta'));
  end if;
end $$;

create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null,
  public_url text,
  media_type text not null default 'image',
  title text not null default '',
  alt_text text not null default '',
  category text not null default 'general' check (category in ('hero','portfolio','services','company','general')),
  section_key text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.media_library add column if not exists file_name text not null default '';
alter table public.media_library add column if not exists storage_path text not null default '';
alter table public.media_library add column if not exists public_url text;
alter table public.media_library add column if not exists media_type text not null default 'image';
alter table public.media_library add column if not exists title text not null default '';
alter table public.media_library add column if not exists alt_text text not null default '';
alter table public.media_library add column if not exists category text not null default 'general';
alter table public.media_library add column if not exists section_key text;
alter table public.media_library add column if not exists is_active boolean not null default false;
alter table public.media_library add column if not exists src text not null default '';
alter table public.media_library add column if not exists type text not null default 'image';
alter table public.media_library add column if not exists section text not null default 'general';
alter table public.media_library add column if not exists status text not null default 'DRAFT';
update public.media_library set file_name = case when file_name = '' then coalesce(nullif(src, ''), 'image') else file_name end, storage_path = case when storage_path = '' then coalesce(src, file_name) else storage_path end, public_url = coalesce(public_url, nullif(src, '')), media_type = coalesce(nullif(type, ''), media_type), category = lower(coalesce(nullif(category, ''), nullif(section, ''), 'general')), section_key = nullif(lower(section), 'general'), is_active = (status = 'PUBLISHED') where true;

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  description text not null default '',
  cover_image text not null default '',
  additional_image text not null default '',
  cover_media_id uuid,
  additional_media_id uuid,
  project_url text not null default '',
  is_featured boolean not null default false,
  is_published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  media_id uuid,
  is_published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.service_categories add column if not exists media_id uuid;
alter table public.service_categories add column if not exists image text not null default '';
alter table public.service_categories add column if not exists is_published boolean not null default true;
alter table public.service_categories add column if not exists display_order integer not null default 0;
alter table public.service_categories add column if not exists status text not null default 'PUBLISHED';
update public.service_categories set is_published = (status = 'PUBLISHED') where status is not null;
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  value text not null default '',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_content_published_idx on public.homepage_content(is_published, section_key);
create index if not exists media_library_public_idx on public.media_library(is_active, category, section_key);
create index if not exists portfolio_projects_public_idx on public.portfolio_projects(is_published, is_featured, display_order);
create index if not exists service_categories_public_idx on public.service_categories(is_published, display_order);

-- Public website media is public by design; admin writes remain server-side.
insert into storage.buckets (id, name, public)
values ('abkab-media', 'abkab-media', true)
on conflict (id) do update set public = true;

alter table public.homepage_content enable row level security;
alter table public.media_library enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.service_categories enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists abkab_public_homepage_read on public.homepage_content;
create policy abkab_public_homepage_read on public.homepage_content for select to anon, authenticated using (is_published = true);
drop policy if exists abkab_public_media_read on public.media_library;
create policy abkab_public_media_read on public.media_library for select to anon, authenticated using (is_active = true);
drop policy if exists abkab_public_portfolio_read on public.portfolio_projects;
create policy abkab_public_portfolio_read on public.portfolio_projects for select to anon, authenticated using (is_published = true);
drop policy if exists abkab_public_services_read on public.service_categories;
create policy abkab_public_services_read on public.service_categories for select to anon, authenticated using (is_published = true);
drop policy if exists abkab_public_settings_read on public.site_settings;
create policy abkab_public_settings_read on public.site_settings for select to anon, authenticated using (is_published = true);

drop policy if exists abkab_public_media_objects_read on storage.objects;
create policy abkab_public_media_objects_read on storage.objects for select to anon, authenticated using (bucket_id = 'abkab-media');

insert into public.homepage_content (section_key, eyebrow, headline, description, primary_cta_text, primary_cta_url, secondary_cta_text, secondary_cta_url, is_published)
values ('hero','ABKAB SMART SOLUTION','Technology, designed to move business forward.','ABKAB builds practical technology, digital experiences and business systems that help organisations work better.','Start a Project','request.html?service=website','Explore Services','services.html',true)
on conflict (section_key) do update set eyebrow = excluded.eyebrow, headline = excluded.headline, description = excluded.description, primary_cta_text = excluded.primary_cta_text, primary_cta_url = excluded.primary_cta_url, secondary_cta_text = excluded.secondary_cta_text, secondary_cta_url = excluded.secondary_cta_url;
insert into public.homepage_content (section_key, content, is_published) values
 ('positioning','Practical technology, digital experiences and business systems for organisations ready to work better.',true),
 ('why_abkab','A better way to move work forward.\nClear thinking, reliable delivery and technology that earns its place in the business.',true),
 ('process','A clear route from need to delivery.\nWe keep the work focused, visible and useful at every stage.',true),
 ('final_cta','Have a project in mind?\nTell us what needs to work better. We will help define the next step.',true)
on conflict (section_key) do nothing;
insert into public.service_categories (slug,name,description,display_order) values
 ('web-development','Digital Products','Websites, software and business systems.',1),('networking','Networking & Cloud','Infrastructure, devices and workplace connectivity.',2),('branding','Branding & Creative','Identity and communication materials.',3),('identity','Business & Identity','Registration guidance and business support.',4),('printing','Printing & Production','Print production and document support.',5),('marketing','Digital Growth','Marketing, content, advertising and SEO support.',6)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';

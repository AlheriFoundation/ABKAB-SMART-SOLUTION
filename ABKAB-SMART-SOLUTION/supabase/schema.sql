create extension if not exists pgcrypto;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  service_type text not null,
  customer_name text not null,
  phone text not null,
  email text not null,
  preferred_contact_method text not null,
  location text not null default '',
  service_category text not null default '',
  description text not null default '',
  address text not null default '',
  state text not null default '',
  lga text not null default '',
  request_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'PENDING',
  admin_notes text not null default '',
  customer_note text not null default ''
);

-- Add fields required by the deployed request APIs to older installations.
alter table public.requests add column if not exists id uuid default gen_random_uuid();
alter table public.requests add column if not exists request_id text;
alter table public.requests add column if not exists service_type text not null default '';
alter table public.requests add column if not exists customer_name text not null default '';
alter table public.requests add column if not exists phone text not null default '';
alter table public.requests add column if not exists email text not null default '';
alter table public.requests add column if not exists preferred_contact_method text not null default '';
alter table public.requests add column if not exists location text not null default '';
alter table public.requests add column if not exists service_category text not null default '';
alter table public.requests add column if not exists description text not null default '';
alter table public.requests add column if not exists address text not null default '';
alter table public.requests add column if not exists state text not null default '';
alter table public.requests add column if not exists lga text not null default '';
alter table public.requests add column if not exists request_details jsonb not null default '{}'::jsonb;
alter table public.requests add column if not exists created_at timestamptz not null default now();
alter table public.requests add column if not exists updated_at timestamptz not null default now();
alter table public.requests add column if not exists admin_notes text not null default '';
alter table public.requests add column if not exists customer_note text not null default '';
alter table public.requests add column if not exists attachments jsonb not null default '[]'::jsonb;

with numbered_requests as (
  select id,
    format(
      'ABKAB-%s-%s',
      to_char(created_at, 'YYYY'),
      lpad(row_number() over (order by created_at, id)::text, 6, '0')
    ) as generated_request_id
  from public.requests
  where request_id is null
)
update public.requests as requests
set request_id = numbered_requests.generated_request_id
from numbered_requests
where requests.id = numbered_requests.id;
alter table public.requests alter column request_id set not null;

alter table public.requests drop constraint if exists requests_request_id_check;
alter table public.requests add constraint requests_request_id_check check (request_id ~ '^ABKAB-[0-9]{4}-[0-9]{6}$');
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check check (status in ('PENDING','UNDER_REVIEW','PROCESSING','APPROVED','COMPLETED','REJECTED','CANCELLED','NEW','IN_PROGRESS','WAITING_FOR_CUSTOMER'));
do $$
begin
  if exists (select request_id from public.requests group by request_id having count(*) > 1) then
    raise exception 'Cannot enforce unique request_id: duplicate request IDs already exist';
  end if;
end
$$;
do $$
begin
  if not exists (
    select 1
      from pg_index index_metadata
      join pg_class index_table on index_table.oid = index_metadata.indrelid
      join pg_attribute index_column on index_column.attrelid = index_table.oid
        and index_column.attnum = any(index_metadata.indkey)
     where index_table.oid = 'public.requests'::regclass
       and index_metadata.indisunique
       and index_column.attname = 'request_id'
  ) then
    execute 'create unique index requests_request_id_unique_idx on public.requests (request_id)';
  end if;
end
$$;

create sequence if not exists public.request_tracking_number_seq
  minvalue 1
  maxvalue 999999
  no cycle;

-- Start after existing numeric suffixes so a migration cannot reuse an ID.
do $$
declare
  existing_max integer;
begin
  select coalesce(max((substring(request_id from '^ABKAB-[0-9]{4}-([0-9]{6})$'))::integer), 0)
    into existing_max
    from public.requests
   where request_id ~ '^ABKAB-[0-9]{4}-[0-9]{6}$';

  if existing_max > 0 then
    perform setval('public.request_tracking_number_seq', existing_max, true);
  end if;
end
$$;

create or replace function public.generate_tracking_number()
returns text
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public
as $$
declare
  tracking_number text;
begin
  loop
    tracking_number := format(
      'ABKAB-%s-%s',
      to_char(current_date, 'YYYY'),
      lpad(nextval('public.request_tracking_number_seq')::text, 6, '0')
    );

    if not exists (select 1 from public.requests where request_id = tracking_number) then
      return tracking_number;
    end if;
  end loop;
end;
$$;

grant execute on function public.generate_tracking_number() to service_role;
grant usage, select on sequence public.request_tracking_number_seq to service_role;

create index if not exists requests_tracking_idx on public.requests (request_id, email);
create index if not exists requests_customer_name_idx on public.requests (customer_name);
create index if not exists requests_phone_idx on public.requests (phone);
create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_created_at_idx on public.requests (created_at desc);
alter table public.requests enable row level security;
revoke all on public.requests from anon, authenticated;

notify pgrst, 'reload schema';

-- Isolated content tables for the admin CMS. Existing request data is untouched.
create table if not exists public.homepage_content (
  id uuid primary key default gen_random_uuid(), status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED')),
  eyebrow text not null default 'ABKAB SMART SOLUTION', headline text not null default 'Technology, designed to move business forward.',
  body text not null default 'ABKAB builds practical technology, digital experiences and business systems that help organisations work better.',
  primary_cta_text text not null default 'Start a Project', primary_cta_link text not null default 'request.html?service=website',
  secondary_cta_text text not null default 'Explore Services', secondary_cta_link text not null default 'services.html',
  positioning_statement text not null default 'Practical technology, digital experiences and business systems for organisations ready to work better.',
  why_heading text not null default 'A better way to move work forward.', why_description text not null default 'Clear thinking, reliable delivery and technology that earns its place in the business.',
  process_heading text not null default 'A clear route from need to delivery.', process_description text not null default 'We keep the work focused, visible and useful at every stage.',
  final_cta_heading text not null default 'Have a project in mind?', final_cta_description text not null default 'Tell us what needs to work better. We will help define the next step.',
  company_description text not null default 'Practical technology, digital experiences and business systems for organisations ready to work better.',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(), title text not null default '', alt_text text not null default '', src text not null, type text not null default 'image', section text not null default 'GENERAL', status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED')), display_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(), name text not null, category text not null default '', description text not null default '', cover_image text not null default '', additional_image text not null default '', project_url text not null default '', featured boolean not null default false, status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED')), display_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, description text not null default '', image text not null default '', icon text not null default '', status text not null default 'PUBLISHED' check (status in ('DRAFT','PUBLISHED')), display_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(), name text not null unique, value text not null default '', status text not null default 'PUBLISHED' check (status in ('DRAFT','PUBLISHED')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.homepage_content enable row level security; alter table public.media_library enable row level security; alter table public.portfolio_items enable row level security; alter table public.service_categories enable row level security; alter table public.site_settings enable row level security;
revoke all on public.homepage_content, public.media_library, public.portfolio_items, public.service_categories, public.site_settings from anon, authenticated;

insert into public.homepage_content (status) select 'PUBLISHED' where not exists (select 1 from public.homepage_content);
insert into public.service_categories (slug, name, description, display_order) values
  ('web-development','Digital Products','Websites, software and business systems.',1),
  ('networking','Networking & Cloud','Infrastructure, devices and workplace connectivity.',2),
  ('branding','Branding & Creative','Identity and communication materials.',3),
  ('identity','Business & Identity','Registration guidance and business support.',4),
  ('printing','Printing & Production','Print production and document support.',5),
  ('marketing','Digital Growth','Marketing, content, advertising and SEO support.',6)
on conflict (slug) do nothing;

-- CMS section/storage compatibility for installations that execute this file directly.
alter table public.homepage_content add column if not exists section_key text;
alter table public.homepage_content add column if not exists description text not null default '';
alter table public.homepage_content add column if not exists primary_cta_url text not null default '';
alter table public.homepage_content add column if not exists secondary_cta_url text not null default '';
alter table public.homepage_content add column if not exists content text not null default '';
alter table public.homepage_content add column if not exists image_id uuid;
alter table public.homepage_content add column if not exists is_published boolean not null default false;
update public.homepage_content set section_key = 'hero', description = body, primary_cta_url = primary_cta_link, secondary_cta_url = secondary_cta_link, is_published = (status = 'PUBLISHED') where section_key is null;
create unique index if not exists homepage_content_section_key_idx on public.homepage_content(section_key);
create table if not exists public.portfolio_projects (id uuid primary key default gen_random_uuid(), name text not null, category text not null default '', description text not null default '', cover_image text not null default '', additional_image text not null default '', cover_media_id uuid, additional_media_id uuid, project_url text not null default '', is_featured boolean not null default false, is_published boolean not null default false, display_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.media_library add column if not exists file_name text not null default '';
alter table public.media_library add column if not exists storage_path text not null default '';
alter table public.media_library add column if not exists public_url text;
alter table public.media_library add column if not exists media_type text not null default 'image';
alter table public.media_library add column if not exists section_key text;
alter table public.media_library add column if not exists is_active boolean not null default false;
alter table public.media_library add column if not exists display_order integer not null default 0;
alter table public.service_categories add column if not exists media_id uuid;
alter table public.service_categories add column if not exists image text not null default '';
alter table public.service_categories add column if not exists is_published boolean not null default true;
alter table public.service_categories add column if not exists display_order integer not null default 0;
insert into storage.buckets (id, name, public) values ('abkab-media','abkab-media',true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('abkab-request-attachments','abkab-request-attachments',false) on conflict (id) do update set public = false;
alter table public.homepage_content enable row level security; alter table public.media_library enable row level security; alter table public.portfolio_projects enable row level security; alter table public.service_categories enable row level security;
drop policy if exists abkab_public_homepage_read on public.homepage_content; create policy abkab_public_homepage_read on public.homepage_content for select to anon, authenticated using (is_published = true);
drop policy if exists abkab_public_media_read on public.media_library; create policy abkab_public_media_read on public.media_library for select to anon, authenticated using (is_active = true);
drop policy if exists abkab_public_portfolio_read on public.portfolio_projects; create policy abkab_public_portfolio_read on public.portfolio_projects for select to anon, authenticated using (is_published = true);
drop policy if exists abkab_public_services_read on public.service_categories; create policy abkab_public_services_read on public.service_categories for select to anon, authenticated using (is_published = true);
insert into public.homepage_content (section_key, content, is_published) values ('positioning','Practical technology, digital experiences and business systems for organisations ready to work better.',true),('why_abkab','A better way to move work forward.\nClear thinking, reliable delivery and technology that earns its place in the business.',true),('process','A clear route from need to delivery.\nWe keep the work focused, visible and useful at every stage.',true),('final_cta','Have a project in mind?\nTell us what needs to work better. We will help define the next step.',true) on conflict (section_key) do nothing;
drop policy if exists abkab_public_media_objects_read on storage.objects; create policy abkab_public_media_objects_read on storage.objects for select to anon, authenticated using (bucket_id = 'abkab-media');
notify pgrst, 'reload schema';

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
  id uuid primary key default gen_random_uuid(), title text not null default '', alt_text text not null default '', src text not null, type text not null default 'image', section text not null default 'GENERAL', status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
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

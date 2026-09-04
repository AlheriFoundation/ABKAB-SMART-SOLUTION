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

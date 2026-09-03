create extension if not exists pgcrypto;

create sequence if not exists public.request_tracking_sequence;

create or replace function public.generate_tracking_number()
returns text
language plpgsql
as $$
declare
  sequence_value bigint;
begin
  sequence_value := nextval('public.request_tracking_sequence');
  return 'ABKAB-' || to_char(timezone('UTC', now()), 'YYYY') || '-' || lpad(sequence_value::text, 6, '0');
end;
$$;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique check (request_id ~ '^ABKAB-[0-9]{4}-[0-9]{6}$'),
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
  status text not null default 'PENDING' check (status in ('PENDING','UNDER_REVIEW','PROCESSING','APPROVED','COMPLETED','REJECTED','CANCELLED','NEW','IN_PROGRESS','WAITING_FOR_CUSTOMER')),
  admin_notes text not null default '',
  customer_note text not null default ''
);

create index if not exists requests_tracking_idx on public.requests (request_id, email);
create index if not exists requests_customer_name_idx on public.requests (customer_name);
create index if not exists requests_phone_idx on public.requests (phone);
create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_created_at_idx on public.requests (created_at desc);
alter table public.requests enable row level security;
revoke all on public.requests from anon, authenticated;
revoke all on function public.generate_tracking_number() from public;
grant execute on function public.generate_tracking_number() to service_role;

-- Keep an existing deployment aligned with the decimal sequence format above.
alter table public.requests drop constraint if exists requests_request_id_check;
alter table public.requests add constraint requests_request_id_check check (request_id ~ '^ABKAB-[0-9]{4}-[0-9]{6}$');

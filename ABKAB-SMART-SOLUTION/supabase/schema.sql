create extension if not exists pgcrypto;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique check (request_id ~ '^ABKAB-[0-9]{4}-[A-F0-9]{6}$'),
  service_type text not null,
  customer_name text not null,
  phone text not null,
  email text not null,
  preferred_contact_method text not null,
  location text not null default '',
  request_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'NEW' check (status in ('NEW','UNDER_REVIEW','IN_PROGRESS','WAITING_FOR_CUSTOMER','COMPLETED','CANCELLED')),
  admin_notes text not null default ''
);

create index if not exists requests_tracking_idx on public.requests (request_id, email);
alter table public.requests enable row level security;
revoke all on public.requests from anon, authenticated;
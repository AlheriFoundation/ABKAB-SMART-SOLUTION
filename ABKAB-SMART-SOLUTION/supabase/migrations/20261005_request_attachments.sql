-- Request attachments are private Storage objects. Existing request rows/fields are preserved.
alter table public.requests add column if not exists attachments jsonb not null default '[]'::jsonb;
insert into storage.buckets (id, name, public) values ('abkab-request-attachments','abkab-request-attachments',false) on conflict (id) do update set public = false;
notify pgrst, 'reload schema';

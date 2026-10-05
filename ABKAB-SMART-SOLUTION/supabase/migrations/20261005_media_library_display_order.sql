-- Add the ordering field already used by the Admin CMS media listing.
-- Safe to run repeatedly; existing media files and metadata are preserved.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'media_library' and column_name = 'display_order'
  ) then
    alter table public.media_library add column display_order integer not null default 0;
    with ordered_media as (
      select id, row_number() over (order by created_at asc, id asc) - 1 as new_order
      from public.media_library
    )
    update public.media_library as media
       set display_order = ordered_media.new_order
      from ordered_media
     where media.id = ordered_media.id;
  end if;
end $$;

alter table public.media_library alter column display_order set default 0;
update public.media_library set display_order = 0 where display_order is null;
alter table public.media_library alter column display_order set not null;
create index if not exists media_library_display_order_idx
  on public.media_library (display_order asc, created_at desc);

notify pgrst, 'reload schema';

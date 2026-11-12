-- Academy likes
create table if not exists public.academy_video_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  video_id uuid not null references public.academy_videos(id) on delete cascade,
  device_id text not null,
  constraint academy_video_likes_video_device_unique unique (video_id, device_id)
);

create index if not exists idx_academy_video_likes_video_id on public.academy_video_likes(video_id);

alter table public.academy_video_likes enable row level security;

drop policy if exists "academy_video_likes_public_read" on public.academy_video_likes;
create policy "academy_video_likes_public_read"
  on public.academy_video_likes for select
  using (true);

drop policy if exists "academy_video_likes_public_insert" on public.academy_video_likes;
create policy "academy_video_likes_public_insert"
  on public.academy_video_likes for insert
  with check (length(device_id) >= 8);

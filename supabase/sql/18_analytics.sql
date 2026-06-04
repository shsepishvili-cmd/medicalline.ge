-- =========================================
-- 18_analytics.sql
-- First-party page and blog view counters
-- Run in Supabase SQL Editor
-- =========================================

create table if not exists public.analytics_pages (
  path text primary key,
  page_title text,
  total_views bigint not null default 0,
  unique_visitors bigint not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_page_visitors (
  path text not null references public.analytics_pages(path) on delete cascade,
  visitor_hash text not null,
  views bigint not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (path, visitor_hash)
);

create table if not exists public.blog_views (
  slug text primary key,
  total_views bigint not null default 0,
  unique_visitors bigint not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_viewers (
  slug text not null references public.blog_views(slug) on delete cascade,
  visitor_hash text not null,
  views bigint not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (slug, visitor_hash)
);

alter table public.analytics_pages enable row level security;
alter table public.analytics_page_visitors enable row level security;
alter table public.blog_views enable row level security;
alter table public.blog_viewers enable row level security;

drop policy if exists "public_read_analytics_pages" on public.analytics_pages;
drop policy if exists "public_read_blog_views" on public.blog_views;

create policy "public_read_analytics_pages"
on public.analytics_pages
for select
to anon, authenticated
using (true);

create policy "public_read_blog_views"
on public.blog_views
for select
to anon, authenticated
using (true);

create or replace function public.record_page_view(
  p_path text,
  p_page_title text default null,
  p_visitor_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_path text;
  clean_title text;
  clean_visitor text;
  blog_slug text;
  page_total bigint;
  page_unique bigint;
  blog_total bigint;
  blog_unique bigint;
begin
  clean_path := nullif(split_part(coalesce(p_path, ''), '?', 1), '');
  clean_title := nullif(left(coalesce(p_page_title, ''), 240), '');
  clean_visitor := nullif(left(coalesce(p_visitor_hash, ''), 160), '');

  if clean_path is null or clean_path !~ '^/' then
    clean_path := '/';
  end if;

  insert into public.analytics_pages (path, page_title, total_views, unique_visitors, last_viewed_at, updated_at)
  values (clean_path, clean_title, 1, 0, now(), now())
  on conflict (path) do update
  set total_views = public.analytics_pages.total_views + 1,
      page_title = coalesce(excluded.page_title, public.analytics_pages.page_title),
      last_viewed_at = now(),
      updated_at = now();

  if clean_visitor is not null then
    insert into public.analytics_page_visitors (path, visitor_hash, views, first_seen_at, last_seen_at)
    values (clean_path, clean_visitor, 1, now(), now())
    on conflict (path, visitor_hash) do update
    set views = public.analytics_page_visitors.views + 1,
        last_seen_at = now();

    if not exists (
      select 1
      from public.analytics_page_visitors
      where path = clean_path
        and visitor_hash = clean_visitor
        and views > 1
    ) then
      update public.analytics_pages
      set unique_visitors = unique_visitors + 1,
          updated_at = now()
      where path = clean_path;
    end if;
  end if;

  if clean_path ~ '^/blog/[^/]+/?$' then
    blog_slug := split_part(clean_path, '/', 3);

    insert into public.blog_views (slug, total_views, unique_visitors, last_viewed_at, updated_at)
    values (blog_slug, 1, 0, now(), now())
    on conflict (slug) do update
    set total_views = public.blog_views.total_views + 1,
        last_viewed_at = now(),
        updated_at = now();

    if clean_visitor is not null then
      insert into public.blog_viewers (slug, visitor_hash, views, first_seen_at, last_seen_at)
      values (blog_slug, clean_visitor, 1, now(), now())
      on conflict (slug, visitor_hash) do update
      set views = public.blog_viewers.views + 1,
          last_seen_at = now();

      if not exists (
        select 1
        from public.blog_viewers
        where slug = blog_slug
          and visitor_hash = clean_visitor
          and views > 1
      ) then
        update public.blog_views
        set unique_visitors = unique_visitors + 1,
            updated_at = now()
        where slug = blog_slug;
      end if;
    end if;
  end if;

  select total_views, unique_visitors
  into page_total, page_unique
  from public.analytics_pages
  where path = clean_path;

  if blog_slug is not null then
    select total_views, unique_visitors
    into blog_total, blog_unique
    from public.blog_views
    where slug = blog_slug;
  end if;

  return jsonb_build_object(
    'path', clean_path,
    'pageViews', coalesce(page_total, 0),
    'pageVisitors', coalesce(page_unique, 0),
    'blogSlug', blog_slug,
    'blogViews', coalesce(blog_total, 0),
    'blogVisitors', coalesce(blog_unique, 0)
  );
end;
$$;

grant execute on function public.record_page_view(text, text, text) to anon, authenticated;

create index if not exists analytics_pages_total_views_idx on public.analytics_pages (total_views desc);
create index if not exists blog_views_total_views_idx on public.blog_views (total_views desc);
create index if not exists analytics_pages_last_viewed_idx on public.analytics_pages (last_viewed_at desc);

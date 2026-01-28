-- Create a table to store the daily summaries
create table if not exists daily_trends_summary (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date not null unique, -- Prevent multiple entries for the same day
  summary_content text, -- The combined summary from Gemini
  raw_data jsonb, -- Store the original raw RSS data for reference
  line_sent boolean default false -- Track if sent to LINE
);

-- Create a table to store LINE users
create table if not exists line_users (
  user_id text primary key,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_active timestamp with time zone default timezone('utc'::text, now())
);

-- Create a table to store individual stock tracking data
create table if not exists stock_tracking (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  summary_id bigint references daily_trends_summary(id) on delete cascade,
  date date not null,
  symbol text not null,
  name text,
  price numeric,
  change_percent numeric,
  currency text,
  raw_metadata jsonb -- Store full Yahoo Finance object for future analysis
);

-- Enable Row Level Security (RLS)
alter table daily_trends_summary enable row level security;
alter table line_users enable row level security;
alter table stock_tracking enable row level security;

-- Policies for daily_trends_summary
drop policy if exists "Enable read access for all users" on daily_trends_summary;
create policy "Enable read access for all users"
on "public"."daily_trends_summary"
as PERMISSIVE
for SELECT
to public
using (true);

drop policy if exists "Enable all access for backend service" on daily_trends_summary;
create policy "Enable all access for backend service"
on "public"."daily_trends_summary"
for all
using (true)
with check (true);

-- Policies for line_users
drop policy if exists "Enable all access for backend service" on line_users;
create policy "Enable all access for backend service"
on "public"."line_users"
for all
using (true)
with check (true);

-- Policies for stock_tracking
drop policy if exists "Enable read access for all users" on stock_tracking;
create policy "Enable read access for all users"
on "public"."stock_tracking"
as PERMISSIVE
for SELECT
to public
using (true);

drop policy if exists "Enable all access for backend service" on stock_tracking;
create policy "Enable all access for backend service"
on "public"."stock_tracking"
for all
using (true)
with check (true);

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

-- Enable Row Level Security (RLS)
alter table daily_trends_summary enable row level security;
alter table line_users enable row level security;

-- Policies for daily_trends_summary
create policy "Enable read access for all users"
on "public"."daily_trends_summary"
as PERMISSIVE
for SELECT
to public
using (true);

create policy "Enable all access for backend service"
on "public"."daily_trends_summary"
for all
using (true)
with check (true);

-- Policies for line_users
create policy "Enable all access for backend service"
on "public"."line_users"
for all
using (true)
with check (true);

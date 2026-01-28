-- Create a table to store the daily summaries
create table if not exists daily_trends_summary (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date not null unique, -- Prevent multiple entries for the same day
  summary_content text, -- The combined summary from Gemini
  raw_data jsonb, -- Store the original raw RSS data for reference
  line_sent boolean default false -- Track if sent to LINE
);

-- Enable Row Level Security (RLS)
alter table daily_trends_summary enable row level security;

-- Create a policy that allows read access to everyone (public) or specific roles if needed
create policy "Enable read access for all users"
on "public"."daily_trends_summary"
as PERMISSIVE
for SELECT
to public
using (true);

-- Create a policy that allows insert/update only for service role (backend)
-- Since we are using Service Role Key in the backend, we bypass RLS, 
-- but it's good practice to keep RLS enabled.

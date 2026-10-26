-- ============================================================================
-- TriageDesk: Supabase Database Schema
-- Run this script in the Supabase SQL Editor (supabase.com -> Project -> SQL Editor)
-- ============================================================================

-- 1. State & Key-Value store (used by TriageDesk API)
create table if not exists triagedesk_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table triagedesk_state enable row level security;

-- Policy to allow anonymous read and write with your anon key
drop policy if exists "Allow public access to triagedesk_state" on triagedesk_state;
create policy "Allow public access to triagedesk_state"
  on triagedesk_state
  for all
  using (true)
  with check (true);

-- 2. Optional: Relational view for easy querying of complaints in Supabase dashboard
create or replace view triagedesk_complaints_view as
select 
  c->>'id' as id,
  c->>'text' as text,
  c->>'language' as language,
  c->>'category' as category,
  c->>'urgency' as urgency,
  c->>'status' as status
from triagedesk_state,
lateral jsonb_array_elements(case when key = 'complaints' then value else '[]'::jsonb end) as c;

-- 3. Optional: Relational view for easy querying of cases in Supabase dashboard
create or replace view triagedesk_cases_view as
select 
  cs->>'id' as id,
  cs->>'title' as title,
  cs->>'department' as department,
  cs->>'urgency' as urgency,
  cs->>'status' as status,
  cs->>'next_action' as next_action,
  cs->>'draft_reply' as draft_reply,
  jsonb_array_length(coalesce(cs->'complaints', '[]'::jsonb)) as complaint_count
from triagedesk_state,
lateral jsonb_array_elements(case when key = 'cases' then value else '[]'::jsonb end) as cs;

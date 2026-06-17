-- Super CTA Responder — responses table
create table if not exists responses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  company     text,
  role        text,
  interest    text,
  thinglink_content text,   -- which ThingLink embed/scenario they viewed (from URL param)
  source      text,         -- UTM / campaign source (from URL param)
  title       text,
  one_pager_md text,        -- markdown output from Claude
  created_at  timestamptz default now()
);

-- Optional: index for listing by date
create index if not exists responses_created_at_idx on responses (created_at desc);

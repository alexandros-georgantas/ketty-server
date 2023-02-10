create table file_translation
(
  -- base
  id uuid primary key,
  type text not null,
  created timestamp
  with time zone not null default current_timestamp,
  updated timestamp
  with time zone,

  -- ketida base
  deleted boolean default false,

  -- translation
  language_iso text not null,

  -- foreign
  file_id uuid not null references file,

  -- own
  alt text,
  description text,

  -- constraints
  unique
  (file_id, language_iso)
);

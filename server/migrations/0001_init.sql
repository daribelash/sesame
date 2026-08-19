create table users (
  id            uuid primary key,
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table sessions (
  id         uuid primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table gates (
  id         uuid primary key,
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null,
  code       text not null,
  lat        double precision not null,
  lng        double precision not null,
  accuracy   double precision,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table addresses (
  id         uuid primary key,
  gate_id    uuid not null references gates(id) on delete cascade,
  address    text not null,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

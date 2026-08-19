-- Superseded gate codes, retained rather than overwritten (sprint 8). A
-- community rotates its code; the previous one is frequently still live for
-- a while, so it's worth keeping rather than discarding on update.
create table code_history (
  id            uuid primary key,          -- client-generated
  gate_id       uuid not null references gates(id) on delete cascade,
  code          text not null,
  superseded_at timestamptz not null
);

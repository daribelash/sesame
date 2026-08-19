-- A gate can be saved without a GPS fix (permission denied, timeout — see
-- CLAUDE.md sprint 2). The client's Gate type already allows lat/lng to be
-- null; the schema's not-null constraint was wrong from the start and only
-- surfaced once sync actually pushed a fix-less gate to the server.
alter table gates alter column lat drop not null;
alter table gates alter column lng drop not null;

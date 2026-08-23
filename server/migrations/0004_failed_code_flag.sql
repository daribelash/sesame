-- A gate's current code can be flagged as not working. Nullable timestamp
-- (not boolean) matches the existing convention of storing *when* something
-- happened (deleted_at, superseded_at) rather than a bare flag. Auto-clears
-- whenever the gate's code next changes (see repository.ts updateGate).
alter table gates add column failed_at timestamptz;

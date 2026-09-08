-- Chapter provenance: a row may exist (e.g. unit list harvested from a
-- secondary mirror) without being primary-source verified yet. Rows whose
-- source kind is official/publisher get verified = true at seed time; all
-- others stay false until confirmed and refreshed.
ALTER TABLE "Chapter" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;

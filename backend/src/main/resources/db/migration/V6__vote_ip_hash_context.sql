ALTER TABLE votes
    ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS votes_ip_context_unique
    ON votes (ip_hash, is_test_vote)
    WHERE ip_hash IS NOT NULL;

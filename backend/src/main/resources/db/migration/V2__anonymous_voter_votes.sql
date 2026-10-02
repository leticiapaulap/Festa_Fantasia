ALTER TABLE votes
    ADD COLUMN IF NOT EXISTS voter_id UUID,
    ADD COLUMN IF NOT EXISTS is_test_vote BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE votes
    ALTER COLUMN vote_code_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS votes_voter_context_unique
    ON votes (voter_id, is_test_vote)
    WHERE voter_id IS NOT NULL;

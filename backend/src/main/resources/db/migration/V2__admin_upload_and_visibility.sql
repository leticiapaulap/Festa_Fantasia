ALTER TABLE participants
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE event_settings
    ADD COLUMN voting_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT';

ALTER TABLE event_settings
    ADD COLUMN show_public_results BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE event_settings
SET voting_status = CASE WHEN voting_open THEN 'OPEN' ELSE 'DRAFT' END,
    show_public_results = results_public;

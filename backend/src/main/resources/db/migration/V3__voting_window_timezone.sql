ALTER TABLE event_settings
    ADD COLUMN timezone VARCHAR(80) NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE event_settings
    ADD COLUMN voting_end_time TIME;

UPDATE event_settings
SET voting_end_time = CAST(voting_end AS TIME)
WHERE voting_end IS NOT NULL;

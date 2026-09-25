UPDATE event_settings
SET event_name = 'Halloween'
WHERE event_name IN ('Festa à Fantasia', 'Festa Fantasia');

UPDATE event_settings
SET description = 'Sistema de cadastro e votação do Halloween.'
WHERE description = 'Concurso de melhor fantasia da festa.';

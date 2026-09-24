INSERT INTO participants (name, costume_name, description, photo_url)
VALUES
('Letícia', 'Malévola', 'Elegância sombria com chifres icônicos.', NULL),
('João', 'Coringa', 'Caos teatral e maquiagem marcante.', NULL),
('Ana', 'Wandinha', 'Clássica, fria e impecável.', NULL),
('Pedro', 'Harry Potter', 'Bruxo pronto para a noite mágica.', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO vote_codes (code)
VALUES ('FESTA-A7X92'), ('FESTA-K82P1'), ('FESTA-M91QD'), ('FESTA-DEMO1')
ON CONFLICT DO NOTHING;

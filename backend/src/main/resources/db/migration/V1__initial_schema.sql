CREATE TABLE participants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    costume_name VARCHAR(120) NOT NULL,
    description VARCHAR(1000),
    photo_url VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE vote_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE votes (
    id BIGSERIAL PRIMARY KEY,
    participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    vote_code_id BIGINT NOT NULL UNIQUE REFERENCES vote_codes(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE event_settings (
    id BIGSERIAL PRIMARY KEY,
    event_name VARCHAR(160) NOT NULL,
    title VARCHAR(180) NOT NULL,
    description VARCHAR(500),
    event_date DATE,
    event_time TIME,
    voting_open BOOLEAN NOT NULL DEFAULT FALSE,
    registration_open BOOLEAN NOT NULL DEFAULT TRUE,
    results_public BOOLEAN NOT NULL DEFAULT FALSE,
    voting_start TIMESTAMP WITH TIME ZONE,
    voting_end TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO event_settings (event_name, title, description, voting_open, registration_open, results_public)
VALUES ('Festa à Fantasia', 'Qual será a melhor fantasia da noite?', 'Concurso de melhor fantasia da festa.', FALSE, TRUE, FALSE);

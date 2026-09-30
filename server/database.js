const { Pool } = require('pg');
const { httpError } = require('./http');

let pool;
let schemaReady;

function getPool() {
  if (!pool) {
    const connectionString = databaseUrl();
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return pool;
}

function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw httpError(500, 'DATABASE_URL não configurada.');
  if (!raw.startsWith('jdbc:postgresql://')) return raw;
  const url = new URL(raw.replace('jdbc:postgresql://', 'postgresql://'));
  if (process.env.DATABASE_USERNAME) url.username = process.env.DATABASE_USERNAME;
  if (process.env.DATABASE_PASSWORD) url.password = process.env.DATABASE_PASSWORD;
  return url.toString();
}

async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const client = await getPool().connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS participants (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          costume_name VARCHAR(120) NOT NULL,
          description VARCHAR(1000),
          photo_url VARCHAR(1000),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS vote_codes (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(40) NOT NULL UNIQUE,
          used BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          used_at TIMESTAMP WITH TIME ZONE
        );
        CREATE TABLE IF NOT EXISTS votes (
          id BIGSERIAL PRIMARY KEY,
          participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
          vote_code_id BIGINT NOT NULL UNIQUE REFERENCES vote_codes(id) ON DELETE RESTRICT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS event_settings (
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
        CREATE TABLE IF NOT EXISTS admin_users (
          id BIGSERIAL PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          email VARCHAR(160) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        ALTER TABLE participants ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS voting_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT';
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS show_public_results BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS timezone VARCHAR(80) NOT NULL DEFAULT 'America/Sao_Paulo';
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS voting_end_time TIME;
      `);
      await client.query(`
        INSERT INTO event_settings (
          id, event_name, title, description, voting_open, registration_open,
          results_public, voting_status, show_public_results, timezone
        )
        VALUES (
          1, 'Halloween', 'Qual será a melhor fantasia da noite?',
          'Sistema de cadastro e votação do Halloween.', FALSE, TRUE,
          FALSE, 'DRAFT', FALSE, 'America/Sao_Paulo'
        )
        ON CONFLICT (id) DO NOTHING
      `);
      await client.query(`
        UPDATE event_settings
        SET event_name = 'Halloween'
        WHERE event_name IN ('Festa à Fantasia', 'Festa Fantasia')
      `);
    } finally {
      client.release();
    }
  })();
  return schemaReady;
}

async function scalar(query, params = []) {
  const { rows } = await getPool().query(query, params);
  return Number(rows[0]?.total || 0);
}

module.exports = { ensureSchema, getPool, scalar };

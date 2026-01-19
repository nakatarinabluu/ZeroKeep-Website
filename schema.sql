-- Table: vault_shards_a
CREATE TABLE IF NOT EXISTS vault_shards_a (
  id UUID PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  title_hash TEXT NOT NULL,
  content_a TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: crash_logs
CREATE TABLE IF NOT EXISTS crash_logs (
  id SERIAL PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  device TEXT NOT NULL,
  thread TEXT,
  exception TEXT,
  stacktrace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

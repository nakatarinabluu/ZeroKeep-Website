-- Table: vault_shards_a
CREATE TABLE IF NOT EXISTS vault_shards_a (
  id UUID PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  content_a TEXT NOT NULL,
  iv TEXT NOT NULL,
  order_index INT DEFAULT 0,
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

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,       -- e.g., 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'VIEW_VAULT'
  actor_ip TEXT NOT NULL,     -- IP Address of the user
  status TEXT NOT NULL,       -- 'SUCCESS', 'FAILURE', 'WARNING'
  metadata TEXT,              -- JSON string for extra details (e.g., failed password attempt count)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
 code TEXT PRIMARY KEY, host_hash TEXT NOT NULL, label TEXT NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
 session_code TEXT NOT NULL REFERENCES sessions(code) ON DELETE CASCADE,
 author_hash TEXT NOT NULL, name TEXT NOT NULL, title TEXT NOT NULL,
 script TEXT NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(session_code, author_hash)
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS limits_expiry ON rate_limits(expires_at);

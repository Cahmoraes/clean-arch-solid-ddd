-- database: ../database/app.db
-- DROP TABLE "users";
-- Tabela users
CREATE TABLE IF NOT EXISTS
  users (
    id TEXT PRIMARY KEY DEFAULT (
      lower(
        hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))
      )
    ),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    role TEXT CHECK (role IN ('ADMIN', 'MEMBER')) NOT NULL DEFAULT 'MEMBER',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK (status IN ('activated', 'suspended')) NOT NULL DEFAULT 'activated',
    billing_customer_id TEXT UNIQUE
  ) WITHOUT ROWID,
  STRICT;

-- Tabela gyms
CREATE TABLE IF NOT EXISTS
  gyms (
    id TEXT PRIMARY KEY DEFAULT (uuid ()),
    cnpj TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    phone TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

-- Tabela check_ins
CREATE TABLE IF NOT EXISTS
  check_ins (
    id TEXT PRIMARY KEY DEFAULT (
      lower(
        hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))
      )
    ),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    validated_at TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    user_id TEXT NOT NULL,
    gym_id TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (gym_id) REFERENCES gyms (id)
  ) WITHOUT ROWID,
  STRICT;

-- Tabela subscriptions
CREATE TABLE IF NOT EXISTS
  subscriptions (
    id TEXT PRIMARY KEY DEFAULT (
      lower(
        hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))
      )
    ),
    user_id TEXT NOT NULL,
    billing_subscription_id TEXT UNIQUE NOT NULL,
    status TEXT CHECK (
      status IN (
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'trialing',
        'unpaid'
      )
    ) NOT NULL DEFAULT 'incomplete',
    canceled_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
  ) WITHOUT ROWID,
  STRICT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins (user_id);

CREATE INDEX IF NOT EXISTS idx_check_ins_gym_id ON check_ins (gym_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);

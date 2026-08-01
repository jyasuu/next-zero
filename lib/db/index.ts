import { Pool } from "pg"

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    permissions TEXT NOT NULL DEFAULT '[]',
    policies TEXT NOT NULL DEFAULT '[]',
    user_count INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions (user_email, updated_at);`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    parts_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id);`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    user_email TEXT PRIMARY KEY,
    custom_prompt TEXT NOT NULL DEFAULT ''
  );`,
  `INSERT INTO roles (id, name, description, permissions, policies, user_count) VALUES
    ('1', 'Admin', 'Full system access', '["read","write","delete","manage_users","manage_roles"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","users:Write","users:Create","users:Delete","users:Manage","roles:Read","roles:Manage","audit:Read","api-keys:Read","api-keys:Manage","reports:Read","reports:Export","settings:Read","system:Read","notifications:Read"]}]}]', 3),
    ('2', 'Editor', 'Can create and edit content', '["read","write"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","audit:Read","reports:Read","settings:Read","notifications:Read"]}]}]', 4),
    ('3', 'Viewer', 'Read-only access', '["read"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","reports:Read"]}]}]', 5),
    ('4', 'Auditor', 'Access to audit logs and reports', '["read","export"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","audit:Read","reports:Read","reports:Export"]}]}]', 0)
  ON CONFLICT (id) DO NOTHING;`,
  `INSERT INTO users (id, name, email, role, status, created_at) VALUES
    ('1', 'Alice Johnson', 'alice@example.com', 'Admin', 'active', '2024-01-15'),
    ('2', 'Bob Smith', 'bob@example.com', 'Editor', 'active', '2024-02-20'),
    ('3', 'Carol Williams', 'carol@example.com', 'Viewer', 'active', '2024-03-10'),
    ('4', 'Dave Brown', 'dave@example.com', 'Admin', 'inactive', '2024-03-15'),
    ('5', 'Eve Davis', 'eve@example.com', 'Editor', 'active', '2024-04-01'),
    ('6', 'Frank Miller', 'frank@example.com', 'Viewer', 'active', '2024-04-15'),
    ('7', 'Grace Wilson', 'grace@example.com', 'Admin', 'active', '2024-05-01'),
    ('8', 'Hank Moore', 'hank@example.com', 'Editor', 'inactive', '2024-05-20'),
    ('9', 'Ivy Taylor', 'ivy@example.com', 'Viewer', 'active', '2024-06-01'),
    ('10', 'Jack Anderson', 'jack@example.com', 'Editor', 'active', '2024-06-15'),
    ('11', 'Karen Thomas', 'karen@example.com', 'Viewer', 'active', '2024-07-01'),
    ('12', 'Leo Garcia', 'leo@example.com', 'Auditor', 'active', '2024-07-15')
  ON CONFLICT (id) DO NOTHING;`,
]

let pool: Pool | null = null
let schemaReady: Promise<void> | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Point it at a Postgres database (e.g. docker compose up postgres)."
      )
    }
    pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 10_000,
    })
    pool.on("error", (err) => {
      console.error("Unexpected error on idle Postgres client:", err)
    })
  }
  return pool
}

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getPool()
      for (const statement of SCHEMA_STATEMENTS) {
        await db.query(statement)
      }
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  return schemaReady
}

async function withSchema<T>(fn: () => Promise<T>): Promise<T> {
  await ensureSchema()
  return fn()
}

export type SqlParams = (string | number | boolean | null)[]

export async function queryAll(
  sql: string,
  params: SqlParams = []
): Promise<Record<string, unknown>[]> {
  return withSchema(async () => {
    const result = await getPool().query(sql, params)
    return result.rows
  })
}

export async function queryRow(
  sql: string,
  params: SqlParams = []
): Promise<Record<string, unknown> | null> {
  const rows = await queryAll(sql, params)
  return rows[0] ?? null
}

export async function run(
  sql: string,
  params: SqlParams = []
): Promise<{ rowCount: number }> {
  return withSchema(async () => {
    const result = await getPool().query(sql, params)
    return { rowCount: result.rowCount ?? 0 }
  })
}

import initSqlJs, { type SqlJsStatic, type Database } from "sql.js"
import path from "path"
import fs from "fs"
import os from "os"

const DB_PATH =
  process.env.DATABASE_URL ||
  (process.env.VERCEL === "1"
    ? path.join(os.tmpdir(), "data", "app.db")
    : path.join(process.cwd(), "data", "app.db"))

const SQL_WASM_PATH = path.join(process.cwd(), "lib", "db", "sql-wasm.wasm")

let db: Database | null = null
let dbPromise: Promise<Database> | null = null

const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    permissions TEXT NOT NULL DEFAULT '[]',
    policies TEXT NOT NULL DEFAULT '[]',
    user_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, run_at TEXT NOT NULL);`,

  `DELETE FROM users;
  DELETE FROM roles;
  INSERT INTO roles (id, name, description, permissions, policies, user_count) VALUES
    ('1', 'Admin', 'Full system access', '["read","write","delete","manage_users","manage_roles"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","users:Write","users:Create","users:Delete","users:Manage","roles:Read","roles:Manage","audit:Read","api-keys:Read","api-keys:Manage","reports:Read","reports:Export","settings:Read","system:Read","notifications:Read"]}]}]', 3),
    ('2', 'Editor', 'Can create and edit content', '["read","write"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","audit:Read","reports:Read","settings:Read","notifications:Read"]}]}]', 4),
    ('3', 'Viewer', 'Read-only access', '["read"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","reports:Read"]}]}]', 5),
    ('4', 'Auditor', 'Access to audit logs and reports', '["read","export"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","audit:Read","reports:Read","reports:Export"]}]}]', 0);
  INSERT INTO users (id, name, email, role, status, created_at) VALUES
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
    ('12', 'Leo Garcia', 'leo@example.com', 'Auditor', 'active', '2024-07-15');`,

  `UPDATE roles SET policies = '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","audit:Read","reports:Read","settings:Read","notifications:Read"]}]}]' WHERE name = 'Editor' AND policies NOT LIKE '%audit:Read%';`,

  `-- grant users:Read to the Viewer role
  UPDATE roles SET policies = '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","reports:Read"]}]}]' WHERE name = 'Viewer' AND policies NOT LIKE '%users:Read%';`,

  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions (user_email, updated_at);
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    parts_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id);
  CREATE TABLE IF NOT EXISTS user_settings (
    user_email TEXT PRIMARY KEY,
    custom_prompt TEXT NOT NULL DEFAULT ''
  );`,
]

export function save(database: Database) {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DB_PATH, Buffer.from(database.export()))
}

export function queryAll(db: Database, sql: string, params: (string | number | null)[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

export function queryRow(db: Database, sql: string, params: (string | number | null)[] = []): Record<string, unknown> | null {
  const rows = queryAll(db, sql, params)
  return rows.length > 0 ? rows[0] : null
}

export function getDb(): Promise<Database> {
  if (db) return Promise.resolve(db)
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL: SqlJsStatic = await initSqlJs({
        wasmBinary: fs.readFileSync(SQL_WASM_PATH),
      })
      const dir = path.dirname(DB_PATH)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const next = fs.existsSync(DB_PATH)
        ? new SQL.Database(fs.readFileSync(DB_PATH))
        : new SQL.Database()

      const hasMigrationsTable = queryAll(next, "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'", []).length > 0
      const runSet = new Set(
        hasMigrationsTable
          ? queryAll(next, "SELECT name FROM _migrations", []).map(r => r.name as string)
          : []
      )

      for (const sql of MIGRATIONS) {
        const name = sql.slice(0, 40)
        if (runSet.has(name)) continue
        next.run(sql)
        next.run("INSERT INTO _migrations (name, run_at) VALUES (?, datetime('now'))", [name])
      }

      save(next)
      db = next
      return db
    })()
    dbPromise.catch(() => {
      dbPromise = null
    })
  }
  return dbPromise
}

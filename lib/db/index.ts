import initSqlJs, { type SqlJsStatic, type Database } from "sql.js"
import path from "path"
import fs from "fs"

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "data", "app.db")

let db: Database | null = null

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
    ('2', 'Editor', 'Can create and edit content', '["read","write"]', '[{"Version":"1","Statement":[{"Effect":"Allow","Action":["dashboard:Read","users:Read","reports:Read","settings:Read","notifications:Read"]}]}]', 4),
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
]

function save(database: Database) {
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

export async function getDb(): Promise<Database> {
  if (db) return db
  const SQL: SqlJsStatic = await initSqlJs({
    locateFile: (file: string) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  })
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  const existing = queryAll(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'", [])
  const runSet = new Set(existing.length > 0 ? existing.map(r => r.name as string) : [])

  for (const sql of MIGRATIONS) {
    const name = sql.slice(0, 40)
    if (runSet.has(name)) continue
    db.run(sql)
    db.run("INSERT INTO _migrations (name, run_at) VALUES (?, datetime('now'))", [name])
  }

  save(db)
  return db
}

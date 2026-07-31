declare module "sql.js" {
  interface QueryExecResult {
    columns: string[]
    values: (string | number | null)[][]
  }
  interface Statement {
    bind(params?: (string | number | null)[]): boolean
    step(): boolean
    getAsObject(): Record<string, string | number | null>
    free(): void
    reset(): void
  }
  interface Database {
    run(sql: string, params?: (string | number | null)[]): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }
  interface InitSqlJsConfig {
    locateFile?: (file: string) => string
    wasmBinary?: ArrayBuffer | Uint8Array
  }
  export type { Database, SqlJsStatic, Statement, QueryExecResult }
  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>
}

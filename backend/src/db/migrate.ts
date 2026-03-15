import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { sql } from './client'

const migrationsDir = path.resolve(import.meta.dir, 'migrations')

const ensureMigrationsTable = async () => {
  await sql`
    create table if not exists schema_migrations (
      id bigserial primary key,
      filename text not null unique,
      executed_at timestamptz not null default now()
    )
  `
}

const run = async () => {
  await ensureMigrationsTable()

  const files = (await readdir(migrationsDir))
    .filter((filename) => filename.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('No migrations found.')
    return
  }

  for (const filename of files) {
    const alreadyApplied = await sql<{ filename: string }[]>`
      select filename
      from schema_migrations
      where filename = ${filename}
      limit 1
    `

    if (alreadyApplied.length > 0) {
      continue
    }

    const fullPath = path.join(migrationsDir, filename)
    const content = await Bun.file(fullPath).text()

    await sql.begin(async (tx) => {
      await tx.unsafe(content)
      await tx.unsafe('insert into schema_migrations (filename) values ($1)', [filename])
    })

    console.log(`Applied migration: ${filename}`)
  }
}

run()
  .then(async () => {
    console.log('Migrations complete.')
    await sql.end({ timeout: 5 })
  })
  .catch(async (error) => {
    console.error('Migration failed:', error)
    await sql.end({ timeout: 5 })
    process.exit(1)
  })

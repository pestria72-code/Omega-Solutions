// node-pg-migrate configuration
// Loaded automatically by `npm run migrate` and related scripts.
const config = {
  schema: 'public',
  dir: 'src/migrations',
  direction: 'up' as const,
  migrationsTable: 'pgmigrations',
  verbose: true,
};

export default config;

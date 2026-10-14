/*
# Enable PostgreSQL Extensions

1. Extensions
- `uuid-ossp` — provides uuid_generate_v4() for default UUID primary keys
- `citext` — case-insensitive text type for email columns
2. Security
- No security changes (extensions only)
3. Notes
- Both extensions are available on Supabase by default
- Safe to run multiple times (IF NOT EXISTS)
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

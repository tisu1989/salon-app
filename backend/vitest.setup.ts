// Runs before any test file (and before env.ts's own `import "dotenv/config"`)
// so DATABASE_URL/REDIS_URL/etc. point at the test database/Redis DB, not dev's.
// dotenv never overrides a variable that's already set in process.env, which is
// exactly what makes this override - rather than get overridden by - work.
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

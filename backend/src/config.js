// Reads .env (if present) into process.env, then exposes settings.
try {
  process.loadEnvFile();
} catch {
  // No .env file: defaults below apply.
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  dbPath: process.env.DB_PATH || './data/recruiter-bot.db',
};

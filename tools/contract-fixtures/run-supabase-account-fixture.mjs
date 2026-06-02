import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = path.join(rootDir, "supabase", "migrations", "202605300012_superior_account_spores.sql");
const functionPath = path.join(rootDir, "supabase", "functions", "account", "index.ts");

for (const filePath of [migrationPath, functionPath]) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing Supabase account file: ${filePath}`);
  }
}

const migration = readFileSync(migrationPath, "utf8");
const edgeFunction = readFileSync(functionPath, "utf8");

for (const token of [
  "create table if not exists public.profiles",
  "create table if not exists public.bot_spores",
  "create table if not exists public.account_connections",
  "provider in ('google', 'x')",
  "auth_providers text[]",
  "enable row level security",
  "auth.uid() = user_id",
  "grant select, insert, update"
]) {
  if (!migration.includes(token)) {
    throw new Error(`Supabase migration missing expected account/RLS token: ${token}`);
  }
}

for (const token of [
  "/start-email-code",
  "/start-oauth",
  "/verify-email-code",
  "/profile",
  "/spore",
  "SUPABASE_PUBLISHABLE_KEY",
  "signInWithOtp",
  "signInWithOAuth",
  "verifyOtp",
  "provider: oauthProvider",
  "\"google\"",
  "\"x\"",
  "account_connections"
]) {
  if (!edgeFunction.includes(token)) {
    throw new Error(`Supabase Edge Function missing expected route/auth token: ${token}`);
  }
}

if (edgeFunction.includes("SERVICE_ROLE") || edgeFunction.includes("service_role")) {
  throw new Error("Account Edge Function must not require or expose a service role key for this alpha pass.");
}

console.log("SUPERIOR Supabase account fixture passed.");

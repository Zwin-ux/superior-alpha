import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  SuperiorAccountOAuthProvider,
  SuperiorAccountProfile,
  SuperiorAccountSession,
  superiorAccountOAuthProviders
} from "@clawdbot/shared";
import { getSuperiorStateDirectory } from "./localPaths.js";

export interface StoredAccountState {
  session: SuperiorAccountSession | null;
  profile: SuperiorAccountProfile | null;
  pendingProvider: SuperiorAccountOAuthProvider | null;
}

const EMPTY_ACCOUNT_STATE: StoredAccountState = {
  session: null,
  profile: null,
  pendingProvider: null
};

export function readStoredAccountState(): StoredAccountState {
  const filePath = getStoredAccountFilePath();

  try {
    if (!existsSync(filePath)) {
      return EMPTY_ACCOUNT_STATE;
    }

    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<StoredAccountState>;

    return normalizeStoredAccountState(parsed);
  } catch {
    return EMPTY_ACCOUNT_STATE;
  }
}

export function writeStoredAccountSession(input: {
  session: SuperiorAccountSession;
  profile: SuperiorAccountProfile;
}): StoredAccountState {
  return writeStoredAccountState({
    ...readStoredAccountState(),
    session: input.session,
    profile: normalizeProfile(input.profile),
    pendingProvider: null
  });
}

export function writePendingAccountProvider(
  provider: SuperiorAccountOAuthProvider | null
): StoredAccountState {
  return writeStoredAccountState({
    ...readStoredAccountState(),
    pendingProvider: provider
  });
}

export function clearStoredAccountSession(): StoredAccountState {
  return writeStoredAccountState({
    session: null,
    profile: null,
    pendingProvider: null
  });
}

function writeStoredAccountState(state: StoredAccountState): StoredAccountState {
  const normalized = normalizeStoredAccountState(state);
  const filePath = getStoredAccountFilePath();

  mkdirSync(dirname(filePath), {
    recursive: true
  });
  writeFileSync(filePath, JSON.stringify(normalized, null, 2), "utf8");

  return normalized;
}

function normalizeStoredAccountState(state: Partial<StoredAccountState>): StoredAccountState {
  const pendingProvider = superiorAccountOAuthProviders.includes(
    state.pendingProvider as SuperiorAccountOAuthProvider
  )
    ? (state.pendingProvider as SuperiorAccountOAuthProvider)
    : null;

  return {
    session: normalizeSession(state.session),
    profile: normalizeProfile(state.profile),
    pendingProvider
  };
}

function normalizeSession(session: unknown): SuperiorAccountSession | null {
  if (!session || typeof session !== "object") {
    return null;
  }

  const candidate = session as Partial<SuperiorAccountSession>;

  if (
    candidate.type !== "superior-account-session" ||
    typeof candidate.userId !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.accessToken !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  const provider =
    candidate.provider === "email-code" ||
    superiorAccountOAuthProviders.includes(candidate.provider as SuperiorAccountOAuthProvider)
      ? candidate.provider
      : undefined;
  const expiresAt = typeof candidate.expiresAt === "number" ? candidate.expiresAt : undefined;

  return {
    type: "superior-account-session",
    userId: candidate.userId,
    email: candidate.email,
    ...(provider ? { provider } : {}),
    accessToken: candidate.accessToken,
    ...(expiresAt ? { expiresAt } : {}),
    createdAt: candidate.createdAt
  };
}

function normalizeProfile(profile: unknown): SuperiorAccountProfile | null {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const candidate = profile as Partial<SuperiorAccountProfile>;

  if (
    candidate.type !== "superior-account-profile" ||
    typeof candidate.userId !== "string" ||
    typeof candidate.handle !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.updatedAt !== "string"
  ) {
    return null;
  }

  const connectedProviders = Array.isArray(candidate.connectedProviders)
    ? candidate.connectedProviders.filter((provider): provider is SuperiorAccountOAuthProvider =>
        superiorAccountOAuthProviders.includes(provider as SuperiorAccountOAuthProvider)
      )
    : undefined;

  return {
    type: "superior-account-profile",
    userId: candidate.userId,
    ...(typeof candidate.email === "string" ? { email: candidate.email } : {}),
    handle: candidate.handle,
    ...(typeof candidate.avatarUrl === "string" ? { avatarUrl: candidate.avatarUrl } : {}),
    ...(connectedProviders ? { connectedProviders } : {}),
    ...(typeof candidate.activeSporeId === "string" ? { activeSporeId: candidate.activeSporeId } : {}),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt
  };
}

function getStoredAccountFilePath(): string {
  return join(getSuperiorStateDirectory(), "account-state.json");
}

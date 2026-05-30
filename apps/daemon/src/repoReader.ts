import {
  RepoPermissionProfile,
  RepoPlaygroundKind,
  RepoProjectSurface,
  RepoReaderEnvironmentStep,
  RepoReaderPlayground,
  RepoReaderRequest,
  RepoReaderResult,
  RepoReaderStructureItem,
  RepoReaderSurfaceSignal
} from "@clawdbot/shared";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface GithubRepoRef {
  owner: string;
  repo: string;
  canonicalUrl: string;
}

interface GithubRepositoryPayload {
  full_name?: string;
  description?: string | null;
  default_branch?: string;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  license?: {
    spdx_id?: string | null;
    name?: string | null;
  } | null;
  updated_at?: string;
}

interface GithubContentPayload {
  name?: string;
  path?: string;
  type?: string;
  size?: number;
  content?: string;
  encoding?: string;
}

interface PackageJsonSignal {
  name?: string;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  main?: string;
  module?: string;
  types?: string;
  exports?: unknown;
  bin?: string | Record<string, string>;
}

interface ScannedPackageJson {
  path: string;
  packageJson: PackageJsonSignal;
}

interface GithubDirectoryScan {
  path: string;
  items: GithubContentPayload[];
}

export class RepoReaderError extends Error {
  constructor(
    readonly code: "bad_request" | "not_found" | "rate_limited" | "network_error",
    message: string
  ) {
    super(message);
  }
}

export function parseGithubRepoUrl(repoUrl: string): GithubRepoRef | null {
  const trimmed = repoUrl.trim();
  const sshMatch = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(trimmed);

  if (sshMatch?.[1] && sshMatch[2]) {
    return toRepoRef(sshMatch[1], sshMatch[2]);
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) {
    return null;
  }

  const [owner, repo] = url.pathname.split("/").filter(Boolean);

  if (!owner || !repo) {
    return null;
  }

  return toRepoRef(owner, repo);
}

export async function runRepoReader(request: RepoReaderRequest, fetcher: FetchLike = fetch): Promise<RepoReaderResult> {
  const repoRef = parseGithubRepoUrl(request.repoUrl);

  if (!repoRef) {
    throw new RepoReaderError("bad_request", "Give SUPERIOR a GitHub repo link.");
  }

  const repository = await fetchGithubJson<GithubRepositoryPayload>(
    `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}`,
    fetcher
  );
  const defaultBranch = repository.default_branch || "main";
  const rootContents = await fetchGithubJson<GithubContentPayload[]>(
    `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/contents?ref=${encodeURIComponent(defaultBranch)}`,
    fetcher
  );
  const rootItems = Array.isArray(rootContents) ? rootContents : [];
  const directoryScans = await scanProjectDirectories(repoRef, defaultBranch, rootItems, fetcher);
  const allItems = dedupeContentItems([...rootItems, ...directoryScans.flatMap((scan) => scan.items)]);
  const readmeText = await fetchOptionalReadme(repoRef, defaultBranch, fetcher);
  const packageJsons = await fetchScannedPackageJsons(repoRef, defaultBranch, allItems, fetcher);
  const stack = detectStack(repository, allItems, packageJsons);
  const structure = describeStructure(allItems);
  const entrypoints = describeEntrypoints(rootItems, allItems, packageJsons, readmeText);
  const risks = describeRisks(repository, rootItems, allItems, packageJsons, readmeText);
  const presentation = detectPresentation(rootItems, allItems, packageJsons, readmeText);
  const environment = recommendEnvironment(presentation.primary, rootItems, allItems, packageJsons, presentation.surfaceMap);
  const playground = recommendPlayground(presentation.primary, presentation.surfaces, environment.steps, packageJsons, presentation.surfaceMap);
  const title = repository.full_name || `${repoRef.owner}/${repoRef.repo}`;

  return {
    type: "repo-reader-result",
    requestId: request.requestId,
    source: {
      url: repoRef.canonicalUrl,
      title
    },
    repository: {
      owner: repoRef.owner,
      name: repoRef.repo,
      defaultBranch,
      description: repository.description ?? "",
      primaryLanguage: repository.language ?? "Unknown",
      stars: repository.stargazers_count ?? 0,
      forks: repository.forks_count ?? 0,
      license: repository.license?.spdx_id || repository.license?.name || "Unknown",
      updatedAt: repository.updated_at ?? ""
    },
    presentation,
    environment,
    playground,
    summary: buildSummary(title, repository, stack, risks, presentation.primary, playground.label),
    stack,
    entrypoints,
    structure,
    risks,
    nextMoves: buildNextMoves(rootItems, allItems, packageJsons, playground),
    playLoop: playground.primaryLoop,
    createdAt: new Date().toISOString()
  };
}

function toRepoRef(owner: string, rawRepo: string): GithubRepoRef {
  const repo = rawRepo.replace(/\.git$/i, "");

  return {
    owner,
    repo,
    canonicalUrl: `https://github.com/${owner}/${repo}`
  };
}

async function fetchGithubJson<T>(url: string, fetcher: FetchLike): Promise<T> {
  let response: Response;

  try {
    response = await fetcher(url, {
      headers: createGithubHeaders()
    });
  } catch {
    throw new RepoReaderError("network_error", "SUPERIOR could not reach GitHub.");
  }

  if (response.status === 404) {
    throw new RepoReaderError("not_found", "GitHub repo was not found.");
  }

  if (response.status === 403 || response.status === 429) {
    throw new RepoReaderError("rate_limited", "GitHub rate-limited this repo read. Add GITHUB_TOKEN locally or try later.");
  }

  if (!response.ok) {
    throw new RepoReaderError("network_error", `GitHub returned ${response.status}.`);
  }

  return (await response.json()) as T;
}

function createGithubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "SUPERIOR-Alpha",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function fetchOptionalReadme(
  repoRef: GithubRepoRef,
  defaultBranch: string,
  fetcher: FetchLike
): Promise<string> {
  try {
    const readme = await fetchGithubJson<GithubContentPayload>(
      `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/readme?ref=${encodeURIComponent(defaultBranch)}`,
      fetcher
    );

    return decodeGithubContent(readme);
  } catch {
    return "";
  }
}

async function scanProjectDirectories(
  repoRef: GithubRepoRef,
  defaultBranch: string,
  rootItems: GithubContentPayload[],
  fetcher: FetchLike
): Promise<GithubDirectoryScan[]> {
  const firstPassPaths = selectFirstPassPaths(rootItems);
  const firstPassScans = await Promise.all(
    firstPassPaths.map((path) => fetchOptionalDirectory(repoRef, defaultBranch, path, fetcher))
  );
  const secondPassPaths = selectSecondPassPaths(firstPassScans);
  const secondPassScans = await Promise.all(
    secondPassPaths.map((path) => fetchOptionalDirectory(repoRef, defaultBranch, path, fetcher))
  );

  return [...firstPassScans, ...secondPassScans].filter((scan) => scan.items.length > 0);
}

function selectFirstPassPaths(rootItems: GithubContentPayload[]): string[] {
  const usefulNames = new Set([
    ".github",
    "api",
    "app",
    "apps",
    "cli",
    "daemon",
    "desktop",
    "docs",
    "examples",
    "extension",
    "extensions",
    "packages",
    "server",
    "src",
    "web"
  ]);

  return rootItems
    .filter((item) => item.type === "dir" && item.name && usefulNames.has(item.name.toLowerCase()) && item.path)
    .map((item) => item.path as string)
    .slice(0, 10);
}

function selectSecondPassPaths(scans: GithubDirectoryScan[]): string[] {
  const expandableParents = new Set(["apps", "packages", "examples", "extensions"]);

  return scans
    .filter((scan) => expandableParents.has(scan.path.toLowerCase()))
    .flatMap((scan) => scan.items)
    .filter((item) => item.type === "dir" && item.path)
    .map((item) => item.path as string)
    .slice(0, 14);
}

async function fetchOptionalDirectory(
  repoRef: GithubRepoRef,
  defaultBranch: string,
  path: string,
  fetcher: FetchLike
): Promise<GithubDirectoryScan> {
  try {
    const items = await fetchGithubJson<GithubContentPayload[]>(
      `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/contents/${encodeGithubPath(path)}?ref=${encodeURIComponent(defaultBranch)}`,
      fetcher
    );

    return {
      path,
      items: Array.isArray(items) ? items : []
    };
  } catch {
    return {
      path,
      items: []
    };
  }
}

async function fetchScannedPackageJsons(
  repoRef: GithubRepoRef,
  defaultBranch: string,
  allItems: GithubContentPayload[],
  fetcher: FetchLike
): Promise<ScannedPackageJson[]> {
  const packagePaths = allItems
    .filter((item) => item.type === "file" && item.name === "package.json" && item.path)
    .map((item) => item.path as string)
    .slice(0, 16);
  const scans = await Promise.all(
    packagePaths.map(async (packagePath): Promise<ScannedPackageJson | null> => {
      try {
        const packageContent = await fetchGithubJson<GithubContentPayload>(
          `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/contents/${encodeGithubPath(packagePath)}?ref=${encodeURIComponent(defaultBranch)}`,
          fetcher
        );
        const packageText = decodeGithubContent(packageContent);

        return {
          path: getPackageDirectory(packagePath),
          packageJson: JSON.parse(packageText) as PackageJsonSignal
        };
      } catch {
        return null;
      }
    })
  );

  return scans.filter((scan): scan is ScannedPackageJson => Boolean(scan));
}

function encodeGithubPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function getPackageDirectory(packagePath: string): string {
  const slashIndex = packagePath.lastIndexOf("/");

  return slashIndex === -1 ? "." : packagePath.slice(0, slashIndex);
}

function decodeGithubContent(content: GithubContentPayload): string {
  if (content.encoding !== "base64" || !content.content) {
    return "";
  }

  return Buffer.from(content.content.replace(/\s+/g, ""), "base64").toString("utf8");
}

function dedupeContentItems(items: GithubContentPayload[]): GithubContentPayload[] {
  const seen = new Set<string>();
  const deduped: GithubContentPayload[] = [];

  for (const item of items) {
    const key = item.path || item.name;

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function detectStack(
  repository: GithubRepositoryPayload,
  allItems: GithubContentPayload[],
  packageJsons: ScannedPackageJson[]
): string[] {
  const signals = new Set<string>();
  const itemNames = new Set(allItems.map((item) => item.name ?? ""));
  const dependencyNames = getAllDependencyNames(packageJsons);

  if (repository.language) {
    signals.add(repository.language);
  }

  if (packageJsons.length > 0 || itemNames.has("package.json")) {
    signals.add("Node");
  }

  if (itemNames.has("tsconfig.json") || dependencyNames.has("typescript")) {
    signals.add("TypeScript");
  }

  if (dependencyNames.has("react") || dependencyNames.has("react-dom")) {
    signals.add("React");
  }

  if (dependencyNames.has("vite") || hasItemPath(allItems, "vite.config.ts") || hasItemPath(allItems, "vite.config.js")) {
    signals.add("Vite");
  }

  if (dependencyNames.has("next")) {
    signals.add("Next.js");
  }

  if (dependencyNames.has("electron")) {
    signals.add("Electron");
  }

  if (dependencyNames.has("@tauri-apps/api") || hasPathSegment(allItems, "src-tauri")) {
    signals.add("Tauri");
  }

  if (itemNames.has("pyproject.toml") || itemNames.has("requirements.txt")) {
    signals.add("Python");
  }

  if (itemNames.has("Cargo.toml")) {
    signals.add("Rust");
  }

  if (itemNames.has("go.mod")) {
    signals.add("Go");
  }

  if (itemNames.has("Dockerfile") || itemNames.has("docker-compose.yml") || itemNames.has("compose.yml")) {
    signals.add("Docker");
  }

  return [...signals].slice(0, 10);
}

function describeStructure(allItems: GithubContentPayload[]): RepoReaderStructureItem[] {
  return allItems
    .filter((item) => item.name && item.path && (item.type === "file" || item.type === "dir"))
    .sort((left, right) => pathDepth(left.path ?? "") - pathDepth(right.path ?? ""))
    .slice(0, 24)
    .map((item) => ({
      path: item.path as string,
      kind: item.type === "dir" ? "directory" : "file",
      signal: describeRootSignal(item)
    }));
}

function describeRootSignal(item: GithubContentPayload): string {
  const name = item.name?.toLowerCase() ?? "";
  const path = item.path?.toLowerCase() ?? "";

  if (["apps", "packages", "src", "lib", "server", "client", "api", "daemon", "extension"].includes(name)) {
    return "core code";
  }

  if (["docs", "examples", "test", "tests", "__tests__"].includes(name)) {
    return "supporting path";
  }

  if (
    ["package.json", "pnpm-workspace.yaml", "turbo.json", "vite.config.ts", "tsconfig.json", "manifest.json"].includes(name)
  ) {
    return "project wiring";
  }

  if (path.includes("src-tauri") || name === "cargo.toml") {
    return "desktop runtime";
  }

  if (name.startsWith("readme") || name === "license") {
    return "repo guide";
  }

  return item.type === "dir" ? "folder" : "file";
}

function describeEntrypoints(
  rootItems: GithubContentPayload[],
  allItems: GithubContentPayload[],
  packageJsons: ScannedPackageJson[],
  readmeText: string
): string[] {
  const entrypoints = new Set<string>();
  const rootNames = new Set(rootItems.map((item) => item.name ?? ""));

  for (const scannedPackage of packageJsons.slice(0, 6)) {
    const prefix = scannedPackage.path === "." ? "" : `${scannedPackage.path} `;

    if (scannedPackage.packageJson.main) {
      entrypoints.add(`${prefix}main: ${scannedPackage.packageJson.main}`);
    }

    if (scannedPackage.packageJson.bin) {
      entrypoints.add(`${prefix}bin command`);
    }

    for (const scriptName of ["dev", "start", "build", "test", "typecheck"]) {
      const command = scannedPackage.packageJson.scripts?.[scriptName];

      if (command) {
        entrypoints.add(`${prefix}${scriptName}: ${command}`);
      }
    }
  }

  for (const name of ["apps", "packages", "src", "docs", "examples", "extension", "server", "cli"]) {
    if (rootNames.has(name)) {
      entrypoints.add(name);
    }
  }

  for (const item of allItems) {
    if (["manifest.json", "Cargo.toml", "Dockerfile"].includes(item.name ?? "") && item.path) {
      entrypoints.add(item.path);
    }
  }

  const headings = readmeText
    .split(/\r?\n/)
    .filter((line) => /^#{1,3}\s+\S/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, "").trim())
    .slice(0, 3);

  for (const heading of headings) {
    entrypoints.add(`README: ${heading}`);
  }

  return [...entrypoints].slice(0, 12);
}

function describeRisks(
  repository: GithubRepositoryPayload,
  rootItems: GithubContentPayload[],
  allItems: GithubContentPayload[],
  packageJsons: ScannedPackageJson[],
  readmeText: string
): string[] {
  const risks: string[] = [];
  const rootNames = new Set(rootItems.map((item) => item.name ?? ""));
  const hasAnyTestScript = packageJsons.some((scannedPackage) => Boolean(scannedPackage.packageJson.scripts?.test));

  if (!readmeText.trim()) {
    risks.push("No README content found from GitHub.");
  }

  if (!repository.license) {
    risks.push("License is unclear.");
  }

  if (packageJsons.length > 0 && !hasAnyTestScript) {
    risks.push("No package test script found.");
  }

  if (!rootNames.has("docs") && !rootNames.has("examples") && !hasPathSegment(allItems, "examples")) {
    risks.push("No top-level docs or examples folder.");
  }

  if (repository.updated_at) {
    const updatedAt = Date.parse(repository.updated_at);
    const daysSinceUpdate = Number.isFinite(updatedAt) ? (Date.now() - updatedAt) / 86_400_000 : 0;

    if (daysSinceUpdate > 365) {
      risks.push("Repo looks quiet for over a year.");
    }
  }

  return risks.length > 0 ? risks.slice(0, 5) : ["No obvious first-pass risk."];
}

function detectPresentation(
  rootItems: GithubContentPayload[],
  allItems: GithubContentPayload[],
  packageJsons: ScannedPackageJson[],
  readmeText: string
): RepoReaderResult["presentation"] {
  const readme = readmeText.toLowerCase();
  const dependencyNames = getAllDependencyNames(packageJsons);
  const scriptNames = getAllScriptNames(packageJsons);
  const rootNames = new Set(rootItems.map((item) => item.name ?? ""));
  const surfaceMap: RepoReaderSurfaceSignal[] = [];

  const addSurface = (
    surface: RepoProjectSurface,
    path: string,
    confidence: RepoReaderSurfaceSignal["confidence"],
    reason: string
  ) => {
    if (surfaceMap.some((signal) => signal.surface === surface && signal.path === path && signal.reason === reason)) {
      return;
    }

    surfaceMap.push({
      surface,
      path,
      confidence,
      reason
    });
  };

  if (hasPathSegment(allItems, "src-tauri") || dependencyNames.has("@tauri-apps/api")) {
    addSurface("desktop-exe", findFirstPath(allItems, "src-tauri") ?? ".", "high", "Tauri desktop shell");
  }

  if (dependencyNames.has("electron") || readme.includes("electron")) {
    addSurface("desktop-exe", findPackagePath(packageJsons, "electron") ?? ".", "high", "Electron desktop shell");
  }

  if (readme.includes(".exe") || readme.includes("installer")) {
    addSurface("desktop-exe", "README", "medium", "desktop packaging language");
  }

  if (allItems.some((item) => item.name === "manifest.json")) {
    addSurface("browser-extension", findFirstPath(allItems, "manifest.json") ?? ".", "medium", "extension manifest");
  }

  if (readme.includes("chrome extension") || readme.includes("browser extension") || readme.includes("mv3")) {
    addSurface("browser-extension", "README", "high", "browser extension language");
  }

  if (
    dependencyNames.has("vite") ||
    dependencyNames.has("next") ||
    dependencyNames.has("@remix-run/react") ||
    dependencyNames.has("react") ||
    dependencyNames.has("svelte") ||
    dependencyNames.has("vue") ||
    allItems.some((item) => item.name === "index.html") ||
    scriptNames.has("dev")
  ) {
    addSurface("web-app", findPackageWithScript(packageJsons, "dev")?.path ?? ".", "high", "interactive app runtime");
  }

  if (
    dependencyNames.has("express") ||
    dependencyNames.has("fastify") ||
    dependencyNames.has("hono") ||
    dependencyNames.has("@nestjs/core") ||
    allItems.some((item) => item.name === "Dockerfile" || item.name === "docker-compose.yml" || item.name === "compose.yml") ||
    hasPathSegment(allItems, "server") ||
    hasPathSegment(allItems, "api") ||
    scriptNames.has("start")
  ) {
    addSurface("local-service", findPackageWithScript(packageJsons, "start")?.path ?? "server", "high", "local service runtime");
  }

  if (packageJsons.some((scannedPackage) => scannedPackage.packageJson.bin) || hasPathSegment(allItems, "bin") || hasPathSegment(allItems, "cli") || readme.includes("cli")) {
    addSurface("cli", findPackageWithBin(packageJsons)?.path ?? "cli", "high", "command surface");
  }

  if (rootNames.has("apps") || rootNames.has("packages") || rootNames.has("pnpm-workspace.yaml") || rootNames.has("turbo.json") || rootNames.has("nx.json")) {
    addSurface("monorepo", ".", "high", "workspace layout");
  }

  if (packageJsons.some((scannedPackage) => isLibraryPackage(scannedPackage.packageJson))) {
    addSurface("library", findLibraryPackage(packageJsons)?.path ?? ".", "medium", "package export surface");
  }

  if (rootNames.has("docs") || readmeText.trim()) {
    addSurface("docs", rootNames.has("docs") ? "docs" : "README", readmeText.trim() ? "high" : "medium", "documentation surface");
  }

  if (surfaceMap.length === 0) {
    addSurface("unknown", ".", "low", "not enough root signals");
  }

  const surfaces = [...new Set(surfaceMap.map((signal) => signal.surface))].sort(
    (left, right) => surfacePriority(left) - surfacePriority(right)
  );

  return {
    primary: surfaces[0] ?? "unknown",
    surfaces,
    signals: surfaceMap.map((signal) => signal.reason).slice(0, 8),
    surfaceMap: surfaceMap
      .sort((left, right) => surfacePriority(left.surface) - surfacePriority(right.surface))
      .slice(0, 10)
  };
}

function recommendEnvironment(
  primarySurface: RepoProjectSurface,
  rootItems: GithubContentPayload[],
  allItems: GithubContentPayload[],
  packageJsons: ScannedPackageJson[],
  surfaceMap: RepoReaderSurfaceSignal[]
): RepoReaderResult["environment"] {
  const steps: RepoReaderEnvironmentStep[] = [];
  const rootNames = new Set(rootItems.map((item) => item.name ?? ""));
  const targetPackage = pickTargetPackage(primarySurface, packageJsons, surfaceMap);
  const scripts = targetPackage?.packageJson.scripts ?? {};

  if (rootNames.has("README.md") || rootNames.has("readme.md")) {
    steps.push({
      label: "Learn",
      note: "Read README before touching runtime commands."
    });
  }

  if (rootNames.has("pnpm-lock.yaml")) {
    steps.push({
      label: "Install",
      command: "corepack pnpm install",
      note: "Repo advertises pnpm lockfile."
    });
  } else if (rootNames.has("package-lock.json")) {
    steps.push({
      label: "Install",
      command: "npm install",
      note: "Repo advertises npm lockfile."
    });
  } else if (rootNames.has("yarn.lock")) {
    steps.push({
      label: "Install",
      command: "corepack yarn install",
      note: "Repo advertises Yarn lockfile."
    });
  } else if (packageJsons.length > 0) {
    steps.push({
      label: "Install",
      command: "npm install",
      note: "No lockfile surfaced in the first GitHub pass."
    });
  }

  if (scripts.typecheck) {
    steps.push({
      label: "Check",
      command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "typecheck"),
      note: "Typecheck before edits."
    });
  }

  if (scripts.test) {
    steps.push({
      label: "Test",
      command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "test"),
      note: "Use tests as the first robot confidence gate."
    });
  }

  if (primarySurface === "browser-extension") {
    steps.push({
      label: "Run",
      ...(scripts.build ? { command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "build") } : {}),
      note: "Build the extension, then load the output folder into SUPERIOR Browser."
    });
  } else if (primarySurface === "desktop-exe") {
    steps.push({
      label: "Run",
      ...(scripts["tauri:dev"]
        ? { command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "tauri:dev") }
        : scripts.dev
          ? { command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "dev") }
          : scripts["tauri:build"]
            ? { command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "tauri:build") }
            : {}),
      note: "Treat as a desktop app; check packaged resources and local process startup."
    });
  } else if (primarySurface === "local-service") {
    steps.push({
      label: "Run",
      ...(scripts.dev
        ? { command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "dev") }
        : scripts.start
          ? { command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "start") }
          : allItems.some((item) => item.name === "docker-compose.yml" || item.name === "compose.yml")
            ? { command: "docker compose up" }
            : {}),
      note: "Start the service on loopback and inspect health, routes, and logs."
    });
  } else if (primarySurface === "web-app") {
    steps.push({
      label: "Run",
      ...(scripts.dev ? { command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "dev") } : {}),
      note: "Start the dev server and open it in SUPERIOR Browser."
    });
  } else if (primarySurface === "cli") {
    steps.push({
      label: "Run",
      ...(scripts.build ? { command: packageScriptCommand(rootNames, targetPackage?.path ?? ".", "build") } : {}),
      note: "Build first, then inspect help/version commands in a terminal cage."
    });
  }

  return {
    mode: ["web-app", "local-service", "desktop-exe", "browser-extension", "cli"].includes(primarySurface)
      ? "both"
      : "learn",
    summary: environmentSummary(primarySurface),
    steps: steps.slice(0, 8)
  };
}

function recommendPlayground(
  primarySurface: RepoProjectSurface,
  surfaces: RepoProjectSurface[],
  environmentSteps: RepoReaderEnvironmentStep[],
  packageJsons: ScannedPackageJson[],
  surfaceMap: RepoReaderSurfaceSignal[]
): RepoReaderPlayground {
  const launchTargets = buildLaunchTargets(primarySurface, packageJsons, surfaceMap);
  const checks = environmentSteps.filter((step) => ["Install", "Check", "Test"].includes(step.label)).slice(0, 4);
  const commonNotes = surfaces.includes("monorepo")
    ? ["Monorepo detected. Pick one runnable app before broad changes."]
    : [];

  switch (primarySurface) {
    case "web-app":
      return makePlayground({
        kind: "superior-browser",
        label: "SUPERIOR Browser",
        robotRole: "Open the app in a controlled browser profile, watch console/network, and use page skills on the running screen.",
        permissions: ["read-repo", "local-files", "terminal", "service-control", "browser-control"],
        primaryLoop: ["Map repo", "Install deps", "Start dev server", "Open own browser", "Inspect first screen"],
        launchTargets,
        checks,
        notes: ["Best fit when the project has a visible app surface.", ...commonNotes]
      });
    case "browser-extension":
      return makePlayground({
        kind: "extension-lab",
        label: "Extension Lab",
        robotRole: "Build the extension, load it into a controlled browser profile, then test popup, background, and page actions.",
        permissions: ["read-repo", "local-files", "terminal", "browser-control", "extension-control"],
        primaryLoop: ["Map manifest", "Build extension", "Load unpacked", "Open test page", "Try extension action"],
        launchTargets,
        checks,
        notes: ["The extension should run in its own browser profile before touching the user's everyday browser.", ...commonNotes]
      });
    case "local-service":
      return makePlayground({
        kind: "service-loop",
        label: "Loopback Bench",
        robotRole: "Start the service locally, inspect health/routes/logs, then feed results back into the Workshop.",
        permissions: ["read-repo", "local-files", "terminal", "service-control"],
        primaryLoop: ["Map service", "Install deps", "Start loopback", "Check health", "Read logs"],
        launchTargets,
        checks,
        notes: ["Use loopback first. External credentials stay explicit and local.", ...commonNotes]
      });
    case "desktop-exe":
      return makePlayground({
        kind: "desktop-bench",
        label: "Desktop Bench",
        robotRole: "Run the desktop shell, watch bundled resources and helper processes, then verify the packaged app path.",
        permissions: ["read-repo", "local-files", "terminal", "service-control"],
        primaryLoop: ["Map desktop shell", "Install deps", "Run app", "Watch helper process", "Check package path"],
        launchTargets,
        checks,
        notes: ["Desktop apps often hide a webview, service, or extension inside the package.", ...commonNotes]
      });
    case "cli":
      return makePlayground({
        kind: "terminal-cage",
        label: "Terminal Cage",
        robotRole: "Build or link the command, run help/version checks, and keep command output attached to the repo notes.",
        permissions: ["read-repo", "local-files", "terminal"],
        primaryLoop: ["Map command", "Install deps", "Build", "Run help", "Save command notes"],
        launchTargets,
        checks,
        notes: ["Start with help/version and dry checks before repo-specific commands.", ...commonNotes]
      });
    case "library":
      return makePlayground({
        kind: "package-shelf",
        label: "Package Shelf",
        robotRole: "Read exports, examples, and tests so the robot can learn the package before making an adapter.",
        permissions: ["read-repo", "local-files", "terminal"],
        primaryLoop: ["Map exports", "Read examples", "Run tests", "Sketch adapter", "Stow notes"],
        launchTargets,
        checks,
        notes: ["Libraries become useful when SUPERIOR learns their public entrypoints.", ...commonNotes]
      });
    case "docs":
      return makePlayground({
        kind: "docs-table",
        label: "Docs Table",
        robotRole: "Read the docs as the playable surface and turn them into concrete commands or adapter notes.",
        permissions: ["read-repo", "local-files", "browser-control"],
        primaryLoop: ["Open docs", "Map sections", "Extract commands", "Mark gaps", "Save notes"],
        launchTargets,
        checks,
        notes: ["Docs-only repos should become study notes before runtime work.", ...commonNotes]
      });
    case "monorepo":
    case "unknown":
    default:
      return makePlayground({
        kind: "repo-map",
        label: "Repo Map",
        robotRole: "Map the folders, choose the first runnable surface, then switch to the matching playpen.",
        permissions: ["read-repo", "local-files"],
        primaryLoop: ["Map repo", "Find apps", "Pick surface", "Check risk", "Choose playpen"],
        launchTargets,
        checks,
        notes: ["No single runtime is clear yet.", ...commonNotes]
      });
  }
}

function makePlayground(input: {
  kind: RepoPlaygroundKind;
  label: string;
  robotRole: string;
  permissions: RepoPermissionProfile[];
  primaryLoop: string[];
  launchTargets: string[];
  checks: RepoReaderEnvironmentStep[];
  notes: string[];
}): RepoReaderPlayground {
  return input;
}

function buildSummary(
  title: string,
  repository: GithubRepositoryPayload,
  stack: string[],
  risks: string[],
  primarySurface: RepoProjectSurface,
  playgroundLabel: string
): string {
  const stackText = stack.length > 0 ? stack.slice(0, 3).join(", ") : repository.language || "unknown stack";
  const riskText = risks[0] && risks[0] !== "No obvious first-pass risk." ? ` First risk: ${risks[0]}` : "";

  return `${title} presents as ${surfaceLabel(primarySurface)} on a ${stackText} stack. Use ${playgroundLabel}.${riskText}`;
}

function buildNextMoves(
  rootItems: GithubContentPayload[],
  allItems: GithubContentPayload[],
  packageJsons: ScannedPackageJson[],
  playground: RepoReaderPlayground
): string[] {
  const rootNames = new Set(rootItems.map((item) => item.name ?? ""));
  const moves: string[] = [];

  if (rootNames.has("README.md") || rootNames.has("readme.md")) {
    moves.push("Read README setup path.");
  }

  if (packageJsons.some((scannedPackage) => scannedPackage.packageJson.scripts?.test)) {
    moves.push("Run the test script before changing files.");
  }

  if (packageJsons.some((scannedPackage) => scannedPackage.packageJson.scripts?.dev)) {
    moves.push("Start the dev script and inspect the first screen.");
  }

  if (hasPathSegment(allItems, "apps")) {
    moves.push("Open apps folder to pick the active surface.");
  }

  if (hasPathSegment(allItems, "packages")) {
    moves.push("Check shared packages before editing app code.");
  }

  moves.push(`Use ${playground.label} as the first playpen.`);

  return moves.slice(0, 6);
}

function pickTargetPackage(
  primarySurface: RepoProjectSurface,
  packageJsons: ScannedPackageJson[],
  surfaceMap: RepoReaderSurfaceSignal[]
): ScannedPackageJson | null {
  const mappedPath = surfaceMap.find((signal) => signal.surface === primarySurface)?.path;
  const exactPackage = mappedPath
    ? packageJsons.find((scannedPackage) => scannedPackage.path === mappedPath || mappedPath.startsWith(scannedPackage.path))
    : null;

  if (exactPackage) {
    return exactPackage;
  }

  if (primarySurface === "cli") {
    return findPackageWithBin(packageJsons) ?? packageJsons[0] ?? null;
  }

  if (primarySurface === "web-app" || primarySurface === "desktop-exe" || primarySurface === "local-service") {
    return findPackageWithScript(packageJsons, "dev") ?? findPackageWithScript(packageJsons, "start") ?? packageJsons[0] ?? null;
  }

  if (primarySurface === "browser-extension") {
    return findPackageWithScript(packageJsons, "build") ?? packageJsons[0] ?? null;
  }

  return packageJsons[0] ?? null;
}

function buildLaunchTargets(
  primarySurface: RepoProjectSurface,
  packageJsons: ScannedPackageJson[],
  surfaceMap: RepoReaderSurfaceSignal[]
): string[] {
  const targets = new Set<string>();

  for (const signal of surfaceMap) {
    if (signal.surface === primarySurface && signal.path) {
      targets.add(signal.path);
    }
  }

  for (const scannedPackage of packageJsons) {
    const scripts = scannedPackage.packageJson.scripts ?? {};

    if (scripts.dev || scripts.start || scripts.build || scannedPackage.packageJson.bin) {
      targets.add(scannedPackage.path);
    }
  }

  return [...targets].filter(Boolean).slice(0, 5);
}

function packageScriptCommand(rootNames: Set<string>, packagePath: string, scriptName: string): string {
  if (rootNames.has("pnpm-lock.yaml")) {
    return packagePath === "." ? `corepack pnpm ${scriptName}` : `corepack pnpm --dir ${packagePath} ${scriptName}`;
  }

  if (rootNames.has("yarn.lock")) {
    return packagePath === "." ? `corepack yarn ${scriptName}` : `corepack yarn --cwd ${packagePath} ${scriptName}`;
  }

  return packagePath === "." ? `npm run ${scriptName}` : `npm --prefix ${packagePath} run ${scriptName}`;
}

function getAllDependencyNames(packageJsons: ScannedPackageJson[]): Set<string> {
  return new Set(
    packageJsons.flatMap((scannedPackage) => [
      ...Object.keys(scannedPackage.packageJson.dependencies ?? {}),
      ...Object.keys(scannedPackage.packageJson.devDependencies ?? {})
    ])
  );
}

function getAllScriptNames(packageJsons: ScannedPackageJson[]): Set<string> {
  return new Set(packageJsons.flatMap((scannedPackage) => Object.keys(scannedPackage.packageJson.scripts ?? {})));
}

function findPackageWithScript(packageJsons: ScannedPackageJson[], scriptName: string): ScannedPackageJson | null {
  return packageJsons.find((scannedPackage) => Boolean(scannedPackage.packageJson.scripts?.[scriptName])) ?? null;
}

function findPackageWithBin(packageJsons: ScannedPackageJson[]): ScannedPackageJson | null {
  return packageJsons.find((scannedPackage) => Boolean(scannedPackage.packageJson.bin)) ?? null;
}

function findLibraryPackage(packageJsons: ScannedPackageJson[]): ScannedPackageJson | null {
  return packageJsons.find((scannedPackage) => isLibraryPackage(scannedPackage.packageJson)) ?? null;
}

function findPackagePath(packageJsons: ScannedPackageJson[], dependencyName: string): string | null {
  return (
    packageJsons.find((scannedPackage) =>
      Boolean(scannedPackage.packageJson.dependencies?.[dependencyName] || scannedPackage.packageJson.devDependencies?.[dependencyName])
    )?.path ?? null
  );
}

function isLibraryPackage(packageJson: PackageJsonSignal): boolean {
  const scripts = packageJson.scripts ?? {};

  return Boolean(packageJson.main || packageJson.module || packageJson.types || packageJson.exports) && !scripts.dev && !scripts.start;
}

function hasItemPath(items: GithubContentPayload[], fileName: string): boolean {
  return items.some((item) => item.name === fileName || item.path === fileName || item.path?.endsWith(`/${fileName}`));
}

function hasPathSegment(items: GithubContentPayload[], segment: string): boolean {
  const normalizedSegment = segment.toLowerCase();

  return items.some((item) =>
    (item.path ?? "")
      .toLowerCase()
      .split("/")
      .includes(normalizedSegment)
  );
}

function findFirstPath(items: GithubContentPayload[], nameOrSegment: string): string | null {
  const normalized = nameOrSegment.toLowerCase();
  const item = items.find((candidate) => {
    const path = candidate.path?.toLowerCase() ?? "";

    return candidate.name?.toLowerCase() === normalized || path.split("/").includes(normalized);
  });

  return item?.path ?? null;
}

function pathDepth(path: string): number {
  return path.split("/").length;
}

function surfacePriority(surface: RepoProjectSurface): number {
  const priority: Record<RepoProjectSurface, number> = {
    "desktop-exe": 1,
    "browser-extension": 2,
    "local-service": 3,
    "web-app": 4,
    cli: 5,
    monorepo: 6,
    library: 7,
    docs: 8,
    unknown: 9
  };

  return priority[surface];
}

function surfaceLabel(surface: RepoProjectSurface): string {
  const labels: Record<RepoProjectSurface, string> = {
    "desktop-exe": "a desktop exe",
    "browser-extension": "a browser extension",
    "web-app": "a web app",
    "local-service": "a local service",
    cli: "a CLI tool",
    library: "a library",
    monorepo: "a monorepo",
    docs: "a docs repo",
    unknown: "an unclear project"
  };

  return labels[surface];
}

function environmentSummary(surface: RepoProjectSurface): string {
  if (surface === "desktop-exe") {
    return "Spin it up like a packaged app, then let SUPERIOR watch the local runtime and resources.";
  }

  if (surface === "browser-extension") {
    return "Build the extension and let SUPERIOR pair it with a controlled browser profile.";
  }

  if (surface === "local-service") {
    return "Start the service locally and let SUPERIOR inspect health, routes, and logs.";
  }

  if (surface === "web-app") {
    return "Run the dev server and let SUPERIOR inspect it in its own browser.";
  }

  if (surface === "cli") {
    return "Build or link the command, then let SUPERIOR run small dry checks.";
  }

  return "Use learn mode first: read docs, map entrypoints, then decide whether it can run.";
}

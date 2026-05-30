import { describe, expect, it } from "vitest";
import { DEFAULT_BOT_IDENTITY, createRepoReaderRequest } from "@clawdbot/shared";
import { parseGithubRepoUrl, runRepoReader } from "./repoReader.js";

describe("Repo Reader", () => {
  it("parses common GitHub repo links", () => {
    expect(parseGithubRepoUrl("https://github.com/openai/openai-node")?.canonicalUrl).toBe(
      "https://github.com/openai/openai-node"
    );
    expect(parseGithubRepoUrl("git@github.com:owner/project.git")?.canonicalUrl).toBe("https://github.com/owner/project");
    expect(parseGithubRepoUrl("https://example.com/owner/project")).toBeNull();
  });

  it("uses a local GitHub token when one is present", async () => {
    const previousToken = process.env.GITHUB_TOKEN;
    const authorizationHeaders: string[] = [];

    process.env.GITHUB_TOKEN = "github_test_token";

    try {
      await runRepoReader(
        createRepoReaderRequest({
          repoUrl: "https://github.com/acme/superior",
          bot: DEFAULT_BOT_IDENTITY
        }),
        async (input, init) => {
          const headers = new Headers(init?.headers);
          const authorization = headers.get("authorization");

          if (authorization) {
            authorizationHeaders.push(authorization);
          }

          return mockGithubFetch(input);
        }
      );
    } finally {
      if (previousToken) {
        process.env.GITHUB_TOKEN = previousToken;
      } else {
        delete process.env.GITHUB_TOKEN;
      }
    }

    expect(authorizationHeaders).toContain("Bearer github_test_token");
  });

  it("classifies a desktop/service monorepo and recommends a setup path", async () => {
    const request = createRepoReaderRequest({
      repoUrl: "https://github.com/acme/superior",
      bot: DEFAULT_BOT_IDENTITY
    });
    const result = await runRepoReader(request, mockGithubFetch);

    expect(result.type).toBe("repo-reader-result");
    expect(result.repository.owner).toBe("acme");
    expect(result.presentation.surfaces).toContain("desktop-exe");
    expect(result.presentation.surfaces).toContain("local-service");
    expect(result.presentation.surfaces).toContain("monorepo");
    expect(result.environment.mode).toBe("both");
    expect(result.environment.steps.map((step) => step.command).filter(Boolean)).toContain("corepack pnpm install");
    expect(result.environment.summary).toContain("packaged app");
    expect(result.playground.kind).toBe("desktop-bench");
    expect(result.playground.label).toBe("Desktop Bench");
    expect(result.presentation.surfaceMap.some((signal) => signal.surface === "desktop-exe")).toBe(true);
    expect(result.stack).toContain("Tauri");
    expect(result.summary).toContain("desktop exe");
  });

  it("maps a nested extension to an extension playpen", async () => {
    const request = createRepoReaderRequest({
      repoUrl: "https://github.com/acme/clipper",
      bot: DEFAULT_BOT_IDENTITY
    });
    const result = await runRepoReader(request, mockGithubFetch);

    expect(result.presentation.primary).toBe("browser-extension");
    expect(result.presentation.surfaceMap.some((signal) => signal.path === "apps/extension/manifest.json")).toBe(true);
    expect(result.environment.steps.map((step) => step.command).filter(Boolean)).toContain(
      "corepack pnpm --dir apps/extension build"
    );
    expect(result.playground.kind).toBe("extension-lab");
    expect(result.playground.permissions).toContain("browser-control");
    expect(result.playground.permissions).toContain("extension-control");
    expect(result.playLoop).toContain("Load unpacked");
  });
});

async function mockGithubFetch(input: string): Promise<Response> {
  const url = new URL(input);

  if (url.pathname === "/repos/acme/superior") {
    return jsonResponse({
      full_name: "acme/superior",
      description: "Clay desktop creature utility.",
      default_branch: "main",
      language: "TypeScript",
      stargazers_count: 42,
      forks_count: 7,
      license: {
        spdx_id: "MIT"
      },
      updated_at: new Date().toISOString()
    });
  }

  if (url.pathname === "/repos/acme/superior/contents") {
    return jsonResponse([
      { name: "README.md", path: "README.md", type: "file" },
      { name: "apps", path: "apps", type: "dir" },
      { name: "packages", path: "packages", type: "dir" },
      { name: "src-tauri", path: "src-tauri", type: "dir" },
      { name: "package.json", path: "package.json", type: "file" },
      { name: "pnpm-lock.yaml", path: "pnpm-lock.yaml", type: "file" },
      { name: "tsconfig.json", path: "tsconfig.json", type: "file" }
    ]);
  }

  if (url.pathname === "/repos/acme/superior/readme") {
    return jsonResponse({
      name: "README.md",
      path: "README.md",
      type: "file",
      encoding: "base64",
      content: Buffer.from("# SUPERIOR\n\nBuilds a desktop exe and local service.").toString("base64")
    });
  }

  if (url.pathname === "/repos/acme/superior/contents/package.json") {
    return jsonResponse({
      name: "package.json",
      path: "package.json",
      type: "file",
      encoding: "base64",
      content: Buffer.from(
        JSON.stringify({
          scripts: {
            dev: "pnpm --parallel dev",
            test: "vitest run",
            typecheck: "tsc --noEmit",
            "tauri:build": "tauri build"
          },
          dependencies: {
            "@tauri-apps/api": "2.0.0",
            express: "4.18.0",
            react: "19.0.0"
          },
          devDependencies: {
            typescript: "6.0.0",
            vite: "8.0.0"
          }
        })
      ).toString("base64")
    });
  }

  if (url.pathname === "/repos/acme/clipper") {
    return jsonResponse({
      full_name: "acme/clipper",
      description: "Browser clipping extension.",
      default_branch: "main",
      language: "TypeScript",
      stargazers_count: 12,
      forks_count: 2,
      license: {
        spdx_id: "MIT"
      },
      updated_at: new Date().toISOString()
    });
  }

  if (url.pathname === "/repos/acme/clipper/contents") {
    return jsonResponse([
      { name: "README.md", path: "README.md", type: "file" },
      { name: "apps", path: "apps", type: "dir" },
      { name: "package.json", path: "package.json", type: "file" },
      { name: "pnpm-lock.yaml", path: "pnpm-lock.yaml", type: "file" },
      { name: "pnpm-workspace.yaml", path: "pnpm-workspace.yaml", type: "file" }
    ]);
  }

  if (url.pathname === "/repos/acme/clipper/contents/apps") {
    return jsonResponse([{ name: "extension", path: "apps/extension", type: "dir" }]);
  }

  if (url.pathname === "/repos/acme/clipper/contents/apps/extension") {
    return jsonResponse([
      { name: "manifest.json", path: "apps/extension/manifest.json", type: "file" },
      { name: "package.json", path: "apps/extension/package.json", type: "file" },
      { name: "src", path: "apps/extension/src", type: "dir" }
    ]);
  }

  if (url.pathname === "/repos/acme/clipper/readme") {
    return jsonResponse({
      name: "README.md",
      path: "README.md",
      type: "file",
      encoding: "base64",
      content: Buffer.from("# Clipper\n\nChrome extension using MV3.").toString("base64")
    });
  }

  if (url.pathname === "/repos/acme/clipper/contents/package.json") {
    return jsonResponse({
      name: "package.json",
      path: "package.json",
      type: "file",
      encoding: "base64",
      content: Buffer.from(
        JSON.stringify({
          scripts: {
            test: "vitest run"
          },
          devDependencies: {
            typescript: "6.0.0"
          }
        })
      ).toString("base64")
    });
  }

  if (url.pathname === "/repos/acme/clipper/contents/apps/extension/package.json") {
    return jsonResponse({
      name: "package.json",
      path: "apps/extension/package.json",
      type: "file",
      encoding: "base64",
      content: Buffer.from(
        JSON.stringify({
          scripts: {
            build: "vite build"
          },
          dependencies: {
            react: "19.0.0"
          },
          devDependencies: {
            vite: "8.0.0",
            typescript: "6.0.0"
          }
        })
      ).toString("base64")
    });
  }

  return jsonResponse({ message: "Not found" }, 404);
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

export const hubData = {
  release: {
    version: "0.8",
    name: "Chrome Extension Store Gate",
    updatedAt: "2026-05-30",
    status: "store prep",
    summary:
      "Prepare the MV3 extension for public Chrome Web Store review with dynamic robot toolbar identity, local-only permissions, and store package proof."
  },
  platforms: [
    {
      lane: "Native Windows EXE",
      state: "active",
      proof: "corepack pnpm windows:installed-loop-smoke",
      next: "second Windows user/machine install proof"
    },
    {
      lane: "Native Repo Loop",
      state: "active proof",
      proof: ".clawdbot/verification/native-loop-fixture-1780162908113.json",
      next: "manual installed UI QA at 1160x720"
    },
    {
      lane: "Chrome / Edge Extension",
      state: "active focus",
      proof: "corepack pnpm extension:store-package",
      next: "public Chrome Web Store upload and manual icon-sync QA"
    },
    {
      lane: "Local Service",
      state: "active",
      proof: "corepack pnpm fixture:host-contract",
      next: "expand host fixtures before .NET host parity work"
    },
    {
      lane: "Mobile Companion",
      state: "waiting",
      proof: "contract plan only",
      next: "identity, equipped parts, recent proof, pairing state"
    },
    {
      lane: "Web Hub",
      state: "coordination only",
      proof: "corepack pnpm --filter @clawdbot/hub build",
      next: "protected Vercel preview and GitHub Release index"
    }
  ],
  proof: [
    {
      label: "Root checks",
      command: "corepack pnpm typecheck && corepack pnpm test && corepack pnpm build",
      state: "passed"
    },
    {
      label: "Windows native proof",
      command: "corepack pnpm windows:proof",
      state: "passed"
    },
    {
      label: "Windows MSI",
      command: ".clawdbot/artifacts/windows/SUPERIOR-0.7.0-alpha-win-x64.msi",
      state: "built"
    },
    {
      label: "Installed loop smoke",
      command: "corepack pnpm windows:installed-loop-smoke",
      state: "passed"
    },
    {
      label: "Admin service smoke",
      command: "corepack pnpm windows:service-smoke from elevated PowerShell",
      state: "installed / uninstalled"
    },
    {
      label: "Host contract fixture",
      command: ".clawdbot/verification/host-contract-fixture-1780162930107.json",
      state: "passed"
    },
    {
      label: "Extension store package",
      command: ".clawdbot/artifacts/extension/SUPERIOR-0.8.0-chrome-mv3.zip",
      state: "built"
    },
    {
      label: "Extension skill fixture",
      command: ".clawdbot/verification/extension-skill-fixture-1780164331918.json",
      state: "passed"
    },
    {
      label: "Hub build",
      command: "corepack pnpm --filter @clawdbot/hub build",
      state: "passed"
    },
    {
      label: "Native repo loop",
      command: ".clawdbot/verification/native-loop-fixture-1780162908113.json",
      state: "passed"
    },
    {
      label: "Protected deployment",
      command: "Vercel Authentication protects deployment URLs",
      state: "401 protected"
    }
  ],
  artifacts: [
    {
      name: "Private hub deployment",
      source: "Vercel",
      state: "protected deployment URL recorded in verification doc",
      link: ""
    },
    {
      name: "Windows installer",
      source: "GitHub Releases",
      state: "local MSI built; release upload pending remote",
      link: ""
    },
    {
      name: "Extension build",
      source: "GitHub Releases",
      state: "local Chrome store ZIP built; release upload pending remote",
      link: ""
    },
    {
      name: "Verification report",
      source: "repo docs",
      state: "local source of truth",
      link: "docs/alpha-verification.md"
    }
  ],
  packets: [
    {
      lane: "Native Loop",
      owner: "Windows Native Agent",
      packet: "Repo URL to playpen to Article X-Ray proof"
    },
    {
      lane: "Windows",
      owner: "Windows Native Agent",
      packet: "Service lifecycle controls and native recovery states"
    },
    {
      lane: "Extension",
      owner: "Extension Function Agent",
      packet: "Chrome Web Store package and dynamic robot toolbar icon proof"
    },
    {
      lane: "Daemon / Contracts",
      owner: "Contract + Backend Agents",
      packet: "Host fixtures for pairing, browser runtime, and custom skill proposal"
    },
    {
      lane: "Hub",
      owner: "Docs / Release Agent",
      packet: "Private Vercel hub with public-safe release data"
    },
    {
      lane: "Mobile",
      owner: "Mobile Platform Agent",
      packet: "Companion contract spec after Windows loop stabilizes"
    }
  ],
  caveats: [
    "No hosted robot runtime in 0.8.",
    "No local secrets or private browser state in the hub.",
    "Chrome privacy policy and GitHub Releases need a remote before public links can resolve.",
    "Scheduled task install reports needs-admin when non-elevated; elevated admin smoke is verified.",
    "Installed native loop proof still uses the Node daemon as the local brain.",
    "Tauri remains an alpha harness, not the official EXE shell."
  ]
};

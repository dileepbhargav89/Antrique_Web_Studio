#!/usr/bin/env node
// Engineering polish pass (pre-Backend-v1.0-review) — Task 3, Dependency
// Security Validation. `pnpm audit` alone exits non-zero the moment ANY
// vulnerability exists in the tree, with no built-in way to say "these 20
// are already triaged and accepted, only fail me on something NEW" — that
// would make CI permanently red (this project has 20 already-reviewed,
// already-documented findings, see docs/architecture/security.md §11/§14)
// or force disabling the check entirely, either of which defeats the
// point. This script is the missing middle ground: run the real audit,
// compare every finding against audit-allowlist.json (the machine-checked
// index into security.md's own reasoning), and fail ONLY on a finding
// that isn't already there — "prevent CI noise from documented accepted
// risks" without silencing genuinely new risk.
//
// Deliberately plain Node (no ts-node, no build step) — this is an
// operational CI script, not application code; keeping it dependency-light
// means it can run before/independent of the app's own compile step.
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ALLOWLIST_PATH = path.join(__dirname, '..', 'audit-allowlist.json');

function loadAllowlist() {
  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const byId = new Map();
  for (const entry of parsed.accepted) {
    byId.set(entry.ghsaId, entry);
  }
  return byId;
}

function runPnpmAudit() {
  // `shell: true` — `pnpm` resolves via PATH/shell wrapper on Windows
  // (pnpm.cmd) the same way every other `pnpm ...` invocation in this
  // repo's own scripts already relies on the shell for.
  const result = spawnSync('pnpm', ['audit', '--json'], {
    encoding: 'utf8',
    shell: true,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (!result.stdout || result.stdout.trim().length === 0) {
    console.error('pnpm audit produced no output.');
    console.error(result.stderr || '(no stderr)');
    process.exit(2);
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    console.error('Failed to parse `pnpm audit --json` output as JSON.');
    console.error(result.stdout.slice(0, 2000));
    process.exit(2);
  }
  return parsed;
}

// pnpm's own advisory objects don't carry a bare GHSA id field — extract
// it from the trailing segment of their `url` (always
// "https://github.com/advisories/GHSA-xxxx-xxxx-xxxx").
function extractGhsaId(advisory) {
  if (typeof advisory.url === 'string') {
    const match = advisory.url.match(/GHSA-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/i);
    if (match) return match[0];
  }
  return null;
}

function main() {
  const allowlist = loadAllowlist();
  const audit = runPnpmAudit();
  const advisories = Object.values(audit.advisories || {});

  const accepted = [];
  const unlisted = [];

  for (const advisory of advisories) {
    const ghsaId = extractGhsaId(advisory);
    const entry = ghsaId ? allowlist.get(ghsaId) : undefined;
    if (entry) {
      accepted.push({ ghsaId, severity: advisory.severity, package: advisory.module_name, entry });
    } else {
      unlisted.push({
        ghsaId: ghsaId || '(unknown)',
        severity: advisory.severity,
        package: advisory.module_name,
        title: advisory.title,
        url: advisory.url,
      });
    }
  }

  console.log('');
  console.log('=== Dependency audit — accepted, documented risks (no action needed) ===');
  if (accepted.length === 0) {
    console.log('(none)');
  } else {
    for (const a of accepted.sort((x, y) => x.package.localeCompare(y.package))) {
      console.log(`  [${a.severity.toUpperCase()}] ${a.package} — ${a.ghsaId}`);
      console.log(`      reason: ${a.entry.reason}`);
    }
  }
  console.log('');
  console.log(`Total findings in tree: ${advisories.length} | Accepted (allowlisted): ${accepted.length} | Unlisted (new): ${unlisted.length}`);
  console.log('');

  if (unlisted.length > 0) {
    console.error('=== NEW, UNDOCUMENTED vulnerabilities found — not in apps/api/audit-allowlist.json ===');
    for (const u of unlisted) {
      console.error(`  [${(u.severity || 'unknown').toUpperCase()}] ${u.package} — ${u.ghsaId}`);
      console.error(`      ${u.title}`);
      console.error(`      ${u.url}`);
    }
    console.error('');
    console.error(
      'Triage each finding above: either fix it (upgrade/override — see ' +
        'docs/architecture/domain-module-guide.md §24/§25 for how this project decides that), ' +
        'or add it to apps/api/audit-allowlist.json with a real reachability-based reason and a ' +
        'matching entry in docs/architecture/security.md. Do not add an entry just to silence this check.',
    );
    process.exit(1);
  }

  console.log('All current findings are documented, accepted risks. Nothing new to triage.');
  process.exit(0);
}

main();

#!/usr/bin/env bun

// Bun runtime check - give helpful error for Node.js users
if (typeof Bun === "undefined") {
  console.error(`
╔══════════════════════════════════════════════════════════════╗
║  breadcrumb requires Bun runtime                             ║
║                                                              ║
║  Install Bun:  curl -fsSL https://bun.sh/install | bash      ║
║  Then run:     bun install -g breadcrumb-cli                 ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Command } from "commander";
import { registerAddCommand } from "./commands/add.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerInitCommand } from "./commands/init.js";
import { registerLsCommand } from "./commands/ls.js";
import { registerPruneCommand } from "./commands/prune.js";
import { registerRmCommand } from "./commands/rm.js";
import { registerStatusCommand } from "./commands/status.js";

// Read version from package.json
const __dirname = dirname(Bun.fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const program = new Command();

program
  .name("breadcrumb")
  .description("Agent-to-agent coordination via file-attached warnings")
  .version(pkg.version);

// Register all commands
registerInitCommand(program);
registerAddCommand(program);
registerRmCommand(program);
registerCheckCommand(program);
registerStatusCommand(program);
registerLsCommand(program);
registerPruneCommand(program);

// Parse arguments
program.parse();

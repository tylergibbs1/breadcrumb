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

import { Command } from "commander";
import pkg from "../package.json";
import { registerAddCommand } from "./commands/add.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerCoverageCommand } from "./commands/coverage.js";
import { registerEditCommand } from "./commands/edit.js";
import { registerInitCommand } from "./commands/init.js";
import { registerLsCommand } from "./commands/ls.js";
import { registerPruneCommand } from "./commands/prune.js";
import { registerRmCommand } from "./commands/rm.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerStatusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("breadcrumb")
  .description("Agent-to-agent coordination via file-attached warnings")
  .version(pkg.version);

// Register all commands
registerInitCommand(program);
registerAddCommand(program);
registerEditCommand(program);
registerRmCommand(program);
registerCheckCommand(program);
registerSearchCommand(program);
registerCoverageCommand(program);
registerStatusCommand(program);
registerLsCommand(program);
registerPruneCommand(program);

// Parse arguments
program.parse();

#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { registerAddCommand } from "./commands/add.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerGuardCommand } from "./commands/guard.js";
import { registerInitCommand } from "./commands/init.js";
import { registerLsCommand } from "./commands/ls.js";
import { registerPruneCommand } from "./commands/prune.js";
import { registerRmCommand } from "./commands/rm.js";
import { registerSessionEndCommand } from "./commands/session-end.js";
import { registerShowCommand } from "./commands/show.js";

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const program = new Command();

program
  .name("breadcrumb")
  .description("Agent-first CLI tool for attaching contextual warnings to file paths")
  .version(pkg.version);

// Register all commands
registerInitCommand(program);
registerAddCommand(program);
registerRmCommand(program);
registerCheckCommand(program);
registerGuardCommand(program);
registerLsCommand(program);
registerShowCommand(program);
registerPruneCommand(program);
registerSessionEndCommand(program);

// Parse arguments
program.parse();

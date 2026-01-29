#!/usr/bin/env node

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

const program = new Command();

program
  .name("breadcrumb")
  .description("Agent-first CLI tool for attaching contextual warnings to file paths")
  .version("1.0.0");

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

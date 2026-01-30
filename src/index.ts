#!/usr/bin/env node

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
import { registerVerifyCommand } from "./commands/verify.js";

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
registerVerifyCommand(program);

// Parse arguments
program.parse();

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import { createEmptyConfig, saveConfig } from "../lib/config.js";
import { outputError, outputJson } from "../lib/output.js";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a new .breadcrumbs.json file")
    .option("-f, --force", "Overwrite existing config file")
    .action((options) => {
      const configPath = join(process.cwd(), ".breadcrumbs.json");

      if (existsSync(configPath) && !options.force) {
        outputError("CONFIG_EXISTS", `Config file already exists at ${configPath}. Use --force to overwrite.`);
        process.exit(1);
      }

      const config = createEmptyConfig();
      saveConfig(configPath, config);

      outputJson({
        success: true,
        path: configPath,
        message: "Created .breadcrumbs.json",
      });
    });
}

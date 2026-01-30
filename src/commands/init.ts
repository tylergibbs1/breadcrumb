import { access } from "node:fs/promises";
import { join } from "node:path";
import type { Command } from "commander";
import { createEmptyConfig, saveConfig } from "../lib/config.js";
import { outputError, outputJson } from "../lib/output.js";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a new .breadcrumbs.json file")
    .option("-f, --force", "Overwrite existing config file")
    .action(async (options) => {
      const configPath = join(process.cwd(), ".breadcrumbs.json");

      if ((await fileExists(configPath)) && !options.force) {
        outputError("CONFIG_EXISTS", `Config file already exists at ${configPath}. Use --force to overwrite.`);
        process.exit(1);
      }

      const config = createEmptyConfig();
      await saveConfig(configPath, config);

      outputJson({
        success: true,
        path: configPath,
        message: "Created .breadcrumbs.json",
      });
    });
}

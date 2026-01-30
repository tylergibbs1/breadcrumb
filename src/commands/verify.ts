import { resolve } from "node:path";
import type { Command } from "commander";
import { findConfigPath, loadConfig, saveConfig } from "../lib/config.js";
import { checkStaleness, computeFileHash } from "../lib/hash.js";
import { outputError, outputJson } from "../lib/output.js";
import type { Staleness, VerifyResult } from "../lib/types.js";

export function registerVerifyCommand(program: Command): void {
  program
    .command("verify")
    .description("Check staleness of breadcrumb notes against current file contents")
    .argument("[path]", "Optional path to filter breadcrumbs")
    .option("--update", "Update hashes for verified/stale breadcrumbs")
    .option("--stale-only", "Only show stale breadcrumbs")
    .action(async (path, options) => {
      const configPath = await findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      try {
        const config = await loadConfig(configPath);
        const targetPath = path ? resolve(path) : null;

        // Filter breadcrumbs if path provided
        const breadcrumbsToCheck = targetPath
          ? config.breadcrumbs.filter((b) => {
              const breadcrumbPath = resolve(b.path);
              return breadcrumbPath === targetPath || breadcrumbPath.startsWith(targetPath + "/");
            })
          : config.breadcrumbs;

        if (breadcrumbsToCheck.length === 0) {
          outputJson({
            verified: 0,
            stale: 0,
            unknown: 0,
            breadcrumbs: [],
            message: path ? `No breadcrumbs found for path: ${path}` : "No breadcrumbs in config",
          });
          return;
        }

        const results: VerifyResult["breadcrumbs"] = [];
        let verifiedCount = 0;
        let staleCount = 0;
        let unknownCount = 0;
        let configModified = false;

        for (const breadcrumb of breadcrumbsToCheck) {
          const { staleness, currentHash } = await checkStaleness(
            breadcrumb.code_hash,
            breadcrumb.path,
            breadcrumb.pattern_type
          );

          // Update counts
          switch (staleness) {
            case "verified":
              verifiedCount++;
              break;
            case "stale":
              staleCount++;
              break;
            case "unknown":
              unknownCount++;
              break;
          }

          // Skip unknown if --stale-only
          if (options.staleOnly && staleness !== "stale") {
            continue;
          }

          const resultEntry: VerifyResult["breadcrumbs"][0] = {
            id: breadcrumb.id,
            path: breadcrumb.path,
            staleness,
            message: breadcrumb.message,
          };

          // Include hash info for debugging/transparency
          if (breadcrumb.code_hash) {
            resultEntry.stored_hash = breadcrumb.code_hash;
          }
          if (currentHash) {
            resultEntry.current_hash = currentHash;
          }

          results.push(resultEntry);

          // Update hash if --update flag and we have a valid current hash
          if (options.update && currentHash && breadcrumb.pattern_type === "exact") {
            const configBreadcrumb = config.breadcrumbs.find((b) => b.id === breadcrumb.id);
            if (configBreadcrumb) {
              configBreadcrumb.code_hash = currentHash;
              configBreadcrumb.last_verified = new Date().toISOString();
              configModified = true;
            }
          }
        }

        // Save config if modified
        if (configModified) {
          await saveConfig(configPath, config);
        }

        const output: VerifyResult & { updated?: boolean } = {
          verified: verifiedCount,
          stale: staleCount,
          unknown: unknownCount,
          breadcrumbs: results,
        };

        if (configModified) {
          output.updated = true;
        }

        outputJson(output);

        // Exit with code 1 if any stale breadcrumbs found
        if (staleCount > 0) {
          process.exit(1);
        }
      } catch (error) {
        outputError(
          "VERIFY_FAILED",
          error instanceof Error ? error.message : "Failed to verify breadcrumbs"
        );
        process.exit(1);
      }
    });
}

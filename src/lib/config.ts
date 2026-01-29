import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { isExpired } from "./expiration.js";
import { ConfigSchema } from "./schema.js";
import type { AddedBy, Breadcrumb, BreadcrumbConfig } from "./types.js";

export { isExpired };

const CONFIG_FILENAME = ".breadcrumbs.json";

export function findConfigPath(startDir?: string): string | null {
  const envPath = process.env.BREADCRUMB_FILE;
  if (envPath) {
    return resolve(envPath);
  }

  let currentDir = startDir ? resolve(startDir) : process.cwd();

  while (true) {
    const configPath = join(currentDir, CONFIG_FILENAME);
    if (existsSync(configPath)) {
      return configPath;
    }
    const parent = dirname(currentDir);
    if (parent === currentDir) break; // Reached filesystem root
    currentDir = parent;
  }

  return null;
}

export function loadConfig(configPath: string): BreadcrumbConfig {
  const content = readFileSync(configPath, "utf-8");
  const data = JSON.parse(content);
  const result = ConfigSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }

  return result.data as BreadcrumbConfig;
}

export function saveConfig(configPath: string, config: BreadcrumbConfig): void {
  const content = JSON.stringify(config, null, 2) + "\n";
  writeFileSync(configPath, content, "utf-8");
}

export function createEmptyConfig(): BreadcrumbConfig {
  return {
    version: 2,
    breadcrumbs: [],
  };
}

export function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "b_";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function findBreadcrumbByPath(
  config: BreadcrumbConfig,
  path: string
): Breadcrumb | undefined {
  return config.breadcrumbs.find((b) => b.path === path);
}

export function findBreadcrumbById(
  config: BreadcrumbConfig,
  id: string
): Breadcrumb | undefined {
  return config.breadcrumbs.find((b) => b.id === id);
}

export interface BuildAddedByOptions {
  sessionId?: string;
  task?: string;
}

export function buildAddedBy(options: BuildAddedByOptions = {}): AddedBy {
  const agentId = process.env.BREADCRUMB_AUTHOR || "agent";
  const addedBy: AddedBy = { agent_id: agentId };

  if (options.sessionId) {
    addedBy.session_id = options.sessionId;
  }
  if (options.task) {
    addedBy.task = options.task;
  }

  return addedBy;
}


import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { isExpired } from "./expiration.js";
import { ConfigSchema } from "./schema.js";
import type { AddedBy, Breadcrumb, BreadcrumbConfig } from "./types.js";

export { isExpired };

const CONFIG_FILENAME = ".breadcrumbs.json";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function findConfigPath(startDir?: string): Promise<string | null> {
  const envPath = process.env.BREADCRUMB_FILE;
  if (envPath) {
    return resolve(envPath);
  }

  let currentDir = startDir ? resolve(startDir) : process.cwd();

  while (true) {
    const configPath = join(currentDir, CONFIG_FILENAME);
    if (await fileExists(configPath)) {
      return configPath;
    }
    const parent = dirname(currentDir);
    if (parent === currentDir) break; // Reached filesystem root
    currentDir = parent;
  }

  return null;
}

export async function loadConfig(configPath: string): Promise<BreadcrumbConfig> {
  const content = await readFile(configPath, "utf-8");
  const data = JSON.parse(content);
  const result = ConfigSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }

  return result.data as BreadcrumbConfig;
}

export async function saveConfig(configPath: string, config: BreadcrumbConfig): Promise<void> {
  const content = JSON.stringify(config, null, 2) + "\n";
  await writeFile(configPath, content, "utf-8");
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

export function buildAddedBy(): AddedBy {
  const agentId = process.env.BREADCRUMB_AUTHOR || "agent";
  return { agent_id: agentId };
}


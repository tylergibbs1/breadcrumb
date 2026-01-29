import type { ErrorResult } from "./types.js";

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(code: string, message: string): void {
  const error: ErrorResult = {
    error: true,
    code,
    message,
  };
  console.error(JSON.stringify(error, null, 2));
}

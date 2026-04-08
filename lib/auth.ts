const SHARED_KEY = process.env.HOSH_SHARED_KEY || "F62ZEsnlSTMHYG3WT4REfZVIXcUcTkRW";

export function validateKey(key: string | undefined): boolean {
  return typeof key === "string" && key.length > 0 && key === SHARED_KEY;
}
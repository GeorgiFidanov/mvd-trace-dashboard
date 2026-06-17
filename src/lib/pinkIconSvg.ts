import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Pink Panther mark for Next.js app icons (favicon / apple-touch). */
export function getPinkIconSvg(): string {
  const svg = readFileSync(join(process.cwd(), "public", "favicon.svg"), "utf8");
  return svg.replace(/width="100%"\s+height="auto"/, 'width="447" height="447"');
}

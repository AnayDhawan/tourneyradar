import fs from "fs";
import path from "path";

export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string | null;
  description: string | null;
  sections: ChangelogSection[];
}

const VERSION_RE = /^## \[(.+?)\](?: - (\d{4}-\d{2}-\d{2}))?\s*$/;
const SECTION_RE = /^### (.+?)\s*$/;
const BULLET_RE = /^- (.+)$/;
const REF_LINK_RE = /^\[.+?\]: https?:\/\//;

/**
 * Parses the repo root CHANGELOG.md (Keep a Changelog format) into
 * structured releases for the /updates page. Reused rather than a new
 * table/CMS -- the file is already the real, maintained source of truth.
 */
export function getChangelog(): ChangelogRelease[] {
  const filePath = path.join(process.cwd(), "CHANGELOG.md");
  const raw = fs.readFileSync(filePath, "utf-8");
  // CRLF: split on \r?\n rather than bare \n, otherwise a trailing \r
  // survives on every line. That silently breaks BULLET_RE below -- \r
  // counts as a line terminator in JS regex, so `.` can't consume it and a
  // bare `$` won't match past it (version/section regexes only survived
  // because they end in `\s*$`, which does absorb \r).
  const lines = raw.split(/\r?\n/);

  const releases: ChangelogRelease[] = [];
  let current: ChangelogRelease | null = null;
  let currentSection: ChangelogSection | null = null;
  let lastBulletIndex = -1;

  for (const line of lines) {
    if (REF_LINK_RE.test(line)) continue;

    const versionMatch = line.match(VERSION_RE);
    if (versionMatch) {
      current = {
        version: versionMatch[1],
        date: versionMatch[2] ?? null,
        description: null,
        sections: [],
      };
      releases.push(current);
      currentSection = null;
      lastBulletIndex = -1;
      continue;
    }

    if (!current) continue;

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      currentSection = { title: sectionMatch[1], items: [] };
      current.sections.push(currentSection);
      lastBulletIndex = -1;
      continue;
    }

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch && currentSection) {
      currentSection.items.push(bulletMatch[1]);
      lastBulletIndex = currentSection.items.length - 1;
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (currentSection && lastBulletIndex >= 0) {
      // Wrapped continuation of the previous bullet.
      currentSection.items[lastBulletIndex] += " " + trimmed;
    } else if (!currentSection) {
      // Plain paragraph directly under a version header, before any ###.
      current.description = current.description ? `${current.description} ${trimmed}` : trimmed;
    }
  }

  return releases;
}

/** The newest release's version string, used as the popup's "seen" marker. */
export function getLatestVersion(): string | null {
  return getChangelog()[0]?.version ?? null;
}

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MEMORY_DIRECTORIES = [
  "bugs",
  "investigations",
  "adr",
  "runbooks",
  "plans",
] as const;
const MAX_RESULTS = 6;

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "before",
  "build",
  "can",
  "code",
  "could",
  "current",
  "did",
  "docs",
  "document",
  "does",
  "file",
  "for",
  "from",
  "good",
  "great",
  "have",
  "help",
  "here",
  "how",
  "into",
  "just",
  "look",
  "looks",
  "make",
  "memory",
  "more",
  "need",
  "other",
  "please",
  "project",
  "should",
  "some",
  "something",
  "sounds",
  "test",
  "tests",
  "thank",
  "thanks",
  "that",
  "the",
  "their",
  "there",
  "these",
  "thing",
  "things",
  "this",
  "using",
  "verification",
  "verify",
  "want",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "why",
  "with",
  "work",
  "working",
  "would",
  "your",
]);

type MemoryMatch = {
  path: string;
  title: string;
  category: (typeof MEMORY_DIRECTORIES)[number];
  score: number;
  matchedTerms: string[];
  modifiedAt: number;
};

function projectRoot(cwd: string): string {
  let current = path.resolve(cwd);

  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(cwd);
    current = parent;
  }
}

function normalizeTerm(term: string): string {
  if (term.length > 4 && term.endsWith("s")) return term.slice(0, -1);
  return term;
}

function termsIn(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((term) => term.length >= 3 && !STOPWORDS.has(term))
      .map(normalizeTerm),
  );
}

function markdownTitle(content: string, fallback: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback.replace(/\.md$/, "").replaceAll("-", " ");
}

function memoryFiles(root: string): Array<{
  absolutePath: string;
  relativePath: string;
  category: MemoryMatch["category"];
}> {
  const files: Array<{
    absolutePath: string;
    relativePath: string;
    category: MemoryMatch["category"];
  }> = [];

  for (const category of MEMORY_DIRECTORIES) {
    const directory = path.join(root, "docs", category);
    if (!fs.existsSync(directory)) continue;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      if (entry.name === "README.md" || entry.name === "TEMPLATE.md") continue;
      files.push({
        absolutePath: path.join(directory, entry.name),
        relativePath: path.posix.join("docs", category, entry.name),
        category,
      });
    }
  }

  return files;
}

export function findMemoryMatches(cwd: string, query: string): MemoryMatch[] {
  const root = projectRoot(cwd);
  const queryTerms = termsIn(query);
  if (queryTerms.size === 0) return [];

  const matches: MemoryMatch[] = [];

  for (const file of memoryFiles(root)) {
    const content = fs.readFileSync(file.absolutePath, "utf8");
    const title = markdownTitle(content, path.basename(file.absolutePath));
    const titleTerms = termsIn(title);
    const bodyTerms = termsIn(content);
    const matchedTerms = [...queryTerms].filter((term) => bodyTerms.has(term));
    const titleMatches = matchedTerms.filter((term) => titleTerms.has(term));
    const hasSpecificMatch = matchedTerms.some(
      (term) =>
        term.length >= 5 && (titleTerms.has(term) || queryTerms.size === 1),
    );

    if (matchedTerms.length < 2 && !hasSpecificMatch) continue;

    matches.push({
      path: file.relativePath,
      title,
      category: file.category,
      score: matchedTerms.length + titleMatches.length * 3,
      matchedTerms,
      modifiedAt: fs.statSync(file.absolutePath).mtimeMs,
    });
  }

  return matches
    .sort(
      (left, right) =>
        right.score - left.score || right.modifiedAt - left.modifiedAt,
    )
    .slice(0, MAX_RESULTS);
}

export default function projectMemoryExtension(pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, ctx) => {
    const matches = findMemoryMatches(ctx.cwd, event.prompt);
    if (matches.length === 0) return;

    const list = matches
      .map(
        (match) =>
          `- \`${match.path}\` — ${match.title} (${match.category}; matched: ${match.matchedTerms.join(", ")})`,
      )
      .join("\n");

    return {
      systemPrompt:
        event.systemPrompt +
        `\n\n## Potentially relevant project memory\n\nA keyword index found these possible matches:\n${list}\n\nRead only the entries that are actually relevant before investigating from scratch. These documents are evidence, not guaranteed current truth: verify stale claims against code, tests, configuration, and the issue tracker. Plans describe intent and are never authoritative for current behavior.`,
    };
  });
}

import {
  failWithErrors,
  fileExists,
  listDocMarkdownFiles,
  readFile,
} from "./_shared.mjs";

const indexFile = "docs/DOCS-INDEX.md";
const indexText = readFile(indexFile);
const errors = [];

const referencedPaths = new Set(
  [
    ...indexText.matchAll(
      /\b(?:AGENTS\.md|docs\/[A-Za-z0-9._/-]+\.(?:md|png|d2))\b/g,
    ),
  ].map((match) => match[0]),
);

for (const referencedPath of referencedPaths) {
  if (!fileExists(referencedPath)) {
    errors.push(`[docs:check:index] missing on disk: ${referencedPath}`);
  }
}

function isAllowedOrphan(relativePath) {
  return (
    relativePath === indexFile ||
    relativePath.startsWith("docs/exec-plans/active/") ||
    relativePath.startsWith("docs/exec-plans/completed/")
  );
}

for (const markdownFile of listDocMarkdownFiles()) {
  if (isAllowedOrphan(markdownFile)) {
    continue;
  }

  if (!referencedPaths.has(markdownFile)) {
    errors.push(`[docs:check:index] missing in DOCS-INDEX: ${markdownFile}`);
  }
}

if (errors.length === 0) {
  console.log("docs:check:index ok");
}

failWithErrors(errors);

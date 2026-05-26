import { failWithErrors, listDocMarkdownFiles, readFile } from "./_shared.mjs";

const DOCUMENT_RULES = {
  "AGENTS.md": {
    requiredPatterns: [
      /docs\/DOCS-INDEX\.md/,
      /docs\/PLANS\.md/,
      /## 5\. Документационная гигиена/,
      /## 6\. Планы и lifecycle задач/,
      /последние стабильные версии/,
      /docs\/exec-plans\/active\//,
      /docs\/exec-plans\/completed\//,
    ],
  },
  "docs/DOCS-INDEX.md": {
    requiredPatterns: [
      /## Основные документы/,
      /## Структура и назначение/,
      /## Docs Harness/,
      /AGENTS\.md/,
      /docs\/crm-requirements\.md/,
      /docs\/TECH-STACK\.md/,
      /docs\/exec-plans\/deferred-roadmap\.md/,
      /docs\/exec-plans\/tech-debt-tracker\.md/,
    ],
  },
  "docs/PLANS.md": {
    requiredPatterns: [
      /## 1\. Когда нужен execution plan/,
      /## 3\. Где хранить планы/,
      /## 4\. Lifecycle/,
      /docs\/exec-plans\/active\//,
      /docs\/exec-plans\/completed\//,
      /docs\/exec-plans\/deferred-roadmap\.md/,
      /docs\/exec-plans\/tech-debt-tracker\.md/,
    ],
  },
  "docs/DEVELOPMENT.md": {
    requiredPatterns: [
      /## 1\. Цель dev-contour/,
      /## 3\. Локальная разработка/,
      /## 5\. Verification commands/,
      /## 7\. Docs harness target/,
      /OrbStack/,
    ],
  },
  "docs/ARCHITECTURE-PRINCIPLES.md": {
    requiredPatterns: [
      /## 1\. Главный вектор/,
      /## 3\. Архитектурные правила кода/,
      /## 6\. Транзакции, конкуренция и история/,
      /## 10\. Тестирование/,
      /## 12\. Auth direction/,
      /последние стабильные версии/,
      /high\/critical уязвимости/,
    ],
  },
  "docs/TECH-STACK.md": {
    requiredPatterns: [
      /## 1\. Общая структура/,
      /## 2\. Frontend/,
      /## 3\. Backend/,
      /## 4\. Auth/,
      /## 5\.1 Dependency policy/,
      /## 6\. Docker для разработки/,
      /BetterAuth/,
      /OrbStack/,
      /последние стабильные версии/,
    ],
  },
  "docs/DECISIONS.md": {
    requiredPatterns: [
      /## DEC-01 — Базовый стек/,
      /## DEC-02 — Docker dev-contour/,
      /## DEC-03 — Auth direction/,
      /## DEC-04 — Docs harness/,
    ],
  },
};

const PLACEHOLDER_DOCS = [
  "docs/ARCHITECTURE.md",
  "docs/SECURITY.md",
  "docs/FRONTEND.md",
  "docs/RELIABILITY.md",
  "docs/DOMAIN-EVENTS.md",
  "docs/HANDLER-MAP.md",
];

const FORBIDDEN_PATTERNS = [
  /Континуум/i,
  /\bcontinuum\b/i,
  /\bteacher\b/i,
  /\bstudent\b/i,
  /учител/i,
  /ученик/i,
  /\bLaTeX\b/i,
  /\blatex\b/i,
  /\bS3\b/,
  /\bMinIO\b/i,
  /\bRedis\b/i,
  /\bBullMQ\b/i,
  /\bReactFlow\b/i,
  /\bCodeMirror\b/i,
  /\bKaTeX\b/i,
  /\bMathJax\b/i,
  /\bОГЭ\b/i,
  /\bphysics\b/i,
  /другого проекта/i,
  /перенес[её]н/i,
];

const errors = [];
const checkedFiles = ["AGENTS.md", ...listDocMarkdownFiles()];

for (const [filePath, rules] of Object.entries(DOCUMENT_RULES)) {
  const fileContent = readFile(filePath);

  for (const pattern of rules.requiredPatterns) {
    if (!pattern.test(fileContent)) {
      errors.push(
        `[docs:check:status] required pattern ${pattern} not found in ${filePath}`,
      );
    }
  }
}

for (const filePath of PLACEHOLDER_DOCS) {
  const fileContent = readFile(filePath);

  if (!/Статус: `(?:Draft|Placeholder)`/.test(fileContent)) {
    errors.push(`[docs:check:status] missing draft/placeholder status in ${filePath}`);
  }

  if (!/не фиксир|не является финальным|не описывать вымышленные|Заполнить после/i.test(fileContent)) {
    errors.push(
      `[docs:check:status] placeholder should guard against premature decisions: ${filePath}`,
    );
  }
}

for (const filePath of checkedFiles) {
  const fileContent = readFile(filePath);

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(fileContent)) {
      errors.push(
        `[docs:check:status] forbidden old-project term ${pattern} found in ${filePath}`,
      );
    }
  }
}

if (errors.length === 0) {
  console.log("docs:check:status ok");
}

failWithErrors(errors);

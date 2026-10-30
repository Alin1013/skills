---
name: xmind-test-cases
description: Generate reviewable functional test cases from XMind test-point maps or normalized XMind trees and deliver them as validated Excel workbooks. Use when a user wants .xmind content converted into structured Chinese test cases compatible with the test-platform case schema; do not use for executing tests or converting an unrelated existing case spreadsheet.
---

# XMind Test Cases

Turn XMind test points into atomic, executable functional test cases while preserving the source map's business language and hierarchy. JSON is an internal canonical representation; the user-facing deliverable is always an `.xlsx` workbook.

## Workflow

1. Resolve the input files. Prefer files named by the user. When only a directory or project is named, discover `.xmind` files, exclude dependency/build/VCS directories, and de-duplicate byte-identical files before generation.
2. For every `.xmind` file, run `python3 scripts/extract_xmind.py <file>`. The script supports modern `content.json` and XMind 8 `content.xml` archives and returns normalized topic trees. Stop and report the file-specific parser error when extraction fails.
3. Read [references/case-contract.md](references/case-contract.md) before generating cases. Treat it as the output and quality contract.
4. Interpret the tree semantically. Root and first-level nodes usually establish the case directory; intermediate nodes may be features, conditions, test dimensions, or context; leaves may be test points, input values, constraints, or expected states. Combine related nodes into a scenario instead of blindly turning every leaf into a case.
5. Generate one case per independently verifiable scenario. Use only behavior supported by the tree or user-provided product context. Preserve exact UI terms and stated limits. Mark unresolved requirements as assumptions outside the case data rather than inventing product behavior.
6. Write a UTF-8 canonical intermediate object shaped as `{"cases": [...]}`. Name it from the source file, for example `feature.xmind` becomes `feature-cases.json`. When multiple source files are processed, keep one intermediate result per source and provide a short aggregate count.
7. Run `python3 scripts/validate_cases.py <result.json>`. Fix every reported violation before conversion. Completion of this phase means every source scope is represented, every case passes the JSON contract, and any assumptions or uncovered ambiguous branches are reported separately.
8. Load the bundled workspace dependencies, create a temporary `node_modules/@oai` symlink if needed, and convert each validated JSON file to Excel with `CODEX_NODE_MODULES=<runtime-node-modules> node scripts/json_to_xlsx.mjs <result.json> --output <result.xlsx>`. The converter uses the bundled `@oai/artifact-tool` runtime, preserves the exact 12 contract fields and values, and creates a readable table with filters, wrapped text, and frozen headers.
9. Run `node scripts/validate_xlsx.mjs <result.xlsx>` and fix every reported violation. Deliver the `.xlsx` file as the primary artifact; JSON is an intermediate file and should only be included when the user explicitly asks for it.

## Generation Rules

- Cover the main positive flow and the meaningful negative, boundary, permission, empty-state, duplicate-action, and failure-recovery branches present in the map.
- Keep a case atomic. Split scenarios when setup, action, or observable outcome differs materially.
- Use numbered preconditions, steps, and expected results. Every action step must have a corresponding observable result at the same number.
- Derive smoke status from business criticality: core happy paths are `是`; boundary, exception, permission, and auxiliary paths are normally `否`.
- Prefer fewer complete cases over many context-free leaf copies. Never claim coverage for a branch that was skipped or too ambiguous to implement.

## Output Contract

The 12-field JSON contract in [references/case-contract.md](references/case-contract.md) remains the canonical data contract, but the required user-facing output is an `.xlsx` workbook. The first worksheet must be named `测试用例`, contain one header row followed by one row per case, and preserve field names and values exactly. Do not silently drop assumptions or coverage notes; report them alongside the workbook in the response or a separate text file.

## Conversion and Validation

- `scripts/json_to_xlsx.mjs` is the single supported JSON-to-XLSX conversion path. It must be run with the bundled Node.js/runtime dependencies discovered through `load_workspace_dependencies`.
- `scripts/validate_xlsx.mjs` checks that the workbook opens, has the required sheet and exact 12-column header order, has at least one case row, and contains no blank required fields or invalid enum values.
- The converter must not invent, normalize, truncate, or reformat case field values. Newlines in preconditions, steps, and expected results remain inside wrapped cells.
- CSV is not a final output variant for this skill. If a caller asks for CSV, still generate and validate the XLSX first, then create CSV only as an additional export.

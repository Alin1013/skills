---
name: tapd-mcp-test-report
description: Use when the user wants a detailed iteration-level TAPD test report in standalone HTML from a project and iteration they identify, including requirement, bug, bug-field, and test-case statistics read through the connected TAPD MCP.
---

# TAPD MCP Test Report

Produce a detailed, evidence-based Chinese HTML report from the TAPD project space and iteration the user supplies. Use only the connected `mcp__tapd__*` read tools; this skill is read-only and never creates or changes TAPD records. The referenced server implementation is [TencentCloudCommunity/mcp-server-tapd](https://github.com/TencentCloudCommunity/mcp-server/tree/main/src/mcp-server-tapd).

## Run

1. Confirm the requested workspace and iteration identifiers or exact names. If either name resolves to multiple candidates, show the candidates and ask the user to choose before querying report data. Record the resolved IDs and names as the report scope.
2. Confirm that the connected `mcp__tapd__*` tools are available. Use only read tools such as `get_workspace_info`, `get_iterations`, `get_story_or_task_count`, `get_stories_or_tasks`, `get_bug_count`, `get_bug`, `get_entity_custom_fields`, `get_entity_relations`, and `get_tcases`. If TAPD MCP is unavailable, stop and explain the missing connection; do not fall back to raw API calls or user-provided credentials.
3. Resolve the workspace and iteration from live MCP results. Query iteration-scoped stories and bugs, then fetch every page until the MCP count and retrieved unique records confirm completion. Keep the iteration filter on every query that supports it. If a query does not support iteration filtering, fetch workspace records and filter against the resolved iteration ID locally. Report any mismatch between advertised totals and retrieved unique records.
4. Discover the project's story and bug field definitions, including custom fields and their labels/options, with `get_entity_custom_fields` before querying custom fields. Fetch all bug fields exposed by MCP, including full descriptions/content and custom fields. When field projection is required, request the complete discovered field list rather than a guessed subset. Preserve raw field values for aggregation; render empty values as “未填写”.
5. Count stories separately as infrastructure/foundation requirements and product requirements. Use an explicit TAPD category/type/custom field and its configured values to classify. If no unambiguous field/value mapping exists, keep the record in “未分类需求” and disclose the mapping gap; do not infer classification from title wording alone. Do not count tasks as requirements unless the user explicitly includes them.
6. Identify the bug field labelled “发现阶段” (including its discovered custom-field key), and use its actual configured values to classify test-stage-found bugs and post-release-found bugs. Do not substitute bug status, creation date, or release field for discovery stage. Keep missing or unrecognized values in “未填写/其他发现阶段”. Show both subtotals and their sum, and ensure they reconcile to the unique bug total.
7. Produce bug metrics from the full bug set: total count; bug-to-requirement ratio (bugs : requirements, with a numeric ratio where the requirement denominator is nonzero); and three horizontal-category/vertical-count distributions: severity, developer, and module. Use TAPD's severity values as returned, include “未填写” buckets, normalize only exact duplicate labels, and verify each chart's category counts sum to the bug total. Do not describe these counts as personal performance.
8. Read bug titles and descriptions for the complete iteration bug set before synthesizing module-level findings. Summarize the main issue patterns by module, cite representative TAPD IDs/links and field evidence, distinguish observed symptoms from suspected causes, and propose actionable process or product improvements with verifiable acceptance criteria. If descriptions are absent or inaccessible, label the synthesis as data-limited instead of inventing causes.
9. Count test cases belonging to the iteration. Prefer `get_entity_relations(relation_type="story_tcase")` for each iteration story, deduplicate by test-case ID, and include the relationship path and excluded/unlinked cases in the report. If a direct test-case iteration custom field exists, use it only when its configured value maps unambiguously to the named iteration. Do not count every test case in the workspace as an iteration case. If neither relation can be queried, report “无法统计” with the exact data limitation, not zero.
10. Generate a standalone UTF-8 HTML file, defaulting to `outputs/` in the current workspace (create that directory only if needed) unless the user specifies another location. Use a restrained, clean visual style; make tables readable, display the three distributions as horizontal-category/vertical-count charts, and keep all CSS inline. Do not require remote assets, external stylesheets, JavaScript, or network access to open the report.
11. Before delivery, verify that the HTML opens as a complete document, all expected sections and charts are present, numbers reconcile to retrieved unique records, requirement and bug totals match their subtotals, test cases are deduplicated, every classification/data gap is disclosed, and no placeholder text remains. Return a short summary and a clickable link to the HTML file.

## Report contents

- Scope: workspace and iteration names/IDs, generation time, queried record totals, and data completeness.
- Requirements: total, infrastructure/foundation requirement count, product requirement count, and unclassified count where applicable.
- Bugs: total, test-stage-found count, post-release-found count, unclassified discovery-stage count, and bug-to-requirement ratio.
- Bug distributions: severity, developer, and module, each with counts and a visible total.
- Findings and improvements: module-level issue patterns, evidence-linked representative bugs, suspected causes clearly marked as hypotheses, and actionable improvements with acceptance criteria.
- Test cases: unique iteration-scoped count, association method, and any unlinked/unknown boundary.
- Methodology and limitations: concise field mappings, filters, pagination completeness, and failed or unavailable queries.

Link TAPD stories as `https://www.tapd.cn/{workspace_id}/prong/stories/view/{story_id}` and bugs as `https://www.tapd.cn/{workspace_id}/bugtrace/bugs/view/{bug_id}` when these standard links are accessible for the project.

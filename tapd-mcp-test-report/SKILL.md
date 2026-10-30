---
name: tapd-mcp-test-report
description: Use when the user wants a detailed iteration-level TAPD test report in standalone HTML from a project and iteration they identify, including requirement, bug, bug-field, and test-case statistics read through the connected TAPD MCP.
---

# TAPD MCP Test Report

Produce a detailed, evidence-based Chinese HTML report from the TAPD project space and iteration the user supplies. Use only the connected `mcp__tapd__*` read tools; this skill is read-only and never creates or changes TAPD records. The referenced server implementation is [TencentCloudCommunity/mcp-server-tapd](https://github.com/TencentCloudCommunity/mcp-server/tree/main/src/mcp-server-tapd).

## Run

1. Confirm the requested workspace and iteration identifiers or exact names. If either name resolves to multiple candidates, show the candidates and ask the user to choose before querying report data. Record the resolved IDs and names as the report scope.
2. Confirm that the connected `mcp__tapd__*` tools are available. Use only read tools such as `get_workspace_info`, `get_iterations`, `get_story_or_task_count`, `get_stories_or_tasks`, `get_bug_count`, `get_bug`, `get_entity_custom_fields`, `get_entity_relations`, and `get_tcases`. If TAPD MCP is unavailable, stop and explain the missing connection; do not fall back to raw API calls or user-provided credentials.
3. Resolve the workspace and iteration from live MCP results. Query iteration-scoped stories and bugs, then fetch every page until the advertised MCP count, fetched row count, and unique ID count agree. Keep the iteration filter on every query that supports it. If a query does not support iteration filtering, fetch workspace records and filter against the resolved iteration ID locally. Record the filter and disclose any unresolved mismatch before reporting a total.
4. Discover story and bug field definitions with `get_entity_custom_fields` before querying custom fields. Also read story status options and labels with `get_stories_fields_info`; map each returned status code to the TAPD display label in requirement tables and summaries, rather than showing internal values such as `status_11`. Preserve raw values for auditability.
5. Fetch the complete bug fields exposed by MCP, including title, full description/content, standard fields, and every discovered custom field. When `fields` projection is required, request the complete discovered list rather than a guessed subset. Retain raw field values, then render absent or empty values as “未填写”. Aggregate from one stable full-field result set.
6. Validate field projection before trusting aggregates. If a field distribution changes between queries, or a projected response appears to fill values unexpectedly, fetch a small ID-selected sample with only the disputed field(s), compare it with the full-field result, and repeat the aggregate with a stable projection. Do not silently choose one conflicting result; disclose an unresolved MCP inconsistency and withhold the affected metric if it cannot be reconciled.
7. Count stories separately as infrastructure/foundation requirements and product requirements. Use an explicit configured TAPD category/type field and its option mapping; do not infer type from title wording or substitute module when an explicit type exists. If no unambiguous mapping exists, retain “未分类需求” and disclose the gap. Do not count tasks as requirements unless explicitly included.
8. Identify the actual bug field labelled “发现阶段”, including its key and configured values, and use those values to classify test-stage-found and post-release-found bugs. TAPD may expose `originphase` as a standard bug field rather than a `custom_field_*` entry; inspect returned field labels/options and records instead of assuming every relevant field is custom. Keep a similarly named semantic flag (for example, “迭代需求缺陷” / `custom_field_10`) separate, report its own distribution, and never assume it is populated or equivalent to `originphase`. Do not substitute status, creation date, release date, or module for discovery stage. Keep missing/unrecognized values in “未填写/其他发现阶段”; subtotals must reconcile to unique bug IDs.
9. Keep field dimensions distinct: “模块未填写” means `module` is empty, while “发现阶段未填写” means the discovered-stage field is empty. Query each independently when useful and report both; never infer one missing count from another.
10. Produce bug metrics from the complete unique iteration bug set: total count; bug-to-requirement ratio; and severity, developer, and module distributions. Use TAPD severity values as returned, include missing-value buckets, show every developer individually without an “other” bucket, and do not describe counts as personal performance. Split multi-assignee bugs across each listed developer and disclose that assignment occurrences can exceed unique bugs. Severity and module counts must reconcile to unique bug count.
11. Read titles and descriptions for the complete iteration bug set before synthesizing module-level findings. Cite representative TAPD IDs/links and field evidence, distinguish observed symptoms from suspected causes, and propose improvements with verifiable acceptance criteria. If descriptions are absent or inaccessible, label the synthesis data-limited. Include every non-closed bug in the review queue with assigned developer(s) and current owner/handler, and state the exact status rule for “未闭环”.

12. Count iteration test cases through `get_entity_relations(relation_type="story_tcase")` for each story, deduplicating by nested `tcase_id` rather than relation-record ID. Include the relationship path and unlinked/unknown boundary. Use a direct test-case iteration field only when its configured value maps unambiguously to the requested iteration. Never count every workspace case; if neither route is available, report “无法统计”, not zero.

13. Generate a standalone UTF-8 HTML file in `outputs/` by default. Keep CSS inline and make the document render without JavaScript, remote assets, external stylesheets, or network access.

14. Before delivery, verify complete document structure, expected sections, links, and charts; reconcile requirement, bug, severity, module, and discovery-stage totals to unique records; validate developer-assignment and test-case deduplication rules; disclose every data gap; scan for placeholders and credentials/secrets; and ensure the generation timestamp matches the data snapshot.

## Report contents

- Scope: workspace and iteration names/IDs, generation time, queried record totals, and data completeness.
- Requirements: total, infrastructure/foundation requirement count, product requirement count, and unclassified count where applicable.
- Bugs: total, test-stage-found count, post-release-found count, unclassified discovery-stage count, and bug-to-requirement ratio. Report similarly named custom flags separately from the discovered-stage field.
- Bug distributions: severity, developer, and module, each with counts and a visible total. Show every developer; explain multi-assignee counting if assignment occurrences exceed unique bugs.
- Findings and improvements: module-level issue patterns, evidence-linked representative bugs, suspected causes clearly marked as hypotheses, and actionable improvements with acceptance criteria.
- Test cases: unique iteration-scoped count, association method, and any unlinked/unknown boundary.
- Methodology and limitations: concise field mappings (including the distinction between `module`, `originphase`, and similarly named custom flags), status-label mapping, filters, pagination/projection completeness, and failed or unavailable queries.

Link TAPD stories as `https://www.tapd.cn/{workspace_id}/prong/stories/view/{story_id}` and bugs as `https://www.tapd.cn/{workspace_id}/bugtrace/bugs/view/{bug_id}` when these standard links are accessible for the project.

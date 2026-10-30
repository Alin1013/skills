/**
 * 将通过 JSON 契约校验的 XMind 用例转换为可交付的 Excel 工作簿。
 * 这里保持字段和值的原样，只负责表格结构、筛选和可读性格式。
 */

import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// 允许调用方在会话临时目录提供 node_modules，避免把运行时依赖写进技能目录。
const require = createRequire(import.meta.url);
const artifactTool = await import(
  require.resolve("@oai/artifact-tool", {
    paths: [process.env.CODEX_NODE_MODULES || path.join(process.cwd(), "node_modules")],
  }),
);
const { SpreadsheetFile, Workbook } = artifactTool;

const FIELDS = [
  "用例目录",
  "用例名称",
  "需求ID",
  "前置条件",
  "用例步骤",
  "预期结果",
  "用例类型",
  "用例状态",
  "用例等级",
  "创建人",
  "归属迭代",
  "是否冒烟",
];

/**
 * 解析仅支持的位置参数和输出参数，避免把未知参数静默当成文件路径。
 * @returns {{ input: string, output: string }} 输入 JSON 与输出 XLSX 路径。
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const input = args[0];
  const outputIndex = args.indexOf("--output");
  const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  if (!input || !output || output.startsWith("--")) {
    throw new Error("用法：node scripts/json_to_xlsx.mjs <result.json> --output <result.xlsx>");
  }
  return { input, output };
}

/**
 * 读取并确认中间 JSON 仍符合最小结构；完整业务校验由 validate_cases.py 负责。
 * @param {string} inputPath JSON 文件路径。
 * @returns {Promise<Array<Record<string, string>>>} 按契约顺序的用例对象。
 */
async function readCases(inputPath) {
  const payload = JSON.parse(await fs.readFile(inputPath, "utf8"));
  if (!payload || !Array.isArray(payload.cases) || payload.cases.length === 0) {
    throw new Error('JSON 根对象必须包含非空的 "cases" 数组');
  }
  for (const [index, caseItem] of payload.cases.entries()) {
    if (!caseItem || typeof caseItem !== "object" || FIELDS.some((field) => typeof caseItem[field] !== "string")) {
      throw new Error(`cases[${index}] 未提供完整的 12 个字符串字段`);
    }
  }
  return payload.cases;
}

/**
 * 创建单工作表用例表，冻结表头并开启自动筛选，方便测试人员直接审阅。
 * @param {Array<Record<string, string>>} cases 已校验的用例。
 * @returns {import("@oai/artifact-tool").Workbook} 新建工作簿。
 */
function buildWorkbook(cases) {
  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add("测试用例");
  sheet.showGridLines = false;

  const rows = [FIELDS, ...cases.map((caseItem) => FIELDS.map((field) => caseItem[field]))];
  const usedRange = sheet.getRangeByIndexes(0, 0, rows.length, FIELDS.length);
  usedRange.values = rows;
  usedRange.format.font = { name: "Arial", size: 10, color: "#1F2937" };
  usedRange.format.verticalAlignment = "center";
  usedRange.format.wrapText = true;
  usedRange.format.borders = { preset: "insideHorizontal", style: "thin", color: "#D9E2F3" };

  const header = sheet.getRange("A1:L1");
  header.format.fill = "#1F4E78";
  header.format.font = { name: "Arial", size: 10, bold: true, color: "#FFFFFF" };
  header.format.horizontalAlignment = "center";
  header.format.rowHeight = 28;
  header.format.borders = { preset: "all", style: "thin", color: "#FFFFFF" };

  // 固定长文本列宽，避免自动适配把步骤/结果列拉到不可读的宽度。
  const widths = [28, 32, 14, 38, 44, 44, 14, 14, 12, 14, 14, 12];
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, rows.length, 1).format.columnWidth = width;
  });
  sheet.getRange(`A2:L${rows.length}`).format.rowHeight = 54;
  sheet.freezePanes.freezeRows(1);
  sheet.tables.add(`A1:L${rows.length}`, true, "TestCasesTable");
  return workbook;
}

/**
 * 执行转换并写入目标文件。
 */
async function main() {
  const { input, output } = parseArgs();
  const cases = await readCases(input);
  const workbook = buildWorkbook(cases);
  workbook.recalculate();
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  const file = await SpreadsheetFile.exportXlsx(workbook);
  await file.save(output);
  console.log(`已生成 Excel：${output}（${cases.length} 条用例）`);
}

main().catch((error) => {
  console.error(`生成失败：${error.message}`);
  process.exitCode = 1;
});

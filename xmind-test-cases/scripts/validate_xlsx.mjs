/**
 * 校验 XMind 用例 Excel 交付物的工作表、字段顺序、枚举值和编号结构。
 * 该校验故意独立于 JSON 校验，确保导出过程没有丢列或改值。
 */

import { createRequire } from "node:module";
import path from "node:path";

// 与转换脚本使用同一运行时发现策略，保证技能目录保持无依赖污染。
const require = createRequire(import.meta.url);
const artifactTool = await import(
  require.resolve("@oai/artifact-tool", {
    paths: [process.env.CODEX_NODE_MODULES || path.join(process.cwd(), "node_modules")],
  }),
);
const { FileBlob, SpreadsheetFile } = artifactTool;

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
const OPTIONAL_TEXT_FIELDS = new Set(["需求ID", "创建人", "归属迭代"]);

/**
 * 检查多行编号是否从 1 连续递增。
 * @param {unknown} value 单元格内容。
 * @returns {number[] | null} 编号序列；格式不符合时返回 null。
 */
function numberedLines(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const lines = value.split(/\r?\n/);
  const numbers = lines.map((line) => {
    const match = line.trim().match(/^(\d+)\.\s+\S/);
    return match ? Number(match[1]) : null;
  });
  return numbers.every((number) => number !== null) ? numbers : null;
}

/**
 * 把单条 Excel 行转换为校验错误列表。
 * @param {unknown[]} row 单行单元格值。
 * @param {number} index Excel 数据行索引（从 2 开始）。
 * @returns {string[]} 错误列表。
 */
function validateRow(row, index) {
  const errors = [];
  if (row.length !== FIELDS.length) {
    errors.push(`第 ${index} 行列数应为 ${FIELDS.length}`);
    return errors;
  }
  const item = Object.fromEntries(FIELDS.map((field, fieldIndex) => [field, row[fieldIndex]]));
  for (const field of FIELDS) {
    // Excel 将 JSON 中的空字符串存成空单元格；契约中的三个可选字段把两者视为同一值。
    if (OPTIONAL_TEXT_FIELDS.has(field) && (item[field] === null || item[field] === undefined)) continue;
    if (typeof item[field] !== "string") errors.push(`第 ${index} 行的「${field}」必须是文本`);
  }
  if (errors.length) return errors;
  for (const field of ["用例目录", "用例名称"]) {
    if (!item[field].trim()) errors.push(`第 ${index} 行的「${field}」不能为空`);
  }
  if (item["用例类型"] !== "功能测试") errors.push(`第 ${index} 行的「用例类型」无效`);
  if (item["用例状态"] !== "正常") errors.push(`第 ${index} 行的「用例状态」无效`);
  if (!["高", "中", "低"].includes(item["用例等级"])) errors.push(`第 ${index} 行的「用例等级」无效`);
  if (!["是", "否"].includes(item["是否冒烟"])) errors.push(`第 ${index} 行的「是否冒烟」无效`);

  if (item["前置条件"].trim() !== "无") {
    const preconditions = numberedLines(item["前置条件"]);
    if (!preconditions || !preconditions.every((number, position) => number === position + 1)) {
      errors.push(`第 ${index} 行的「前置条件」编号不连续`);
    }
  }
  const steps = numberedLines(item["用例步骤"]);
  const results = numberedLines(item["预期结果"]);
  if (!steps || !steps.every((number, position) => number === position + 1)) errors.push(`第 ${index} 行的「用例步骤」编号不连续`);
  if (!results || !results.every((number, position) => number === position + 1)) errors.push(`第 ${index} 行的「预期结果」编号不连续`);
  if (steps && results && steps.length !== results.length) errors.push(`第 ${index} 行步骤与预期结果数量不一致`);
  return errors;
}

/**
 * 打开工作簿并验证交付工作表的完整结构。
 */
async function main() {
  const input = process.argv[2];
  if (!input || input.startsWith("-")) throw new Error("用法：node scripts/validate_xlsx.mjs <result.xlsx>");
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(input));
  const sheet = workbook.worksheets.getItem("测试用例");
  if (!sheet) throw new Error("缺少名为「测试用例」的工作表");
  const usedRange = sheet.getUsedRange();
  if (!usedRange) throw new Error("工作表没有内容");
  const rows = usedRange.values;
  if (!Array.isArray(rows) || rows.length < 2) throw new Error("工作表至少需要表头和一条用例");
  if (JSON.stringify(rows[0]) !== JSON.stringify(FIELDS)) throw new Error("表头字段或顺序不符合 12 字段契约");
  const errors = rows.slice(1).flatMap((row, index) => validateRow(row, index + 2));
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Excel 校验通过：${rows.length - 1} 条用例`);
}

main().catch((error) => {
  console.error(`Excel 校验失败：${error.message}`);
  process.exitCode = 1;
});

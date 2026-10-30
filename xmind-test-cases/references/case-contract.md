# Test Case Contract

This contract mirrors the functional-case shape used by the test-platform XMind generation flow.

## Exact Fields

Each case must contain exactly these fields in this order:

1. `用例目录`
2. `用例名称`
3. `需求ID`
4. `前置条件`
5. `用例步骤`
6. `预期结果`
7. `用例类型`
8. `用例状态`
9. `用例等级`
10. `创建人`
11. `归属迭代`
12. `是否冒烟`

Fixed and enumerated values:

- `用例类型`: always `功能测试`.
- `用例状态`: always `正常`.
- `用例等级`: one of `高`, `中`, or `低`.
- `是否冒烟`: one of `是` or `否`.
- `需求ID`, `创建人`, and `归属迭代`: use user-provided or source-supported values; otherwise use an empty string.

## Field Semantics

- `用例目录`: preserve the XMind root/feature hierarchy as a `/`-separated path. Do not let a generated scenario move to an unrelated branch.
- `用例名称`: use `功能点—具体场景`, including the decisive value or condition when it distinguishes the scenario.
- `前置条件`: list executable identity, permission, data, and state prerequisites. Use `无` only when no prerequisite exists.
- `用例步骤`: list user or system actions as consecutive `1.`, `2.`, ... lines.
- `预期结果`: list observable UI, data, or status outcomes using the same count and numbering as `用例步骤`.
- `用例等级`: use `高` for business-critical or high-risk flows, `中` for normal feature behavior and important validation, and `低` for low-impact presentation or auxiliary behavior.

## Tree Interpretation

Read a branch as context, not as a mechanical path-to-case conversion:

- A leaf such as `200字符` beneath `任务名称 / 字符限制` is test data for a boundary scenario.
- Sibling leaves such as `png`, `jpg`, and `jpeg` beneath `格式限制` are usually an equivalence class. Combine them unless the behavior differs by format.
- Nodes such as `正向测试点` and `逆向测试点` classify their descendants; they are not themselves actions or expected results.
- Nodes such as `展示`, `新建`, `编辑`, `删除`, `权限`, and `空状态` usually define scenario families.
- A full sentence describing an action and outcome may become the scenario nucleus, but still needs explicit setup, steps, and observable results.

## Coverage Check

Before finalizing, compare the generated cases back to every meaningful branch and classify it as covered, merged into an equivalence class, ambiguous, or intentionally excluded. Report ambiguous and excluded branches outside `cases`.

Do not infer URLs, HTTP methods, status codes, database tables, hidden permissions, product copy, or downstream side effects that are absent from the source and user context.

## Example

```json
{
  "cases": [
    {
      "用例目录": "抽取任务/新建任务",
      "用例名称": "创建抽取任务—任务名称输入200字符",
      "需求ID": "",
      "前置条件": "1. 用户已登录系统并拥有创建抽取任务权限\n2. 用户拥有一个可选词条",
      "用例步骤": "1. 进入新建抽取任务页面\n2. 输入恰好200个字符的任务名称\n3. 选择一个词条\n4. 点击「开始抽取」",
      "预期结果": "1. 新建页面展示完整\n2. 任务名称可输入且保留200个字符\n3. 词条选择成功\n4. 任务创建成功，列表可查看该任务",
      "用例类型": "功能测试",
      "用例状态": "正常",
      "用例等级": "中",
      "创建人": "",
      "归属迭代": "",
      "是否冒烟": "是"
    }
  ]
}
```

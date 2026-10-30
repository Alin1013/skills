#!/usr/bin/env python3
"""校验 XMind 生成结果是否满足测试平台的功能用例字段契约。"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

FIELDS = (
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
)
NUMBERED_LINE = re.compile(r"^(\d+)\.\s+\S")


def _number_sequence(value: str) -> list[int] | None:
    """读取多行编号；存在空行或非编号行时返回 None。"""
    lines = value.splitlines()
    if not lines:
        return None
    numbers: list[int] = []
    for line in lines:
        match = NUMBERED_LINE.match(line.strip())
        if match is None:
            return None
        numbers.append(int(match.group(1)))
    return numbers


def validate_case(case: Any, index: int) -> list[str]:
    """返回单条用例的全部结构与枚举值错误。"""
    prefix = f"cases[{index}]"
    if not isinstance(case, dict):
        return [f"{prefix} 必须是对象"]

    errors: list[str] = []
    if tuple(case.keys()) != FIELDS:
        errors.append(f"{prefix} 字段名称或顺序不符合 12 字段契约")
    for field in FIELDS:
        if not isinstance(case.get(field), str):
            errors.append(f"{prefix}.{field} 必须是字符串")

    if errors:
        return errors
    if not case["用例目录"].strip():
        errors.append(f"{prefix}.用例目录 不能为空")
    if not case["用例名称"].strip():
        errors.append(f"{prefix}.用例名称 不能为空")
    if case["用例类型"] != "功能测试":
        errors.append(f"{prefix}.用例类型 必须为 功能测试")
    if case["用例状态"] != "正常":
        errors.append(f"{prefix}.用例状态 必须为 正常")
    if case["用例等级"] not in {"高", "中", "低"}:
        errors.append(f"{prefix}.用例等级 必须为 高、中或低")
    if case["是否冒烟"] not in {"是", "否"}:
        errors.append(f"{prefix}.是否冒烟 必须为 是或否")

    preconditions = case["前置条件"].strip()
    if preconditions != "无":
        numbers = _number_sequence(preconditions)
        if numbers != list(range(1, len(numbers or []) + 1)):
            errors.append(f"{prefix}.前置条件 必须使用从 1 开始的连续编号，或填写 无")

    step_numbers = _number_sequence(case["用例步骤"].strip())
    result_numbers = _number_sequence(case["预期结果"].strip())
    if step_numbers is None or step_numbers != list(range(1, len(step_numbers) + 1)):
        errors.append(f"{prefix}.用例步骤 必须使用从 1 开始的连续编号")
    if result_numbers is None or result_numbers != list(range(1, len(result_numbers) + 1)):
        errors.append(f"{prefix}.预期结果 必须使用从 1 开始的连续编号")
    if step_numbers is not None and result_numbers is not None and len(step_numbers) != len(result_numbers):
        errors.append(f"{prefix} 的步骤数与预期结果数必须一致")
    return errors


def main() -> int:
    """加载生成结果并汇总所有契约违规，便于一次修复。"""
    parser = argparse.ArgumentParser(description="校验 XMind 功能用例 JSON")
    parser.add_argument("input", type=Path, help="待校验的 JSON 文件")
    args = parser.parse_args()
    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        print(f"读取失败：{error}", file=sys.stderr)
        return 1

    cases = payload.get("cases") if isinstance(payload, dict) else None
    if not isinstance(cases, list) or not cases:
        print('根对象必须包含非空的 "cases" 数组', file=sys.stderr)
        return 1
    errors = [error for index, case in enumerate(cases) for error in validate_case(case, index)]
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"校验通过：{len(cases)} 条用例")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

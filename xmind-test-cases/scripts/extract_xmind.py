#!/usr/bin/env python3
"""安全解析 XMind 归档，并输出供用例生成使用的标准节点树。"""

from __future__ import annotations

import argparse
import json
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024


class XMindParseError(ValueError):
    """表示输入文件不是受支持或安全的 XMind 归档。"""


def _title(value: Any) -> str:
    """把 XMind 标题规整为非空文本，避免丢失无标题节点的层级。"""
    if isinstance(value, str) and value.strip():
        return value.strip()
    return "未命名节点"


def _json_node(topic: dict[str, Any]) -> dict[str, Any]:
    """递归转换新版 XMind JSON 节点为 title/children 结构。"""
    children_value = topic.get("children", {})
    if isinstance(children_value, dict):
        children = children_value.get("attached", [])
    elif isinstance(children_value, list):
        children = children_value
    else:
        children = []
    return {
        "title": _title(topic.get("title")),
        "children": [
            _json_node(child) for child in children if isinstance(child, dict)
        ],
    }


def _parse_json(content: bytes) -> list[dict[str, Any]]:
    """解析 content.json，兼容顶层数组和带 sheets 字段的两种结构。"""
    try:
        decoded = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise XMindParseError("content.json 不是有效的 UTF-8 JSON") from error

    if isinstance(decoded, list):
        sheets = decoded
    elif isinstance(decoded, dict):
        sheets = decoded.get("sheets", [])
    else:
        sheets = []
    roots = [
        _json_node(sheet["rootTopic"])
        for sheet in sheets
        if isinstance(sheet, dict) and isinstance(sheet.get("rootTopic"), dict)
    ]
    if not roots:
        raise XMindParseError("content.json 中没有可用的根主题")
    return roots


def _xml_node(topic: ET.Element) -> dict[str, Any]:
    """递归转换 XMind 8 XML 节点为 title/children 结构。"""
    title_element = topic.find("{*}title")
    title = title_element.text if title_element is not None else None
    child_topics = topic.findall("{*}children/{*}topics/{*}topic")
    return {
        "title": _title(title),
        "children": [_xml_node(child) for child in child_topics],
    }


def _parse_xml(content: bytes) -> list[dict[str, Any]]:
    """解析 content.xml，并返回每个工作表的根主题。"""
    try:
        document = ET.fromstring(content)
    except ET.ParseError as error:
        raise XMindParseError("content.xml 不是有效的 XML") from error
    roots = []
    for sheet in document.findall(".//{*}sheet"):
        topic = sheet.find("{*}topic")
        if topic is not None:
            roots.append(_xml_node(topic))
    if not roots:
        raise XMindParseError("content.xml 中没有可用的根主题")
    return roots


def parse_xmind(path: Path) -> list[dict[str, Any]]:
    """校验归档大小并选择 JSON 或 XML 解析入口。"""
    if not path.is_file():
        raise XMindParseError(f"文件不存在：{path}")
    if path.stat().st_size > MAX_UPLOAD_BYTES:
        raise XMindParseError("XMind 文件超过 10 MB 限制")
    try:
        with zipfile.ZipFile(path) as archive:
            # 只读取归档成员，不解压到磁盘，并限制声明的总大小以规避压缩炸弹。
            if sum(member.file_size for member in archive.infolist()) > MAX_UNCOMPRESSED_BYTES:
                raise XMindParseError("XMind 解压后超过 25 MB 限制")
            names = set(archive.namelist())
            if "content.json" in names:
                return _parse_json(archive.read("content.json"))
            if "content.xml" in names:
                return _parse_xml(archive.read("content.xml"))
    except (zipfile.BadZipFile, KeyError) as error:
        raise XMindParseError("文件不是有效的 XMind 归档") from error
    raise XMindParseError("归档中缺少 content.json 或 content.xml")


def _count_nodes(node: dict[str, Any]) -> int:
    """递归统计节点数量，帮助调用方评估生成规模。"""
    return 1 + sum(_count_nodes(child) for child in node["children"])


def main() -> int:
    """解析命令行参数并把标准化结果写入文件或标准输出。"""
    parser = argparse.ArgumentParser(description="解析 XMind 为标准 JSON 节点树")
    parser.add_argument("input", type=Path, help="待解析的 .xmind 文件")
    parser.add_argument("--output", type=Path, help="输出 JSON 路径；省略时写到标准输出")
    args = parser.parse_args()

    try:
        roots = parse_xmind(args.input)
    except XMindParseError as error:
        print(f"解析失败：{error}", file=sys.stderr)
        return 1

    payload = {
        "source": str(args.input),
        "root_count": len(roots),
        "node_count": sum(_count_nodes(root) for root in roots),
        "roots": roots,
    }
    rendered = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        # 父目录必须由调用方明确创建，避免路径拼写错误时静默写入意外位置。
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

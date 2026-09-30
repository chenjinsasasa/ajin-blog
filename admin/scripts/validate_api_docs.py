#!/usr/bin/env python3
"""Dependency-light OpenAPI quality gate for repository-owned API contracts."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable


HTTP_METHODS = {
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
}
OPERATION_ID = re.compile(r"^[A-Za-z][A-Za-z0-9._-]*$")
PATH_PARAMETER = re.compile(r"\{([^{}]+)\}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate an OpenAPI JSON/YAML contract")
    parser.add_argument("spec", type=Path)
    parser.add_argument(
        "--strict", action="store_true", help="Treat quality warnings as failures"
    )
    parser.add_argument(
        "--json-output", action="store_true", help="Emit a machine-readable report"
    )
    return parser.parse_args()


def load_document(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        value = json.loads(text)
    elif path.suffix.lower() in {".yaml", ".yml"}:
        try:
            import yaml  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "YAML validation requires PyYAML; use JSON or install PyYAML"
            ) from exc
        value = yaml.safe_load(text)
    else:
        try:
            value = json.loads(text)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Use a .json, .yaml, or .yml OpenAPI file") from exc
    if not isinstance(value, dict):
        raise ValueError("OpenAPI root must be an object")
    return value


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.operations = 0

    def error(self, location: str, message: str) -> None:
        self.errors.append(f"{location}: {message}")

    def warn(self, location: str, message: str) -> None:
        self.warnings.append(f"{location}: {message}")


def nonempty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def iter_nodes(value: Any, location: str = "$") -> Iterable[tuple[str, Any]]:
    yield location, value
    if isinstance(value, dict):
        for key, child in value.items():
            yield from iter_nodes(child, f"{location}/{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from iter_nodes(child, f"{location}/{index}")


def resolve_pointer(document: dict[str, Any], ref: str) -> bool:
    if not ref.startswith("#/"):
        return True
    current: Any = document
    for raw_part in ref[2:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if isinstance(current, dict) and part in current:
            current = current[part]
        elif isinstance(current, list) and part.isdigit() and int(part) < len(current):
            current = current[int(part)]
        else:
            return False
    return True


def validate_parameters(
    report: Report, parameters: Any, location: str, path_names: set[str]
) -> set[str]:
    documented_path_names: set[str] = set()
    if parameters is None:
        return documented_path_names
    if not isinstance(parameters, list):
        report.error(location, "parameters must be an array")
        return documented_path_names
    seen: set[tuple[Any, Any]] = set()
    for index, parameter in enumerate(parameters):
        item_location = f"{location}/{index}"
        if not isinstance(parameter, dict):
            report.error(item_location, "parameter must be an object")
            continue
        if "$ref" in parameter:
            continue
        name = parameter.get("name")
        where = parameter.get("in")
        key = (name, where)
        if key in seen:
            report.error(item_location, f"duplicate parameter {name!r} in {where!r}")
        seen.add(key)
        if not nonempty(name) or where not in {"path", "query", "header", "cookie"}:
            report.error(item_location, "parameter needs a valid name and in value")
        if not nonempty(parameter.get("description")):
            report.warn(item_location, "parameter description is missing")
        if "schema" not in parameter and "content" not in parameter:
            report.error(item_location, "parameter needs schema or content")
        if where == "path":
            if parameter.get("required") is not True:
                report.error(item_location, "path parameter must set required=true")
            if isinstance(name, str):
                documented_path_names.add(name)
                if name not in path_names:
                    report.error(item_location, "path parameter is not present in the path")
    return documented_path_names


def validate_media_map(report: Report, content: Any, location: str) -> None:
    if not isinstance(content, dict) or not content:
        report.error(location, "content must define at least one media type")
        return
    for media_type, media in content.items():
        media_location = f"{location}/{media_type}"
        if not isinstance(media, dict):
            report.error(media_location, "media type entry must be an object")
            continue
        if "schema" not in media:
            report.error(media_location, "schema is missing")
        if "example" not in media and "examples" not in media:
            report.warn(media_location, "example is missing")


def validate_responses(report: Report, responses: Any, location: str) -> None:
    if not isinstance(responses, dict) or not responses:
        report.error(location, "responses must be a non-empty object")
        return
    codes = {str(code) for code in responses}
    if not any(code.startswith("2") for code in codes):
        report.error(location, "at least one 2xx success response is required")
    if not any(code == "default" or code.startswith(("4", "5")) for code in codes):
        report.warn(location, "document at least one 4xx/5xx or default response")
    for code, response in responses.items():
        response_location = f"{location}/{code}"
        if not isinstance(response, dict):
            report.error(response_location, "response must be an object")
            continue
        if "$ref" in response:
            continue
        if not nonempty(response.get("description")):
            report.error(response_location, "response description is missing")
        if str(code) not in {"204", "304"} and "content" in response:
            validate_media_map(report, response["content"], f"{response_location}/content")


def validate_schema_descriptions(report: Report, document: dict[str, Any]) -> None:
    schemas = document.get("components", {}).get("schemas", {})
    if not isinstance(schemas, dict):
        report.error("$/components/schemas", "schemas must be an object")
        return
    for schema_name, schema in schemas.items():
        location = f"$/components/schemas/{schema_name}"
        if not isinstance(schema, dict):
            report.error(location, "schema must be an object")
            continue
        if not nonempty(schema.get("description")):
            report.warn(location, "schema description is missing")
        properties = schema.get("properties", {})
        if isinstance(properties, dict):
            for property_name, prop in properties.items():
                if isinstance(prop, dict) and not nonempty(prop.get("description")):
                    report.warn(
                        f"{location}/properties/{property_name}",
                        "property description is missing",
                    )


def validate(document: dict[str, Any]) -> Report:
    report = Report()
    version = document.get("openapi")
    if not isinstance(version, str) or not version.startswith(("3.0.", "3.1.")):
        report.error("$/openapi", "expected OpenAPI 3.0.x or 3.1.x")
    elif not version.startswith("3.1."):
        report.warn("$/openapi", "prefer OpenAPI 3.1 for new contracts")

    info = document.get("info")
    if not isinstance(info, dict):
        report.error("$/info", "info must be an object")
    else:
        for field in ("title", "version", "description"):
            if not nonempty(info.get(field)):
                report.error(f"$/info/{field}", f"{field} is required")

    paths = document.get("paths")
    if not isinstance(paths, dict):
        report.error("$/paths", "paths must be an object")
        return report
    if not paths:
        if document.get("x-api-status") != "no-public-api":
            report.error(
                "$/paths",
                "empty paths require x-api-status=no-public-api after code inspection",
            )
        return report

    servers = document.get("servers")
    if not isinstance(servers, list) or not servers:
        report.warn("$/servers", "declare at least one server for an API")
    else:
        for index, server in enumerate(servers):
            if not isinstance(server, dict) or not nonempty(server.get("url")):
                report.error(f"$/servers/{index}", "server url is required")
            elif "@" in server["url"]:
                report.error(f"$/servers/{index}/url", "server URL must not embed credentials")

    defined_tags = {
        tag.get("name")
        for tag in document.get("tags", [])
        if isinstance(tag, dict) and nonempty(tag.get("name"))
    }
    operation_ids: set[str] = set()
    root_security_defined = "security" in document

    for path, path_item in paths.items():
        path_location = f"$/paths/{path}"
        if not isinstance(path, str) or not path.startswith("/"):
            report.error(path_location, "path must start with /")
        if not isinstance(path_item, dict):
            report.error(path_location, "path item must be an object")
            continue
        path_names = set(PATH_PARAMETER.findall(path))
        path_parameters = validate_parameters(
            report, path_item.get("parameters"), f"{path_location}/parameters", path_names
        )
        for method, operation in path_item.items():
            if method.lower() not in HTTP_METHODS:
                continue
            operation_location = f"{path_location}/{method}"
            report.operations += 1
            if not isinstance(operation, dict):
                report.error(operation_location, "operation must be an object")
                continue
            operation_id = operation.get("operationId")
            if not nonempty(operation_id) or not OPERATION_ID.fullmatch(operation_id):
                report.error(operation_location, "operationId is missing or invalid")
            elif operation_id in operation_ids:
                report.error(operation_location, f"duplicate operationId {operation_id!r}")
            else:
                operation_ids.add(operation_id)
            for field in ("summary", "description"):
                if not nonempty(operation.get(field)):
                    if field == "summary":
                        report.error(
                            f"{operation_location}/{field}", f"{field} is required"
                        )
                    else:
                        report.warn(
                            f"{operation_location}/{field}", f"{field} is missing"
                        )
            tags = operation.get("tags")
            if not isinstance(tags, list) or not tags or not all(nonempty(tag) for tag in tags):
                report.warn(f"{operation_location}/tags", "at least one tag is recommended")
            else:
                for tag in tags:
                    if tag not in defined_tags:
                        report.warn(f"{operation_location}/tags", f"tag {tag!r} is not defined")
            documented = set(path_parameters)
            documented.update(
                validate_parameters(
                    report,
                    operation.get("parameters"),
                    f"{operation_location}/parameters",
                    path_names,
                )
            )
            missing_path_parameters = path_names - documented
            if missing_path_parameters:
                report.error(
                    operation_location,
                    "undocumented path parameters: "
                    + ", ".join(sorted(missing_path_parameters)),
                )
            request_body = operation.get("requestBody")
            if isinstance(request_body, dict) and "$ref" not in request_body:
                if not nonempty(request_body.get("description")):
                    report.warn(f"{operation_location}/requestBody", "description is missing")
                validate_media_map(
                    report,
                    request_body.get("content"),
                    f"{operation_location}/requestBody/content",
                )
            elif request_body is not None and not isinstance(request_body, dict):
                report.error(f"{operation_location}/requestBody", "must be an object")
            validate_responses(
                report, operation.get("responses"), f"{operation_location}/responses"
            )
            if "security" not in operation and not root_security_defined:
                report.warn(
                    f"{operation_location}/security",
                    "declare security or explicitly use security=[] for a public endpoint",
                )

    if report.operations == 0:
        report.error("$/paths", "no HTTP operations were found")

    validate_schema_descriptions(report, document)
    for location, node in iter_nodes(document):
        if isinstance(node, dict) and isinstance(node.get("$ref"), str):
            ref = node["$ref"]
            if ref.startswith("#/") and not resolve_pointer(document, ref):
                report.error(f"{location}/$ref", f"unresolved local reference {ref!r}")
            elif not ref.startswith("#/"):
                report.warn(f"{location}/$ref", "external reference was not resolved")
    return report


def emit(report: Report, strict: bool, json_output: bool) -> int:
    failed = bool(report.errors or (strict and report.warnings))
    if json_output:
        print(
            json.dumps(
                {
                    "status": "failed" if failed else "ok",
                    "strict": strict,
                    "operations": report.operations,
                    "errors": report.errors,
                    "warnings": report.warnings,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        for message in report.errors:
            print(f"ERROR {message}")
        for message in report.warnings:
            print(f"WARN  {message}")
        print(
            f"OpenAPI gate: {'FAILED' if failed else 'OK'} "
            f"({report.operations} operations, {len(report.errors)} errors, "
            f"{len(report.warnings)} warnings, strict={str(strict).lower()})"
        )
    return 1 if failed else 0


def main() -> int:
    args = parse_args()
    try:
        document = load_document(args.spec)
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        if args.json_output:
            print(json.dumps({"status": "parse-error", "error": str(exc)}, indent=2))
        else:
            print(f"ERROR {args.spec}: {exc}", file=sys.stderr)
        return 2
    return emit(validate(document), args.strict, args.json_output)


if __name__ == "__main__":
    raise SystemExit(main())

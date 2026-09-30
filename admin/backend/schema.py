"""Shared OpenAPI enrichment for runtime and checked-in contract."""


def enrich(schema, config):
    import copy

    schema = copy.deepcopy(schema)
    schema["servers"] = [{"url": f"http://127.0.0.1:{config.port}"}]
    # Middleware protections apply to all authenticated POST operations.
    for path, item in schema["paths"].items():
        for method, op in item.items():
            if not isinstance(op, dict):
                continue
            op.setdefault("description", op["summary"])
            op.setdefault("security", [])
            op["responses"].setdefault(
                "default",
                {
                    "description": "Unexpected error; retry after checking local service",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/Error"}
                        }
                    },
                },
            )
            if method == "post":
                op.setdefault("parameters", []).append(
                    {
                        "name": "Origin",
                        "in": "header",
                        "required": True,
                        "schema": {"type": "string"},
                        "description": "Exact loopback origin of this service",
                    }
                )
                if path != "/api/auth/login":
                    op["parameters"].append(
                        {
                            "name": "X-CSRF-Token",
                            "in": "header",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Token returned by login or session",
                        }
                    )
    schema["paths"]["/api/auth/login"]["post"]["responses"]["429"] = {
        "description": "Too many login attempts",
        "content": {
            "application/json": {"schema": {"$ref": "#/components/schemas/Error"}}
        },
    }
    for path in ("/api/reports/{date}/article", "/api/reports/{date}/cover"):
        schema["paths"][path]["get"]["responses"]["409"] = {
            "description": "Artifact version changed",
            "content": {
                "application/json": {"schema": {"$ref": "#/components/schemas/Error"}}
            },
        }
    schema["info"]["description"] = (
        "Local-only daily-report observation API. Authentication is required for all business data. No publication commands are implemented in this version."
    )
    schema["tags"] = [
        {"name": n, "description": d}
        for n, d in [
            ("认证", "Local administrator session"),
            ("日报", "Reports, immutable run history and operator notes"),
            ("系统", "Collection and backup health"),
            ("产物", "Authenticated read-only artifact previews"),
            ("能力", "Read-only execution capability inspection"),
        ]
    ]
    descriptions = {
        "data": "Operation result",
        "observed_at": "Server observation time in UTC",
        "date": "Business date in Asia/Shanghai",
        "status": "Recorded business or execution state",
        "body": "Plain text content; never executed as code",
        "csrf": "Per-session token required by state-changing requests",
        "password": "Local administrator password; never stored in browser storage",
        "hash": "SHA-256 of source bytes",
        "source_hash": "SHA-256 of original journal",
        "last_event": "Last observed source event timestamp; not a process heartbeat",
        "reason": "Human-readable explanation or original controlled reason code",
        "stage": "Current recorded stage",
        "runs": "Original run history; failures are preserved",
        "notes": "Operator notes; do not change business state",
        "evidence": "Output of the durable publication verifier",
        "natural_schedule_verified": "Whether natural scheduling origin was proven",
        "supported": "Whether execution is available; false in observation-only release",
        "allowed_actions": "Actions currently executable; empty in observation-only release",
    }
    for name, model in schema["components"]["schemas"].items():
        model.setdefault("description", name + " API value")
        for key, value in model.get("properties", {}).items():
            value.setdefault(
                "description",
                descriptions.get(
                    key, key.replace("_", " ") + " as recorded by the local service"
                ),
            )
    examples = {
        "login": {"password": "example-not-a-real-password"},
        "add_note": {"body": "已核查，等待执行侧修复。"},
        "action_preview": {"action": "retry"},
    }

    def sample(value, depth=0):
        if depth > 8:
            return None
        if "$ref" in value:
            return sample(
                schema["components"]["schemas"][value["$ref"].split("/")[-1]], depth + 1
            )
        if "const" in value:
            return value["const"]
        if "enum" in value:
            return value["enum"][0]
        if "anyOf" in value:
            return sample(value["anyOf"][0], depth + 1)
        kind = value.get("type")
        if kind == "object":
            return {
                key: sample(child, depth + 1)
                for key, child in value.get("properties", {}).items()
                if key in value.get("required", [])
            }
        if kind == "array":
            return []
        if kind in ("integer", "number"):
            return 1
        if kind == "boolean":
            return False
        if kind == "null":
            return None
        return "example"

    for item in schema["paths"].values():
        for method, op in item.items():
            for param in op.get("parameters", []):
                param.setdefault(
                    "description", param["name"] + " filter or route value"
                )
            if "requestBody" in op:
                op["requestBody"]["description"] = (
                    "Validated input for " + op["operationId"]
                )
                for media in op["requestBody"]["content"].values():
                    media["example"] = examples.get(
                        op["operationId"], sample(media["schema"])
                    )
            for code, response in op["responses"].items():
                for media in response.get("content", {}).values():
                    media["example"] = sample(media["schema"])
    return schema

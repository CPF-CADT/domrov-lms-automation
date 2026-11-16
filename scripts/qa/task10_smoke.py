#!/usr/bin/env python3
"""DOMROV Task 10 local integration smoke tests."""

import json
import sys
import urllib.error
import urllib.request

GATEWAY = "http://localhost:8088"
EXECUTION = "http://localhost:3005"

results = []


def check(name, base, path, expected, method="GET", payload=None):
    url = base + path
    headers = {"Content-Type": "application/json"}

    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        url, data=data, headers=headers, method=method
    )

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            status = response.status
            body = response.read().decode(errors="replace")
    except urllib.error.HTTPError as error:
        status = error.code
        body = error.read().decode(errors="replace")
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        results.append(("FAIL", name, str(error)))
        return

    if status != expected:
        results.append(("FAIL", name, f"HTTP {status}, expected {expected}"))
        return

    if status == 200:
        try:
            json.loads(body)
        except json.JSONDecodeError:
            results.append(("FAIL", name, "Invalid JSON response"))
            return

    results.append(("PASS", name, f"HTTP {status}"))


def blocked(name, reason):
    results.append(("BLOCKED", name, reason))


check("Gateway health", GATEWAY, "/health", 200)
check("Academic liveness", GATEWAY, "/api/academic/health/live", 200)
check("Academic readiness", GATEWAY, "/api/academic/health/ready", 200)
check("Payment liveness", GATEWAY, "/api/payment/health/live", 200)
check("Payment readiness", GATEWAY, "/api/payment/health/ready", 200)
check("Evaluation liveness", GATEWAY, "/api/ai/health/live", 200)
check("Evaluation readiness", GATEWAY, "/api/ai/health/ready", 200)
check("Code execution liveness", EXECUTION, "/health/live", 200)
check("Code execution readiness", EXECUTION, "/health/ready", 200)
check("Credit packages", GATEWAY, "/credit-packages", 200)

check("Protected profile", GATEWAY, "/api/users/me", 401)
check("Protected classes", GATEWAY, "/class/my-classes", 401)
check(
    "Invalid login",
    GATEWAY,
    "/auth/login",
    401,
    method="POST",
    payload={"email": "nonexistent-qa@example.invalid", "password": "WrongPassword123!"},
)

blocked("Student authenticated E2E", "QA credentials unavailable")
blocked("Admin authenticated E2E", "Admin QA account unavailable")
blocked("Evaluation execution E2E", "Message contract and runner require verification")
blocked("Payment transaction E2E", "Authorized QA account unavailable; real payments prohibited")

print("\nDOMROV TASK 10 — INTEGRATION SMOKE TESTS")
print("=" * 76)

for status, name, detail in results:
    print(f"{status:<8} {name:<34} {detail}")

print("=" * 76)

counts = {
    status: sum(result[0] == status for result in results)
    for status in ("PASS", "FAIL", "BLOCKED")
}

print(
    f"PASS: {counts['PASS']} | "
    f"FAIL: {counts['FAIL']} | "
    f"BLOCKED: {counts['BLOCKED']}"
)

sys.exit(1 if counts["FAIL"] else 0)

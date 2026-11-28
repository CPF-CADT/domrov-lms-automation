"""Exercise the VPS release script in a temporary directory with mocked Compose."""

import io
import os
from pathlib import Path
import stat
import subprocess
import tarfile
import tempfile


RELEASE_SCRIPT = Path(__file__).resolve().parents[1] / "infra/deploy/release.sh"
SHA = "a" * 40
BACKENDS = {
    "user": "USER_IMAGE_TAG",
    "academic-service": "ACADEMIC_IMAGE_TAG",
    "payment-service": "PAYMENT_IMAGE_TAG",
    "evaluation-service": "EVALUATION_IMAGE_TAG",
}

DOCKER_STUB = """#!/usr/bin/env bash
set -euo pipefail
[[ $1 == compose && $2 == --env-file && $4 == -f && $5 == compose.prod.yml ]]
grep -qx 'DEMO_SECRET=local-test-value' "$3"
printf '%s\\n' "${*:6}" >> compose.calls
case "$6" in
  config|pull|run) ;;
  up) [[ ${FAIL_ROLLOUT:-0} == 0 ]] ;;
  exec)
    [[ ${FAIL_FRONTEND:-0} == 0 ]] || exit 1
    cmp -s "frontend/${11##*/domrov/}" -
    ;;
  *) exit 2 ;;
esac
"""


def write_stub(bin_dir, name, content):
    path = bin_dir / name
    path.write_text(content)
    path.chmod(0o700)


def frontend_archive():
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode="w") as bundle:
        contents = b"<html>New frontend release</html>"
        entry = tarfile.TarInfo("index.html")
        entry.size = len(contents)
        bundle.addfile(entry, io.BytesIO(contents))
    return archive.getvalue()


def run_test():
    with tempfile.TemporaryDirectory(prefix="domrov-cd-") as directory:
        work = Path(directory)
        bin_dir = work / "bin"
        bin_dir.mkdir()
        write_stub(bin_dir, "docker", DOCKER_STUB)
        write_stub(bin_dir, "flock", "#!/usr/bin/env bash\nexit 0\n")
        # Match the two-operand GNU mv invocation on macOS.
        write_stub(
            bin_dir,
            "mv",
            """#!/usr/bin/env python3
import os
import sys

if sys.argv[1] == "-Tf":
    os.replace(sys.argv[3], sys.argv[4])
else:
    os.execv("/bin/mv", ["mv", *sys.argv[1:]])
""",
        )
        env = os.environ | {"PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}"}
        config = work / ".env.production"
        expected = "DEMO_SECRET=local-test-value\n" + "".join(
            f"{key}=old-tag\n" for key in BACKENDS.values()
        )
        config.write_text(expected)

        def deploy(target, run_number=2, *, archive=b"", fail=None):
            result = subprocess.run(
                ["bash", str(RELEASE_SCRIPT), target, SHA, str(run_number)],
                input=archive, cwd=work, env=env | ({fail: "1"} if fail else {}),
                capture_output=True,
            )
            assert (result.returncode == 0) == (fail is None), (
                target, result.returncode, result.stderr.decode()
            )

        calls = work / "compose.calls"
        deploy("payment-service", fail="FAIL_ROLLOUT")
        assert config.read_text() == expected
        assert not (work / ".deploy-state/payment-service").exists()

        for target, tag_key in BACKENDS.items():
            calls.write_text("")
            deploy(target)
            expected = expected.replace(f"{tag_key}=old-tag", f"{tag_key}={SHA}")
            assert config.read_text() == expected
            assert stat.S_IMODE(config.stat().st_mode) == 0o600
            assert (work / f".deploy-state/{target}.previous-tag").read_text() == f"{tag_key}=old-tag\n"
            commands = calls.read_text().splitlines()
            assert f"pull {target}" in commands
            assert f"up -d --no-deps --no-build --pull never --wait --wait-timeout 180 {target}" in commands
            if target in {"user", "academic-service"}:
                assert f"run --rm --no-deps --pull never {target} npm run migration:run" in commands
            deploy(target, run_number=1)
            assert calls.read_text().splitlines() == commands
            print(f"PASS {target} CD")

        artifact = frontend_archive()
        for target in ("client", "admin"):
            destination = work / "frontend" / target
            destination.mkdir(parents=True)
            (destination / "index.html").write_text("Old build")
            deploy(target, archive=artifact, fail="FAIL_FRONTEND")
            assert (destination / "index.html").read_text() == "Old build"
            deploy(target, archive=artifact)
            assert destination.is_symlink()
            assert (destination / "index.html").read_text() == "<html>New frontend release</html>"
            print(f"PASS {target} CD and rollback")


if __name__ == "__main__":
    run_test()

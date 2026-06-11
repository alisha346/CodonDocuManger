"""
bump_version.py — CodonDocuManger version manager
---------------------------------------------------
Usage:
  python bump_version.py           # patch bump  (1.0.02 → 1.0.03)  for bug fixes
  python bump_version.py --fix     # patch bump  (same as above)
  python bump_version.py --enhance # minor bump  (1.0.03 → 1.01.01) for new features
  python bump_version.py --major   # major bump  (1.01.01 → 2.00.01) for breaking changes
  python bump_version.py --show    # just print current version

Files updated automatically:
  • edge_extension/manifest.json  — "version" field
  • CHANGELOG.md                  — append entry (created if missing)
"""

import json
import sys
import os
from datetime import datetime

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.abspath(__file__))
MANIFEST  = os.path.join(ROOT, "edge_extension", "manifest.json")
CHANGELOG = os.path.join(ROOT, "CHANGELOG.md")

# ── Helpers ──────────────────────────────────────────────────────────────────

def load_manifest():
    with open(MANIFEST, "r", encoding="utf-8") as f:
        return json.load(f)

def save_manifest(data):
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def parse_version(v: str):
    """Parse 'major.middle.minor' into ints, normalise quirks."""
    parts = v.strip().split(".")
    while len(parts) < 3:
        parts.append("0")
    try:
        return int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        return 1, 0, 0

def format_version(major, middle, minor):
    return f"{major}.{middle:02d}.{minor:02d}"

def append_changelog(old_ver, new_ver, bump_type, message=""):
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    label = {"patch": "🐛 Fix", "enhance": "✨ Enhancement", "major": "🚀 Major"}.get(bump_type, "🔧 Change")
    entry = f"\n## [{new_ver}] — {now}\n- **{label}**: bumped from `{old_ver}` → `{new_ver}`"
    if message:
        entry += f"\n- {message}"
    entry += "\n"

    if not os.path.exists(CHANGELOG):
        with open(CHANGELOG, "w", encoding="utf-8") as f:
            f.write("# Changelog — CodonDocuManger\n")

    with open(CHANGELOG, "a", encoding="utf-8") as f:
        f.write(entry)

# ── Bump logic ───────────────────────────────────────────────────────────────

def bump(bump_type="patch", message=""):
    if not os.path.exists(MANIFEST):
        print(f"[ERROR] manifest.json not found at {MANIFEST}")
        sys.exit(1)

    data = load_manifest()
    current = data.get("version", "1.0.00")
    major, middle, minor = parse_version(current)

    if bump_type == "patch":
        minor += 1
    elif bump_type == "enhance":
        middle += 1
        minor = 1
    elif bump_type == "major":
        major += 1
        middle = 0
        minor = 1

    new_ver = format_version(major, middle, minor)
    data["version"] = new_ver
    save_manifest(data)
    append_changelog(current, new_ver, bump_type, message)

    print(f"  [OK]  {current}  ->  {new_ver}  ({bump_type})")
    print(f"  [INFO]  manifest.json updated")
    print(f"  [INFO]  CHANGELOG.md updated")
    return new_ver

def show():
    if not os.path.exists(MANIFEST):
        print(f"[ERROR] manifest.json not found")
        sys.exit(1)
    data = load_manifest()
    print(f"  Current version: {data.get('version', 'unknown')}")

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]

    if "--show" in args:
        show()
        sys.exit(0)

    bump_type = "patch"
    if "--major" in args:
        bump_type = "major"
    elif "--enhance" in args:
        bump_type = "enhance"
    elif "--fix" in args:
        bump_type = "patch"

    # Optional: pass a description after the flag e.g. --fix "fixed login bug"
    message = ""
    for a in args:
        if not a.startswith("--"):
            message = a
            break

    bump(bump_type, message)

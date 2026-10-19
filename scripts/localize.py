"""Make Figma-exported screens self-contained, without touching layout or styles.

For src/screens/*.tsx:
  - download every asset referenced via ${assetPathPrefix}/<name> into
    public/assets/ (skipped if already there). Figma asset names are shared
    across frames, so any not-yet-localized screen's temporary prefix is
    used to fetch the full set.
  - point each screen's assetPathPrefix at /assets
  - rewrite font-['Plus_Jakarta_Sans:Bold'] -> font-['Plus_Jakarta_Sans']
    (weight is already carried by the font-bold/font-semibold/... class)

Usage: python scripts/localize.py
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCREENS = ROOT / "src" / "screens"
ASSETS = ROOT / "public" / "assets"

PREFIX_RE = re.compile(r'const assetPathPrefix = "(https://www\.figma\.com/api/mcp/asset/[^"]+)";')
ASSET_RE = re.compile(r"\$\{assetPathPrefix\}/([\w.-]+)")
FONT_RE = re.compile(r"font-\['Plus_Jakarta_Sans:[A-Za-z]+'\]")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    files = sorted(SCREENS.glob("*.tsx"))
    sources = {p: p.read_text(encoding="utf-8") for p in files}

    names = sorted({n for s in sources.values() for n in ASSET_RE.findall(s)})
    missing = [n for n in names if not (ASSETS / n).exists() or (ASSETS / n).stat().st_size == 0]
    prefixes = [m.group(1) for s in sources.values() if (m := PREFIX_RE.search(s))]

    failed = []
    for name in missing:
        dest = ASSETS / name
        for prefix in prefixes:
            subprocess.run(["curl", "-sfL", "-o", str(dest), f"{prefix}/{name}"], check=False)
            if dest.exists() and dest.stat().st_size > 0:
                print(f"  downloaded {name}")
                break
        else:
            failed.append(name)

    for path, src in sources.items():
        if m := PREFIX_RE.search(src):
            src = src.replace(m.group(0), 'const assetPathPrefix = "/assets";')
        src = FONT_RE.sub("font-['Plus_Jakarta_Sans']", src)
        path.write_text(src, encoding="utf-8")

    print(f"{len(files)} screens, {len(names)} assets, {len(missing) - len(failed)} downloaded")
    if failed:
        print("FAILED (empty or unavailable):", ", ".join(failed))
        sys.exit(1)


if __name__ == "__main__":
    main()

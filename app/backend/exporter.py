"""
exporter.py — Export sessions to Markdown or standalone HTML.
"""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any


def _b64_image(path: str | None) -> str | None:
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        return None
    data = p.read_bytes()
    return "data:image/png;base64," + base64.b64encode(data).decode()


def to_markdown(session: dict[str, Any]) -> str:
    lines = [f"# {session['name']}", ""]
    for step in session.get("steps", []):
        lines.append(f"## Step {step['order']}: {step['description']}")
        lines.append(f"> **App**: {step.get('app_name', '')}  |  **Action**: {step.get('type', '').capitalize()}")
        if step.get("typed_text"):
            lines.append(f"> **Typed**: `{step['typed_text']}`")
        if step.get("screenshot"):
            p = Path(step["screenshot"])
            lines.append(f"![Step {step['order']}]({p.name})")
        lines.append("")
    return "\n".join(lines)


def to_html(session: dict[str, Any]) -> str:
    steps_html = ""
    for step in session.get("steps", []):
        img_tag = ""
        b64 = _b64_image(step.get("screenshot"))
        if b64:
            img_tag = f'<img src="{b64}" alt="Step {step["order"]}" />'

        typed = ""
        if step.get("typed_text"):
            typed = f'<div class="typed-text"><span class="kbd">⌨</span> Typed: <code>{_esc(step["typed_text"])}</code></div>'

        badge_class = {
            "click": "badge-click",
            "type": "badge-type",
            "scroll": "badge-scroll",
        }.get(step.get("type", ""), "badge-click")

        steps_html += f"""
        <div class="step">
          <div class="step-header">
            <div class="step-num">{step["order"]}</div>
            <div class="step-info">
              <div class="step-description">{_esc(step["description"])}</div>
              <div class="step-meta">
                <span class="badge {badge_class}">{step.get("type","").capitalize()}</span>
                <span class="app-badge">{_esc(step.get("app_name",""))}</span>
              </div>
            </div>
          </div>
          {typed}
          {"<div class='screenshot-wrap'>" + img_tag + "</div>" if img_tag else ""}
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{_esc(session["name"])}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800&display=swap');
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Inter', sans-serif;
    background: #0b0813;
    color: #e2d9f3;
    min-height: 100vh;
    padding: 40px 20px;
  }}
  .container {{ max-width: 860px; margin: 0 auto; }}
  h1 {{
    font-family: 'Outfit', sans-serif;
    font-size: 2.2rem;
    font-weight: 800;
    background: linear-gradient(135deg, #a855f7, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
  }}
  .subtitle {{ color: #9b89c4; margin-bottom: 40px; font-size: 0.95rem; }}
  .step {{
    background: rgba(21,17,36,0.8);
    border: 1px solid rgba(168,85,247,0.15);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    backdrop-filter: blur(12px);
  }}
  .step-header {{ display: flex; gap: 16px; align-items: flex-start; margin-bottom: 12px; }}
  .step-num {{
    min-width: 36px; height: 36px;
    background: linear-gradient(135deg, #a855f7, #7c3aed);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.85rem; color: #fff; flex-shrink: 0;
  }}
  .step-description {{ font-size: 1rem; font-weight: 600; color: #e2d9f3; margin-bottom: 6px; }}
  .step-meta {{ display: flex; gap: 8px; flex-wrap: wrap; }}
  .badge {{
    padding: 2px 10px; border-radius: 999px; font-size: 0.72rem;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  }}
  .badge-click {{ background: rgba(168,85,247,0.18); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }}
  .badge-type {{ background: rgba(59,130,246,0.18); color: #93c5fd; border: 1px solid rgba(59,130,246,0.3); }}
  .badge-scroll {{ background: rgba(16,185,129,0.18); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }}
  .app-badge {{ padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 500; background: rgba(255,255,255,0.05); color: #9b89c4; border: 1px solid rgba(255,255,255,0.08); }}
  .typed-text {{ margin: 10px 0; padding: 8px 14px; background: rgba(59,130,246,0.08); border-left: 3px solid #3b82f6; border-radius: 0 8px 8px 0; font-size: 0.88rem; color: #93c5fd; }}
  code {{ font-family: 'Courier New', monospace; background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; }}
  .screenshot-wrap {{ margin-top: 14px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(168,85,247,0.12); }}
  .screenshot-wrap img {{ width: 100%; display: block; }}
</style>
</head>
<body>
<div class="container">
  <h1>{_esc(session["name"])}</h1>
  <p class="subtitle">{len(session.get("steps", []))} steps captured</p>
  {steps_html}
</div>
</body>
</html>"""


def _esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

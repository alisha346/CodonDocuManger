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
    project_id = session.get("project_id")
    project_name = "Operations"
    if project_id:
        try:
            import storage
            project = storage.get_project(project_id)
            if project and project.get("name"):
                project_name = project["name"]
        except Exception:
            pass
            
    lines = [f"# {project_name} / {session['name']}", ""]
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
    project_id = session.get("project_id")
    project_name = "Operations"
    project_color = "#a855f7"
    project_logo = ""
    if project_id:
        try:
            import storage
            project = storage.get_project(project_id)
            if project:
                if project.get("name"):
                    project_name = project["name"]
                if project.get("branding"):
                    branding = project["branding"]
                    if branding.get("colors"):
                        project_color = branding["colors"][0]
                    if branding.get("logo"):
                        project_logo = branding["logo"]
        except Exception:
            pass

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
  .project-context {{
    font-family: 'Inter', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: {project_color};
    margin-bottom: 6px;
  }}
  h1 {{
    font-family: 'Outfit', sans-serif;
    font-size: 2.2rem;
    font-weight: 800;
    background: linear-gradient(135deg, {project_color}, #7c3aed);
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
    background: linear-gradient(135deg, {project_color}, #7c3aed);
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

  /* Print-only layout elements default hidden on screen */
  .print-only {{ display: none; }}

  @media print {{
    @page {{
      size: A4 portrait;
      margin-top: 2.2cm;
      margin-bottom: 2.2cm;
      margin-left: 1.5cm;
      margin-right: 1.5cm;
    }}
    
    body {{
      background: #ffffff !important;
      color: #0f172a !important;
      padding: 0 !important;
      margin: 0 !important;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    .container {{
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }}

    /* Print Header & Footer Layout */
    .print-only {{
      display: flex !important;
    }}

    .print-header {{
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 40px;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 500;
      background: #ffffff;
    }}

    .print-header-left {{
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    
    .print-divider {{
      color: #cbd5e1;
      font-weight: 300;
    }}

    .print-project-name {{
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: {project_color};
    }}

    .print-guide-name {{
      color: #334155;
    }}

    .print-logo {{
      max-height: 24px;
      max-width: 120px;
      object-fit: contain;
    }}

    .logo-fallback-text {{
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 0.8rem;
      color: {project_color};
    }}

    .print-footer {{
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 0.75rem;
      color: #64748b;
      background: #ffffff;
    }}

    .sop-badge {{
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
    }}

    .page-number-label::after {{
      content: counter(page);
      font-weight: 700;
      color: {project_color};
    }}

    /* Steps print layout - Industry SOP Standard */
    .step {{
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: none !important;
      border-radius: 12px !important;
      padding: 18px !important;
      margin-bottom: 24px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }}

    .step-num {{
      background: {project_color} !important;
      color: #ffffff !important;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }}

    .step-description {{
      color: #0f172a !important;
      font-size: 1.05rem !important;
    }}

    .step-meta {{
      color: #475569 !important;
    }}

    .project-context {{
      color: {project_color} !important;
    }}

    h1 {{
      background: none !important;
      -webkit-text-fill-color: initial !important;
      color: #0f172a !important;
      font-size: 2rem !important;
      margin-top: 10px !important;
    }}

    .subtitle {{
      color: #475569 !important;
      margin-bottom: 25px !important;
    }}

    .badge-click {{
      background: #fef2f2 !important;
      color: #dc2626 !important;
      border: 1px solid #fee2e2 !important;
    }}

    .badge-type {{
      background: #eff6ff !important;
      color: #2563eb !important;
      border: 1px solid #dbeafe !important;
    }}

    .badge-scroll {{
      background: #ecfdf5 !important;
      color: #059669 !important;
      border: 1px solid #d1fae5 !important;
    }}

    .app-badge {{
      background: #f8fafc !important;
      color: #475569 !important;
      border: 1px solid #e2e8f0 !important;
    }}

    .typed-text {{
      background: #eff6ff !important;
      border-left: 3px solid #3b82f6 !important;
      color: #1e40af !important;
    }}

    .screenshot-wrap {{
      border: 1px solid #cbd5e1 !important;
      box-shadow: none !important;
      margin-top: 10px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }}
  }}
</style>
</head>
<body>
<div class="print-header print-only">
  <div class="print-header-left">
    <span class="print-project-name">{_esc(project_name)}</span>
    <span class="print-divider">/</span>
    <span class="print-guide-name">{_esc(session["name"])}</span>
  </div>
  <div class="print-header-right">
    {f'<img src="{project_logo}" class="print-logo" />' if project_logo else f'<span class="logo-fallback-text">{_esc(project_name)}</span>'}
  </div>
</div>

<div class="print-footer print-only">
  <div class="print-footer-left">
    {f'<img src="{project_logo}" class="print-logo" />' if project_logo else '<span class="logo-fallback-text">CodonDocuManger</span>'}
  </div>
  <div class="print-footer-right">
    <span class="sop-badge">Standard Operating Procedure</span>
    <span class="print-divider">|</span>
    <span class="page-number-label">Page </span>
  </div>
</div>

<div class="container">
  <div class="project-context">{_esc(project_name)}</div>
  <h1>{_esc(session["name"])}</h1>
  <p class="subtitle">{len(session.get("steps", []))} steps captured</p>
  {steps_html}
</div>
</body>
</html>"""



def _esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

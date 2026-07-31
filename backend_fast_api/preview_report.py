"""Run from backend_fast_api/: python preview_report.py"""
import webbrowser
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

TEMPLATE_DIR = Path(__file__).parent / "src/hgs_refuce_app/report"
OUT = Path(__file__).parent / "report_preview.html"

categories = [
    {"label": "Restavfall",  "color": "#6b6e52", "total_kg": 42.5, "pct": 42.5},
    {"label": "Matavfall",   "color": "#6b8e4e", "total_kg": 27.0, "pct": 27.0},
    {"label": "Papp/papir",  "color": "#8b9eb7", "total_kg": 18.0, "pct": 18.0},
    {"label": "Plast",       "color": "#c97b5a", "total_kg": 8.5,  "pct": 8.5},
    {"label": "Metall",      "color": "#8a8a8a", "total_kg": 3.0,  "pct": 3.0},
    {"label": "EE-avfall",   "color": "#a17bb3", "total_kg": 1.0,  "pct": 1.0},
]

registrations = [
    {
        "date": "2026-03-28",
        "total_kg": 15.5,
        "entries": [
            {"label": "Restavfall", "weightKg": 9.0},
            {"label": "Matavfall",  "weightKg": 6.5},
        ],
    },
    {
        "date": "2026-03-14",
        "total_kg": 22.0,
        "entries": [
            {"label": "Restavfall", "weightKg": 11.0},
            {"label": "Papp/papir", "weightKg": 7.0},
            {"label": "Plast",      "weightKg": 4.0},
        ],
    },
    {
        "date": "2026-02-28",
        "total_kg": 19.5,
        "entries": [
            {"label": "Restavfall", "weightKg": 8.5},
            {"label": "Matavfall",  "weightKg": 7.0},
            {"label": "Papp/papir", "weightKg": 4.0},
        ],
    },
    {
        "date": "2026-02-14",
        "total_kg": 18.0,
        "entries": [
            {"label": "Matavfall",  "weightKg": 8.0},
            {"label": "Papp/papir", "weightKg": 5.0},
            {"label": "Plast",      "weightKg": 3.0},
            {"label": "Metall",     "weightKg": 2.0},
        ],
    },
    {
        "date": "2026-01-31",
        "total_kg": 18.0,
        "entries": [
            {"label": "Restavfall", "weightKg": 12.0},
            {"label": "Matavfall",  "weightKg": 5.5},
            {"label": "EE-avfall",  "weightKg": 0.5},
        ],
    },
    {
        "date": "2026-01-15",
        "total_kg": 7.0,
        "entries": [
            {"label": "Restavfall", "weightKg": 2.0},
            {"label": "Matavfall",  "weightKg": 0.5 + 5.0 - 5.0},
            {"label": "Papp/papir", "weightKg": 2.0},
            {"label": "Metall",     "weightKg": 1.0},
            {"label": "EE-avfall",  "weightKg": 0.5},
            {"label": "Plast",      "weightKg": 1.5},
        ],
    },
]

env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)
template = env.get_template("report_template.html")
html = template.render(
    period="2026-Q1",
    year="2026",
    quarter_label="Q1",
    location_name="Bouvet Stavanger",
    total_kg=100.0,
    registration_count=6,
    category_count=len(categories),
    categories=categories,
    registrations=registrations,
    submitted_by="inge.halvorsen",
    submitted_at="2026-04-02",
)

OUT.write_text(html, encoding="utf-8")
print(f"Preview written to: {OUT}")
webbrowser.open(OUT.as_uri())

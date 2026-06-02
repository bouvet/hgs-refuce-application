# Copilot instructions for hgs-refuce-application

Purpose: concise guidance for Copilot-powered sessions working in this repository.

1) Build, test and lint commands
- No build, test, or lint configuration detected in the repository root (no package.json, pyproject.toml, requirements.txt, setup.py, Makefile, or CI workflows present).
- If/when toolchains are added, update this file. Example commands to document when relevant:
  - Node (example):
    - Install: npm install
    - Run full tests: npm test
    - Run single test: npm test -- tests/path/to/test-file.test.js or npm test -- -t "test name"
    - Lint: npm run lint
  - Python (example):
    - Install: pip install -r requirements.txt
    - Run full tests: pytest
    - Run single test: pytest tests/test_file.py::test_name
    - Lint: flake8 or ruff

2) High-level architecture (from bossapp.md and README.md)
- Purpose: backend service that accepts datapoints, stores them, performs calculations, and exposes processed data to a frontend.
- Primary data flow: data_storage <--- backend <--- frontend <--- user
- Suggested/observed endpoints (design doc):
  - POST /add_datapoint -> persist incoming datapoint to long-term storage
  - GET  /get_datapoint -> fetch and return processed data (design doc references return_data.json)
- Non-functional notes from design doc:
  - Data should be pre-crunched/processed on the backend for frontend consumption
  - Access model: admin and regular users; authentication and authorization must be added and enforced
  - Data ingestion format is currently unspecified; design for extensibility when adding parsers/adapters
- README notes: project references use of LLMs in the workflow; treat LLM-driven suggestions as design prompts, not final implementation.

3) Key conventions and repo-specific patterns
- Endpoints and flow named in design doc: use the /add_datapoint and /get_datapoint routes and keep data-processing responsibilities on the backend.
- Persistent storage expectation: add a clear long-term storage backend (DB or file store) and document its schema and access module when added.
- Roles: explicitly track admin vs user functionality (place related code in a clear auth/ or roles/ module when implemented).
- Documentation-first hints: bossapp.md contains the shape of the system—keep design notes in this file or add a design/ directory so Copilot sessions can find architecture notes quickly.
- LLM guidance: README contains lines addressed to a code assistant (e.g., "the codeAssistent should recomend stack"). When a Copilot session modifies architecture or stack, ensure those suggestions are converted to explicit PRs and documented here.

4) AI assistant config check
- Checked for these files and found none in repo root: CLAUDE.md, .cursorrules, .cursor/rules/, AGENTS.md, .windsurfrules, CONVENTIONS.md, AIDER_CONVENTIONS.md, .clinerules, .cline_rules
- No .github/copilot-instructions.md existed previously; this file has been added.

5) Where to look next for context
- README.md — project one-line and LLM note
- bossapp.md — backend design doc and endpoints
- After adding code: look for package.json / pyproject.toml / requirements.txt and CI workflows under .github/workflows to update build/test commands here.

6) How Copilot sessions should behave here
- Prefer proposals that implement the simple backend endpoints described in bossapp.md and add unit tests for endpoint behavior and storage interactions.
- When proposing a stack, include concrete project files (package.json or pyproject.toml) and a README update so future sessions can discover exact commands.

If you add tests, build tooling, or CI workflows, update this file with the exact commands and a short example of running a single test.

---

(Generated from README.md and bossapp.md)

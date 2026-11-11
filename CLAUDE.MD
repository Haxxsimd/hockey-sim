# Project: Retro Hockey / Tactics Sim (Core Engine)

## Architecture & Goals
- Pure simulation engine: logic and state are strictly separated from presentation.
- Platform: Node.js / TypeScript.
- Focus: Fast, turn-/tick-based simulation with attributes, hidden potential (CA/PA), and tactical roles (e.g. net-front screens, snipers).
- Keep code modular with clean unit tests for game logic.

## Guidelines for Claude
- Always write minimal, working TypeScript code.
- Prefer deterministic/seedable random generation for match tests.
- Do not introduce heavy graphics libraries or web servers yet; test everything via CLI and unit tests (e.g., ts-node / Vitest).
- Keep files small and focused.
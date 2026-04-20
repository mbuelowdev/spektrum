# AGENTS.md

## Quick test environment setup

1. Start the frontend (from repo root):
   - `python3 -m http.server 4173`
2. Open:
   - `http://127.0.0.1:4173`

## Optional: create a mock room for game testing

If the API is running (local or remote), create a room + mock players:
- `python3 scripts/create_mock_room.py --api-base-url http://127.0.0.1:9001`

For the shared remote API:
- `python3 scripts/create_mock_room.py --api-base-url https://api.spektrum.mbuelow.dev`

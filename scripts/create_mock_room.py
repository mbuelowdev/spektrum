#!/usr/bin/env python3
"""Create a mock room with players via the Spektrum API.

This script:
1) creates one room
2) creates N players
3) joins all players into the room
4) switches the second half to team B
5) fetches the final room snapshot for verification
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class ApiError(Exception):
    """Raised when an API request fails."""

    def __init__(self, message: str, status_code: int | None = None, payload: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


@dataclass
class PlayerRecord:
    index: int
    name: str
    uuid: str
    join_message: str
    switched_to_team_b: bool = False


def request_json(base_url: str, method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    url = f"{base_url.rstrip('/')}{path}"
    headers = {"Accept": "application/json"}
    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(url=url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            if not raw:
                return {}
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return {"raw": raw}
    except HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        raise ApiError(
            f"{method} {path} failed with HTTP {error.code}",
            status_code=error.code,
            payload=payload,
        ) from error
    except URLError as error:
        raise ApiError(f"{method} {path} failed: {error}") from error


def extract_room_uuid(payload: Any) -> str:
    if isinstance(payload, dict):
        room_uuid = payload.get("uuid") or payload.get("id")
        if room_uuid:
            return str(room_uuid)
        room = payload.get("room")
        if isinstance(room, dict):
            room_uuid = room.get("uuid") or room.get("id")
            if room_uuid:
                return str(room_uuid)
    raise ApiError("Room creation response did not include a room UUID", payload=payload)


def extract_player_uuid(payload: Any) -> str:
    if isinstance(payload, dict):
        player_uuid = payload.get("uuid") or payload.get("Uuid")
        if player_uuid:
            return str(player_uuid)
    raise ApiError("Player creation response did not include a player UUID", payload=payload)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create a mock Spektrum room and populate it with generated players."
    )
    parser.add_argument(
        "--api-base-url",
        default="http://127.0.0.1:9001",
        help="API base URL (default: %(default)s).",
    )
    parser.add_argument(
        "--players",
        type=int,
        default=6,
        help="Number of mock players to create (default: %(default)s).",
    )
    parser.add_argument(
        "--name-prefix",
        default="Mock Player",
        help="Prefix used for generated player names.",
    )
    parser.add_argument(
        "--password",
        default="",
        help="Optional room password used for create/join operations.",
    )
    args = parser.parse_args()

    if args.players < 2:
        print("error: --players must be >= 2", file=sys.stderr)
        return 2

    try:
        room_payload = request_json(
            args.api_base_url,
            "POST",
            "/room/create",
            {"password": args.password} if args.password else {},
        )
        room_uuid = extract_room_uuid(room_payload)

        timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
        players: list[PlayerRecord] = []
        for index in range(1, args.players + 1):
            name = f"{args.name_prefix} {index} {timestamp}"
            created = request_json(
                args.api_base_url,
                "POST",
                "/player/create",
                {"name": name},
            )
            player_uuid = extract_player_uuid(created)

            join_payload = {
                "uuidRoom": room_uuid,
                "uuidPlayer": player_uuid,
            }
            if args.password:
                join_payload["password"] = args.password
            joined = request_json(args.api_base_url, "POST", "/room/join", join_payload)
            join_message = joined.get("message", "") if isinstance(joined, dict) else ""
            players.append(PlayerRecord(index=index, name=name, uuid=player_uuid, join_message=join_message))

        first_team_b_index = (args.players // 2) + 1
        for player in players:
            if player.index >= first_team_b_index:
                request_json(
                    args.api_base_url,
                    "POST",
                    "/room/switch-team",
                    {
                        "uuidRoom": room_uuid,
                        "uuidPlayer": player.uuid,
                        "team": "B",
                    },
                )
                player.switched_to_team_b = True

        snapshot = request_json(args.api_base_url, "GET", f"/room/{room_uuid}")
        team_a_count = len(snapshot.get("playersTeamA", [])) if isinstance(snapshot, dict) else 0
        team_b_count = len(snapshot.get("playersTeamB", [])) if isinstance(snapshot, dict) else 0

        result = {
            "api_base_url": args.api_base_url.rstrip("/"),
            "room_uuid": room_uuid,
            "room_path": f"/{room_uuid}",
            "players_requested": args.players,
            "team_a_count": team_a_count,
            "team_b_count": team_b_count,
            "players": [
                {
                    "index": player.index,
                    "name": player.name,
                    "uuid": player.uuid,
                    "team": "B" if player.switched_to_team_b else "A",
                    "join_message": player.join_message,
                }
                for player in players
            ],
        }
        print(json.dumps(result, indent=2))
        return 0
    except ApiError as error:
        print(f"error: {error}", file=sys.stderr)
        if error.payload is not None:
            print(json.dumps({"details": error.payload}, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

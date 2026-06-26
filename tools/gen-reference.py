#!/usr/bin/env nix-shell
#!nix-shell -i python3 -p python3 python3Packages.numpy python3Packages.scipy
"""Generate reference tide vectors from the canonical pytides2 engine.

This is the oracle for the TypeScript port: it loads the same fitted constituent
JSONs the app bundles, runs them through pytides2 (via ~/org/scripts/tides_lib),
and writes hourly heights + high/low waters to a fixture the engine test checks
against. Run it whenever you add a station or touch the data.

    tools/gen-reference.py
"""
import collections
import collections.abc
import datetime as dt
import json
import sys
from pathlib import Path

import numpy as np

# pytides2 compat shims (stale lib): must precede the import.
if not hasattr(collections, "Iterable"):
    collections.Iterable = collections.abc.Iterable
if not hasattr(np, "float"):
    np.float = float

PYTIDES_LIB = Path("~/org/scripts/tides_lib").expanduser()
sys.path.insert(0, str(PYTIDES_LIB))

import pytides2.constituent as cons  # noqa: E402
from pytides2.tide import Tide  # noqa: E402

NAME2CONST = {c.name: c for c in cons.noaa}
NAME2CONST["Z0"] = cons._Z0

REPO = Path(__file__).resolve().parent.parent
DATA = REPO / "apps" / "mobile" / "assets" / "data"
OUT = REPO / "apps" / "mobile" / "lib" / "tides" / "__fixtures__" / "reference.json"

# (station file, ISO start (UTC)) — a spread of seasons/years to exercise the
# nodal corrections and the S2/K2, K1/P1 splits.
WINDOWS = [
    ("tobermory.json", "2026-07-01T00:00:00"),
    ("tobermory.json", "2027-01-15T00:00:00"),
    ("leith.json", "2026-07-01T00:00:00"),
    ("leith.json", "2026-12-21T00:00:00"),
    ("ullapool.json", "2026-07-01T00:00:00"),
    ("wick.json", "2026-07-01T00:00:00"),
    ("aberdeen.json", "2026-08-10T00:00:00"),
    ("stornoway.json", "2026-07-01T00:00:00"),
    ("lerwick.json", "2026-09-01T00:00:00"),
    ("port_ellen.json", "2026-07-01T00:00:00"),
]

SPAN_HOURS = 48


def build_tide(path: Path) -> Tide:
    data = json.loads(path.read_text())
    names, amps, phases = [], [], []
    for c in data["constituents"]:
        names.append(c["name"])
        amps.append(c["amplitude"])
        phases.append(c["phase"])
    constituents = [NAME2CONST[n] for n in names]
    return Tide(constituents=constituents, amplitudes=amps, phases=phases)


def main() -> None:
    windows = []
    for fname, iso in WINDOWS:
        tide = build_tide(DATA / fname)
        t0 = dt.datetime.fromisoformat(iso)
        t1 = t0 + dt.timedelta(hours=SPAN_HOURS)

        times = [t0 + dt.timedelta(hours=i) for i in range(SPAN_HOURS + 1)]
        heights = [float(h) for h in tide.at(times)]

        extrema = []
        for when, height, hilo in tide.extrema(t0, t1):
            extrema.append(
                {
                    "t": when.replace(microsecond=0).isoformat(),
                    "h": round(float(height), 4),
                    "type": "high" if hilo == "H" else "low",
                }
            )

        windows.append(
            {
                "station": fname,
                "t0": iso,
                "spanHours": SPAN_HOURS,
                "hourly": [round(h, 4) for h in heights],
                "extrema": extrema,
            }
        )
        print(f"  {fname} @ {iso}: {len(extrema)} extrema")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"windows": windows}, indent=2) + "\n")
    print(f"wrote {OUT.relative_to(REPO)} ({len(windows)} windows)")


if __name__ == "__main__":
    main()

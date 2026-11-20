# Tidal streams — model & data

The **Streams** feature estimates slack times and rates for well-known races. It
is deliberately a *model*, not a tidal stream atlas, and uses no copyrighted
Admiralty data.

## The model

Every race in `lib/streams.ts` → `RACES` is a "gate", a strait or sound
(Pentland Firth, Corryvreckan, Dorus Mòr…):

1. **Slack water** occurs near the reference port's HW/LW (± an offset), from the
   offline tide engine (`predictExtrema`).
2. Between consecutive slacks the **rate follows a sinusoid** (the "50/90" idea).
3. The **peak magnitude** scales between the race's neap and spring figures by
   the day's spring/neap fraction (`classifyTide`).

So a gate needs: a reference station, slack offsets, flood/ebb sense, and a
**published** spring/neap peak rate (common knowledge — Pentland ~12 kn,
Corryvreckan ~8.5 kn — *not* Admiralty's tables).

The slack offsets are **calibrated from published figures** (sailing/kayak
sources, not the Admiralty atlas), and match to ~5–15 min where checkable, e.g.:
Corryvreckan W-going begins HW Oban +4:10 / E-going −2:10; Pentland W-going HW
**Aberdeen** −1:05 / E-going +5:00; Dorus Mòr slack ~1½ h before HW/LW Oban.
The flood/ebb *magnitudes* are still modelled symmetric (the timing is the part
that's calibrated).

The **Falls of Lora** (Connel) is a gate too: the falls run out from HW Oban
+2:10 and in from LW Oban +2:50. Those are the fixed offsets fallsoflora.info
puts on XTide's Oban, on every turn of its 2026 table, so they're a local rule of
thumb rather than a model. A loch low-pass ("sill") model fitted to the same table
did no better (~9-10 min mean against ~7.5 for the offsets) and was dropped.

## What's approximate

- **Slack timing** is keyed to HW/LW of the reference port with a fixed offset.
  Real races don't turn exactly at local HW/LW — calibrate the offsets against a
  pilot/atlas and update `slackAtHwOffsetMin` / `slackAtLwOffsetMin`.
- **Direction** is a coarse flood/ebb sense, not a true set.
- **Peak rates** are single published figures, not the full hour-by-hour table.

## Adding / calibrating a race

Edit `RACES` in `apps/mobile/lib/streams.ts`. Pick a bundled `referenceStationId`
with a good tidal relationship to the race, set the published peak rates, and
tune the slack offsets against the atlas. The UI carries the standing safety
warning; keep each race's `warning` specific and honest.

> ⚠️ These are estimates for planning, never for navigation. The Pentland Firth
> and Corryvreckan can kill — always verify against the tidal stream atlas and
> the pilot.

# Tidal streams — model & data

The **Streams** feature estimates slack times and rates for well-known races. It
is deliberately a *model*, not a tidal stream atlas, and uses no copyrighted
Admiralty data.

## The two models

Each race in `lib/streams.ts` → `RACES` has a `type`:

**`gate`** — a strait/sound (Pentland Firth, Corryvreckan, Dorus Mòr…):

1. **Slack water** occurs near the reference port's HW/LW (± an offset), from the
   offline tide engine (`predictExtrema`).
2. Between consecutive slacks the **rate follows a sinusoid** (the "50/90" idea).
3. The **peak magnitude** scales between the race's neap and spring figures by
   the day's spring/neap fraction (`classifyTide`).

So a gate needs: a reference station, slack offsets, flood/ebb sense, and a
**published** spring/neap peak rate (common knowledge — Pentland ~12 kn,
Corryvreckan ~8.5 kn — *not* Admiralty's tables).

**`sill`** — a basin behind a rock sill (**Falls of Lora**, at Connel). Here the
stream is driven by the **head between the open sea and the loch**, not by local
HW/LW. We take the sea level (the reference port), low-pass it to estimate the
lagged loch level (`lochTauHours`), and set the rate ∝ `head = sea − loch`
(`headRateScale`). The falls run **out** when the falling sea drops below the
loch and **in** when it rises above — the documented mechanism — giving the
asymmetric, strongly range-dependent windows a sinusoid can't. Slacks are the
head's zero crossings. Tune `lochTauHours` / `headRateScale` against a reference
like fallsoflora.info.

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

# Tidal streams — model & data

The **Streams** feature estimates slack times and rates for well-known races. It
is deliberately a *model*, not a tidal stream atlas, and uses no copyrighted
Admiralty data.

## The model

For each race (`lib/streams.ts` → `RACES`):

1. **Slack water** occurs near the reference port's HW/LW (± an offset), taken
   straight from the offline tide engine (`predictExtrema`).
2. Between consecutive slacks the **rate follows a sinusoid** (the "50/90" idea):
   zero at slack, peak mid-way.
3. The **peak magnitude** scales between the race's neap and spring figures by
   the day's spring/neap fraction (`classifyTide`), so the rate is small on
   neaps and large on springs.

So a race needs only: a reference station, slack offsets, flood/ebb sense, and a
**published** spring/neap peak rate (common knowledge — e.g. Pentland ~12 kn,
Corryvreckan ~8.5 kn — *not* Admiralty's tables).

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

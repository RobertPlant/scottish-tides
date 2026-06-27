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

The slack offsets are **calibrated from published figures** (sailing/kayak
sources, not the Admiralty atlas), and match to ~5–15 min where checkable, e.g.:
Corryvreckan W-going begins HW Oban +4:10 / E-going −2:10; Pentland W-going HW
**Aberdeen** −1:05 / E-going +5:00; Dorus Mòr slack ~1½ h before HW/LW Oban.
The flood/ebb *magnitudes* are still modelled symmetric (the timing is the part
that's calibrated).

**`sill`** — a basin behind a rock sill (**Falls of Lora**, at Connel). Here the
stream is driven by the **head between the open sea and the loch**, not by local
HW/LW. We take the sea level (the reference port) and low-pass it to estimate the
lagged loch level, then set the rate ∝ `head = sea − loch` (`headRateScale`). The
loch's low-pass is **asymmetric** — it fills faster (`lochTauFillHours`) than it
drains (`lochTauDrainHours`), because the sill restricts outflow — so the falls
run **out** longer on the ebb (the documented mechanism), giving asymmetric,
strongly range-dependent windows a sinusoid can't.

The Falls-of-Lora constants are **calibrated against fallsoflora.info** (itself
XTide): fill τ 3.5 h / drain τ 8 h reproduces the published turn times to ~12 min
mean. `headRateScale` is set so big springs peak ~7 kn (the rate isn't published,
so its magnitude is indicative). Re-calibrate against that site if needed.

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

# Marsad (مرصد) — Visual Design Brief
*Attach this file + `03-proposal-marsad.md` to the design session.*

## Brand
- **Name:** مرصد (Marsad — "path/route"). Domain feel: roads, motion, resolution, trust.
- **Personality:** governmental-grade trust + modern fintech clarity. NOT playful. Think: Absher/Najm credibility with cleaner, calmer UI.
- **Logo directions (pick one, iterate):**
  1. Arabic wordmark مرصد where the connecting stroke forms a road/path with a subtle route-pin or checkpoint.
  2. Abstract mark: two converging lanes forming the letter م, resolving into one line (two parties → one settlement).
  3. Shield + road monogram (trust + traffic). Avoid clichés: no car crashes, no cracked glass.
- Must work: single color, small favicon 16px, on dark & light, next to Arabic AND Latin "Marsad".

## Colors (suggested starting palette)
- Primary: deep trust blue `#1F4E79` / `#2C5F8A`
- Success/settled: green `#2E7D4F`
- Warning/SLA: amber `#B26A00`
- Danger/rejected: red `#C62828`
- Neutrals: slate grays, near-white backgrounds `#F7F9FB`
- Status colors map 1:1 to case/claim states (12-state machine) — design a status chip system.

## Typography
- Arabic-first: IBM Plex Sans Arabic (preferred) or Noto Kufi Arabic for headings + IBM Plex Sans Arabic text. Latin fallback: IBM Plex Sans.
- Full RTL layout. Numbers: Western digits (0-9) for case numbers/amounts.

## Screens to design (priority order)
1. **Accident reporting wizard (mobile-first, THE hero flow):** steps = location pin → guided photo capture with overlay ghost frames (wide shot, both cars, damage close-ups, plates) → counterparty (QR scan / manual) → voice/text statement → review & submit. Design for a stressed user: huge buttons, one action per screen, progress bar, works one-handed.
2. **Citizen case view:** timeline of case states, evidence gallery, fault decision with the cited rule in plain Arabic, objection button with 72h countdown.
3. **Claim tracking:** Uber-style status timeline with SLA expectations.
4. **Adjudicator console (desktop):** queue, two statements side-by-side with auto-highlighted contradictions, evidence viewer, matrix proposal card → confirm/override.
5. **Insurer console (desktop):** claims table with SLA countdown chips, claim detail, decision panel with mandatory reason codes, settlement form.
6. **Public QR verify page:** minimal, no login, shows report validity only.
7. Landing page + login (phone + OTP).
8. Regulator/authority dashboard: SLA compliance cards + accident heatmap.

## Components (shadcn/ui base, customized)
Status chips (12 case states + 8 claim states), SLA countdown badge, evidence card (photo + hash icon + geotag), timeline, guided-camera overlay, rule-citation card, reason-code select, Arabic form fields (right-aligned labels, validation below-right).

## Constraints
- RTL everywhere; test every component mirrored.
- Low-end Android browsers; wizard target < 5 min completion.
- WCAG AA contrast. Offline banner + local-save indicator on wizard.
- SYP amounts with thousands separators; dual date display where customary.

## Deliverables
Logo (SVG, all variants) · color/typography tokens · the 8 screens (mobile 390px for 1-3 & 6-7; desktop 1440px for 4-5 & 8) · component sheet · exported design tokens (JSON/Tailwind config) for handoff to code.

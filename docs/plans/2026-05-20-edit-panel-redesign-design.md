# Edit Panel Redesign — Design

Date: 2026-05-20. Approved.

## Goal

Replace the current edit UI (bottom-right add-city box + separate Home label
input + per-card `×` buttons) with a single side panel that exposes the full
list of zones for inline rename, drag-to-reorder, removal, and keyboard-
navigable city search. Per-card `×` buttons stay.

## UX

Clicking **Edit** opens a fixed slide-in panel on the right edge. Top-to-
bottom:

1. **Header row** — "Edit zones" label + close (×) button (= Done).
2. **Zone list** — one `.zone-row` per zone in current order:
   - Drag handle `≡` on the left. **Local row has no handle and is
     anchored at index 0.**
   - Editable label. Click to edit; Enter or blur commits. Empty value on
     the local row restores geo-detection (same effect as clearing the old
     homebox).
   - Read-only tz abbreviation (e.g. `CET`) right of the label.
   - `×` remove button. **Local row has no `×`.**
3. **Search box** — at the bottom of the panel, with keyboard navigation
   over results.
4. **Done button** — at the very bottom, mirrors the Edit toggle.

The fixed bottom-right Edit/Done toggle stays; it opens the panel. The
existing per-card `×` buttons stay (unchanged).

The current `.homebox` is removed — its function moves into the editable
label on the local row.

## Architecture

### Data layer (`src/zones.js`)

Add two pure functions:

- `renameZone(list, idx, newLabel) → list`
  - Returns new list with `list[idx].label = trimmed newLabel`.
  - No-op if idx is out of range.
  - **Does not** mutate the local zone's label (that path goes through
    `writeHome` in `geo.js`, not through this store).
- `reorderZones(list, fromIdx, toIdx) → list`
  - Moves the item at `fromIdx` to `toIdx`. Returns new list.
  - **Refuses to move the local zone** and **refuses to move any item
    into index 0** (local anchor). Returns the unchanged list in those
    cases.

Persistence path is unchanged: callers run `saveZones(list, storage)`.

### Glue (`newtab.js`)

New ctx handlers wired into the store:

- `onRename(row, value)`:
  - If `row.tz === "local"`: call `onHome(value)` (existing path).
  - Else: find idx, call `renameZone`, `saveZones`, `tick()`.
- `onReorder(fromIdx, toIdx)`: call `reorderZones`, `saveZones`, `tick()`.

The existing `onHome` handler stays but is now an internal detail; the
homebox UI is gone.

### Render layer (`src/render.js`)

`renderEditBar` is replaced. It still owns the Edit/Done toggle, but in
edit mode it also renders the side panel as a sibling DOM region.

To avoid the per-second tick clobbering the search input's focus and
selection (today the search box keeps focus via `ctx.focusSearch`), the
panel rebuilds **only on edit-state changes** (toggle, add, remove,
rename, reorder), not on the tick. This matches the existing pattern:
`paintBar()` is separate from `tick()`.

### Drag-to-reorder (pointer-based)

Implemented inline in `src/render.js` against the rendered `.zone-row`
elements. No external library.

- `pointerdown` on `.drag-handle`:
  - Capture pointer; record source idx, start Y, and row heights.
  - Add `.dragging` class to the source row (lifts it visually).
- `pointermove`:
  - Compute deltaY; translate the source row by `translateY(deltaY)`.
  - Compute target idx from cursor Y vs row positions; translate non-
    source rows that lie between source and target by ±rowHeight so the
    list visually parts to receive the drop. Clamp target idx to ≥ 1
    (local anchor).
- `pointerup`:
  - If target idx ≠ source idx, call `ctx.onReorder(source, target)` —
    which triggers a full panel rerender. Otherwise just clear transforms.
- A module-scoped `dragging` flag suppresses live tick effects on the
  panel; since the panel doesn't rerender on tick anyway, this is mostly
  a guard against `paintBar()` calls during a drag (we early-return).

### Keyboard navigation (search)

State: an integer `activeIdx` on the search panel scope (no globals).

- Input keydown:
  - `ArrowDown`: if results exist, set `activeIdx = 0`, focus the result
    `<ul>`.
  - `Enter`: if results exist, add `results[0]` (or `results[activeIdx]`
    if a result is already focused).
  - `Escape`: clear query.
- Results `<ul>` keydown:
  - `ArrowDown` / `ArrowUp`: cycle `activeIdx` modulo results.length.
    Wrap from top via Up returns focus to the input.
  - `Enter`: add `results[activeIdx]`.
  - `Escape`: clear query, return focus to input.
- Each result still mouse-clickable.
- Visual: `.results li.active` gets the existing hover background.

## Visuals

- Panel: 280px wide, full viewport height, `position: fixed; right: 0;
  top: 0`. Background `var(--panel)`, left border `var(--border)`.
- Slide-in transition: `transform: translateX(100%) → 0` over 150ms.
- Zone row: 36px tall, flex layout: handle, label/input, abbr (right-
  aligned), `×`. Hover reveals the handle's grab cursor.
- Editable label: shown as plain text by default; click → swap to `<input>`
  filling the same width, autofocus + select. Enter / Escape / blur all
  commit.
- Page content (1180px centered) is unchanged — panel overlays.
- Narrow screens (< 600px viewport): panel becomes full-width.

## Testing

New cases in `test/`:

- `renameZone` — happy path, out-of-range no-op, does not touch other
  zones, does not mutate input.
- `reorderZones` — happy path forward and backward, refuses to move local
  zone, refuses to move anything into idx 0, no-op when from === to.

Manual QA checklist:

- Open panel, rename "Madrid" → "Steve". Confirm card label, timeline
  label, and panel label all update; reload preserves.
- Drag "Tokyo" above "Madrid". Confirm card order, timeline order, and
  panel order all change; reload preserves.
- Type "lon" in search; press Down then Enter. Confirm "London" is added
  without the mouse.
- Clear local row label. Confirm geo-detection re-runs.

## Out of scope (v1)

- Animated insert/remove/reorder transitions.
- Drag on touch with long-press affordance (Pointer Events handles touch
  natively; explicit long-press is YAGNI here).
- Search fuzzy matching / diacritic insensitivity.
- Resizing or repositioning the panel.

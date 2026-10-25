# Photo-first landing — 2026-10-26

Hypothesis: let visitors see their own photo in a finished card before asking them to complete the editor. Conversion improvement is not yet measured.

- The first CTA opens a single-photo picker directly. JPG, PNG and WebP up to 20 MB are supported, matching the trip editor.
- The card uses a local object URL. Personal-photo backs show writing prompts, not example friends' statements presented as real comments.
- Continue carries the File in memory across client navigation. Trip and themed-album editors consume it once; refresh does not preserve it. No photo is uploaded until the existing save action.
- The trip composer places the selected-photo preview before the fields. Existing consent and save requirements remain intact.
- Korean and English CTAs, errors and privacy hints are included.

## Measurement

Landing picker engagement uses existing allowlisted events and `template_id=album-intro`: `album_maker_viewed` on first picker opening, `album_picker_opened`, `album_photos_selected`, and `album_preview_ready` after successful image decoding. All share the landing attempt ID. `memory_intro_viewed` remains the landing exposure denominator; `memory_intro_started` means continuing to the editor. These are not server upload or save completions. Editor attempts remain separate; use the journey identifier to connect downstream saves rather than treating the intro template's save count as conversion.

## Verified locally

- Ego browser: Korean mobile photo preview, travel handoff with exactly one photo and preview first, English couple editor handoff with exactly one photo.
- Real picker opening; unreadable-image error and recovery with another photo; personal card flip.
- TypeScript, targeted ESLint (no errors), production build passed. Build printed two generic application request warnings during prerender but completed successfully.
- No production photo uploads or publishing performed for this check. Production deployment is not included in this change.

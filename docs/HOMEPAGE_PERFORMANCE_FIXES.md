# Homepage Performance & iOS Stability — Issue Tracker

**Date:** 2026-07-20
**Area:** Homepage hero (`components/hero`, `components/ui`), homepage ads API
**Trigger:** Reported loading lag ("app feels heavy"), heavy image motion on the
homepage, and intermittent breakage in iOS Safari / Chrome.

## Root cause (summary)

The homepage hero ran **two independent WebGL/OGL contexts simultaneously** — a
fullscreen `Aurora` noise shader and the `CircularGallery` image marquee — each
with its own infinite `requestAnimationFrame` loop that never paused, on top of
**~4 MB of unoptimized images**. Two high-memory GL contexts is the classic
trigger for iOS Safari's GPU-memory reclaim → lost context → blank/broken hero.

---

## Status board

| ID | Issue | Area | Severity | Status |
|----|-------|------|----------|--------|
| PERF-01 | `hero-bg.png` (2.5 MB) loaded as raw CSS background, bypassing image optimization | Load weight | High | ✅ Fixed |
| PERF-02 | 10 food-gallery images (~1.5 MB) shipped full-res as WebGL textures | Load weight | High | ✅ Fixed |
| PERF-03 | Two concurrent WebGL contexts (Aurora + Gallery) → iOS context loss | iOS stability | High | ✅ Fixed |
| PERF-04 | `CircularGallery` plane geometry over-tessellated (100×50 = 120k quads total) | GPU cost | Medium | ✅ Fixed |
| PERF-05 | Gallery render loop ran forever, even off-screen / in background tabs | GPU / battery | Medium | ✅ Fixed |
| PERF-06 | `prefers-reduced-motion` only CSS-hid Aurora; WebGL kept rendering; Gallery ignored it entirely | Accessibility | Medium | ✅ Fixed |
| PERF-07 | Gallery bound `wheel`/`touch`/`mouse` listeners to `window`, hijacking page scroll (iOS jank) | Interaction / iOS | Medium | ✅ Fixed |
| ROBUST-01 | `/api/homepage-ads` returned HTTP 500 on every homepage load when the ads backend errored | Robustness | Low | ✅ Fixed |
| CLEAN-01 | Dead `Aurora.tsx` / `Aurora.css` after Aurora removal | Cleanup | Low | ✅ Fixed |
| CLEAN-02 | Unused `hero-bg.png` (2.4 MB) still deployed in `public/` | Cleanup | Low | ✅ Fixed |
| OPEN-01 | `project-fit-wordmark-clean.png` source is 752 KB (served optimized at ~73 KB via next/image) | Load weight | Low | 🔲 Open (optional) |
| OPEN-02 | `hero-bg.webp` has no `<picture>`/`image-set()` PNG fallback (fine for iOS 14+) | Compatibility | Low | 🔲 Open (optional) |
| OPEN-03 | `/api/my-plan` returns 401 for logged-out visitors on the homepage (correct, but logs a console error) | Noise | Low | 🔲 Open (optional) |

---

## Fixed — details

### PERF-01 — Optimize the hero background image ✅
Was loaded as a raw CSS `background: url(...)` in `hero-3.module.css`, so Next's
image optimizer never touched it.
- **hero-bg.png 2.5 MB → hero-bg.webp 137 KB** (~95% smaller), resized to 1600px wide.
- Files: `public/images/heroes/hero-bg.webp` (new), `components/ui/hero-3.module.css:22`.

### PERF-02 — Downsize food-gallery textures ✅
Only used by the hero gallery; safe to resize in place (originals in git history).
- **10 images 1.5 MB → 479 KB total** (resized 1200→800px, mozjpeg q72).
- Files: `public/images/food-gallery/*.jpg`.

### PERF-03 — Drop one of the two WebGL contexts ✅
Replaced the `Aurora` WebGL shader with a static CSS gradient. Aurora rendered at
`opacity: 0.18`, so the gradient is visually near-identical while removing a whole
GL context.
- **Verified: page went from 2 → 1 live WebGL contexts.**
- Files: `components/ui/hero-3.tsx`, `components/ui/hero-3.module.css` (`.aurora`).

### PERF-04 — Lower gallery geometry ✅
The vertex shader only applies a gentle wave, so the plane needs very few segments.
- **heightSegments/widthSegments 50/100 → 12/20** (~95% fewer vertices, visually identical).
- Files: `components/ui/CircularGallery/CircularGallery.tsx` (`createGeometry`).

### PERF-05 — Pause the render loop when not visible ✅
Added an `IntersectionObserver` + `visibilitychange` gate so the loop only runs
while the gallery is on-screen and the tab is visible.
- **Verified: 720 WebGL draws / 400 ms while visible → 0 draws off-screen.**
- Files: `CircularGallery.tsx` (`startLoop`/`stopLoop`/`wake`/`isRunnable`/`observeVisibility`, self-gating `update`).

### PERF-06 — Honour reduced-motion in the gallery ✅
Reads `prefers-reduced-motion` in the React component and passes it to the app:
freezes the decorative wave + scroll distortion and idles the loop when settled.
- Files: `CircularGallery.tsx` (component effect, `App` constructor, `Media.update`).

### PERF-07 — Scope gallery input to its own element ✅
Wheel/touch/mouse scrubbing listeners moved from `window` to the gallery container
and marked `passive` (they never `preventDefault`). A drag that begins on the
gallery still tracks via `window` move/up guarded by `isDown`.
- Files: `CircularGallery.tsx` (`addEventListeners`/`destroy`).

### ROBUST-01 — Graceful degrade for the ads API ✅
`supabaseRestFetch` **throws** on missing env, so the previous `{ error }` check
never ran and the route 500'd. Now wrapped in `try/catch`: returns
`200 { enabled: false, ads: [] }` on any error/throw, still `console.error`-logged
server-side for observability.
- **Verified: `/api/homepage-ads` 500 → 200 `{"enabled":false,"ads":[]}`; homepage console error gone.**
- Files: `app/api/homepage-ads/route.ts`.

### CLEAN-01 / CLEAN-02 — Remove dead assets ✅
- Deleted `components/ui/Aurora/Aurora.tsx`, `components/ui/Aurora/Aurora.css` (unimported after PERF-03).
- Deleted `public/images/heroes/hero-bg.png` (2.4 MB, unreferenced after PERF-01).

---

## Open / optional (not yet done)

- **OPEN-01** — Re-export the wordmark source at a smaller size. Runtime impact is
  already minimal (next/image serves ~73 KB); this only trims the repo/deploy.
- **OPEN-02** — Add a PNG fallback via `image-set()` if you must support iOS < 14
  (WebP-in-CSS is fine on all current browsers).
- **OPEN-03** — Optionally skip the `/api/my-plan` fetch for anonymous visitors to
  silence the (correct) 401 in the console.

---

## Verification

- `npm run lint` — clean.
- `npm run build` — compiles successfully, all 51 pages generated.
- Browser (localhost:3000): 1 WebGL context; gallery loop pauses off-screen;
  hero renders identically (wordmark, tagline, CTAs, food strip); ads API returns 200.

## Net impact

- **~2.8 MB less** downloaded on first homepage load (hero-bg + food gallery).
- **One fewer WebGL context** and **~95% fewer gallery vertices** → the primary iOS crash vector removed.
- **Zero GPU work** when the hero is scrolled away or the tab is backgrounded.

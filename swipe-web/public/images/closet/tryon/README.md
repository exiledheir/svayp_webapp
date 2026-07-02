# Try-on example photos

Shown in the "Try It On?" confirm sheet (see `components/closet/TryOnFlow.tsx`
→ `ExamplePhoto`) when the user picks **On my photo**. They teach how to shoot a
photo that produces a good virtual try-on result.

Three full-body photos live here:

- `example-1.png` — full-length shot (whole body in frame) → caption "Full length"
- `example-2.png` — well-lit shot (bright, even light) → caption "Good lighting"
- `example-3.png` — plain/uncluttered background → caption "Plain background"

Notes
- Displayed at a 3:4 aspect ratio, `object-cover`, in a 3-column strip.
- Any missing file falls back to a neutral silhouette placeholder, so the sheet
  never breaks — but add all three for the intended look.
- Keep them modest in size (~150–300 KB each); they load lazily.

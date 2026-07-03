# Try-on example photos

Shown in the "Try It On?" confirm sheet (see `components/closet/TryOnFlow.tsx`
→ `ExamplePhoto`) when the user picks **On my photo**. They teach how to shoot a
photo that produces a good virtual try-on result.

Three full-body example photos live here (WebP):

- `example-1.webp`, `example-2.webp`, `example-3.webp`

Each shows a good self-photo: full body in frame, even lighting, plain
background, outfit not covered.

Notes
- Displayed at a 2:3 aspect ratio, `object-cover`, in a 3-column strip; tapping
  one opens an enlarged viewer.
- Any missing file falls back to a neutral silhouette placeholder, so the sheet
  never breaks — but keep all three for the intended look.
- WebP, quality ~82, ~45–85 KB each; they load lazily. Re-encode from source
  with `sharp(src).webp({ quality: 82 })`.

# Market category artwork

Cut-out product photos for the category rail on `/market`
(`components/market/CategoryRail.tsx`).

One file per browse group, not one per postable category. Sellers still pick from
all 28 categories when posting; the rail groups them (`MARKET_BROWSE_GROUPS` in
`lib/market-attributes.ts`).

## Live files

| File | Shown as (EN) | Covers |
| --- | --- | --- |
| `tops.webp` | Tops | T-shirts & Tops, Shirts & Blouses, Sweaters & Knits |
| `dresses.webp` | Dresses & Sets | Dresses, Sets |
| `bottoms.webp` | Bottoms | Trousers & Jeans, Skirts, Shorts, Leggings & Triko |
| `outerwear.webp` | Outerwear | Jacket, Coat, Puffer, Trench |
| `shoes.webp` | Footwear | Pumps, Sneakers, Heels, Ankle boots, Sandals, High boots, Flats |
| `bags.webp` | Bags | Bags |
| `hijab.webp` | Headscarf / Hijab | Headscarf & Hijab, Scarf, Headwear |
| `jewelry.webp` | Jewelry | Jewelry |
| — *(icon)* | Accessories | Glasses, Belt |
| `underwear.webp` | Underwear | Underwear |

**Accessories has no photo on purpose** — glasses and belts have too little in
common to photograph as one hero product, so it wears a line icon. It's marked
`iconOnly: true` in `MARKET_BROWSE_GROUPS`; to give it artwork, drop
`accessories.webp` here and delete that flag.

## Spec

- **Format:** WebP with a **transparent background**. (Not PNG — these are
  photographs; with alpha at 320 px WebP lands ~10 KB against PNG's ~200 KB.)
- **Size:** 320×320, item centred, sized by the rule below.
- **Style:** one garment, flat / ghost-mannequin, no model, no props.
- The gradient disc behind the item is drawn in CSS, so a baked-in white
  background shows as a pale square inside a pink circle and breaks in dark mode.

## Adding or replacing one

Put the new source shot in `_source/`, add it to the `MAP` in
`_source/make-cutouts.py`, then:

```sh
python3 _source/make-cutouts.py .
```

The script keys out the studio background by **flood-filling inward from the
border** rather than thresholding on colour — that's what lets a cream t-shirt on
a light-grey ground keep its body instead of being punched through.

It also normalises size by the geometric mean of bounding box and ink area, so
every item carries the same visual weight in the rail: fitting by bounding box
alone leaves a long coat a thin sliver beside a handbag, while fitting by ink
area alone shrinks a solid t-shirt beside a pair of strappy sandals.

Filenames are derived from the group id, so a correctly-named file is picked up
with no code change. A missing file falls back to the group's line icon.

`_source/` holds the untouched originals and is not referenced by the app.

Labels come from `lib/wardrobe-taxonomy.ts` (en/ru/uz) — don't bake text into
the artwork.

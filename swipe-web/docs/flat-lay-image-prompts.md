# Flat-Lay Image Generation Prompts

Re-generate user-uploaded clothing items as premium flat-lay product shots for the top-down mannequin composition.

---

## TOPS (tops, tshirts, blouses, dresses, jumpsuits)

```
Professional fashion flat-lay photography of a [ITEM DESCRIPTION] laid flat on invisible surface, shot from directly above at perfect 90-degree top-down angle. The garment is naturally spread as if worn by an invisible mannequin — shoulders extended, sleeves slightly opened, body relaxed and symmetrical. Studio lighting with soft diffused shadows. Crisp fabric texture visible. Isolated on pure transparent background, no surface texture, no wrinkles, no hangers. Ultra-high resolution product photography, editorial luxury e-commerce style.
```

## JACKETS / OUTERWEAR

```
Professional fashion flat-lay photography of a [ITEM DESCRIPTION] laid flat, shot from directly above at perfect 90-degree top-down angle. The jacket is unbuttoned/unzipped and naturally spread open as if draped on an invisible mannequin — shoulders squared, sleeves slightly bent at elbows, collar naturally folded. Studio lighting with soft diffused shadows. Fabric weight and texture clearly visible. Isolated on pure transparent background, no surface, no props. Ultra-high resolution product photography, editorial luxury flat-lay style.
```

## BOTTOMS (pants, jeans, skirts, shorts)

```
Professional fashion flat-lay photography of [ITEM DESCRIPTION] laid flat, shot from directly above at perfect 90-degree top-down angle. The garment is naturally positioned as if worn by an invisible mannequin — waistband at top, legs/hem extended downward, natural relaxed drape with realistic proportions. Slight natural fold at knees for pants. Studio lighting with soft diffused shadows. Isolated on pure transparent background, no surface texture, no props. Ultra-high resolution product photography, editorial luxury e-commerce style.
```

## SHOES

```
Professional fashion flat-lay photography of a pair of [ITEM DESCRIPTION], shot from directly above at perfect 90-degree top-down angle. Shoes placed side by side in natural walking position, toes pointing upward, slight V-angle between the pair. Clean and pristine condition. Studio lighting with soft realistic drop shadow only. Isolated on pure transparent background. Ultra-high resolution product photography, luxury editorial shoe campaign style.
```

## SHAWL / SCARVES

```
Professional fashion flat-lay photography of a [ITEM DESCRIPTION] elegantly draped as if resting across shoulders of an invisible mannequin, shot from directly above at perfect 90-degree top-down angle. The fabric cascades naturally with soft organic folds, spread wide horizontally to show full pattern and texture. Luxurious drape, visible weave/material quality. Studio lighting with delicate soft shadows. Isolated on pure transparent background. Ultra-high resolution product photography, editorial luxury styling.
```

## BAGS

```
Professional fashion flat-lay photography of a [ITEM DESCRIPTION], shot from directly above at perfect 90-degree top-down angle. Bag is closed, handle/strap arranged naturally to one side, positioned at a slight elegant angle. Hardware and texture details clearly visible. Studio lighting with soft directional shadow. Isolated on pure transparent background, no props. Ultra-high resolution product photography, luxury brand campaign style.
```

## JEWELRY / ACCESSORIES

```
Professional fashion flat-lay photography of [ITEM DESCRIPTION], shot from directly above at perfect 90-degree top-down angle. Item is delicately arranged in a natural resting position showing full detail — clasps open, chains gently curved, no tangles. Macro-level detail visible. Studio lighting with subtle metallic reflections and soft shadow. Isolated on pure transparent background. Ultra-high resolution product photography, fine jewelry editorial campaign style.
```

---

## Usage

| Parameter | Replace with |
|-----------|-------------|
| `[ITEM DESCRIPTION]` | Auto-detected or user-labeled item (e.g. "navy wool blazer", "black leather crossbody bag") |

## Key Composition Rules

- **90° top-down** — matches the flat-lay canvas perspective
- **Invisible mannequin** — items hold natural "worn" shape without a body visible
- **Transparent background** — composites cleanly on the white/gradient canvas
- **Soft shadows** — subtle photographic shadow adds realism; CSS shadows supplement
- **No props/surfaces** — items stay isolated for flexible positioning in the layout engine

## Layout Zones (for reference)

```
┌─────────────────────────────────┐
│         SHAWL (overlay)         │  ← z-index top, draped wide
├──────────┬──────────────────────┤
│          │                      │
│  ACCESS. │      TOP ZONE        │  ← shoulders spread, centered
│  (side)  │   (tops, jackets)    │
│          │                      │
├──────────┼──────────────────────┤
│          │                      │
│   BAGS   │    MIDDLE ZONE       │  ← waist aligned below top
│  (side)  │  (pants, skirts)     │
│          │                      │
├──────────┴──────────────────────┤
│          BOTTOM ZONE            │  ← shoes, natural foot placement
│        (shoes, paired)          │
└─────────────────────────────────┘
```

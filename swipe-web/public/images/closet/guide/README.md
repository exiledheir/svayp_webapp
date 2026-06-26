# Closet guide screenshots

Screenshots shown in the closet "Qo‘llanma" (Guide) modal, one (or two) per step:

- `qadam-1.png` — Upload clothes (tap "+")
- `qadam-2.png` — Choose category / details
- `qadam-3.png` — AI processes the clothes
- `qadam-4-1.png`, `qadam-4-2.png` — Boards (create looks — two screenshots)
- `qadam-5.png` — Virtual try-on
- `qadam-6.png` — Styling ("Kiyintirish")
- `qadam-7.png` — Weekly looks (Calendar)
- `qadam-8.png` — Looks ("Obrazlar")

Notes
- Mapping lives in `lib/closet-guide.ts` (`img()`). To add/remove a screenshot
  for a step, edit the array there.
- Any aspect ratio works; images are shown `object-contain`, capped at 72vh
  (60vh when a step has two). A step whose image is missing renders text-only.

## Video
`GUIDE_VIDEO_URL` in `lib/closet-guide.ts` is set to the YouTube short
`https://www.youtube.com/shorts/KoviqEhfaVY`. Replace it to change the video;
watch / share / embed / shorts URLs are all accepted.

## About Hero — spacing fix only

Two small CSS-only tweaks to `src/site/components/about-v2/HeroCinematic.tsx`. No image, font, or copy changes.

### 1. Stop descenders ("j" in "just" / "journeys") from being clipped
The word-reveal animation wraps each word in `overflow-hidden`, which crops the bottom of letters with descenders. Add a tiny bottom pad + matching negative margin on that wrapper so the clip box extends below the baseline without affecting layout:

```
- <span key={wi} className="mr-[0.25em] inline-block overflow-hidden align-baseline">
+ <span key={wi} className="mr-[0.25em] inline-block overflow-hidden align-baseline pb-[0.18em] -mb-[0.18em]">
```

### 2. Lift the headline on mobile so it's visible without scrolling
Currently the section is `h-screen min-h-[640px]` with `pb-32` on mobile, which pushes the headline near the bottom edge (and behind the "Scroll to explore" chip on shorter phones). Tighten mobile spacing only — desktop stays identical:

```
- <section className="relative h-screen min-h-[640px] w-full overflow-hidden bg-[#0B0B0E] text-white">
+ <section className="relative h-[88svh] min-h-[560px] w-full overflow-hidden bg-[#0B0B0E] text-white sm:h-screen sm:min-h-[640px]">

- <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-32 sm:px-10 sm:pb-24 lg:px-20 lg:pb-32">
+ <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-20 sm:px-10 sm:pb-24 lg:px-20 lg:pb-32">
```

Using `svh` (small viewport height) accounts for the mobile browser address bar so the headline doesn't sit under it.

### Files
- `src/site/components/about-v2/HeroCinematic.tsx`
# Performance and accessibility evidence

## Targets

- LCP ≤ 2.5 s
- INP ≤ 200 ms
- CLS ≤ 0.1
- WCAG 2.2 AA principles for semantic structure, keyboard use, focus, contrast and accessible names

## Implemented performance techniques

- Server Components by default on reader-facing routes.
- Client-side state is limited to controls that require interaction.
- `next/image` with responsive `sizes`, lead-image priority and lazy loading for non-critical images.
- Publication pages use a five-minute revalidation window.
- Redis is optional and cache errors degrade to uncached reads.
- Related-story recommendations are behind a Suspense boundary.
- Reduced-motion CSS is present for users requesting reduced motion.

## Measurement status

No Lighthouse, field Core Web Vitals, bundle-size, accessibility audit or screen-reader result has been measured in this workspace. Do not treat target values as achieved values.

`.lighthouserc.json` configures repeatable local lab runs against both publication homepages and two seeded article routes. Run:

```bash
npm run build
npm run start
# In another terminal, after start is ready:
npm run lighthouse
```

The resulting JSON reports are written to `reports/lighthouse/`. Lighthouse is a lab test; it does not provide real-user INP or field Core Web Vitals. For field data, instrument the `web-vitals` package and send anonymised measurements to a real analytics endpoint after privacy review.

## Accessibility review checklist

- [ ] Keyboard-only pass for navigation, search, gallery, save controls and every studio form.
- [ ] Visible focus ring in both brand themes and studio theme.
- [ ] Screen-reader review of headings, landmarks, form labels, validation, dialogs and live regions.
- [ ] Contrast testing for muted captions, metadata and accent colours.
- [ ] Zoom/reflow check at 200% and narrow viewports.
- [ ] Reduced-motion check.
- [ ] Axe/Lighthouse accessibility checks on both brands and CMS workflows.
- [ ] Manual review of alt text, captions and image credits.

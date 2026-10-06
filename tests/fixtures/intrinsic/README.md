# Intrinsic dimension fixtures

Synthetic 200×100 RGB white canvas, red rectangle at (0,0)-(60,35) and blue
rectangle at (140,60)-(199,99). PNG, lossy/lossless WebP and JPEG files were
generated using existing Pillow; JPEG variants have EXIF orientation 1–8.
These are valid decodable images, separate from header parser unit fixtures.
SVGs are local synthetic XML covering px, fractional sizes, mm, viewBox aspect
ratio with one dimension, CSS style override, and rejected context-dependent
viewBox-only/percentage viewports. No customer or external assets are used.

The browser test uses existing Playwright and an explicitly selected Chromium
executable; it installs neither a package nor a browser. Compare decoded
naturalWidth/naturalHeight with the helper and preserve all crop/source bytes.

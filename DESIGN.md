# Design direction

One photograph printed in cobalt, paper for everything else, one typeface, and motion that behaves as one system. The portrait at the top of the homepage is the only statement piece; everything after it stays calm so the work is what gets looked at.

## Colour

- **Cobalt** `#2947ec`: the hero, the head of every other page, the contact band and the "next project" band. It is the portrait's own colour, so the photograph and the page read as one surface.
- **Paper** `#f4f4f1` (ink `#0c0d12` in the dark theme): the sheet that carries the reading.
- **Yellow** `#ffd400`: the only accent, kept for small signals. The CV button, the open placement year, the last step of the Coast request flow, text selection, and focus rings on cobalt.

Nothing else gets a colour of its own. Project screenshots bring their own.

## Type

Bricolage Grotesque for everything, at four sizes (`--text-xl`, `-l`, `-m`, `-s`) that are far enough apart to tell at a glance. Large type is set slightly narrower and tighter (`.display`). IBM Plex Mono appears only for code.

## Layout

- Every section sits on one 12-column grid (`.grid`), with the same margin, gutter and section spacing throughout.
- Each page opens with a cobalt head and continues on a paper sheet with rounded top corners.
- Screenshots sit on a plain grey stage at their own proportions. Nothing is cropped.
- One button per group of actions; the rest are text links.

## Motion

Two easings, arrivals of about half a second and quick feedback (150 to 250 ms). It lives in four places:

1. **Opening.** The name or page title rises from behind its own edge and the picture is uncovered.
2. **Scroll.** The paper sheet slides up over the pinned hero; screenshots are uncovered and section headings rise as they arrive; the Coast flow's line draws in.
3. **Feedback.** Underlines grow from the left, buttons press in slightly.
4. **Page to page.** A curtain: the old page lifts and fades while the new one is uncovered from the bottom. The top bar stays still. A page reached this way doesn't replay its opening.

All of it is CSS, and all of it stops for `prefers-reduced-motion` or the site's own "Reduce motion" setting. With motion off every element simply sits in its finished place.

## Left out on purpose

Per-project colour schemes, decorative icons, handwriting, badges, numbered step discs, card grids, reading-progress bars and a footer full of links. If something is added, it needs a reason to be there.

## Content

Projects, profile details, skills and experience come from `/content`, not from the templates. The contact section, the 404 and the page about the site are written in the code. A tool can't appear in the skills list without a project or module behind it.

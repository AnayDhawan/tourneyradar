# Product

## Register

brand

## Users

Chess players, organizers, and hobbyists worldwide looking for their next over-the-board tournament. They land on the homepage cold (from search, GitHub, or word of mouth), need to quickly understand what TourneyRadar does, and either jump into the tournament list/map or bounce. Return visitors use the wishlist/login flow to track events they care about.

## Product Purpose

TourneyRadar aggregates over-the-board chess tournaments from around the world into one free, searchable, map-based directory. It exists because tournament info is scattered across federation sites, forums, and PDFs; success looks like a player finding a relevant tournament faster than they would anywhere else, and open-source contributors trusting it enough to star/contribute.

## Brand Personality

Fast, direct, no-nonsense. Get to the tournament list quickly, minimal marketing fluff, function-forward even on the marketing surfaces (hero, nav). Confidence without corporate polish; feels like a tool built by a player, not a startup.

## Anti-references

No specific anti-reference given. Default guardrails apply: avoid generic SaaS-template tells (stock gradient-blob hero, cookie-cutter feature-card grids, the hero-metric template) and avoid reading as a stuffy federation/enterprise portal (FIDE-official-site energy) - should feel more indie/open-source.

## Design Principles

1. Get out of the way of the tournament data - the hero sells the pitch in one glance, then hands off to Explore Tournaments.
2. No filler copy. Every line of hero/nav copy should be information a visitor actually needs.
3. Free and open-source is a selling point, not a footnote - surface it, don't bury it.
4. One product, one consistent nav/visual language across every page (homepage, tournaments, player auth).
5. Speed over spectacle - motion and visual flourish are allowed but never at the cost of the page feeling fast/direct.

## Accessibility & Inclusion

No specific requirements stated. Default to WCAG AA: sufficient color contrast (white text on the hero's blue gradient must stay legible across the gradient's full range), visible focus states (already present via `:focus-visible` outlines), and respect for `prefers-reduced-motion` where animation is added.

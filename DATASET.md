# TourneyRadar Open Dataset

TourneyRadar publishes the cleaned tournament dataset behind [tourneyradar.com](https://www.tourneyradar.com)
for the chess-stats hobbyist and research community. This file covers origin, license, and
attribution. For the columns, live row count, and download links, see the
[dataset page](https://www.tourneyradar.com/dataset). For how the data is collected, see
[`docs/scraping-architecture.md`](docs/scraping-architecture.md).

## What this is

A snapshot of the `tournaments` table: one row per over-the-board chess tournament, worldwide,
current state only (not the full change history). Same data the map on the site shows, minus a
handful of internal-only or contact-detail columns. Generated live by
[`app/api/dataset/route.ts`](app/api/dataset/route.ts) on request (cached up to 1 hour), or via
[`scripts/export-dataset.ts`](scripts/export-dataset.ts) for a local/CI snapshot on disk.

## Origin

Every row originates from [Chess-Results.com](https://chess-results.com), scraped, geocoded,
categorized, and deduplicated by the pipeline documented in
[`docs/scraping-architecture.md`](docs/scraping-architecture.md). TourneyRadar does not organize
these events, verify them beyond what the source lists, or run registration for any of them, the
same disclaimer as on the site's [About page](https://www.tourneyradar.com/about): TourneyRadar
aggregates publicly available information, it does not organize tournaments.

## License

**TourneyRadar's own aggregation, cleaning, deduplication, and geocoding work on this export is
released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)** (public domain
dedication). Use it for research, a paper, a blog post, a model, a rebuilt map, anything, no
permission needed and no attribution required.

That covers TourneyRadar's work on the data, not the underlying facts. The tournaments themselves
(that an event exists, its dates, its location, who organizes it) are not TourneyRadar's
intellectual property to license; they originate with the organizers and with Chess-Results.com.
If you plan to redistribute this dataset further or build a product on it, that is between you and
those underlying rights, this is not legal advice and TourneyRadar makes no representation about
Chess-Results.com's own terms of use.

## Attribution

Not required by the license above, but if this dataset is useful in a writeup, paper, or project,
a line like the following is appreciated:

> Tournament data via [TourneyRadar](https://www.tourneyradar.com), aggregated from
> Chess-Results.com.

## Questions or issues with the data

Data quality issues (a wrong date, a missing tournament, a bad geocode) are almost always upstream
scraper issues, not export bugs. [Open an issue](https://github.com/AnayDhawan/tourneyradar/issues/new)
on the main repo rather than the export tooling; someone else may already be tracking the same one.

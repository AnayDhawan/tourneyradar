# Rows with no time-control category: counts and a re-read sample

Spike for issue #265. Measured 2026-11-25 against the live table (service role, read-only) and 25 live Chess-Results pages. Nothing was written to the database.

## Counts

| Group | Rows | Share |
|---|---|---|
| Published rows | 19,555 | |
| `category` is null | 1,705 | 8.7% |
| of those, `time_control` is empty | 1,059 | |
| of those, `time_control` has text but no Standard / Rapid / Blitz marker | 646 | |
| `category` set but `time_control` empty | 54 | |

Upcoming rows only (start date on or after 2026-11-24): 1,017 total, 77 with a null category (7.6%). The 23% figure from the September measurement no longer holds.

## Sample

- 25 detail pages: 13 picked at random from upcoming rows with an empty `time_control`, 12 from upcoming rows with text but no marker.
- Fetched one at a time with a 4 second pause, `https://chess-results.com/tnrNNNNNN.aspx?lan=1&turdet=YES`, plain HTTP with a browser user agent. The scraper itself uses Puppeteer; the markup is the same, but this was not a Puppeteer run.
- Parsed the same way the scraper does: a "Time control" label cell and its value cell, then the two marker formats from `detectCategoryFromTimeControl`.

### Throttling

- 25 of 25 requests returned 200. No 429, 403 or 503.
- Response time 0.9 s minimum, 1.9 s median, 8.0 s maximum. Slow responses were scattered through the run, with no steady climb that would suggest the server slowing us down.
- Total run time 167 s.
- Only 25 requests were made, so this says nothing about throttling after hundreds or thousands of requests from one address.

### What a re-read would fix

| Group | Pages | Gained a category | Why not |
|---|---|---|---|
| Empty `time_control` | 13 | 1 (Rapid) | The other 12 pages have no "Time control" row at all. Checked two of them by searching the raw HTML: zero mentions of "time control". |
| Text but no marker | 12 | 0 | 11 pages show a Time control row with no Standard / Rapid / Blitz label (a raw spec such as "90 Min.+30 Sek/Zug"). One page no longer shows the row at all. |

So the missing category is mostly Chess-Results not stating one, not the scraper missing it. Re-reading would recover about 1 in 13 of the empty rows (roughly 85 of 1,059, with a wide margin because the sample is 13) and none of the 646 rows that have text but no marker.

## Recommendation

No full pass. Roughly 85 rows is not worth about 70 minutes of requests (1,059 pages at 4 s) and the ban risk on the only data source.

What to do instead:
- Show "Format not listed" for null-category rows instead of leaving them blank (issue #285).
- If someone still wants the roughly 85, do it as a one-off: only rows with an empty `time_control`, upcoming only (27 rows today), 4 s spacing, stop on the first 429 or 403, dry run first.

## Safe request rate

One request every 4 seconds, one at a time, showed no throttling over 25 requests. The scraper's own spacing is 100 to 150 ms between requests inside a federation, much faster than what was tested here, so this result does not say anything about the weekly run's headroom.

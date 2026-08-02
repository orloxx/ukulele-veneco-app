# `data/` — what the app knows that the book does not

`songs/` is the cancionero. Since M6 deleted the source PDF it is the *record* rather than
a copy of one, which is why `songs/README.md` says that changing a fingering is changing
the source rather than correcting it.

This directory is the other thing: data the app wants and the book never printed. It is
deliberately a sibling of `songs/` and not a subdirectory of it, so that the boundary is a
directory listing rather than a convention somebody has to remember.

There is one file in it.

## `videos.json` — a reference recording per song

A flat JSON object keyed by song slug — the filename in `songs/` without its `.md`. A song
with no findable recording **has no entry**; it does not have an entry with a null in it.

```json
{
  "barlovento": {
    "id": "aBcDeFgHiJk",
    "title": "Barlovento",
    "channel": "Aldemaro Romero",
    "duration": "3:12"
  }
}
```

| Field | What it is |
|---|---|
| `id` | the 11-character YouTube video ID, and nothing else — not a URL, not a watch link |
| `title` | the video's own title, as YouTube gives it |
| `channel` | the uploader's channel name |
| `duration` | `m:ss` or `mm:ss`, as printed rather than in seconds |

### The last three fields are the point of the file

`M14 · 4` can prove an ID is well-formed, that its slug is a real song and that no two
songs claim the same recording. It cannot prove the video is this song, and no check can:
an assertion that reached YouTube would be a network call in a check script and would go
stale the first time an upload was taken down. So the only thing that can tell a right
video from a plausible one is a person — and a person can read 276 titles and channels in
an hour where they cannot watch 276 videos in a week. **Without the evidence the review is
not affordable, and a review that is not affordable does not happen**, which is the same
failure as a check nobody can run.

So an entry with an ID and no evidence is worse than no entry: it is a claim with nothing
behind it. `pnpm videos` fails on one.

**All three are also printed on the collapsed panel**, which was not the plan and is the
better answer. The alternative was a mystery box: a button that says *escuchar* and will
not tell you what it is about to fetch from Google until you have already let it. Printing
them means a reader can see whose recording it is before any request is made, and it gives
a wrong match the only route it has to being reported — there is no backend and no report
button, so a reader noticing the channel is a karaoke upload is the entire feedback loop.

**One character of that is different on screen: a trailing ` - Topic` is dropped.** It is
YouTube's own plumbing rather than a name — those channels are generated from a licensed
distribution feed, the suffix is on 113 of the entries here, and on exactly those channels
the name without it *is* the artist. `videos.json` keeps what YouTube says, because the
file is the record and has to still be lookupable in five years; `VideoReference.tsx`
trims it, because the screen is prose. That is the only place the two differ.

### Fixing a wrong match

There is no backend and no report button, so a wrong video is a one-line edit here and a
deploy. Change the `id`, and change the `title`, `channel` and `duration` beside it in the
same edit — an entry whose evidence describes the video it *used* to point at is worse
than one with no evidence at all, because it reads as reviewed.

Run `pnpm videos` afterwards. To find a replacement, `node scripts/find-videos.mjs
--only <slug>` searches one song and prints its candidates without writing anything.

### How the file was written

`scripts/find-videos.mjs`, over `yt-dlp`. The acceptance rule is at the top of that file
and was written down before it was run; the coverage it reached and the songs it declined
are in `M14 · 2`. **It declines rather than guesses**: an accept-anything matcher returns
276 videos, some unknown number of which are the wrong song, and that is worse than an
absent panel because it is invisible until somebody plays one.

## How the app reads it

`src/lib/videos.ts`, and nowhere else — the same shape as `src/lib/songs.ts` being the only
reader of `songs/`. It is a server-only module: it reads `fs`, so importing it from a client
component fails the build rather than shipping the map to a browser.

**Only one entry ever crosses into the browser.** `getSongVideo(slug)` resolves this song's
own entry at build time and the song route passes it as a prop, the way `getTranspositions`
hands over one song's keys rather than the whole chord vocabulary. `/list` renders all 276
songs into a client component and has no business carrying 276 video references it will
never draw.

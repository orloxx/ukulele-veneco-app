import Link from "next/link";
import { notFound } from "next/navigation";
import { ChordsViewClient } from "@/components/ChordsViewClient";
import { getAllSongSlugs, getSongBySlug, getTranspositions } from "@/lib/songs";

interface ChordsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * The catalogue is 276 files on disk and nothing else is a song, so an unknown
 * slug is a 404 and never a page to render on demand.
 *
 * Saying so is not only an optimisation. With `dynamicParams` left on, Next
 * boots a server render for `/song/<anything>` just to throw `notFound()`, and
 * the 404 it streams back does not carry the root layout's `<head>` — which is
 * where the pre-paint theme script lives, so that page alone came out unthemed
 * and flashed cream at anyone reading in the dark.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = getAllSongSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

/**
 * Every chord in a song, drawn large, on its own page.
 *
 * The case for it is the phone. On the sheet the chords are a sticky sidebar of
 * 88px diagrams beside the lyrics, and on a narrow screen they collapse to a
 * strip — which is fine for a reminder and small for a shape you are trying to
 * copy onto a fretboard while holding the instrument. This is where you look
 * when you need the fingering rather than the reminder.
 *
 * It is prerendered off the same `generateStaticParams` as the sheet, so it
 * works offline for exactly the songs the sheet does.
 */
export default async function ChordsPage({ params }: ChordsPageProps) {
  const { slug } = await params;
  const song = getSongBySlug(slug);

  if (!song) {
    notFound();
  }

  return (
    <div>
      <p className="uv-eyebrow">{song.metadata.title}</p>
      <h1 className="uv-song-title">Acordes de la canción</h1>
      {/* The grid is a client component so it can follow the key the reader
          picked on the sheet — the two screens share one stored choice, and a
          panel naming different chords from the sheet beside it is worse than
          no transposition at all. Since M15 it also carries the lede that names
          the four strings, which is a fact about the instrument the reader
          picked and so cannot be written here. */}
      <ChordsViewClient
        slug={slug}
        printedKey={song.metadata.key}
        transpositions={getTranspositions(song)}
      />

      <p className="uv-chords-view__back">
        <Link href={`/song/${slug}`} className="uv-btn uv-btn--secondary">
          <span>Volver a la letra</span>
        </Link>
      </p>
    </div>
  );
}

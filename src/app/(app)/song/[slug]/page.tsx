import { notFound } from "next/navigation";
import { SongDetailClient } from "@/components/SongDetailClient";
import { getAllSongSlugs, getSongBySlug } from "@/lib/songs";

interface SongPageProps {
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

export default async function SongPage({ params }: SongPageProps) {
  const { slug } = await params;
  const song = getSongBySlug(slug);

  if (!song) {
    notFound();
  }

  // Strip filePath at the route boundary: a client component's props have to serialize,
  // and the build machine's absolute paths are nobody's business. Discarding it is the
  // point, so the binding is deliberately unused.
  // biome-ignore lint/correctness/noUnusedVariables: destructured only to drop it
  const { filePath, ...serializableSong } = song;

  return <SongDetailClient song={serializableSong} />;
}

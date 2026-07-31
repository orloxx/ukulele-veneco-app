import { notFound } from "next/navigation";
import { SongDetailClient } from "@/components/SongDetailClient";
import { getAllSongSlugs, getSongBySlug } from "@/lib/songs";

interface SongPageProps {
  params: Promise<{
    slug: string;
  }>;
}

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

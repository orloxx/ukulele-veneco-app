import { notFound } from "next/navigation";
import { getAllSongSlugs, getSongBySlug } from "@/lib/songs";
import { SongDetailClient } from "@/components/SongDetailClient";

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

  // Remove filePath for serialization (client component needs serializable props)
  const { filePath, ...serializableSong } = song;

  return <SongDetailClient song={serializableSong} />;
}

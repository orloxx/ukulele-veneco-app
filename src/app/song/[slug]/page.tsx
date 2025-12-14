import Link from "next/link";
import { notFound } from "next/navigation";
import ChordDiagram from "@/components/ChordDiagram";
import LyricsDisplay from "@/components/LyricsDisplay";
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Volver a la lista
            </Link>
            <div className="text-sm text-gray-500">
              {song.metadata.key} | {song.metadata.timeSignature}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Song info */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {song.metadata.title}
          </h1>
          <p className="text-xl text-gray-600">
            {song.metadata.artist}
            {song.metadata.year && ` • ${song.metadata.year}`}
          </p>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Lyrics */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <LyricsDisplay lyrics={song.lyrics} />
            </div>
          </div>

          {/* Right column: Chords (sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Acordes
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
                {song.chordDefinitions.map((chord) => (
                  <ChordDiagram key={chord.name} chord={chord} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

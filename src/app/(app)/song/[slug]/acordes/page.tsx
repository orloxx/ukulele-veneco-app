import Link from "next/link";
import { notFound } from "next/navigation";
import ChordDiagram from "@/components/ChordDiagram";
import { getAllSongSlugs, getSongBySlug } from "@/lib/songs";

interface ChordsPageProps {
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
      {/* The only place in the app that says how the notation works. */}
      <p className="uv-chords-view__lede">
        Cuerdas de arriba abajo: <span className="uv-mono">G C E A</span>. El
        círculo arriba es cuerda al aire; el número al lado dice en qué traste
        empieza la cuadrícula.
      </p>

      <div className="uv-chords-view__grid">
        {song.chordDefinitions.map((chord) => (
          <div key={chord.name} className="uv-diagram uv-chords-view__card">
            <div className="uv-diagram__name uv-chords-view__name">
              {chord.name}
            </div>
            <ChordDiagram
              chord={chord}
              size={132}
              showName={false}
              frame={false}
            />
            {/* The fingering as it is written in `songs/`, for anyone reading
                the diagram back against the file. */}
            <div className="uv-chords-view__positions">{chord.positions}</div>
          </div>
        ))}
      </div>

      <p className="uv-chords-view__back">
        <Link href={`/song/${slug}`} className="uv-btn uv-btn--secondary">
          <span>Volver a la letra</span>
        </Link>
      </p>
    </div>
  );
}

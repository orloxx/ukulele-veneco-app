import SongList from "@/components/SongList";
import { getAllSongs } from "@/lib/songs";

export default function Home() {
  const songs = getAllSongs();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <SongList songs={songs} />
      </main>
    </div>
  );
}

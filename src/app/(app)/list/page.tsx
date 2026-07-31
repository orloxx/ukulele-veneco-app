import SongList from "@/components/SongList";
import { getAllSongs } from "@/lib/songs";

// The page column belongs to the app shell, not to this route — (app)/layout.tsx.
export default function ListPage() {
  const songs = getAllSongs();

  return <SongList songs={songs} />;
}

import SongList from "@/components/SongList";
import { getAllSongs } from "@/lib/songs";
import { containerStyles } from "@/lib/styles";

export default function ListPage() {
  const songs = getAllSongs();

  return (
    <div className={containerStyles.page}>
      <main className={`${containerStyles.main} py-12`}>
        <SongList songs={songs} />
      </main>
    </div>
  );
}

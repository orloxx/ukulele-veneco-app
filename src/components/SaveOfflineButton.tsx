"use client";

/**
 * Save a song to the phone, or take it off again.
 *
 * Verde for the saved state, because verde means saved everywhere in this
 * system; turquesa for the action, because turquesa is the one action colour.
 * The icons are Phosphor, replacing the hand-drawn Heroicons-style paths that
 * were inlined here.
 */

import { IconCheck, IconDownload } from "@/components/icons";
import { useSaveOffline } from "@/contexts/OfflineSongsContext";
import type { ParsedSong } from "@/types/song";

interface SaveOfflineButtonProps {
  song: ParsedSong;
  className?: string;
}

export function SaveOfflineButton({ song, className }: SaveOfflineButtonProps) {
  // `isSaving` comes from the context rather than a local flag: the list's
  // checkbox shows the same state for the same song, and one source is what
  // keeps the two saying the same thing.
  const { isOffline, isSaving, toggleOffline } = useSaveOffline(song);

  const handleClick = async () => {
    try {
      await toggleOffline();
    } catch (error) {
      console.error("Error toggling offline status:", error);
    }
  };

  const variant = isOffline ? "uv-btn--saved" : "uv-btn--primary";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSaving}
      className={`uv-btn ${variant}${className ? ` ${className}` : ""}`}
    >
      {isOffline ? <IconCheck size={17} /> : <IconDownload size={17} />}
      <span>
        {isSaving ? "Guardando..." : isOffline ? "Guardada" : "Guardar"}
      </span>
    </button>
  );
}

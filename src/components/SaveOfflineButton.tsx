"use client";

/**
 * Save a song to the phone, or take it off again.
 *
 * Verde for the saved state, because verde means saved everywhere in this
 * system; turquesa for the action, because turquesa is the one action colour.
 * The icons are Phosphor, replacing the hand-drawn Heroicons-style paths that
 * were inlined here.
 */

import { useState } from "react";
import { IconCheck, IconDownload } from "@/components/icons";
import { useSaveOffline } from "@/contexts/OfflineSongsContext";
import type { ParsedSong } from "@/types/song";

interface SaveOfflineButtonProps {
  song: ParsedSong;
  className?: string;
}

export function SaveOfflineButton({ song, className }: SaveOfflineButtonProps) {
  const { isOffline, toggleOffline } = useSaveOffline(song);
  const [isSaving, setIsSaving] = useState(false);

  const handleClick = async () => {
    setIsSaving(true);
    try {
      await toggleOffline();
    } catch (error) {
      console.error("Error toggling offline status:", error);
    } finally {
      setIsSaving(false);
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

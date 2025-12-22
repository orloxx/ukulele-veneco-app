"use client";

/**
 * Reusable button component for saving/removing songs from offline storage
 * Toggles between save and remove states
 */

import { useState } from "react";
import { useSaveOffline } from "@/contexts/OfflineSongsContext";
import type { ParsedSong } from "@/types/song";

interface SaveOfflineButtonProps {
	song: ParsedSong;
	variant?: "icon" | "full";
	className?: string;
}

export function SaveOfflineButton({
	song,
	variant = "full",
	className = "",
}: SaveOfflineButtonProps) {
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

	// Icon variant (for mobile or compact views)
	if (variant === "icon") {
		return (
			<button
				type="button"
				onClick={handleClick}
				disabled={isSaving}
				className={`inline-flex items-center justify-center rounded-md p-2 transition-colors hover:bg-gray-100 disabled:opacity-50 cursor-pointer ${className}`}
				aria-label={isOffline ? "Eliminar de offline" : "Guardar offline"}
			>
				{isSaving ? (
					<svg
						className="h-5 w-5 animate-spin text-gray-600"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
				) : isOffline ? (
					<svg
						className="h-5 w-5 text-green-600"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
						/>
					</svg>
				) : (
					<svg
						className="h-5 w-5 text-gray-600"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
						/>
					</svg>
				)}
			</button>
		);
	}

	// Full button variant (with text)
	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={isSaving}
			className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
				isOffline
					? "bg-green-100 text-green-800 hover:bg-green-200"
					: "bg-gray-100 text-gray-800 hover:bg-gray-200"
			} disabled:opacity-50 ${className}`}
		>
			{isSaving ? (
				<>
					<svg
						className="h-4 w-4 animate-spin"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<span>Guardando...</span>
				</>
			) : isOffline ? (
				<>
					<svg
						className="h-4 w-4"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
						/>
					</svg>
					<span>Guardada</span>
				</>
			) : (
				<>
					<svg
						className="h-4 w-4"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
						/>
					</svg>
					<span>Guardar</span>
				</>
			)}
		</button>
	);
}

/**
 * IndexedDB wrapper for offline song storage
 * Uses idb library for Promise-based IndexedDB operations
 */

import { openDB, type IDBPDatabase } from "idb";
import type { StoredSong, StorageOperationResult } from "@/types/offline";

const DB_NAME = "ukulele-veneco-db";
const DB_VERSION = 1;
const STORE_NAME = "songs";

/**
 * Initialize and open the IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase> {
	return openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// Create object store if it doesn't exist
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "slug" });
			}
		},
	});
}

/**
 * Save a single song to IndexedDB
 */
export async function saveSong(
	song: StoredSong,
): Promise<StorageOperationResult> {
	try {
		const db = await initDB();
		await db.put(STORE_NAME, song);
		return { success: true };
	} catch (error) {
		console.error("Error saving song:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Remove a single song from IndexedDB
 */
export async function removeSong(
	slug: string,
): Promise<StorageOperationResult> {
	try {
		const db = await initDB();
		await db.delete(STORE_NAME, slug);
		return { success: true };
	} catch (error) {
		console.error("Error removing song:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get a single song from IndexedDB
 */
export async function getSong(
	slug: string,
): Promise<StoredSong | undefined> {
	try {
		const db = await initDB();
		return await db.get(STORE_NAME, slug);
	} catch (error) {
		console.error("Error getting song:", error);
		return undefined;
	}
}

/**
 * Get all saved songs from IndexedDB
 */
export async function getAllSavedSongs(): Promise<StoredSong[]> {
	try {
		const db = await initDB();
		return await db.getAll(STORE_NAME);
	} catch (error) {
		console.error("Error getting all songs:", error);
		return [];
	}
}

/**
 * Get only the slugs of saved songs (lightweight for status checks)
 */
export async function getSavedSongSlugs(): Promise<string[]> {
	try {
		const db = await initDB();
		const songs = await db.getAllKeys(STORE_NAME);
		return songs as string[];
	} catch (error) {
		console.error("Error getting song slugs:", error);
		return [];
	}
}

/**
 * Save multiple songs in a single transaction
 */
export async function saveMultipleSongs(
	songs: StoredSong[],
): Promise<StorageOperationResult> {
	try {
		const db = await initDB();
		const tx = db.transaction(STORE_NAME, "readwrite");

		// Add all songs to the transaction
		await Promise.all([
			...songs.map((song) => tx.store.put(song)),
			tx.done,
		]);

		return { success: true };
	} catch (error) {
		console.error("Error saving multiple songs:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Remove multiple songs in a single transaction
 */
export async function removeMultipleSongs(
	slugs: string[],
): Promise<StorageOperationResult> {
	try {
		const db = await initDB();
		const tx = db.transaction(STORE_NAME, "readwrite");

		// Delete all songs from the transaction
		await Promise.all([
			...slugs.map((slug) => tx.store.delete(slug)),
			tx.done,
		]);

		return { success: true };
	} catch (error) {
		console.error("Error removing multiple songs:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

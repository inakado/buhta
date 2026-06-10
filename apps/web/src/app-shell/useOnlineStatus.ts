"use client";

import { useSyncExternalStore } from "react";

export function useOnlineStatus(): boolean {
	return useSyncExternalStore(subscribeToOnlineStatus, getOnlineSnapshot, getServerOnlineSnapshot);
}

function subscribeToOnlineStatus(onStoreChange: () => void): () => void {
	window.addEventListener("online", onStoreChange);
	window.addEventListener("offline", onStoreChange);

	return () => {
		window.removeEventListener("online", onStoreChange);
		window.removeEventListener("offline", onStoreChange);
	};
}

function getOnlineSnapshot(): boolean {
	return navigator.onLine;
}

function getServerOnlineSnapshot(): boolean {
	return true;
}

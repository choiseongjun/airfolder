// Browsers do not execute the native background task. Foreground queue recovery remains available.
export async function registerUploads() { return false; }

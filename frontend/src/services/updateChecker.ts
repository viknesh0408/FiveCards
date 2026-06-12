export async function checkForUpdates() {
  // Skip update check when running locally in browser (but NOT on Capacitor native apps where hostname is also localhost)
  const isCapacitor = !!(window as any).Capacitor;
  if (!isCapacitor && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return null;
  }

  const API_BASE =
    import.meta.env.VITE_API_URL ||
    "https://fivecards.onrender.com";

  const response = await fetch(`${API_BASE}/api/version`);

  const latest = await response.json();

  const currentVersion = "1.0.10";

  if (latest.version !== currentVersion) {
      return latest;
  }

  return null;
}
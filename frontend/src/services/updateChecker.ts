export async function checkForUpdates() {
  // Skip update check when running locally
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return null;
  }

  const response = await fetch("https://fivecards.onrender.com/api/version");

  const latest = await response.json();

  const currentVersion = "1.0.8";

  if (latest.version !== currentVersion) {
      return latest;
  }

  return null;
}
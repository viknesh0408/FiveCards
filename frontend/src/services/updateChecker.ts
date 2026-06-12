export async function checkForUpdates() {

  // Use local API in development, remote in production
  const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080'
    : 'https://fivecards.onrender.com';

  const response = await fetch(`${apiBase}/api/version`);

  const latest = await response.json();

  const currentVersion = "1.0.7";

  if (latest.version !== currentVersion) {
      return latest;
  }

  return null;
}
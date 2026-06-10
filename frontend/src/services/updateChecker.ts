export async function checkForUpdates() {

  const response = await fetch(
    "https://fivecards.onrender.com/api/version"
  );

  const latest = await response.json();

  const currentVersion = "0.2";

  if (latest.version !== currentVersion) {
      return latest;
  }

  return null;
}
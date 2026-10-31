/** Path of a URL or path, without a trailing slash (except the homepage). Matches pages across http/https and www. */
export function pathOf(urlOrPath: string) {
  let path = urlOrPath;
  try {
    path = new URL(urlOrPath, "https://placeholder.invalid").pathname;
  } catch {
    // keep as given
  }
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

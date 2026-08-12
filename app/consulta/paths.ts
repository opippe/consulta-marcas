const siteBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function sitePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return path;
  }

  return `${siteBasePath}${path}`;
}

export function publicAsset(path: string) {
  return sitePath(path);
}

export function apiPath(path: string) {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );

  return `${apiBaseUrl || siteBasePath}${path}`;
}

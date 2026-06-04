// Read-only client for the Symphony song-score catalog.
// Lives in a SEPARATE Supabase project from auth/billing (intentional).
// We ONLY read public.songs (public SELECT via RLS) with the anon key —
// never write. Mirrors the iOS app's SymphonyCatalog client.

const CATALOG_URL = "https://jsycnnldxmmqcpbcelbl.supabase.co";
const CATALOG_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzeWNubmxkeG1tcWNwYmNlbGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMjcxMzcsImV4cCI6MjA5NDgwMzEzN30.7xz3Wj9eGCXju76s3udVU1s1UmIPIYd6CW-S4ECkI6Q";

const headers = {
  apikey: CATALOG_ANON_KEY,
  Authorization: `Bearer ${CATALOG_ANON_KEY}`,
};

export interface CatalogSong {
  title: string;
  artist: string;
  album: string | null;
  spotify_track_id?: string | null;
}

export interface CatalogArtist {
  artist: string;
  song_count: number;
}

/** Total number of active songs in the catalog. */
export async function fetchCatalogCount(): Promise<number> {
  const res = await fetch(
    `${CATALOG_URL}/rest/v1/songs?select=song_id&is_active=eq.true`,
    { headers: { ...headers, Prefer: "count=exact", Range: "0-0" } }
  );
  // Content-Range looks like "0-0/5095"
  const range = res.headers.get("content-range");
  const total = range?.split("/")?.[1];
  return total ? parseInt(total, 10) : 0;
}

/** Artists with the most songs in the catalog. */
export async function fetchTopArtists(limit = 18): Promise<CatalogArtist[]> {
  const res = await fetch(`${CATALOG_URL}/rest/v1/rpc/artists_with_catalog`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as CatalogArtist[];
  return (Array.isArray(data) ? data : [])
    .sort((a, b) => b.song_count - a.song_count)
    .slice(0, limit);
}

/**
 * Search songs by title/artist. With no query, returns a recent sample so
 * the section always shows something.
 */
export async function searchCatalog(query: string, limit = 24): Promise<CatalogSong[]> {
  const select = "select=title,artist,album,spotify_track_id";
  let url = `${CATALOG_URL}/rest/v1/songs?${select}&is_active=eq.true&limit=${limit}`;
  const q = query.trim();
  if (q) {
    const enc = encodeURIComponent(`%${q}%`);
    url += `&or=(title.ilike.${enc},artist.ilike.${enc})`;
  } else {
    url += "&order=updated_at.desc";
  }
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  return (await res.json()) as CatalogSong[];
}

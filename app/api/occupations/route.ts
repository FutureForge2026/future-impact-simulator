import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ occupations: [] });
  }

  try {
    const url =
      "https://ec.europa.eu/esco/api/search" +
      `?text=${encodeURIComponent(query)}` +
      "&type=occupation" +
      "&language=en" +
      "&limit=5";

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json({
        occupations: [],
        error: "ESCO API did not return a successful response.",
      });
    }

    const data = await response.json();

    const rawResults =
      data?._embedded?.results ||
      data?.results ||
      [];

    const occupations = rawResults.map((item: any) => ({
      title:
        item?.title ||
        item?.preferredLabel?.en ||
        item?.preferredLabel ||
        "Unknown occupation",
      uri: item?.uri || "",
      description:
        item?.description?.en ||
        item?.description ||
        "",
    }));

    return NextResponse.json({ occupations });
  } catch {
    return NextResponse.json({
      occupations: [],
      error: "Could not connect to ESCO API.",
    });
  }
}

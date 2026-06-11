import { NextResponse } from "next/server";

function normalizeJobQuery(query: string) {
  const text = query.toLowerCase();

  if (
    text.includes("operational technology") ||
    text.includes("ot engineer") ||
    text.includes("ics") ||
    text.includes("scada") ||
    text.includes("control systems")
  ) {
    return "industrial control systems engineer";
  }

  return query;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q");

  if (!rawQuery || rawQuery.trim().length < 2) {
    return NextResponse.json({ occupations: [] });
  }

  const query = normalizeJobQuery(rawQuery);

  try {
    const url =
      "https://ec.europa.eu/esco/api/search" +
      `?text=${encodeURIComponent(query)}` +
      "&type=occupation" +
      "&language=en" +
      "&limit=8";

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

    if (
      rawQuery.toLowerCase().includes("operational technology") ||
      rawQuery.toLowerCase().includes("ot engineer")
    ) {
      const preferred = [
        {
          title: "Industrial control systems engineer",
          uri: "",
          description:
            "Suggested mapping for Operational Technology roles involving industrial systems, control systems, SCADA, automation, and critical infrastructure.",
        },
        {
          title: "Control systems engineer",
          uri: "",
          description:
            "Suggested related role focused on designing, maintaining, and securing control systems used in industrial environments.",
        },
        {
          title: "Automation engineer",
          uri: "",
          description:
            "Suggested related role focused on automation, process control, and industrial technology systems.",
        },
        {
          title: "SCADA engineer",
          uri: "",
          description:
            "Suggested related role focused on supervisory control and data acquisition systems.",
        },
      ];

      return NextResponse.json({
        occupations: [...preferred, ...occupations].slice(0, 8),
      });
    }

    return NextResponse.json({ occupations });
  } catch {
    return NextResponse.json({
      occupations: [],
      error: "Could not connect to ESCO API.",
    });
  }
}

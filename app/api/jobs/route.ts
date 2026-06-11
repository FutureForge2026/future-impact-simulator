import { NextResponse } from "next/server";

const supportedAdzunaCountries: Record<string, string> = {
  AU: "au",
  GB: "gb",
  US: "us",
  CA: "ca",
  DE: "de",
  FR: "fr",
  IN: "in",
  NZ: "nz",
  SG: "sg",
  ZA: "za",
  BR: "br",
  AT: "at",
  PL: "pl",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const iso2 = searchParams.get("iso2");
  const career = searchParams.get("career");

  if (!iso2 || !career) {
    return NextResponse.json(
      { error: "Missing iso2 or career." },
      { status: 400 }
    );
  }

  const adzunaCountry = supportedAdzunaCountries[iso2];

  if (!adzunaCountry) {
    return NextResponse.json({
      supported: false,
      message: "Live job data is not available for this country through the current jobs API.",
    });
  }

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json({
      supported: true,
      configured: false,
      message: "Adzuna API keys are not configured yet.",
    });
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=10&what=${encodeURIComponent(
    career
  )}&content-type=application/json`;

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();

  const jobs = (data.results || []).map((job: any) => ({
    title: job.title || "Untitled role",
    company: job.company?.display_name || "Unknown company",
    location: job.location?.display_name || "Unknown location",
    description: job.description || "No description available",
    salaryMin: job.salary_min || null,
    salaryMax: job.salary_max || null,
    url: job.redirect_url || "",
  }));

  const salaries = jobs
    .flatMap((job: any) => [job.salaryMin, job.salaryMax])
    .filter((value: number | null) => typeof value === "number");

  const averageSalary =
    salaries.length > 0
      ? Math.round(salaries.reduce((sum: number, value: number) => sum + value, 0) / salaries.length)
      : null;

  return NextResponse.json({
    supported: true,
    configured: true,
    count: data.count || jobs.length,
    averageSalary,
    jobs,
  });
}

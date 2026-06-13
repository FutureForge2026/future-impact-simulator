"use client";

import { useEffect, useState } from "react";

type Country = {
  wbCode: string;
  iso2: string;
  name: string;
  region: string;
  incomeLevel: string;
  currencyCode: string;
};

type Metric = {
  label: string;
  value: string;
};

type Occupation = {
  title: string;
  uri: string;
  description: string;
};

const indicators = [
  { key: "NY.GDP.PCAP.CD", label: "GDP per capita" },
  { key: "SL.UEM.TOTL.ZS", label: "Unemployment rate" },
  { key: "FP.CPI.TOTL.ZG", label: "Inflation rate" },
  { key: "SP.POP.TOTL", label: "Population" },
  { key: "IT.NET.USER.ZS", label: "Internet usage" },
  { key: "NY.GDP.MKTP.CD", label: "Total GDP" },
];

const currencyByIso2: Record<string, string> = {
  AU: "AUD", GB: "GBP", US: "USD", CA: "CAD", NZ: "NZD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", IE: "EUR",
  NL: "EUR", AT: "EUR", BE: "EUR", PT: "EUR", FI: "EUR",
  IN: "INR", AE: "AED", BH: "BHD", BB: "BBD", HK: "HKD", KR: "KRW", VN: "VND", EG: "EGP", NG: "NGN", KE: "KES", GH: "GHS", TR: "TRY", CL: "CLP", CO: "COP", PE: "PEN", CZ: "CZK", HU: "HUF", RO: "RON", SG: "SGD", JP: "JPY",
  CN: "CNY", ZA: "ZAR", BR: "BRL", MX: "MXN", CH: "CHF",
  SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", MY: "MYR",
  TH: "THB", ID: "IDR", PH: "PHP", PK: "PKR", BD: "BDT",
  LK: "LKR", QA: "QAR", SA: "SAR", KW: "KWD", OM: "OMR",
};

function getCurrencyCode(iso2: string) {
  return currencyByIso2[iso2] || "USD";
}

function formatMoney(amount: number, country?: Country) {
  const currency = country?.currencyCode || "USD";

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

function formatWorldBankValue(label: string, value: number | null, year?: string) {
  if (value === null || value === undefined) return "Not available";

  let formatted = "";

  if (label.includes("GDP")) {
    formatted = `USD ${Math.round(value).toLocaleString()}`;
  } else if (label.includes("rate") || label.includes("usage")) {
    formatted = `${value.toFixed(1)}%`;
  } else {
    formatted = Math.round(value).toLocaleString();
  }

  return year ? `${formatted} (${year})` : formatted;
}

export default function Home() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [career, setCareer] = useState("");
  const [salary, setSalary] = useState("");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [occupationStatus, setOccupationStatus] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCountries() {
      try {
        const res = await fetch("https://api.worldbank.org/v2/country?format=json&per_page=400");
        const data = await res.json();

        const list = data[1]
          .filter((item: any) => item.region.value !== "Aggregates")
          .map((item: any) => ({
            wbCode: item.id,
            iso2: item.iso2Code,
            name: item.name,
            region: item.region.value,
            incomeLevel: item.incomeLevel.value,
            currencyCode: getCurrencyCode(item.iso2Code),
          }))
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

        setCountries(list);
      } catch {
        setError("Could not load live country data.");
      } finally {
        setLoadingCountries(false);
      }
    }

    loadCountries();
  }, []);

  async function fetchIndicator(countryCode: string, indicator: string) {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicator}?format=json&per_page=10`;
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data) || !data[1]) return null;

    const latest = data[1].find((row: any) => row.value !== null);
    if (!latest) return null;

    return { value: latest.value, year: latest.date };
  }

  async function fetchOccupations(jobTitle: string) {
    try {
      const res = await fetch(`/api/occupations?q=${encodeURIComponent(jobTitle)}`);
      const data = await res.json();

      if (data.error) {
        setOccupationStatus(data.error);
        return [];
      }

      const matches = data.occupations || [];

      if (matches.length === 0) {
        setOccupationStatus("No ESCO occupation matches were found for this job title.");
      } else {
        setOccupationStatus(`Found ${matches.length} ESCO occupation match${matches.length === 1 ? "" : "es"}.`);
      }

      return matches;
    } catch {
      setOccupationStatus("Could not fetch ESCO occupation matches.");
      return [];
    }
  }

  async function runSimulation() {
    if (!selectedCode || !career || !salary) {
      alert("Select a country, enter a job title, and enter a salary.");
      return;
    }

    setLoadingData(true);
    setMetrics([]);
    setOccupations([]);
    setOccupationStatus("");
    setScore(null);
    setError("");

    try {
      const selectedCountry = countries.find((c) => c.wbCode === selectedCode);
      const currentSalary = Number(salary);

      const [occupationMatches, indicatorResults] = await Promise.all([
        fetchOccupations(career),
        Promise.all(
          indicators.map(async (indicator) => {
            const result = await fetchIndicator(selectedCode, indicator.key);
            return {
              label: indicator.label,
              raw: result?.value ?? null,
              value: formatWorldBankValue(indicator.label, result?.value ?? null, result?.year),
            };
          })
        ),
      ]);

      setOccupations(occupationMatches);

      const gdp = indicatorResults.find((m) => m.label === "GDP per capita")?.raw || 0;
      const unemployment = indicatorResults.find((m) => m.label === "Unemployment rate")?.raw || 0;
      const internet = indicatorResults.find((m) => m.label === "Internet usage")?.raw || 0;
      const inflation = indicatorResults.find((m) => m.label === "Inflation rate")?.raw || 0;

      const opportunityScore = Math.max(
        1,
        Math.min(
          100,
          Math.round(
            45 +
              Math.min(gdp / 2000, 25) +
              Math.min(internet / 4, 25) -
              Math.min(unemployment * 2, 20) -
              Math.min(inflation, 10)
          )
        )
      );

      setScore(opportunityScore);

      setMetrics([
        { label: "Country", value: selectedCountry?.name || "Unknown" },
        { label: "Region", value: selectedCountry?.region || "Unknown" },
        { label: "Income level", value: selectedCountry?.incomeLevel || "Unknown" },
        { label: "Detected local currency", value: selectedCountry?.currencyCode || "Unknown" },
        { label: "Job title entered", value: career },
        { label: "Salary entered", value: formatMoney(currentSalary, selectedCountry) },
        { label: "5-year conservative projection", value: formatMoney(currentSalary * 1.25, selectedCountry) },
        { label: "5-year accelerated projection", value: formatMoney(currentSalary * 1.6, selectedCountry) },
        ...indicatorResults.map((item) => ({ label: item.label, value: item.value })),
      ]);
    } catch {
      setError("Could not fetch live data. Try again.");
    } finally {
      setLoadingData(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-3 text-4xl font-bold">Global Future Impact Simulator</h1>

        <p className="mb-8 text-gray-600">
          Compare countries using live World Bank indicators and ESCO occupation classification.
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          <select
            suppressHydrationWarning
            className="w-full rounded-lg border p-3"
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            disabled={loadingCountries}
          >
            <option value="">
              {loadingCountries ? "Loading countries..." : "Select a country"}
            </option>

            {countries.map((country) => (
              <option key={country.wbCode} value={country.wbCode}>
                {country.name}
              </option>
            ))}
          </select>

          <input
            suppressHydrationWarning
            className="w-full rounded-lg border p-3"
            placeholder="Enter job title, e.g. OT Engineer, Nurse, Accountant"
            value={career}
            onChange={(e) => setCareer(e.target.value)}
          />

          <input
            suppressHydrationWarning
            className="w-full rounded-lg border p-3"
            placeholder="Current annual salary, e.g. 110000"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
          />

          <button
            suppressHydrationWarning
            onClick={runSimulation}
            className="rounded-lg bg-black px-6 py-3 font-semibold text-white"
          >
            {loadingData ? "Fetching live data..." : "Run Simulation"}
          </button>
        </div>

        {score !== null && (
          <div className="mt-8 rounded-xl border bg-blue-50 p-6">
            <h2 className="text-2xl font-bold">Country Opportunity Score: {score}/100</h2>
            <p className="mt-2 text-gray-700">
              This score uses GDP per capita, unemployment, inflation, and internet usage from the World Bank. It does not use live job vacancy data.
            </p>
          </div>
        )}

        {(occupationStatus || occupations.length > 0) && (
          <div className="mt-8">
            <h2 className="mb-4 text-2xl font-bold">Closest Occupation Matches from ESCO</h2>

            {occupationStatus && (
              <div className="mb-4 rounded-xl border bg-blue-50 p-5">
                <p>{occupationStatus}</p>
              </div>
            )}

            {occupations.length > 0 && (
              <div className="space-y-4">
                {occupations.map((occupation, index) => (
                  <div key={index} className="rounded-xl border bg-gray-50 p-5">
                    <h3 className="text-xl font-semibold">{occupation.title}</h3>
                    {occupation.description && (
                      <p className="mt-2 text-gray-700">{occupation.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {metrics.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-2xl font-bold">Results</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">{metric.label}</p>
                  <p className="text-xl font-semibold">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border bg-gray-50 p-5 text-sm text-gray-600">
          <p>
            Data note: Country indicators are fetched live from the World Bank API using the latest available published values. Closest occupation matches are fetched from the European Commission ESCO API. ESCO provides occupation classification data, not live job vacancies, job demand, or salary data.
          </p>
          <p className="mt-3">
            Disclaimer: Opportunity scores and salary projections are estimates generated using publicly available data and application specific calculations. Results are provided for informational purposes only and should not be considered as financial, immigration, employment or career advice.
          </p>
        </div>
      </div>
    </main>
  );
}

import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const prompt = `
You are analysing a country opportunity simulation.

User input:
Country: ${body.country}
Job title: ${body.jobTitle}
Salary: ${body.salary}
Currency: ${body.currency}
Opportunity score: ${body.opportunityScore}/100

World Bank indicators:
GDP per capita: ${body.gdpPerCapita}
Unemployment: ${body.unemployment}
Inflation: ${body.inflation}
Population: ${body.population}
Internet usage: ${body.internetUsage}
Total GDP: ${body.totalGdp}

ESCO occupation matches:
${(body.occupations || []).join(", ")}

Write a concise, honest report with:
1. What the country indicators suggest
2. What the opportunity score means
3. How the salary projections should be interpreted
4. Limitations of the analysis
5. Practical next steps

Important:
- Do not claim this is live job vacancy data.
- Do not give immigration, financial, or legal advice.
- Explain that World Bank data is country-level data.
- Explain that ESCO is occupation classification data.
`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    return NextResponse.json({
      report: response.output_text,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not generate AI report." },
      { status: 500 }
    );
  }
}

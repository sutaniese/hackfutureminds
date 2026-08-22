const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const rawPath = path.join(root, "data", "grants_raw.json");
const cleanPath = path.join(root, "data", "grants.json");

async function clean() {
  const rawData = JSON.parse(await fs.readFile(rawPath, "utf8"));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY is missing; keeping existing cleaned grants.json fallback.");
    return;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Here is raw scraped grant data from Kazakh government websites:
${JSON.stringify(rawData)}

Clean this data:
1. Fill missing fields with null (never guess)
2. Normalize field names to English slugs
3. Convert all amounts to KZT (use 1 USD = 450 KZT)
4. Deduplicate entries
5. Return only valid JSON array, no markdown`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude clean failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const text = payload.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error("Claude returned no text content.");

  const grants = JSON.parse(text);
  if (!Array.isArray(grants)) throw new Error("Claude output was not a JSON array.");

  await fs.writeFile(cleanPath, `${JSON.stringify(grants, null, 2)}\n`);
  console.log(`Cleaned ${grants.length} grants -> ${cleanPath}`);
}

clean().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

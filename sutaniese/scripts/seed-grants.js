const path = require("node:path");
const grants = require("../data/grants.json");

async function seed() {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are required.");
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const sqlPath = path.join(__dirname, "create-grants-table.sql");
  console.log(`Ensure the grants table exists first: ${sqlPath}`);

  const { error } = await supabase
    .from("grants")
    .upsert(grants, { onConflict: "id" });

  if (error) throw error;
  console.log(`Seeded ${grants.length} grants`);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

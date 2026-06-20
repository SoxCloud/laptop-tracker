import "dotenv/config";
import { getAllRows, getStorageMode } from "../lib/data";

async function main() {
  const mode = getStorageMode();
  console.log(`📦 Storage mode: ${mode === "sheets" ? "Google Sheets" : "Local SQLite"}`);

  if (mode === "sheets") {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    console.log(`🔌 Connecting to sheet: ${sheetId}`);
    console.log(`   Tab: ${process.env.GOOGLE_SHEET_TAB || "Laptops (default)"}`);
  } else {
    console.log("🔌 Using local SQLite database (dev.db)");
    console.log("   To connect Google Sheets, set GOOGLE_SERVICE_ACCOUNT_KEY in .env");
    console.log("   See .env file for setup instructions.");
  }

  try {
    const rows = await getAllRows();
    console.log(`✅ Connected! Found ${rows.length} repair records.`);
    if (rows.length > 0) {
      console.log("\nFirst entry:");
      console.log(`   Date:   ${rows[0].date}`);
      console.log(`   User:   ${rows[0].user}`);
      console.log(`   Model:  ${rows[0].model}`);
      console.log(`   Serial: ${rows[0].serial}`);
      console.log(`   Issue:  ${rows[0].issue}`);
      console.log(`   Status: ${rows[0].status}`);
    } else {
      console.log("\nNo records yet. Add one via the app or import CSV.");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Connection failed: ${msg}`);

    if (getStorageMode() === "sheets") {
      console.error("\nTroubleshooting:");
      console.error("  1. Is the service account email added as Editor on the sheet?");
      console.error("  2. Is the Google Sheets API enabled?");
      console.error("  3. Is GOOGLE_SHEET_TAB correct? (default: 'Laptops')");
    }
    process.exit(1);
  }
}

main();

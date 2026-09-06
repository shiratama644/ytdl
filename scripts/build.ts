import { build } from "vite";

async function run() {
  try {
    await build();
  } catch (error) {
    console.error("Vite build failed:", error);
    process.exit(1);
  }
}

run();

import { preview } from "vite";

async function run() {
  try {
    const previewServer = await preview({
      preview: {
        port: 4173,
        host: true,
        allowedHosts: true,
      },
    });
    previewServer.printUrls();
  } catch (error) {
    console.error("Vite preview failed:", error);
    process.exit(1);
  }
}

run();

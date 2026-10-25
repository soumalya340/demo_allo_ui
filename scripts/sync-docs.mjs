import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const source = path.resolve(process.argv[2] || "../allo_xyz");
const files = {
  overview: "README.md",
  functions: "Functions.md",
  endpoints: "Endpoints.md",
};
await mkdir("public/docs", { recursive: true });
await mkdir("app/docs/content", { recursive: true });
const documents = {};
for (const [key, file] of Object.entries(files)) {
  const markdown = await readFile(path.join(source, file), "utf8");
  documents[key] = { file, markdown };
  await writeFile(path.join("public/docs", file), markdown);
}
await writeFile(
  "app/docs/content/documents.json",
  JSON.stringify(documents, null, 2) + "\n",
);
console.log("Synced Overview, Functions, and Endpoints documentation.");

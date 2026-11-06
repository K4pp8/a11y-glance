import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/licenses", { recursive: true });
await mkdir("dist/icons", { recursive: true });
await cp("public", "dist", { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const source = size <= 32 ? "assets/toolbar.svg" : "assets/icon.svg";
  await sharp(source).resize(size, size).png().toFile(`dist/icons/icon-${size}.png`);
}
const common = {
  bundle: true,
  target: "chrome116",
  minify: true,
  sourcemap: false,
  legalComments: "eof",
  define: { "process.env.NODE_ENV": '"production"' },
};
await Promise.all([
  build({
    ...common,
    entryPoints: ["src/background.ts"],
    outfile: "dist/background.js",
    format: "esm",
  }),
  build({ ...common, entryPoints: ["src/content.ts"], outfile: "dist/content.js", format: "iife" }),
  build({
    ...common,
    entryPoints: ["src/panel/main.tsx"],
    outfile: "dist/panel.js",
    format: "esm",
  }),
]);
for (const name of ["axe-core", "react", "react-dom", "scheduler"]) {
  const license = await readFile(`node_modules/${name}/LICENSE`, "utf8");
  await writeFile(`dist/licenses/${name}.txt`, license);
}
await cp("LICENSE", "dist/LICENSE.txt");
await cp("THIRD_PARTY_NOTICES.md", "dist/THIRD_PARTY_NOTICES.md");
console.log("Built Chrome extension in dist/. Load this directory as an unpacked extension.");

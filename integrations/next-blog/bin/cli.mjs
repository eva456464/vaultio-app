#!/usr/bin/env node
/**
 * `npx <package> init`: copies the starter blog (list, article, tag pages, sitemap, styles) into
 * app/blog or src/app/blog. Existing files are kept unless --force is given.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
const [command, ...flags] = process.argv.slice(2);
const force = flags.includes("--force");

if (command !== "init") {
  console.log(`Usage: npx ${pkg.name} init [--force]\n\nCopies a ready-made /blog into your Next.js App Router project.`);
  process.exit(command ? 1 : 0);
}

const cwd = process.cwd();
const appDir = existsSync(join(cwd, "src", "app")) ? join(cwd, "src", "app") : existsSync(join(cwd, "app")) ? join(cwd, "app") : null;
if (!appDir) {
  console.error("No app/ or src/app/ folder found. Run this in the root of a Next.js App Router project.");
  process.exit(1);
}

const source = join(here, "..", "template", "blog");
const target = join(appDir, "blog");
const written = [];
const skipped = [];
const copy = (from, to) => {
  for (const entry of readdirSync(from)) {
    const src = join(from, entry);
    const dest = join(to, entry);
    if (statSync(src).isDirectory()) {
      mkdirSync(dest, { recursive: true });
      copy(src, dest);
    } else if (existsSync(dest) && !force) {
      skipped.push(relative(cwd, dest));
    } else {
      // Templates import the read client by this package's own name.
      writeFileSync(dest, readFileSync(src, "utf8").replaceAll("__PACKAGE__", pkg.name));
      written.push(relative(cwd, dest));
    }
  }
};
mkdirSync(target, { recursive: true });
copy(source, target);

console.log(`\nBlog added in ${relative(cwd, target)}/`);
for (const file of written) console.log(`  + ${file}`);
for (const file of skipped) console.log(`  = ${file} (exists, kept; use --force to replace)`);
console.log(`\nNext:\n  1. .env.local: BLOG_API_KEY and BLOG_API_URL (from Settings → Publishing → Next.js Blog), NEXT_PUBLIC_SITE_URL=https://your-site\n  2. next.config: images.remotePatterns for your article image host\n  3. npm run dev, then open /blog\n`);

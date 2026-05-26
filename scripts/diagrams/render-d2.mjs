import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { D2 } from "@terrastruct/d2";

const [format = "svg", input = "docs/diagrams/business-flow.d2", outputArg] = process.argv.slice(2);
const supportedFormats = new Set(["svg", "png", "pdf"]);

if (!supportedFormats.has(format)) {
  console.error("Usage: pnpm d2:svg|d2:png|d2:pdf [input.d2] [output]");
  process.exit(1);
}

const inputPath = resolve(input);
const outputPath = resolve(outputArg ?? input.replace(/\.d2$/i, `.${format}`));
const svgPath = format === "svg" ? outputPath : resolve(outputPath.replace(new RegExp(`${extname(outputPath)}$`), ".svg"));

const source = await readFile(inputPath, "utf8");
const d2 = new D2();
const compiled = await d2.compile(source, {
  layout: "elk",
  themeID: 4,
  pad: 80,
});
const svg = highlightDiagramText(await d2.render(compiled.diagram, compiled.renderOptions));

await mkdir(dirname(svgPath), { recursive: true });
await writeFile(svgPath, svg);

if (format !== "svg") {
  const conversion = spawnSync("rsvg-convert", [svgPath, "-o", outputPath], {
    encoding: "utf8",
  });

  if (conversion.status !== 0) {
    console.error(conversion.stderr || "rsvg-convert failed");
    process.exit(conversion.status ?? 1);
  }

  await rm(svgPath, { force: true });
}

console.log(outputPath);
process.exit(0);

function highlightDiagramText(svg) {
  return svg.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, (textBlock) => {
    let tspanIndex = 0;
    let roleContinuationLines = 0;

    return textBlock.replace(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g, (tspan, attributes, content) => {
      const cleanContent = content.replace(/<[^>]+>/g, "").trim();
      const cleanedAttributes = attributes
        .replace(/\sfont-weight="[^"]*"/g, "")
        .replace(/\sfill="[^"]*"/g, "");
      const styles = [];

      const isRoleLine = cleanContent.startsWith("Роль:");
      const isRoleContinuation = roleContinuationLines > 0;

      if (tspanIndex === 0) {
        styles.push('font-weight="700"');
      } else if (isRoleLine || isRoleContinuation) {
        styles.push('fill="#2563EB"');
        styles.push('font-weight="600"');
      } else {
        styles.push('font-weight="400"');
      }

      if (isRoleLine) {
        roleContinuationLines = cleanContent.endsWith("или") ? 1 : 0;
      } else if (isRoleContinuation) {
        roleContinuationLines -= 1;
      }

      tspanIndex += 1;
      return `<tspan${cleanedAttributes} ${styles.join(" ")}>${content}</tspan>`;
    });
  });
}

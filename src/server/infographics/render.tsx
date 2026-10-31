/* eslint-disable @next/next/no-img-element -- satori draws these into the infographic image; they never reach a page. */
/**
 * Typesets an infographic with satori (layout, wrapping, text turned into paths) and rasterizes it
 * with sharp, so numbers and words are always exactly right — unlike images from an image model.
 *
 * Editorial: a cream magazine sheet, serif title, an illustration drawn for the topic.
 * Classic: a photo/sketch header (the article's cover) with the title on it, then cards and charts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import sharp from "sharp";
import type { InfographicStyle } from "@/lib/visuals";
import type { InfographicSpec } from "./spec";

const WIDTH = 1200;
/** Width inside the 64px side margins. */
const CONTENT = WIDTH - 128;
const SUBSETS = [
  "latin",
  "latin-ext",
  "cyrillic",
  "cyrillic-ext",
  "greek",
  "vietnamese",
];

type Font = {
  name: string;
  data: Buffer;
  weight: 400 | 600 | 700;
  style: "normal";
};
let fonts: Font[] | null = null;

/** Inter for text and Source Serif 4 for editorial titles, one face per script so text in any of them renders. */
function loadFonts() {
  if (fonts) return fonts;
  // Resolved from the project folder so it works the same in the Next server and the worker.
  const dir = (pkg: string) => join(process.cwd(), "node_modules", "@fontsource", pkg, "files");
  const list: Font[] = [];
  for (const subset of SUBSETS) {
    for (const weight of [400, 600, 700] as const)
      list.push({
        name: `Sans-${subset}`,
        data: readFileSync(
          join(dir("inter"), `inter-${subset}-${weight}-normal.woff`),
        ),
        weight,
        style: "normal",
      });
    if (subset !== "greek-ext")
      for (const weight of [600, 700] as const)
        list.push({
          name: `Serif-${subset}`,
          data: readFileSync(
            join(
              dir("source-serif-4"),
              `source-serif-4-${subset}-${weight}-normal.woff`,
            ),
          ),
          weight,
          style: "normal",
        });
  }
  fonts = list;
  return list;
}

const SANS = SUBSETS.map((subset) => `Sans-${subset}`).join(", ");
const SERIF = `${SUBSETS.map((subset) => `Serif-${subset}`).join(", ")}, ${SANS}`;

export type Brand = {
  color: string;
  name: string;
  logo: string | null;
  domain: string;
};
export type Art = { illustration?: string | null; header?: string | null };

// ------------------------------------------------------------------ Colour helpers

function mix(hex: string, toward: string, amount: number) {
  const parse = (value: string) =>
    [1, 3, 5].map((offset) =>
      Number.parseInt(value.slice(offset, offset + 2), 16),
    );
  const [a, b] = [parse(hex), parse(toward)];
  return `#${a
    .map((channel, index) =>
      Math.round(channel + (b[index]! - channel) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
const tint = (hex: string, amount: number) => mix(hex, "#ffffff", amount);
const shade = (hex: string, amount: number) => mix(hex, "#000000", amount);

// ------------------------------------------------------------------ Layouts

function Check({ color }: { color: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
      <circle cx="15" cy="15" r="15" fill={color} />
      <path
        d="M9 15.5l4 4 8-9"
        stroke="#ffffff"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Bars({
  spec,
  color,
  editorial,
}: {
  spec: InfographicSpec;
  color: string;
  editorial: boolean;
}) {
  const max = Math.max(...spec.bars.map((bar) => bar.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {spec.bars.map((bar, index) => {
        const share = bar.value / max;
        const fill = editorial ? tint(color, 0.6 * (1 - share)) : color;
        return (
          <div key={index} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 300,
                flexShrink: 0,
                paddingRight: 24,
                fontSize: 24,
                fontWeight: 600,
                color: "#1f2937",
                lineHeight: 1.25,
              }}
            >
              {bar.label}
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                minWidth: 0,
                alignItems: "center",
                height: 44,
                borderRadius: 22,
                background: editorial ? "transparent" : tint(color, 0.9),
              }}
            >
              <div
                style={{
                  width: `${Math.max(4, share * 70)}%`,
                  flexShrink: 0,
                  height: 44,
                  borderRadius: editorial ? 6 : 22,
                  background: editorial
                    ? fill
                    : `linear-gradient(90deg, ${color}, ${tint(color, 0.25)})`,
                }}
              />
              <div
                style={{
                  marginLeft: 16,
                  fontSize: 24,
                  fontWeight: 700,
                  color: editorial ? "#111827" : shade(color, 0.15),
                  whiteSpace: "nowrap",
                }}
              >
                {bar.display}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Steps({ spec, color }: { spec: InfographicSpec; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {spec.steps.map((step, index) => (
        <div key={index} style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 64,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                height: 52,
                borderRadius: 26,
                background: color,
                color: "#ffffff",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {String(index + 1)}
            </div>
            {index < spec.steps.length - 1 && (
              <div
                style={{
                  width: 3,
                  flex: 1,
                  minHeight: 28,
                  background: tint(color, 0.7),
                }}
              />
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              paddingLeft: 20,
              paddingBottom: index < spec.steps.length - 1 ? 28 : 0,
              paddingTop: 8,
            }}
          >
            <div
              style={{
                fontSize: 27,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.25,
              }}
            >
              {step.title}
            </div>
            {step.detail && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 21,
                  color: "#4b5563",
                  lineHeight: 1.4,
                }}
              >
                {step.detail}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Checklist({ spec, color }: { spec: InfographicSpec; color: string }) {
  const twoColumns = spec.checklist.length > 4;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
      {spec.checklist.map((item, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            // Padding is added to this width (content-box), so it is taken off here.
            width: (twoColumns ? (CONTENT - 18) / 2 : CONTENT) - 40,
            padding: "18px 20px",
            borderRadius: 16,
            background: tint(color, 0.93),
          }}
        >
          <Check color={color} />
          <div
            style={{
              fontSize: 23,
              fontWeight: 600,
              color: "#1f2937",
              lineHeight: 1.35,
              flex: 1,
            }}
          >
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

function Comparison({ spec, color }: { spec: InfographicSpec; color: string }) {
  const { columns, rows } = spec.comparison;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 18,
        overflow: "hidden",
        border: `2px solid ${tint(color, 0.8)}`,
      }}
    >
      <div style={{ display: "flex", background: color }}>
        <div style={{ width: 260, padding: "18px 20px" }} />
        {columns.map((column, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              padding: "18px 20px",
              fontSize: 24,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {column}
          </div>
        ))}
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            background: index % 2 ? tint(color, 0.95) : "#ffffff",
          }}
        >
          <div
            style={{
              width: 260,
              padding: "18px 20px",
              fontSize: 22,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {row.label}
          </div>
          {row.cells.map((cell, cellIndex) => (
            <div
              key={cellIndex}
              style={{
                flex: 1,
                padding: "18px 20px",
                fontSize: 22,
                color: "#374151",
                lineHeight: 1.35,
              }}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Stats({ spec, color }: { spec: InfographicSpec; color: string }) {
  return (
    <div style={{ display: "flex", gap: 22 }}>
      {spec.stats.map((stat, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "30px 26px",
            borderRadius: 20,
            background: tint(color, 0.92),
          }}
        >
          <div style={{ width: 48, height: 6, borderRadius: 3, background: color, marginBottom: 22 }} />
          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              color: shade(color, 0.1),
              lineHeight: 1,
            }}
          >
            {stat.value}
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 22,
              fontWeight: 600,
              color: "#1f2937",
              lineHeight: 1.35,
            }}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function Body({
  spec,
  color,
  editorial,
}: {
  spec: InfographicSpec;
  color: string;
  editorial: boolean;
}) {
  switch (spec.layout) {
    case "bars":
      return <Bars spec={spec} color={color} editorial={editorial} />;
    case "steps":
      return <Steps spec={spec} color={color} />;
    case "checklist":
      return <Checklist spec={spec} color={color} />;
    case "comparison":
      return <Comparison spec={spec} color={color} />;
    case "stats":
      return <Stats spec={spec} color={color} />;
  }
}

function Footer({ brand, color }: { brand: Brand; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 44,
        paddingTop: 22,
        borderTop: `2px solid ${tint(color, 0.82)}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {brand.logo && (
          <img
            alt=""
            src={brand.logo}
            width={40}
            height={40}
            style={{ borderRadius: 8, objectFit: "contain" }}
          />
        )}
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
          {brand.name}
        </div>
      </div>
      <div style={{ fontSize: 19, color: "#6b7280" }}>{brand.domain}</div>
    </div>
  );
}

function Editorial({
  spec,
  brand,
  art,
}: {
  spec: InfographicSpec;
  brand: Brand;
  art: Art;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: WIDTH,
        background: "#FBF7F2",
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: "56px 64px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 32,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 54,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.12,
                letterSpacing: -0.5,
              }}
            >
              {spec.title}
            </div>
            {spec.subtitle && (
              <div
                style={{
                  marginTop: 16,
                  fontSize: 24,
                  color: "#4b5563",
                  lineHeight: 1.4,
                }}
              >
                {spec.subtitle}
              </div>
            )}
          </div>
          {art.illustration && (
            <img
              alt=""
              src={art.illustration}
              width={260}
              height={200}
              style={{ borderRadius: 18, objectFit: "cover", flexShrink: 0 }}
            />
          )}
        </div>
        <Body spec={spec} color={brand.color} editorial />
        <Footer brand={brand} color={brand.color} />
      </div>
    </div>
  );
}

function Classic({
  spec,
  brand,
  art,
}: {
  spec: InfographicSpec;
  brand: Brand;
  art: Art;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: WIDTH,
        background: "#ffffff",
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          height: 300,
          padding: "0 64px 36px",
          backgroundColor: shade(brand.color, 0.35),
          backgroundImage: art.header
            ? `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.72) 100%), url(${art.header})`
            : `linear-gradient(135deg, ${brand.color}, ${shade(brand.color, 0.45)})`,
          backgroundSize: "100% 100%",
          borderBottom: `8px solid ${brand.color}`,
        }}
      >
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 50,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.12,
          }}
        >
          {spec.title}
        </div>
        {spec.subtitle && (
          <div
            style={{
              marginTop: 12,
              fontSize: 23,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.4,
            }}
          >
            {spec.subtitle}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "48px 64px 40px",
        }}
      >
        <Body spec={spec} color={brand.color} editorial={false} />
        <Footer brand={brand} color={brand.color} />
      </div>
    </div>
  );
}

/** Renders the infographic to a PNG (1600px wide for sharp text on high-density screens). */
export async function renderInfographic(
  spec: InfographicSpec,
  style: InfographicStyle,
  brand: Brand,
  art: Art = {},
) {
  const element =
    style === "classic" ? (
      <Classic spec={spec} brand={brand} art={art} />
    ) : (
      <Editorial spec={spec} brand={brand} art={art} />
    );
  const svg = await satori(element, { width: WIDTH, fonts: loadFonts() });
  return sharp(Buffer.from(svg), { density: 96 })
    .resize({ width: 1600 })
    .png()
    .toBuffer();
}

/** Any image (WebP, SVG, PNG…) as a PNG/JPEG data URL satori can embed. */
export async function toDataUrl(
  bytes: Buffer,
  size: { width: number; height: number },
  format: "png" | "jpeg" = "jpeg",
) {
  const image = sharp(bytes).resize(size.width, size.height, {
    fit: format === "png" ? "contain" : "cover",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const data =
    format === "png"
      ? await image.png().toBuffer()
      : await image.jpeg({ quality: 85 }).toBuffer();
  return `data:image/${format};base64,${data.toString("base64")}`;
}

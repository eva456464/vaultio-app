/**
 * Product data from feeds and files: Google Shopping and Facebook catalog feeds (RSS 2.0 or Atom
 * with g: fields), the product XML format shown on the import dialog, CSV and Excel (.xlsx).
 */
import { type ChildNode, type Element, isTag, isText } from "domhandler";
import { decodeHTML } from "entities";
import { unzipSync, strFromU8 } from "fflate";
import { parseDocument } from "htmlparser2";

export type ProductInput = {
  externalId: string;
  name: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string | null;
  brand: string | null;
  category: string | null;
  status: "active" | "draft";
  variants: number;
};

export class CatalogFileError extends Error {}

/** Most catalogs fit; bigger ones import the first 10,000 products. */
export const MAX_PRODUCTS = 10_000;

const clean = (value: string | null | undefined, max = 2000) => {
  const text = decodeHTML((value ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};
const httpUrl = (value: string | null | undefined) => {
  const text = (value ?? "").trim();
  return /^https?:\/\/\S+$/i.test(text) ? text : null;
};

/**
 * "29.99 USD", "USD 29.99", "29,99 €", "$1,299.00" → { price: "29.99", currency: "USD" }.
 * Unclear amounts give no price rather than a wrong one.
 */
export function parsePrice(raw: string | number | null | undefined, fallbackCurrency: string | null = null) {
  if (raw === null || raw === undefined || raw === "") return { price: null, currency: fallbackCurrency };
  const text = String(raw).trim();
  const symbols: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "¥": "JPY", "₹": "INR", "₩": "KRW", "zł": "PLN", "kr": "SEK" };
  const code = text.match(/\b([A-Z]{3})\b/)?.[1] ?? Object.entries(symbols).find(([symbol]) => text.includes(symbol))?.[1] ?? fallbackCurrency;
  const number = text.match(/\d[\d.,\s]*/)?.[0].replace(/\s/g, "");
  if (!number) return { price: null, currency: code };
  let value = number;
  const lastDot = value.lastIndexOf(".");
  const lastComma = value.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) value = lastComma > lastDot ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  else if (lastComma >= 0) value = /,\d{1,2}$/.test(value) ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  else if ((value.match(/\./g) ?? []).length > 1) value = value.replace(/\./g, "");
  const amount = Number(value);
  return Number.isFinite(amount) ? { price: String(Math.round(amount * 100) / 100), currency: code } : { price: null, currency: code };
}

// ---------------------------------------------------------------------------------------------
// XML (feeds and product files)

const localName = (name: string) => name.split(":").pop()!.toLowerCase();
const textOf = (node: ChildNode): string => (isText(node) ? node.data : isTag(node) ? node.children.map(textOf).join("") : "");

function fields(element: Element) {
  // g:price and price both count; the g: (or other prefixed) value wins when both exist.
  const values = new Map<string, string>();
  for (const child of element.children) {
    if (!isTag(child)) continue;
    const key = localName(child.name);
    const value = key === "link" && child.attribs.href ? child.attribs.href : textOf(child).trim();
    if (value && (!values.has(key) || child.name.includes(":"))) values.set(key, value);
  }
  return values;
}

function findAll(nodes: ChildNode[], names: string[], out: Element[] = []) {
  for (const node of nodes) {
    if (!isTag(node)) continue;
    if (names.includes(localName(node.name))) out.push(node);
    else findAll(node.children, names, out);
  }
  return out;
}

/** Feed and file items with Google's field names (id, title, link, image_link, price…). */
function rowsFromXml(xml: string) {
  const document = parseDocument(xml, { xmlMode: true, decodeEntities: true });
  return findAll(document.children, ["item", "entry", "product"]).map((element) => Object.fromEntries(fields(element)));
}

// ---------------------------------------------------------------------------------------------
// CSV and Excel

/** RFC 4180 CSV (comma, semicolon or tab), first row as headers. */
export function parseCsv(text: string) {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0]!;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return tableToRows(rows.filter((cells) => cells.some((cell) => cell.trim())));
}

function tableToRows(table: string[][]) {
  const [header, ...body] = table;
  if (!header) return [];
  const keys = header.map((cell) => cell.trim().toLowerCase().replace(/^g:/, ""));
  return body.map((cells) => Object.fromEntries(keys.map((key, index) => [key, (cells[index] ?? "").trim()])));
}

/** The first worksheet of an .xlsx file as rows (first row as headers). */
export function parseXlsx(bytes: Uint8Array) {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (file) => file.name.startsWith("xl/") && file.name.endsWith(".xml") || file.name.endsWith(".rels") });
  } catch {
    throw new CatalogFileError("This doesn't look like an Excel (.xlsx) file. Old .xls files: save them as .xlsx or CSV first.");
  }
  const read = (name: string) => (files[name] ? parseDocument(strFromU8(files[name]!), { xmlMode: true }) : null);
  const workbook = read("xl/workbook.xml");
  const firstSheet = workbook ? findAll(workbook.children, ["sheet"])[0] : undefined;
  const relationId = firstSheet?.attribs["r:id"];
  const relations = read("xl/_rels/workbook.xml.rels");
  const target = relations ? findAll(relations.children, ["relationship"]).find((relation) => relation.attribs.Id === relationId)?.attribs.Target : undefined;
  const sheetPath = target ? `xl/${target.replace(/^\/?xl\//, "").replace(/^\//, "")}` : "xl/worksheets/sheet1.xml";
  const sheet = read(sheetPath) ?? read("xl/worksheets/sheet1.xml");
  if (!sheet) throw new CatalogFileError("The Excel file has no worksheet");
  const sharedDocument = read("xl/sharedStrings.xml");
  const shared = sharedDocument ? findAll(sharedDocument.children, ["si"]).map((item) => findAll(item.children, ["t"]).map(textOf).join("")) : [];
  const columnIndex = (reference: string) => [...(reference.match(/^[A-Z]+/)?.[0] ?? "A")].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  const table: string[][] = [];
  for (const row of findAll(sheet.children, ["row"])) {
    const cells: string[] = [];
    for (const cell of row.children.filter(isTag).filter((node) => localName(node.name) === "c")) {
      const type = cell.attribs.t;
      const value = findAll(cell.children, ["v"])[0];
      const raw = value ? textOf(value) : "";
      const text =
        type === "s" ? (shared[Number(raw)] ?? "") : type === "inlineStr" ? findAll(cell.children, ["t"]).map(textOf).join("") : type === "b" ? (raw === "1" ? "TRUE" : "FALSE") : type === "str" || type === "e" ? raw : raw ? String(Number(Number(raw).toPrecision(12))) : "";
      cells[columnIndex(cell.attribs.r ?? "")] = text;
    }
    table.push(Array.from(cells, (cell) => cell ?? ""));
  }
  return tableToRows(table.filter((cells) => cells.some((cell) => cell.trim())));
}

// ---------------------------------------------------------------------------------------------
// Rows → products

const pick = (row: Record<string, string>, ...keys: string[]) => keys.map((key) => row[key]).find((value) => value !== undefined && value.trim() !== "") ?? null;

/**
 * Products from rows with Google's field names. Rows of the same item_group_id (variants of one
 * product in a feed) become one product with the lowest price.
 */
export function rowsToProducts(rows: Record<string, string>[]) {
  const products = new Map<string, ProductInput>();
  let skipped = 0;
  for (const row of rows) {
    const id = pick(row, "id", "sku", "product_id");
    const name = clean(pick(row, "title", "name", "product_name"), 300);
    if (!id || !name) {
      skipped++;
      continue;
    }
    const group = pick(row, "item_group_id") ?? id;
    const { price, currency } = parsePrice(pick(row, "sale_price", "price"), pick(row, "currency_code", "currency"));
    const availability = (pick(row, "availability", "status") ?? "").toLowerCase();
    const existing = products.get(group);
    if (existing) {
      existing.variants++;
      if (price !== null && (existing.price === null || Number(price) < Number(existing.price))) existing.price = price;
      continue;
    }
    products.set(group, {
      externalId: group.slice(0, 200),
      name,
      description: clean(pick(row, "description", "short_description"), 1000),
      url: httpUrl(pick(row, "link", "url", "product_url")),
      imageUrl: httpUrl(pick(row, "image_link", "image", "image_url")),
      price,
      currency: currency?.toUpperCase().slice(0, 3) ?? null,
      brand: clean(pick(row, "brand", "vendor"), 200),
      category: clean(pick(row, "product_type", "category", "google_product_category"), 300),
      status: /draft|archived|discontinued/.test(availability) ? "draft" : "active",
      variants: 1,
    });
    if (products.size >= MAX_PRODUCTS) break;
  }
  return { products: [...products.values()], skipped, truncated: products.size >= MAX_PRODUCTS };
}

/** Products from an uploaded file (XML, CSV or .xlsx). */
export function parseCatalogFile(name: string, bytes: Uint8Array) {
  const extension = name.toLowerCase().split(".").pop();
  if (extension === "xls") throw new CatalogFileError("Old Excel (.xls) files can't be read: save the file as .xlsx or CSV and import that.");
  const rows =
    extension === "xlsx" ? parseXlsx(bytes) : extension === "csv" || extension === "tsv" || extension === "txt" ? parseCsv(strFromU8(bytes)) : extension === "xml" ? rowsFromXml(strFromU8(bytes)) : null;
  if (!rows) throw new CatalogFileError("Upload an XML, CSV or Excel (.xlsx) file");
  if (!rows.length) throw new CatalogFileError("No products found in the file");
  return rowsToProducts(rows);
}

/** Products from a Google Shopping or Facebook catalog feed. */
export function parseFeed(xml: string) {
  if (!/<(rss|feed|channel|products?)\b/i.test(xml.slice(0, 5000))) throw new CatalogFileError("This URL didn't return an XML product feed");
  return rowsToProducts(rowsFromXml(xml));
}

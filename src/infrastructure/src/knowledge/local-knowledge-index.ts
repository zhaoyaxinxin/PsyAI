import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TokenVectorDocument } from "../adapters/token-vector-store.js";

export type KnowledgeLibraryKind = "counseling" | "resonance";

export interface KnowledgeIndexEntry {
  documentId: string;
  library: KnowledgeLibraryKind;
  fileName: string;
  extension: string;
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
  updatedAt: string;
  title: string;
  summary: string;
  excerpt: string | null;
  tags: string[];
}

export interface KnowledgeIndexManifest {
  library: KnowledgeLibraryKind;
  sourceDirectory: string;
  indexFilePath: string;
  indexedAt: string;
  documentCount: number;
  documents: KnowledgeIndexEntry[];
  vectorDocuments: TokenVectorDocument[];
}

export interface IndexKnowledgeLibraryOptions {
  library: KnowledgeLibraryKind;
  sourceDirectory: string;
  indexDirectory: string;
}

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".csv", ".tsv"]);
const SUPPORTED_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".pdf",
  ".docx",
  ".doc",
  ".json",
  ".csv",
  ".tsv"
]);

const GENERIC_PATH_TAGS = new Set([
  "high",
  "quality",
  "case",
  "pool",
  "md",
  "txt",
  "json",
  "csv",
  "tsv",
  "readme"
]);

interface StructuredKnowledgeFields {
  themes: string[];
  summary: string | null;
  cues: string[];
  keywords: string[];
  excerpt: string | null;
}

function tokenizePathSegments(relativePath: string): string[] {
  return relativePath
    .split(/[\\/]/u)
    .flatMap((segment) => segment.split(/[-_\s.]+/u))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function isStructuredResonanceCase(relativePath: string): boolean {
  return relativePath.replace(/\\/gu, "/").startsWith("high-quality-case-pool/");
}

function splitStructuredValues(value: string): string[] {
  return value
    .split(/[、，,；;｜|]/u)
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0);
}

function parseStructuredKnowledgeFields(textContent: string): StructuredKnowledgeFields {
  const fields: StructuredKnowledgeFields = {
    themes: [],
    summary: null,
    cues: [],
    keywords: [],
    excerpt: null
  };
  const lines = textContent.split(/\r?\n/u);
  let collectingExcerpt = false;
  const excerptLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (collectingExcerpt && excerptLines.length > 0) {
        break;
      }
      continue;
    }

    if (line.startsWith("#")) {
      continue;
    }

    const fieldMatch =
      line.match(/^[-*]\s*([^：:]+)[：:]\s*(.*)$/u) ??
      line.match(/^([^：:]+)[：:]\s*(.*)$/u);

    if (fieldMatch) {
      const label = normalizeText(fieldMatch[1] ?? "");
      const value = normalizeText(fieldMatch[2] ?? "");
      collectingExcerpt = false;

      switch (label) {
        case "核心主题":
          fields.themes.push(...splitStructuredValues(value));
          break;
        case "情境摘要":
          fields.summary = value || fields.summary;
          break;
        case "共振线索":
          fields.cues.push(...splitStructuredValues(value));
          break;
        case "关键词":
          fields.keywords.push(...splitStructuredValues(value));
          break;
        case "案例片段":
          if (value) {
            excerptLines.push(value);
          }
          collectingExcerpt = true;
          break;
        default:
          break;
      }
      continue;
    }

    if (collectingExcerpt) {
      excerptLines.push(normalizeText(line));
    }
  }

  if (excerptLines.length > 0) {
    fields.excerpt = excerptLines.join(" ").slice(0, 400);
  }

  fields.themes = [...new Set(fields.themes)];
  fields.cues = [...new Set(fields.cues)];
  fields.keywords = [...new Set(fields.keywords)];
  return fields;
}

function deriveTitle(fileName: string, textContent?: string): string {
  if (textContent) {
    const heading = textContent
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => line.startsWith("# "));
    if (heading) {
      return heading.slice(2).trim();
    }
  }

  return fileName.replace(path.extname(fileName), "");
}

function deriveSummary(textContent: string | null, relativePath: string): string {
  if (textContent) {
    if (isStructuredResonanceCase(relativePath)) {
      const structured = parseStructuredKnowledgeFields(textContent);
      if (structured.summary) {
        return structured.summary.slice(0, 220);
      }
    }

    const lines = textContent
      .split(/\r?\n/u)
      .map((line) => normalizeText(line))
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    if (lines.length > 0) {
      return lines.slice(0, 3).join(" ").slice(0, 220);
    }
  }

  return `本地知识文件：${relativePath}`;
}

function deriveExcerpt(textContent: string | null): string | null {
  if (!textContent) {
    return null;
  }

  const structured = parseStructuredKnowledgeFields(textContent);
  if (structured.excerpt) {
    return structured.excerpt;
  }

  const excerpt = normalizeText(textContent).slice(0, 400);
  return excerpt.length > 0 ? excerpt : null;
}

function deriveTags(textContent: string | null, relativePath: string, library: KnowledgeLibraryKind): string[] {
  const pathTags = tokenizePathSegments(relativePath).filter(
    (tag) => !GENERIC_PATH_TAGS.has(tag.toLowerCase())
  );

  if (textContent && isStructuredResonanceCase(relativePath)) {
    const structured = parseStructuredKnowledgeFields(textContent);
    return Array.from(
      new Set([
        library,
        ...structured.themes,
        ...structured.cues,
        ...structured.keywords,
        ...pathTags
      ])
    );
  }

  return Array.from(new Set([library, ...pathTags]));
}

async function collectFiles(rootDirectory: string, relativeDir = ""): Promise<string[]> {
  const currentDirectory = path.join(rootDirectory, relativeDir);
  const entries = await readdir(currentDirectory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const nextRelativePath = relativeDir
      ? path.join(relativeDir, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(rootDirectory, nextRelativePath)));
      continue;
    }

    if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(nextRelativePath);
    }
  }

  return files;
}

async function readKnowledgeText(filePath: string): Promise<string | null> {
  const extension = path.extname(filePath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension)) {
    return null;
  }

  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function toVectorDocument(entry: KnowledgeIndexEntry): TokenVectorDocument {
  return {
    caseId: entry.documentId,
    title: entry.title,
    summary: entry.summary,
    ...(entry.excerpt ? { excerpt: entry.excerpt } : {}),
    themes: entry.tags.slice(0, 6),
    keywords: entry.tags,
    candidateSetId: `knowledge-${entry.library}`
  };
}

export async function indexKnowledgeLibrary(
  options: IndexKnowledgeLibraryOptions
): Promise<KnowledgeIndexManifest> {
  const files = await collectFiles(options.sourceDirectory);
  const documents: KnowledgeIndexEntry[] = [];

  for (const relativePath of files) {
    const absolutePath = path.join(options.sourceDirectory, relativePath);
    const fileStat = await stat(absolutePath);
    const textContent = await readKnowledgeText(absolutePath);
    const title = deriveTitle(path.basename(relativePath), textContent ?? undefined);
    const summary = deriveSummary(textContent, relativePath);
    const excerpt = deriveExcerpt(textContent);
    const tags = deriveTags(textContent, relativePath, options.library);

    documents.push({
      documentId: `${options.library}:${relativePath.replace(/[\\/]/gu, "::")}`,
      library: options.library,
      fileName: path.basename(relativePath),
      extension: path.extname(relativePath).toLowerCase(),
      absolutePath,
      relativePath,
      sizeBytes: fileStat.size,
      updatedAt: fileStat.mtime.toISOString(),
      title,
      summary,
      excerpt,
      tags
    });
  }

  const vectorDocuments = documents.map(toVectorDocument);
  const indexFilePath = path.join(
    options.indexDirectory,
    `knowledge-${options.library}.index.json`
  );
  const manifest: KnowledgeIndexManifest = {
    library: options.library,
    sourceDirectory: options.sourceDirectory,
    indexFilePath,
    indexedAt: new Date().toISOString(),
    documentCount: documents.length,
    documents,
    vectorDocuments
  };

  await mkdir(options.indexDirectory, { recursive: true });
  await writeFile(indexFilePath, JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

export async function syncKnowledgeLibraryIndexes(dataRoot: string): Promise<{
  counseling: KnowledgeIndexManifest;
  resonance: KnowledgeIndexManifest;
}> {
  const indexDirectory = path.join(dataRoot, "indexes");
  const counselingDirectory = path.join(dataRoot, "knowledge-counseling");
  const resonanceDirectory = path.join(dataRoot, "knowledge-resonance");

  await mkdir(counselingDirectory, { recursive: true });
  await mkdir(resonanceDirectory, { recursive: true });

  const [counseling, resonance] = await Promise.all([
    indexKnowledgeLibrary({
      library: "counseling",
      sourceDirectory: counselingDirectory,
      indexDirectory
    }),
    indexKnowledgeLibrary({
      library: "resonance",
      sourceDirectory: resonanceDirectory,
      indexDirectory
    })
  ]);

  return { counseling, resonance };
}

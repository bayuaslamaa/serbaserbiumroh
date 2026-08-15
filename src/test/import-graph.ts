import fs from 'node:fs';
import path from 'node:path';

export const IMPORT_PATTERNS = [
  /\b(?:import|export)\s[^"';]*?\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']/g,
  /\brequire\s*\(\s*["']([^"']+)["']/g,
];

export const importsOf = (source: string): Array<{ statement: string; module: string }> => {
  const found: Array<{ statement: string; module: string }> = [];

  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      found.push({ statement: match[0], module: match[1] });
    }
  }

  return found;
};

export const resolveLocal = (specifier: string, fromFile: string): string | null => {
  let base: string;
  if (specifier.startsWith('@/')) base = path.join(process.cwd(), specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;

  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  return null;
};

export const importGraph = (entry: string): Array<{ file: string; module: string }> => {
  const edges: Array<{ file: string; module: string }> = [];
  const seen = new Set<string>();
  const queue = [path.join(process.cwd(), entry)];

  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);

    for (const { module } of importsOf(fs.readFileSync(file, 'utf8'))) {
      edges.push({ file: path.relative(process.cwd(), file), module });
      const next = resolveLocal(module, file);
      if (next) queue.push(next);
    }
  }

  return edges;
};

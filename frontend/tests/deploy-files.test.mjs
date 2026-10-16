import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repository = fileURLToPath(new globalThis.URL('../../', import.meta.url));
const indexedFiles = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: repository, encoding: 'utf8' }).split('\0').filter(Boolean));
const sourceFiles = [...indexedFiles].filter((file) => /^frontend\/src\/.*\.(?:tsx?|css)$/.test(file));
const contents = new Map();

function indexedContent(file) {
  if (!contents.has(file)) contents.set(file, execFileSync('git', ['show', `:${file}`], { cwd: repository, encoding: 'utf8' }));
  return contents.get(file);
}

function checkImport(file, specifier) {
  if (!specifier.startsWith('.')) return;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
  const candidates = [base, ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css', '/index.ts', '/index.tsx'].map((suffix) => base + suffix)];
  const resolved = candidates.find((candidate) => indexedFiles.has(candidate));
  assert.ok(resolved, `${file}: ${specifier} não existe no índice Git com a capitalização exata. Execute git add no arquivo correto antes do commit.`);
}

test('cinematic components and their named exports are included in Git', () => {
  for (const component of ['PublicHeader', 'EventStatus', 'ParticipationJourney', 'VotingPortal', 'CinematicCountdown']) {
    const file = `frontend/src/components/halloween/${component}.tsx`;
    assert.ok(indexedFiles.has(file), `${file} está ausente do índice Git.`);
    const source = ts.createSourceFile(file, indexedContent(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.ok(source.statements.some((statement) => ts.isFunctionDeclaration(statement)
      && statement.name?.text === component
      && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)), `${file} não exporta ${component}.`);
  }
});

test('relative imports resolve in Git with case-sensitive names', () => {
  for (const file of sourceFiles) {
    const content = indexedContent(file);
    if (file.endsWith('.css')) {
      for (const match of content.matchAll(/@import\s+['"]([^'"]+)['"]/g)) checkImport(file, match[1]);
      continue;
    }
    const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        checkImport(file, node.moduleSpecifier.text);
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        checkImport(file, node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

test('photograph, fonts and other referenced public assets are included in Git', () => {
  for (const file of [...sourceFiles, 'frontend/index.html']) {
    for (const match of indexedContent(file).matchAll(/\/assets\/[^"'()\s<>]+/g)) {
      const asset = `frontend/public${match[0]}`;
      assert.ok(indexedFiles.has(asset), `${file}: ${asset} está ausente do índice Git ou tem capitalização diferente.`);
    }
  }
});

test('frontend has no Git paths that collide only by capitalization', () => {
  const names = new Map();
  for (const file of indexedFiles) {
    if (!file.startsWith('frontend/')) continue;
    const normalized = file.toLowerCase();
    assert.ok(!names.has(normalized), `${file} colide com ${names.get(normalized)}.`);
    names.set(normalized, file);
  }
});

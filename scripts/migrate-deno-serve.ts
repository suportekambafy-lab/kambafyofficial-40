/**
 * Script para migrar todas as edge functions para usar Deno.serve()
 * em vez da importação antiga de deno.land/std
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const functionsDir = 'supabase/functions';

function getAllIndexFiles(dir: string): string[] {
  const files: string[] = [];
  
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && item !== '_shared') {
      const indexPath = join(fullPath, 'index.ts');
      try {
        statSync(indexPath);
        files.push(indexPath);
      } catch {
        // index.ts não existe nesta pasta
      }
    }
  }
  
  return files;
}

function migrateFile(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Padrão 1: Remover import do serve
    const importPattern = /import\s*{\s*serve\s*}\s*from\s*['"](https:\/\/deno\.land\/std@[\d.]+\/http\/server\.ts)['"];?\s*\n/g;
    if (importPattern.test(content)) {
      content = content.replace(importPattern, '');
      modified = true;
    }
    
    // Padrão 2: Substituir serve( por Deno.serve(
    // Verifica se tem serve( mas não Deno.serve(
    if (content.includes('serve(') && !content.includes('Deno.serve(')) {
      content = content.replace(/\bserve\(/g, 'Deno.serve(');
      modified = true;
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Migrado: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  Já atualizado: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro ao migrar ${filePath}:`, error);
    return false;
  }
}

// Executar migração
console.log('🚀 Iniciando migração de edge functions...\n');

const files = getAllIndexFiles(functionsDir);
console.log(`📁 Encontradas ${files.length} edge functions\n`);

let migratedCount = 0;

for (const file of files) {
  if (migrateFile(file)) {
    migratedCount++;
  }
}

console.log(`\n✅ Migração concluída!`);
console.log(`📊 Total: ${files.length} funções`);
console.log(`✨ Migradas: ${migratedCount} funções`);
console.log(`⏭️  Já atualizadas: ${files.length - migratedCount} funções`);

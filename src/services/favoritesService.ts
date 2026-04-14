import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.config', 'tmuxtui');
const FILE = join(CONFIG_DIR, 'favorites.json');

export function loadFavorites(): Set<string> {
  try {
    const data = JSON.parse(readFileSync(FILE, 'utf-8'));
    return new Set(data.favorites || []);
  } catch {
    return new Set();
  }
}

export function saveFavorites(favorites: Set<string>): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify({ favorites: [...favorites] }, null, 2));
}

export function toggleFavorite(name: string, favorites: Set<string>): Set<string> {
  const next = new Set(favorites);
  next.has(name) ? next.delete(name) : next.add(name);
  saveFavorites(next);
  return next;
}

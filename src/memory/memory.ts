// Cross-run memory layer. Persists selectors, bug history, and lessons to a
// local JSON file so each run can build on the last (no cold starts).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface MemoryStore {
  knownSelectors: Record<string, string>;
  bugHistory: { title: string; area: string; firstSeen: string }[];
  lessons: string[];
  runs: number;
}

const EMPTY: MemoryStore = { knownSelectors: {}, bugHistory: [], lessons: [], runs: 0 };

export class Memory {
  private data: MemoryStore;
  constructor(private path: string) {
    this.data = existsSync(path)
      ? { ...EMPTY, ...JSON.parse(readFileSync(path, "utf8")) }
      : { ...EMPTY };
  }

  get store(): MemoryStore {
    return this.data;
  }

  rememberSelector(key: string, selector: string): void {
    this.data.knownSelectors[key] = selector;
  }

  recordBug(title: string, area: string, now: string): boolean {
    const seenBefore = this.data.bugHistory.some((b) => b.title === title);
    if (!seenBefore) this.data.bugHistory.push({ title, area, firstSeen: now });
    return seenBefore; // true => regression / recurring
  }

  addLesson(lesson: string): void {
    if (!this.data.lessons.includes(lesson)) this.data.lessons.push(lesson);
  }

  save(): void {
    this.data.runs += 1;
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  }
}

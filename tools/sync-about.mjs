#!/usr/bin/env node
// Copies the shared "About Koha Solutions" block into README.md between <!-- about:start --> and <!-- about:end -->.
// The one source is company/about.md in github.com/kohasolutions/.github, so every Koha Solutions repository says
// the same thing; never edit the block in this README.
//
//   node tools/sync-about.mjs            fetch it and write it into README.md
//   node tools/sync-about.mjs --check    exit 1 if README.md's block differs from the source (CI)
//   ABOUT_FILE=../.github/company/about.md node tools/sync-about.mjs    use a local copy instead of fetching
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib.mjs'

const SOURCE = 'https://raw.githubusercontent.com/kohasolutions/.github/main/company/about.md'
const CHECK = process.argv.includes('--check')
const about = process.env.ABOUT_FILE
  ? readFileSync(process.env.ABOUT_FILE, 'utf8')
  : await (async () => {
      const res = await fetch(SOURCE)
      if (!res.ok) throw new Error(`${SOURCE} answered ${res.status}`)
      return res.text()
    })()

const START = '<!-- about:start -->'
const END = '<!-- about:end -->'
const path = join(ROOT, 'README.md')
const readme = readFileSync(path, 'utf8')
const i = readme.indexOf(START)
const j = readme.indexOf(END)
if (i < 0 || j < 0) {
  console.error('README.md has no about markers')
  process.exit(2)
}
const next = `${readme.slice(0, i + START.length)}\n${about.trim()}\n${readme.slice(j)}`
if (CHECK) {
  if (next !== readme) {
    console.error('[about] README.md differs from company/about.md — run node tools/sync-about.mjs')
    process.exit(1)
  }
  console.log('[about] README.md matches company/about.md')
} else {
  writeFileSync(path, next)
  console.log('[about] written')
}

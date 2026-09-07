// Local-only contact previews. Never uploads or changes a source photograph.
import { readdir, stat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import exifr from 'exifr';
const [source, after, before, title = 'Your photographs'] = process.argv.slice(2);
// Camera-card dates follow local calendar days, not UTC midnight.
const boundary = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? new Date(value + 'T00:00:00').getTime() : NaN;
if (!source || !after || !before || !Number.isFinite(boundary(after)) || !Number.isFinite(boundary(before)) || boundary(after) >= boundary(before)) throw Error('Usage: node scripts/prepare-photo-review.mjs /path/to/DCIM FROM-DATE UNTIL-DATE [TITLE]');
const root = path.resolve(source);
const output = path.resolve('.local/photo-review');
await mkdir(output, { recursive: true, mode: 0o700 });
async function walk(folder) {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (entry.isFile() && /\.jpe?g$/i.test(entry.name)) {
      const info = await stat(file);
      if (info.mtimeMs >= boundary(after) && info.mtimeMs < boundary(before)) files.push({ file, size: info.size, modified: info.mtimeMs });
    }
  }
  return files;
}
const files = (await walk(root)).sort((a,b) => a.modified-b.modified);
if (files.length > 1000) throw Error(`${files.length} photographs match. Narrow the date range to at most 1000 for a deliberate review.`);
const items = [];
for (const [index, entry] of files.entries()) {
  const id = createHash('sha256').update(`${entry.file}:${entry.size}:${entry.modified}`).digest('hex').slice(0,20);
  const data = await readFile(entry.file);
  const exif = await exifr.parse(data, { pick: ['DateTimeOriginal', 'Model', 'FNumber', 'ISO', 'ExposureTime'] }).catch(() => null);
  const result = await sharp(data).rotate().resize(1400,1400,{fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer({resolveWithObject:true});
  await writeFile(path.join(output,id+'.jpg'),result.data,{mode:0o600});
  items.push({id,path:entry.file,name:path.basename(entry.file),size:entry.size,modified:entry.modified,width:result.info.width,height:result.info.height,takenAt:exif?.DateTimeOriginal?.toISOString?.() || null,focus:'check',note:''});
  if((index+1)%10===0) console.log(`Prepared ${index+1}/${files.length} local previews`);
}
await writeFile(path.join(output,'manifest.json'),JSON.stringify({version:Date.now().toString(),sourceRoot:root,title,items},null,2),{mode:0o600});
console.log(`Prepared ${items.length} local previews. No uploads or publishing.`);

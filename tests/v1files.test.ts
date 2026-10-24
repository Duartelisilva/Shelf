import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readV1Folder } from '../src/main/v1files'

describe('readV1Folder', () => {
  it('reports found, missing and unreadable files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'shelf-v1-'))
    await writeFile(join(dir, 'movies.json'), '\uFEFF[{"Title":"Alien"}]')
    await writeFile(join(dir, 'bookss.json'), 'broken')
    const result = await readV1Folder(dir)
    expect(result.found).toEqual(['movies.json'])
    expect(result.missing).toEqual(['seriess.json', 'wishlists.json'])
    expect(result.problems).toEqual(['bookss.json: is not valid JSON'])
    expect(result.files.movies).toEqual([{ Title: 'Alien' }])
  })
})

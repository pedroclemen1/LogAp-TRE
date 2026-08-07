import { readFile } from 'node:fs/promises'
import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'

const files = ['messages/pt-BR.json', 'messages/en-US.json']
const [portuguese, english] = await Promise.all(
  files.map(async (file) => JSON.parse(await readFile(new URL(`../../${file}`, import.meta.url), 'utf8'))),
)

function flatten(value, prefix = '', result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') result.set(path, child)
    else flatten(child, path, result)
  }
  return result
}

function variables(message) {
  return [...new Set([...message.matchAll(/\{([a-z][A-Za-z0-9_]*)(?=\s*[,}])/g)]
    .map((match) => match[1]))].sort()
}

const pt = flatten(portuguese)
const en = flatten(english)

describe('i18n catalogs', () => {
  it('uses the same keys in Portuguese and English', () => {
    expect([...pt.keys()].filter((key) => !en.has(key))).toEqual([])
    expect([...en.keys()].filter((key) => !pt.has(key))).toEqual([])
  })

  it('uses the same ICU variables in both locales', () => {
    const mismatches = [...pt.keys()]
      .filter((key) => en.has(key))
      .filter((key) => variables(pt.get(key)).join(',') !== variables(en.get(key)).join(','))

    expect(mismatches).toEqual([])
  })

  it('contains only valid ICU messages', () => {
    const invalid = []

    for (const [locale, messages, catalog] of [['pt-BR', portuguese, pt], ['en-US', english, en]]) {
      const translate = createTranslator({ locale, messages })
      for (const [key, message] of catalog) {
        const values = Object.fromEntries(variables(message).map((variable) => [variable, 1]))
        try {
          translate(key, values)
        } catch (error) {
          invalid.push(`${locale}:${key} (${error instanceof Error ? error.message : String(error)})`)
        }
      }
    }

    expect(invalid).toEqual([])
  })
})

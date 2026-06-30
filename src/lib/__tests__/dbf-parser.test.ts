import { describe, it, expect } from 'vitest'
import { parseDbf, DbfParseError } from '../dbf-parser'

function makeMinimalDbf(records: Array<Record<string, string>>): ArrayBuffer {
  const fields = Object.keys(records[0] || {})
  const fieldLen = fields.reduce((sum, f) => sum + 1, 0)
  const recordLen = fieldLen + 1
  const headerLen = 32 + (fields.length * 32) + 1
  const buffer = new ArrayBuffer(headerLen + (records.length * recordLen))
  const view = new DataView(buffer)
  const encoder = new TextEncoder()

  view.setUint8(0, 0x03)
  view.setUint8(1, 126)
  view.setUint8(2, 6)
  view.setUint8(3, 29)
  view.setUint32(4, records.length, true)
  view.setUint16(8, headerLen, true)
  view.setUint16(10, recordLen, true)

  let offset = 32
  for (const field of fields) {
    const nameBytes = encoder.encode(field.padEnd(11, '\x00'))
    new Uint8Array(buffer).set(nameBytes, offset)
    view.setUint8(offset + 11, 0x43)
    view.setUint8(offset + 16, 1)
    view.setUint8(offset + 17, 0)
    offset += 32
  }
  view.setUint8(offset, 0x0D)

  offset = headerLen
  for (const record of records) {
    view.setUint8(offset, 0x20)
    offset++
    for (const field of fields) {
      view.setUint8(offset, (record[field] || ' ').charCodeAt(0))
      offset++
    }
  }

  return buffer
}

describe('parseDbf', () => {
  it('parses header fields correctly', () => {
    const buf = makeMinimalDbf([{ X: 'A' }, { X: 'B' }])
    const result = parseDbf(buf)
    expect(result.schema.recordCount).toBe(2)
    expect(result.schema.fields).toHaveLength(1)
    expect(result.schema.fields[0].name).toBe('X')
    expect(result.schema.fields[0].type).toBe('C')
  })

  it('parses records', () => {
    const buf = makeMinimalDbf([{ X: 'A' }, { X: 'B' }, { X: 'C' }])
    const result = parseDbf(buf)
    expect(result.records).toHaveLength(3)
    expect(result.records[0]).toEqual({ X: 'A' })
    expect(result.records[1]).toEqual({ X: 'B' })
  })

  it('parses multiple fields per record', () => {
    const buf = makeMinimalDbf([
      { NAME: 'J', AGE: '3' },
      { NAME: 'M', AGE: '5' },
    ])
    const result = parseDbf(buf)
    expect(result.schema.fields).toHaveLength(2)
    expect(result.records[0]).toEqual({ NAME: 'J', AGE: '3' })
  })

  it('skips deleted records (0x2A flag)', () => {
    const records = [{ X: 'A' }, { X: 'B' }, { X: 'C' }]
    const fields = ['X']
    const headerLen = 32 + (1 * 32) + 1
    const recordLen = 2
    const buf = new ArrayBuffer(headerLen + (3 * recordLen))
    const view = new DataView(buf)
    const encoder = new TextEncoder()

    view.setUint8(0, 0x03)
    view.setUint8(1, 126); view.setUint8(2, 6); view.setUint8(3, 29)
    view.setUint32(4, 3, true)
    view.setUint16(8, headerLen, true)
    view.setUint16(10, recordLen, true)

    const nameBytes = encoder.encode('X'.padEnd(11, '\x00'))
    new Uint8Array(buf).set(nameBytes, 32)
    view.setUint8(32 + 11, 0x43); view.setUint8(32 + 16, 1); view.setUint8(32 + 17, 0)
    view.setUint8(64, 0x0D)

    view.setUint8(65, 0x20); view.setUint8(66, 0x41)
    view.setUint8(67, 0x2A); view.setUint8(68, 0x42)
    view.setUint8(69, 0x20); view.setUint8(70, 0x43)

    const result = parseDbf(buf)
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toEqual({ X: 'A' })
    expect(result.records[1]).toEqual({ X: 'C' })
  })

  it('trims whitespace from field values', () => {
    const fields = ['X']
    const headerLen = 32 + (1 * 32) + 1
    const recordLen = 4
    const buf = new ArrayBuffer(headerLen + (1 * recordLen))
    const view = new DataView(buf)
    const encoder = new TextEncoder()

    view.setUint8(0, 0x03)
    view.setUint8(1, 126); view.setUint8(2, 6); view.setUint8(3, 29)
    view.setUint32(4, 1, true)
    view.setUint16(8, headerLen, true)
    view.setUint16(10, recordLen, true)

    const nameBytes = encoder.encode('X'.padEnd(11, '\x00'))
    new Uint8Array(buf).set(nameBytes, 32)
    view.setUint8(32 + 11, 0x43); view.setUint8(32 + 16, 3); view.setUint8(32 + 17, 0)
    view.setUint8(64, 0x0D)

    view.setUint8(65, 0x20)
    view.setUint8(66, 0x41); view.setUint8(67, 0x20); view.setUint8(68, 0x20)

    const result = parseDbf(buf)
    expect(result.records[0]).toEqual({ X: 'A' })
  })

  it('throws DbfParseError on invalid header', () => {
    const buf = new ArrayBuffer(10)
    new Uint8Array(buf).fill(0xFF)
    expect(() => parseDbf(buf)).toThrow(DbfParseError)
  })

  it('throws DbfParseError on empty file', () => {
    expect(() => parseDbf(new ArrayBuffer(0))).toThrow(DbfParseError)
  })
})

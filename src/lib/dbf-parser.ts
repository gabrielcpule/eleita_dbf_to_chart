import type { DbfField, ParsedDbf, SurveyRecord } from './types'

export class DbfParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DbfParseError'
  }
}

const VALID_VERSIONS = new Set([0x02, 0x03, 0x04, 0x30, 0x43, 0x83, 0x8B])

export function parseDbf(buffer: ArrayBuffer): ParsedDbf {
  if (buffer.byteLength < 32) {
    throw new DbfParseError('File is too small to be a valid DBF.')
  }

  const view = new DataView(buffer)
  const version = view.getUint8(0)

  if (!VALID_VERSIONS.has(version)) {
    throw new DbfParseError(
      `Unsupported DBF version: ${version}. Expected dBASE III+ (0x03) or compatible.`
    )
  }

  const year = view.getUint8(1) + 1900
  const month = view.getUint8(2)
  const day = view.getUint8(3)
  const recordCount = view.getUint32(4, true)
  const headerLength = view.getUint16(8, true)
  const recordLength = view.getUint16(10, true)

  if (recordCount === 0) {
    return {
      schema: { fields: [], recordCount: 0, lastUpdate: new Date(year, month - 1, day) },
      records: [],
    }
  }

  if (headerLength < 33 || headerLength > buffer.byteLength) {
    throw new DbfParseError('Invalid header length in DBF file.')
  }

  const fields: DbfField[] = []
  let offset = 32

  while (offset < headerLength - 1) {
    const terminator = view.getUint8(offset)
    if (terminator === 0x0D) break

    const nameBytes = new Uint8Array(buffer, offset, 11)
    let nameEnd = 0
    while (nameEnd < 11 && nameBytes[nameEnd] !== 0x00) nameEnd++
    const name = new TextDecoder().decode(nameBytes.slice(0, nameEnd)).trim()

    const fieldType = String.fromCharCode(view.getUint8(offset + 11))
    const fieldLength = view.getUint8(offset + 16)
    const decimals = view.getUint8(offset + 17)

    if (name) {
      fields.push({ name, type: fieldType, length: fieldLength, decimals })
    }
    offset += 32
  }

  const records: SurveyRecord[] = []
  const decoder = new TextDecoder()

  for (let i = 0; i < recordCount; i++) {
    const recordOffset = headerLength + (i * recordLength)
    if (recordOffset + recordLength > buffer.byteLength) break

    const deletionFlag = view.getUint8(recordOffset)
    if (deletionFlag === 0x2A) continue

    const record: SurveyRecord = {}
    let fieldOffset = recordOffset + 1

    for (const field of fields) {
      const bytes = new Uint8Array(buffer, fieldOffset, field.length)
      const value = decoder.decode(bytes).trim()
      record[field.name] = value
      fieldOffset += field.length
    }
    records.push(record)
  }

  return {
    schema: {
      fields,
      recordCount: records.length,
      lastUpdate: new Date(year, month - 1, day),
    },
    records,
  }
}

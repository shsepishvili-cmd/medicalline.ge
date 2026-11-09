import 'server-only'
import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Product photos uploaded from the admin panel. Kept in one public bucket;
// the name predates the main-catalogue use and is kept so existing links work.
export const PRODUCT_PHOTO_BUCKET = 'expo-products'
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Checks the file really is the image type it claims, by its first bytes.
function matchesSignature(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  return false
}

export type CheckedPhoto = { bytes: Uint8Array; type: string; extension: string }

// Returns the photo or a Georgian error message with its HTTP status.
export async function checkPhoto(photo: FormDataEntryValue | null): Promise<CheckedPhoto | { error: string; status: number }> {
  if (!(photo instanceof File) || !photo.size) return { error: 'დაამატეთ ფოტო.', status: 400 }
  if (photo.size > MAX_PHOTO_BYTES) return { error: 'ფოტო 4 MB-ზე დიდია.', status: 413 }
  const extension = TYPES[photo.type]
  const bytes = new Uint8Array(await photo.arrayBuffer())
  if (!extension || !matchesSignature(bytes, photo.type)) return { error: 'ფოტო უნდა იყოს JPG, PNG ან WEBP.', status: 415 }
  return { bytes, type: photo.type, extension }
}

async function ensureBucket(service: SupabaseClient) {
  const { data } = await service.storage.getBucket(PRODUCT_PHOTO_BUCKET)
  if (data) return
  const { error } = await service.storage.createBucket(PRODUCT_PHOTO_BUCKET, { public: true, fileSizeLimit: MAX_PHOTO_BYTES, allowedMimeTypes: Object.keys(TYPES) })
  if (error && !/already exists/i.test(error.message)) throw new Error(`bucket: ${error.message}`)
}

// Uploads under a new, unguessable name (never overwrites), returns the
// public URL and the storage path for cleanup.
export async function uploadProductPhoto(service: SupabaseClient, photo: CheckedPhoto, nameHint: string) {
  await ensureBucket(service)
  const base = nameHint.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'product'
  const path = `${new Date().toISOString().slice(0, 10)}/${base}-${randomBytes(4).toString('hex')}.${photo.extension}`
  const upload = await service.storage.from(PRODUCT_PHOTO_BUCKET).upload(path, photo.bytes, { contentType: photo.type, upsert: false, cacheControl: '31536000' })
  if (upload.error) throw new Error(`upload: ${upload.error.message}`)
  return { path, url: service.storage.from(PRODUCT_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl }
}

import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'text/csv': [],
  'application/json': [],
  'text/plain': [],
}

const MAX_BYTES: Record<string, number> = {
  avatars: 2 * 1024 * 1024,
  'list-files': 10 * 1024 * 1024,
}

function matchesMagic(bytes: Uint8Array, mime: string): boolean {
  const signatures = ALLOWED[mime]
  if (!signatures) return false
  if (signatures.length === 0) {
    const sample = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 512))
    if (sample.includes('\u0000')) return false
    if (mime === 'application/json') {
      try {
        JSON.parse(new TextDecoder().decode(bytes))
        return true
      } catch {
        return false
      }
    }
    return true
  }
  return signatures.some((sig) => sig.every((b, i) => bytes[i] === b))
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  let body: { bucket?: string; path?: string; mime?: string; size?: number; listId?: string; originalName?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 })
  }

  const bucket = body.bucket ?? ''
  const path = body.path ?? ''
  const mime = body.mime ?? ''
  const size = body.size ?? 0
  const max = MAX_BYTES[bucket]

  if (!max || !ALLOWED[mime] || size <= 0 || size > max) {
    return new Response(JSON.stringify({ error: 'rejected', reason: 'type_or_size' }), { status: 400 })
  }

  if (!path.startsWith(`${user.id}/`)) {
    return new Response(JSON.stringify({ error: 'rejected', reason: 'path' }), { status: 403 })
  }

  const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(path)
  if (downloadError || !fileData) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer())
  if (bytes.byteLength !== size && Math.abs(bytes.byteLength - size) > 64) {
    await supabase.storage.from(bucket).remove([path])
    return new Response(JSON.stringify({ error: 'rejected', reason: 'size_mismatch' }), { status: 400 })
  }

  if (mime === 'image/webp') {
    const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    const webp = String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    if (!riff || !webp) {
      await supabase.storage.from(bucket).remove([path])
      await supabase.from('files').insert({
        owner_id: user.id,
        list_id: body.listId ?? null,
        bucket,
        path,
        mime_type: mime,
        size_bytes: bytes.byteLength,
        original_name: body.originalName ?? null,
        scan_status: 'rejected',
      })
      return new Response(JSON.stringify({ error: 'rejected', reason: 'magic' }), { status: 400 })
    }
  } else if (!matchesMagic(bytes, mime)) {
    await supabase.storage.from(bucket).remove([path])
    return new Response(JSON.stringify({ error: 'rejected', reason: 'magic' }), { status: 400 })
  }

  const { error: insertError } = await supabase.from('files').upsert(
    {
      owner_id: user.id,
      list_id: body.listId ?? null,
      bucket,
      path,
      mime_type: mime,
      size_bytes: bytes.byteLength,
      original_name: body.originalName ?? null,
      scan_status: 'clean',
    },
    { onConflict: 'bucket,path' },
  )

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, scan_status: 'clean' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

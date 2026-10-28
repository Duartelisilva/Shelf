// A stand-in for fetch that answers from a list of routes, so the lookup code
// can be tested without the internet.

export interface Reply {
  status?: number
  json?: unknown
  bytes?: Buffer
  type?: string // content type; images default to image/jpeg
}

export interface Route {
  match: string // a part of the address
  reply: Reply | (() => Reply)
}

export interface FakeFetch {
  fetchFn: typeof fetch
  calls: { url: string; headers: Record<string, string> }[]
}

export function fakeFetch(routes: Route[]): FakeFetch {
  const calls: FakeFetch['calls'] = []
  const fetchFn = (async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: init?.headers ?? {} })
    const route = routes.find((r) => url.includes(r.match))
    if (!route) throw new Error(`offline: ${url}`)
    const reply = typeof route.reply === 'function' ? route.reply() : route.reply
    const status = reply.status ?? 200
    return {
      ok: status < 400,
      status,
      json: async () => reply.json,
      arrayBuffer: async () => {
        const b = reply.bytes ?? Buffer.alloc(0)
        return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
      },
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-type' ? (reply.type ?? (reply.bytes ? 'image/jpeg' : 'application/json')) : null
      }
    } as unknown as Response
  }) as unknown as typeof fetch
  return { fetchFn, calls }
}

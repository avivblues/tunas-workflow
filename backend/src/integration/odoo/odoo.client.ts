interface OdooJsonRpcParams {
  url: string;
  database: string;
  username: string;
  apiKey: string;
  model: string;
  method: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
}

export async function odooJsonRpc<T>(params: OdooJsonRpcParams): Promise<T> {
  const endpoint = `${params.url.replace(/\/$/, '')}/jsonrpc`;

  const uid = await authenticate(params);
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'object',
      method: 'execute_kw',
      args: [
        params.database,
        uid,
        params.apiKey,
        params.model,
        params.method,
        params.args ?? [],
        params.kwargs ?? {},
      ],
    },
    id: Date.now(),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  const body = (await response.json()) as { result?: T; error?: { message?: string } };

  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? `Odoo request failed (${response.status})`);
  }

  return body.result as T;
}

async function authenticate(params: OdooJsonRpcParams): Promise<number> {
  const endpoint = `${params.url.replace(/\/$/, '')}/jsonrpc`;
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'common',
      method: 'authenticate',
      args: [params.database, params.username, params.apiKey, {}],
    },
    id: Date.now(),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  const body = (await response.json()) as { result?: number | false; error?: { message?: string } };

  if (!response.ok || body.error || body.result === false || typeof body.result !== 'number') {
    throw new Error(body.error?.message ?? 'Odoo authentication failed');
  }

  return body.result;
}

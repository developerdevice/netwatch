import { describe, expect, it } from 'vitest'

import { getApiClientConfig } from '@/lib/server/api-client/config'

describe('api client config', () => {
  it('usa valores padrao quando o ambiente nao esta preenchido', () => {
    expect(getApiClientConfig({} as NodeJS.ProcessEnv)).toEqual({
      driver: 'routerboard',
      enabled: false,
      timeoutMs: 10_000,
    })
  })

  it('normaliza os valores informados no ambiente', () => {
    expect(
      getApiClientConfig({
        NETWATCH_API_ENABLED: 'true',
        NETWATCH_API_TIMEOUT_MS: '2500',
      } as unknown as NodeJS.ProcessEnv)
    ).toEqual({
      driver: 'routerboard',
      enabled: true,
      timeoutMs: 2500,
    })
  })
})

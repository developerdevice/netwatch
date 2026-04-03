import 'server-only'

import { Device, Link, NetworkMap } from '@/lib/types'
import { ApiClient, ApiClientTopologySnapshot } from '@/lib/server/api-client/contracts'
import { ApiClientConfig } from '@/lib/server/api-client/config'
import { ApiClientNotConfiguredError } from '@/lib/server/api-client/errors'

export class RouterboardApiClient implements ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  async getTopologySnapshot(): Promise<ApiClientTopologySnapshot> {
    this.assertConfigured()

    throw new ApiClientNotConfiguredError(
      'A leitura de topologia via RouterBOARD ainda nao foi implementada.'
    )
  }

  async listMaps(): Promise<NetworkMap[]> {
    this.assertConfigured()

    throw new ApiClientNotConfiguredError(
      'A listagem de mapas via RouterBOARD ainda nao foi implementada.'
    )
  }

  async listDevices(): Promise<Device[]> {
    this.assertConfigured()

    throw new ApiClientNotConfiguredError(
      'A listagem de dispositivos via RouterBOARD ainda nao foi implementada.'
    )
  }

  async listLinks(): Promise<Link[]> {
    this.assertConfigured()

    throw new ApiClientNotConfiguredError(
      'A listagem de links via RouterBOARD ainda nao foi implementada.'
    )
  }

  private assertConfigured() {
    if (!this.config.enabled) {
      throw new ApiClientNotConfiguredError(
        'O apiClient SSR esta preparado, mas a integracao ainda nao foi habilitada via ambiente.'
      )
    }
  }
}

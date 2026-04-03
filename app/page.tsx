import { LoginScreen } from '@/components/netwatch/LoginScreen'
import { NetWatchApp } from '@/components/netwatch/NetWatchApp'
import { getCurrentServerSessionSummary } from '@/lib/server/auth/session'
import { loadStoredTopology } from '@/lib/server/map-repository/topology-repository'
import { listRegisteredServers } from '@/lib/server/server-registry/repository'
import { isServerRegistrySecretConfigured } from '@/lib/server/server-registry/secret'
import { StoreProvider } from '@/lib/store'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getCurrentServerSessionSummary()

  if (!session) {
    return (
      <LoginScreen
        initialServers={listRegisteredServers()}
        registrySecretRequired={isServerRegistrySecretConfigured()}
      />
    )
  }

  const { maps } = loadStoredTopology(session.serverId)

  return (
    <StoreProvider initialMaps={maps}>
      <NetWatchApp session={session} liveMonitoring />
    </StoreProvider>
  )
}

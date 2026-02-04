import { ConfidentialClientApplication } from '@azure/msal-node'
import { Client } from '@microsoft/microsoft-graph-client'
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client'

const MS_TENANT_ID = process.env.MS_TENANT_ID!
const MS_CLIENT_ID = process.env.MS_CLIENT_ID!
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET!

let msalApp: ConfidentialClientApplication | null = null
let graphClient: Client | null = null
let tokenCache: { token: string; expiresAt: number } | null = null

function getMsalApp(): ConfidentialClientApplication {
  if (!msalApp) {
    msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: MS_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${MS_TENANT_ID}`,
        clientSecret: MS_CLIENT_SECRET,
      },
    })
  }
  return msalApp
}

async function getAccessToken(): Promise<string> {
  // Check cache
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.token
  }

  const app = getMsalApp()
  const result = await app.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  })

  if (!result || !result.accessToken) {
    throw new Error('Failed to acquire access token')
  }

  // Cache token (expires in ~1 hour, cache for 50 minutes)
  tokenCache = {
    token: result.accessToken,
    expiresAt: Date.now() + 50 * 60 * 1000,
  }

  return result.accessToken
}

class CustomAuthenticationProvider implements AuthenticationProvider {
  async getAccessToken(): Promise<string> {
    return getAccessToken()
  }
}

export async function getGraphClient(): Promise<Client> {
  if (!graphClient) {
    const authProvider = new CustomAuthenticationProvider()
    graphClient = Client.initWithMiddleware({ authProvider })
  }
  return graphClient
}

export async function refreshGraphClient(): Promise<Client> {
  graphClient = null
  tokenCache = null
  return getGraphClient()
}

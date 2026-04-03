import 'server-only'

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = 'API_CLIENT_ERROR'
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export class ApiClientNotConfiguredError extends ApiClientError {
  constructor(message = 'O apiClient SSR ainda nao foi configurado.') {
    super(message, 501, 'API_CLIENT_NOT_CONFIGURED')
    this.name = 'ApiClientNotConfiguredError'
  }
}

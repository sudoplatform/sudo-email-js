import { SudoEmailClientOptions } from '../../../public/sudoEmailClient'
import { ApiClient } from './apiClient'
import { EmailServiceConfig, IdentityServiceConfig } from './config'

/**
 * Private DefaultSudoEmailClient for describing private options
 * for supporting unit testing.
 */
export type PrivateSudoEmailClientOptions = {
  apiClient?: ApiClient
  identityServiceConfig?: IdentityServiceConfig
  emailServiceConfig?: EmailServiceConfig
} & SudoEmailClientOptions

import { DefaultConfigurationManager } from '@sudoplatform/sudo-common'
import * as t from 'io-ts'

const IdentityServiceConfigCodec = t.strict({
  region: t.string,
  poolId: t.string,
  clientId: t.string,
  identityPoolId: t.string,
  apiUrl: t.string,
  apiKey: t.string,
  transientBucket: t.string,
  registrationMethods: t.array(t.string),
  bucket: t.string,
})

export type IdentityServiceConfig = t.TypeOf<typeof IdentityServiceConfigCodec>

export const getIdentityServiceConfig = (): IdentityServiceConfig => {
  return DefaultConfigurationManager.getInstance().bindConfigSet<IdentityServiceConfig>(
    IdentityServiceConfigCodec,
    'identityService',
  )
}

const EmailServiceConfigCodec = t.strict({
  apiUrl: t.string,
  region: t.string,
  bucket: t.string,
  transientBucket: t.string,
})

export type EmailServiceConfig = t.TypeOf<typeof EmailServiceConfigCodec>

export const getEmailServiceConfig = (): EmailServiceConfig => {
  return DefaultConfigurationManager.getInstance().bindConfigSet<EmailServiceConfig>(
    EmailServiceConfigCodec,
    'emService',
  )
}

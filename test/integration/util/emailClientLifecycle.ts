import { DefaultApiClientManager } from '@sudoplatform/sudo-api-client'
import {
  DefaultConfigurationManager,
  DefaultLogger,
  SudoCryptoProvider,
} from '@sudoplatform/sudo-common'
import {
  DefaultSudoEntitlementsClient,
  SudoEntitlementsClient,
} from '@sudoplatform/sudo-entitlements'
import { DefaultSudoEntitlementsAdminClient } from '@sudoplatform/sudo-entitlements-admin'
import {
  DefaultSudoProfilesClient,
  FetchOption,
  Sudo,
  SudoProfilesClient,
} from '@sudoplatform/sudo-profiles'
import {
  DefaultSudoUserClient,
  SudoUserClient,
  TESTAuthenticationProvider,
} from '@sudoplatform/sudo-user'
import { WebSudoCryptoProvider } from '@sudoplatform/sudo-web-crypto-provider'
import * as fs from 'fs'
import { v4 } from 'uuid'
import {
  AddressNotFoundError,
  DefaultSudoEmailClient,
  EmailAddress,
  SudoEmailClient,
} from '../../../src'
import { ApiClient } from '../../../src/private/data/common/apiClient'
import { PrivateSudoEmailClientOptions } from '../../../src/private/data/common/privateSudoEmailClientOptions'
import { EntitlementsBuilder } from '../util/entitlements'
import { createSudo } from './createSudo'

// [START] - Polyfills
global.fetch = require('node-fetch')
require('isomorphic-fetch')
global.crypto = require('isomorphic-webcrypto')
// [END] - Polyfills

export const sudoIssuer = 'sudoplatform.sudoservice'

const configFile = 'config/sudoplatformconfig.json'
const registerKeyFile = 'config/register_key.private'
const registerKeyIdFile = 'config/register_key.id'
const registerKey = fs.readFileSync(registerKeyFile).toString()
const registerKeyId = fs.readFileSync(registerKeyIdFile).toString().trim()

const adminApiKeyFile = 'config/admin_api_key.secret'
let adminApiKey: string | undefined
if (fs.existsSync(adminApiKeyFile)) {
  adminApiKey = fs.readFileSync(adminApiKeyFile).toString().trim()
} else {
  adminApiKey = process.env.ADMIN_API_KEY?.trim()
}

const testAuthenticationProvider = new TESTAuthenticationProvider(
  'email-js-test',
  registerKey,
  registerKeyId,
  { 'custom:entitlementsSet': 'email-integration-test' },
)

interface SetupEmailClientOutput {
  sudo: Sudo
  ownershipProofToken: string
  emailClient: SudoEmailClient
  userClient: SudoUserClient
  entitlementsClient: SudoEntitlementsClient
  profilesClient: SudoProfilesClient
  cryptoProvider: SudoCryptoProvider
}

export const setupEmailClient = async (
  log: DefaultLogger,
): Promise<SetupEmailClientOutput> => {
  try {
    if (!adminApiKey) {
      throw new Error('ADMIN_API_KEY must be set')
    }

    DefaultConfigurationManager.getInstance().setConfig(
      fs.readFileSync(configFile).toString(),
    )
    const userClient = new DefaultSudoUserClient({ logger: log })
    const username = await userClient.registerWithAuthenticationProvider(
      testAuthenticationProvider,
      `email-JS-SDK-${v4()}`,
    )
    log.debug('username', { username })
    await userClient.signInWithKey()
    const apiClientManager =
      DefaultApiClientManager.getInstance().setAuthClient(userClient)
    const entitlementsClient = new DefaultSudoEntitlementsClient(userClient)
    const entitlementsAdminClient = new DefaultSudoEntitlementsAdminClient(
      adminApiKey,
    )
    await new EntitlementsBuilder()
      .setEntitlementsClient(entitlementsClient)
      .setEntitlementsAdminClient(entitlementsAdminClient)
      .setLogger(log)
      .apply()
    const profilesClient = new DefaultSudoProfilesClient({
      sudoUserClient: userClient,
    })
    await profilesClient.pushSymmetricKey(
      'emailIntegrationTest',
      '01234567890123456789',
    )
    const { sudo, ownershipProofToken } = await createSudo(
      'emailIntegrationTest',
      profilesClient,
    )
    const cryptoProvider = new WebSudoCryptoProvider(
      'SudoEmailClient',
      'com.sudoplatform.appservicename',
    )
    const apiClient = new ApiClient(apiClientManager)
    const options: PrivateSudoEmailClientOptions = {
      sudoUserClient: userClient,
      sudoProfilesClient: profilesClient,
      sudoCryptoProvider: cryptoProvider,
      apiClient,
    }
    const emailClient = new DefaultSudoEmailClient(options)
    await emailClient.reset()
    return {
      ownershipProofToken,
      emailClient,
      userClient,
      entitlementsClient,
      profilesClient,
      sudo,
      cryptoProvider,
    }
  } catch (err) {
    log.error(`${setupEmailClient.name} FAILED`)
    throw err
  }
}

export const teardown = async (
  props: { emailAddresses: EmailAddress[]; sudos: Sudo[] },
  clients: { emailClient: SudoEmailClient; profilesClient: SudoProfilesClient },
): Promise<void> => {
  await Promise.all(
    props.emailAddresses.map(
      async (a) =>
        await clients.emailClient.deprovisionEmailAddress(a.id).catch((err) => {
          if (err instanceof AddressNotFoundError) {
            return
          }
          throw err
        }),
    ),
  )
  // This needs to be done due to a bug in profiles client to hydrate cache.
  await clients.profilesClient?.listSudos(FetchOption.RemoteOnly)
  await Promise.all(
    props.sudos.map((s) =>
      clients.profilesClient
        ?.deleteSudo(s)
        ?.catch((err) =>
          console.log(`Error deleting Sudo ${s.id}: ${err.message}`),
        ),
    ),
  )
}

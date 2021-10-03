import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import waitForExpect from 'wait-for-expect'

export const emailStorageMaxPerEmailAddressEntitlement =
  'sudoplatform.email.emailStorageMaxPerEmailAddress'

export const emailAddressMaxPerSudoEntitlement =
  'sudoplatform.email.emailAddressMaxPerSudo'

export const emailAddressUserEntitledEntitlement =
  'sudoplatform.email.emailAddressUserEntitled'

export const emailMessageSendUserEntitledEntitlement =
  'sudoplatform.email.emailMessageSendUserEntitled'

export const emailMessageReceiveUserEntitledEntitlement =
  'sudoplatform.email.emailMessageReceiveUserEntitled'

export class EntitlementsBuilder {
  private entitlementsClient?: SudoEntitlementsClient
  private log: Logger = new DefaultLogger(this.constructor.name)

  setEntitlementsClient(
    entitlementsClient: SudoEntitlementsClient,
  ): EntitlementsBuilder {
    this.entitlementsClient = entitlementsClient
    return this
  }

  setLogger(log: Logger): EntitlementsBuilder {
    this.log = log
    return this
  }

  async apply(): Promise<void> {
    if (!this.entitlementsClient) {
      throw 'Entitlements client not set'
    }
    const redeemedEntitlements =
      await this.entitlementsClient.redeemEntitlements()
    this.log?.debug('redeemed entitlements', { redeemedEntitlements })
    this.log?.debug('redeemed entitlements details', {
      redeemedDetails: redeemedEntitlements.entitlements,
    })
    await waitForExpect(
      async () => {
        const emailEntitlements =
          await this.entitlementsClient?.getEntitlements()
        const emailUserEntitled = emailEntitlements?.entitlements.find(
          (e) => e.name === 'sudoplatform.email.emailAddressUserEntitled',
        )
        expect(emailUserEntitled?.value).toBeGreaterThanOrEqual(1)
      },
      30000,
      1000,
    )
  }
}

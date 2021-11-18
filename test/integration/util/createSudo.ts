import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import waitForExpect from 'wait-for-expect'

const emailAudience = 'sudoplatform.email.email-address'

export const createSudo = async (
  name: string,
  profilesClient: SudoProfilesClient,
): Promise<{ sudo: Sudo; ownershipProofToken: string }> => {
  let sudo: Sudo | undefined

  // We retry this to give time for entitlements to be able to be
  // checked eventually consistently
  await waitForExpect(
    async () => {
      sudo = await profilesClient.createSudo(new Sudo(name))
      expect(sudo.id).toBeTruthy()
    },
    5000,
    500,
  )

  if (!sudo?.id) {
    throw new Error('Failed to create sudo with id')
  }

  const ownershipProofToken = await profilesClient
    .getOwnershipProof(sudo.id, emailAudience)
    .catch((err) => {
      console.log('Error getting ownership proof', { err })
      throw err
    })

  return { sudo, ownershipProofToken }
}

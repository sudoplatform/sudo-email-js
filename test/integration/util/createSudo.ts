import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'

const emailAudience = 'sudoplatform.email.email-address'

export const createSudo = async (
  name: string,
  profilesClient: SudoProfilesClient,
): Promise<{ sudo: Sudo; ownershipProofToken: string }> => {
  const sudo = await profilesClient.createSudo(new Sudo(name))
  if (!sudo.id) {
    throw new Error('Failed to create sudo with id')
  }
  const ownershipProofToken = await profilesClient.getOwnershipProof(
    sudo.id,
    emailAudience,
  )
  return { sudo, ownershipProofToken }
}

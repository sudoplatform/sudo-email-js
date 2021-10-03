/**
 * Core entity representation of an email address business rule. Depicts the information related to an email address resource.
 *
 * @interface EmailAddressEntity
 * @property {string} emailAddress The fully structured email address (i.e. `example@sudoplatform.com`)
 * @property {string} displayName The display name (or personal name) of the email address.
 * @property {string} alias An alias for the email address.
 */
export interface EmailAddressEntity {
  emailAddress: string
  displayName?: string
  alias?: string
}

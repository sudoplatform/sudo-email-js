/**
 * Core entity representation of a draft email message metadata.
 *
 * @interface DraftEmailMessageDraftEntity
 * @property {string} id The unique ID of the draft email message
 * @property {Date} updatedAt The time at which the draft was last updated.
 */
export interface DraftEmailMessageMetadataEntity {
  id: string
  updatedAt: Date
}

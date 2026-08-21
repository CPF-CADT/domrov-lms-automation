export enum ResourceType {
  FILE = 'FILE',       // generic file
  URL = 'URL',         // external URL
  VIDEO = 'VIDEO',     // video file
  IMAGE = 'IMAGE',     // image file
  DOCUMENT = 'DOCUMENT', // pdf, word, text docs
  TEXT = 'TEXT',       // plain text
  OTHER = 'OTHER',     // fallback for unknown types
}
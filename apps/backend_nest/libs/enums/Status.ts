export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
}
export enum ClassStatus {
  BEING_START ='BEING_START',
  ACTIVE = 'ACTIVE',
  END = 'END',
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
  RESUBMITTED = 'RESUBMITTED',
  LATE = 'LATE',
}
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
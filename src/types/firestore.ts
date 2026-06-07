export interface UserData {
  uid: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  latestTestScore?: string;
  latestTestStatus?: string;
  lastTestDate?: Date;
}

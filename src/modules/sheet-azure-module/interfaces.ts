export interface databaseGetResponse {
  id: number;
  userEmail: string;
  refreshToken: string;
  accessToken: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface databaseUpsertInput {
  userEmail: string;
  refreshToken: string;
  accessToken: string;
}

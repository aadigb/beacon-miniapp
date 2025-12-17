export type Question = {
  id: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  votes: number;
  voters: string[]; // wallet addresses
};

export type Participant = {
  id: number;
  name: string;
  costumeName: string;
  description?: string;
  photoUrl?: string;
  active: boolean;
  createdAt: string;
};

export type EventSettings = {
  id: number;
  eventName: string;
  title: string;
  description?: string;
  eventDate?: string;
  eventTime?: string;
  votingEndTime?: string;
  timezone: string;
  votingOpen: boolean;
  registrationOpen: boolean;
  resultsPublic: boolean;
  votingStatus: string;
  showPublicResults: boolean;
  votingStart?: string;
  votingEnd?: string;
  canAcceptVotes: boolean;
  publicVotingUrl: string;
  votingAvailability: string;
};

export type RankingItem = {
  participantId: number;
  participantName: string;
  costumeName: string;
  description?: string;
  photoUrl?: string;
  votes: number;
  percentage: number;
};

export type Results = {
  votingOpen: boolean;
  resultsPublic: boolean;
  tie: boolean;
  totalVotes: number;
  ranking: RankingItem[];
  winners: RankingItem[];
};

export type Dashboard = {
  participants: number;
  votes: number;
  availableCodes: number;
  usedCodes: number;
  status: string;
  settings: EventSettings;
  results: Results;
};

export type VoteCode = {
  id: number;
  code: string;
  used: boolean;
  createdAt: string;
  usedAt?: string;
};

export type LoginResponse = {
  token: string;
  name: string;
  email: string;
};

export type BootstrapStatus = {
  available: boolean;
};

export type VoteListItem = {
  id: number;
  participantName: string;
  costumeName: string;
  code: string;
  createdAt: string;
};

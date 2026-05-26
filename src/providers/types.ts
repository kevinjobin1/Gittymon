/* ------------------------------------------------------------------ */
/*  Provider Abstraction — shared types & interface                   */
/* ------------------------------------------------------------------ */

export type GitProvider = 'github' | 'gitlab';

export interface ProviderProfileData {
  name: string;
  publicRepos: number;
  followers: number;
  location: string;
  joinedYear: string;
  bio: string;
  avatarUrl: string;
  provider: GitProvider;
  /** Whether the data fell back to defaults because the API call failed */
  fromFallback: boolean;
  /** Optional human-readable warning about the data source */
  warning?: string;
}

export interface IProfileProvider {
  readonly provider: GitProvider;

  /** Fetch profile data from the provider's API */
  fetchProfile(username: string, apiKey?: string): Promise<ProviderProfileData>;

  /** Get avatar URL (from profile or generated fallback) */
  getAvatarUrl(username: string, profileData?: ProviderProfileData): string;

  /** Sanitize username according to provider's allowed charset */
  sanitizeUsername(username: string): string;

  /** Parse a user input string to extract username + detect provider */
  parseUsername(input: string): { username: string; provider: GitProvider } | null;
}

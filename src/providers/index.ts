/* ------------------------------------------------------------------ */
/*  Provider Registry — factory, auto-detect, barrel exports          */
/* ------------------------------------------------------------------ */

export type { GitProvider, ProviderProfileData, IProfileProvider } from './types';
export { GitHubProvider } from './github';
export { GitLabProvider } from './gitlab';

import type { GitProvider, IProfileProvider } from './types';
import { GitHubProvider } from './github';
import { GitLabProvider } from './gitlab';

/** Return the provider instance for a given type. */
export function getProvider(type: GitProvider): IProfileProvider {
  switch (type) {
    case 'github':
      return new GitHubProvider();
    case 'gitlab':
      return new GitLabProvider();
  }
}

/**
 * Auto-detect the provider from a raw user input string.
 *
 * Detection priority:
 * 1. If input contains "gitlab.com" → GitLab
 * 2. If input contains "github.com" → GitHub
 * 3. If username contains characters invalid for GitHub (dots, underscores) → GitLab
 * 4. Default → GitHub (backward compatible)
 */
export function detectProvider(input: string): IProfileProvider {
  const trimmed = input.trim();

  if (/gitlab\.com/i.test(trimmed)) {
    return new GitLabProvider();
  }

  if (/github\.com/i.test(trimmed)) {
    return new GitHubProvider();
  }

  // Strip leading @ if present
  const raw = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  // GitLab allows dots and underscores — if present, it must be GitLab
  if (/[._]/.test(raw)) {
    return new GitLabProvider();
  }

  // Default to GitHub
  return new GitHubProvider();
}

/**
 * Parse a user input string and return both the cleaned username and detected provider.
 * Returns null if the input is invalid.
 */
export function parseProviderInput(
  input: string,
): { username: string; provider: IProfileProvider } | null {
  const provider = detectProvider(input);
  const result = provider.parseUsername(input);
  if (!result) return null;
  return { username: result.username, provider: getProvider(result.provider) };
}

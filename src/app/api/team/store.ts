export type TeamRole = 'admin' | 'developer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  addedAt: string;
}

function seedTeam(): TeamMember[] {
  return [
    {
      id: 'member-1',
      name: 'Alice Admin',
      email: 'alice@muxprotocol.com',
      role: 'admin',
      addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'member-2',
      name: 'Bob Dev',
      email: 'bob@muxprotocol.com',
      role: 'developer',
      addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// In-memory mock store for local dev / CI (never used in production).
export const mockTeam: TeamMember[] = seedTeam();

/** Reset the mock store to its seed state. Intended for tests. */
export function resetMockTeam(): void {
  mockTeam.length = 0;
  mockTeam.push(...seedTeam());
}

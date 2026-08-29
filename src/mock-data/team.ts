/**
 * Local/dev-only mock store for team members.
 *
 * `src/app/api/team/route.ts` only reads from this store as a fallback when
 * no backend URL (`NEXT_PUBLIC_API_URL`/legacy aliases) is configured, so
 * local dev/CI keeps working without a running API server. In any
 * environment with a backend configured, list/add/remove are served by the
 * real mux-backend API instead. No custody secrets live here — only
 * name/email/role.
 */
import type { TeamMember } from "@/types/team";

export const mockTeamMembers: TeamMember[] = [
	{
		id: "member-1",
		name: "Ada Lovelace",
		email: "ada@example.com",
		role: "admin",
		addedAt: "2024-01-10T09:00:00Z",
	},
	{
		id: "member-2",
		name: "Grace Hopper",
		email: "grace@example.com",
		role: "developer",
		addedAt: "2024-02-02T12:00:00Z",
	},
];

let inMemoryStore: TeamMember[] | null = null;

function loadStore(): TeamMember[] {
	if (typeof window !== "undefined" && window.localStorage) {
		const raw = window.localStorage.getItem("mockTeamMembers");
		if (raw) return JSON.parse(raw) as TeamMember[];
		window.localStorage.setItem(
			"mockTeamMembers",
			JSON.stringify(mockTeamMembers),
		);
		return mockTeamMembers.slice();
	}
	if (!inMemoryStore) inMemoryStore = mockTeamMembers.slice();
	return inMemoryStore;
}

function saveStore(store: TeamMember[]) {
	if (typeof window !== "undefined" && window.localStorage) {
		window.localStorage.setItem("mockTeamMembers", JSON.stringify(store));
	} else {
		inMemoryStore = store;
	}
}

export function getTeamMembers(): TeamMember[] {
	return loadStore().slice();
}

export function addTeamMember(
	name: string,
	email: string,
	role: TeamMember["role"],
): TeamMember {
	const member: TeamMember = {
		id: `member-${Date.now()}`,
		name: name.trim(),
		email: email.trim(),
		role,
		addedAt: new Date().toISOString(),
	};
	const store = loadStore();
	saveStore([member, ...store]);
	return member;
}

export function removeTeamMember(id: string): boolean {
	const store = loadStore();
	const next = store.filter((member) => member.id !== id);
	if (next.length === store.length) return false;
	saveStore(next);
	return true;
}

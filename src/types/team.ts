/**
 * A member of the current project's team. `role` gates team-management
 * actions in the settings UI: only "admin" can add/remove members.
 */
export interface TeamMember {
	id: string;
	name: string;
	email: string;
	role: "admin" | "developer";
	addedAt: string;
}

/**
 * Anti-enumeration copy for the login flow.
 *
 * Login failures must not reveal whether an account exists. Unknown email,
 * wrong password, locked or unverified accounts all map to the same generic
 * message; only transport/availability failures get distinct copy.
 */
export const LOGIN_GENERIC_ERROR =
	"Invalid email or password. Please try again.";

export const LOGIN_RATE_LIMITED_ERROR =
	"Too many sign-in attempts. Please wait a moment and try again.";

export const LOGIN_UNAVAILABLE_ERROR =
	"Sign-in is temporarily unavailable. Please try again later.";

export function getLoginErrorMessage(status: number | undefined): string {
	if (status === 429) return LOGIN_RATE_LIMITED_ERROR;
	if (status === undefined || status >= 500) return LOGIN_UNAVAILABLE_ERROR;
	// 400/401/403/404/423 etc. are deliberately indistinguishable.
	return LOGIN_GENERIC_ERROR;
}

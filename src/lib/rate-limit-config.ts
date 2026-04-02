/** Duration (in seconds) for the login rate-limit window. */
export const LOGIN_LIMIT_DURATION = 15 * 60;

/** Maximum login attempts allowed per IP within the window. */
export const LOGIN_LIMIT_POINTS = 5;

/** Duration (in seconds) for the registration rate-limit window. */
export const REGISTER_LIMIT_DURATION = 60 * 60;

/** Maximum registrations allowed per IP within the window. */
export const REGISTER_LIMIT_POINTS = 3;

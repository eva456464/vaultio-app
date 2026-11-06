import { requestOrigin } from "../invites";

/** The redirect URL registered with the WordPress.com app (always on the main app address). */
export const wpcomRedirectUri = async () => `${(process.env.APP_URL || (await requestOrigin())).replace(/\/$/, "")}/api/integrations/wordpress-com/callback`;

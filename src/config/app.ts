import type { Icon } from "@phosphor-icons/react";
import { HandHeartIcon } from "@phosphor-icons/react";
import {
  bottomMenuItems,
  type MenuGroup,
  type MenuItem,
  mainMenuItems,
} from "@/lib/sidebar-items";

/**
 * The single place to rebrand the app.
 *
 * `appConfig` is consumed by the sidebar (logo + name + nav), the root
 * document head (title), the theme provider, and the auth pages (brand
 * header). Change the brand here and it propagates everywhere — no other file
 * should hardcode the product name or logo.
 */
export interface AppConfig {
  /** Product name shown in the sidebar, document title, and auth header. */
  name: string;
  /** One-line description used for the default `<meta name="description">`. */
  description: string;
  /** Brand mark — any Phosphor icon component. */
  logo: Icon;
  /** Navigation source for the sidebar (main groups + footer items). */
  nav: {
    main: MenuGroup[];
    bottom: MenuItem[];
  };
  /** Theme defaults handed to `next-themes`. */
  theme: {
    defaultTheme: "light" | "dark" | "system";
    enableSystem: boolean;
  };
}

export const appConfig: AppConfig = {
  name: "OKU Jobs Selangor",
  description:
    "OKU data analytics dashboard for job opportunities in Selangor — profiles, employment, labour market, job matching and skill gaps.",
  logo: HandHeartIcon,
  nav: {
    main: mainMenuItems,
    bottom: bottomMenuItems,
  },
  theme: {
    defaultTheme: "system",
    enableSystem: true,
  },
};

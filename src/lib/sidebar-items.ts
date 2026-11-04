import type { Icon } from "@phosphor-icons/react";

import {
  BriefcaseIcon,
  ChartLineUpIcon,
  GaugeIcon,
  GearIcon,
  IdentificationCardIcon,
  ListChecksIcon,
  MagicWandIcon,
  PuzzlePieceIcon,
} from "@phosphor-icons/react";

export interface MenuItem {
  label: string;
  href: string;
  icon: Icon;
}

export interface MenuGroup {
  groupLabel?: string;
  items: MenuItem[];
}

export const mainMenuItems: MenuGroup[] = [
  {
    items: [{ label: "Overview", href: "/", icon: GaugeIcon }],
  },
  {
    groupLabel: "OKU population",
    items: [
      {
        label: "OKU Profiles",
        href: "/profiles",
        icon: IdentificationCardIcon,
      },
      {
        label: "Employment Statistics",
        href: "/employment",
        icon: BriefcaseIcon,
      },
    ],
  },
  {
    groupLabel: "Labour market",
    items: [
      {
        label: "Labour Market Insights",
        href: "/labour-market",
        icon: ChartLineUpIcon,
      },
      { label: "Job Postings", href: "/jobs", icon: ListChecksIcon },
    ],
  },
  {
    groupLabel: "Matching",
    items: [
      {
        label: "Job Recommendations",
        href: "/recommendations",
        icon: MagicWandIcon,
      },
      {
        label: "Skill-Gap Analytics",
        href: "/skill-gap",
        icon: PuzzlePieceIcon,
      },
      // create-resource:anchor (keep this line — generated resources are inserted above)
    ],
  },
];

export const bottomMenuItems: MenuItem[] = [
  { label: "Settings", href: "/settings", icon: GearIcon },
];

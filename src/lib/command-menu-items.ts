import {
  BriefcaseIcon,
  ChartLineUpIcon,
  GaugeIcon,
  IdentificationCardIcon,
  ListChecksIcon,
  MagicWandIcon,
  MoonIcon,
  PuzzlePieceIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";

export type CommandMenuIcon = ComponentType<{
  size?: number;
  className?: string;
}>;

export type CommandMenuShortcut = {
  keys: string[];
  label: string;
};

export interface CommandMenuItemConfig {
  key: string;
  label: string;
  description?: string;
  icon: CommandMenuIcon;
  href?: string;
  action?: "toggleTheme";
  shortcut?: CommandMenuShortcut;
  tone?: "danger";
}

export interface CommandMenuGroupConfig {
  key: string;
  label: string;
  items: CommandMenuItemConfig[];
}

export const commandMenuGroups: CommandMenuGroupConfig[] = [
  {
    key: "modules",
    label: "Modules",
    items: [
      { key: "overview", label: "Overview", icon: GaugeIcon, href: "/" },
      {
        key: "profiles",
        label: "OKU Profiles",
        description: "Disability, age, gender by district",
        icon: IdentificationCardIcon,
        href: "/profiles",
      },
      {
        key: "employment",
        label: "Employment Statistics",
        description: "Employment rates of working-age OKU",
        icon: BriefcaseIcon,
        href: "/employment",
      },
      {
        key: "labour-market",
        label: "Labour Market Insights",
        description: "Industries, districts and skills in demand",
        icon: ChartLineUpIcon,
        href: "/labour-market",
      },
      {
        key: "jobs",
        label: "Job Postings",
        description: "Add or edit vacancies",
        icon: ListChecksIcon,
        href: "/jobs",
      },
      {
        key: "recommendations",
        label: "Job Recommendations",
        description: "TF-IDF job matching for a job-seeker",
        icon: MagicWandIcon,
        href: "/recommendations",
      },
      {
        key: "skill-gap",
        label: "Skill-Gap Analytics",
        description: "Demand vs supply of skills",
        icon: PuzzlePieceIcon,
        href: "/skill-gap",
      },
    ],
  },
  {
    key: "account",
    label: "Account",
    items: [
      {
        key: "settings",
        label: "Settings",
        description: "Profile and sign out",
        icon: UserIcon,
        href: "/settings",
      },
    ],
  },
  {
    key: "preferences",
    label: "Preferences",
    items: [
      {
        key: "toggle-theme",
        label: "Toggle Theme",
        description: "Toggle dark mode",
        icon: MoonIcon,
        action: "toggleTheme",
        shortcut: {
          keys: ["command"],
          label: "T",
        },
      },
    ],
  },
  {
    key: "actions",
    label: "Actions",
    items: [
      {
        key: "logout",
        label: "Logout",
        description: "Sign out",
        icon: SignOutIcon,
        href: "/login",
        tone: "danger",
      },
    ],
  },
];

/** Settings sections in sidebar order. Plain module so both server pages and the client nav can import it. */
export const SETTINGS_GROUPS = [
  { key: "account", sections: ["account", "team-members", "billing", "white-label"] },
  { key: "business", sections: ["business", "branding", "competitors", "product-catalog", "saved-pages"] },
  { key: "articles", sections: ["writing", "visual", "schedule", "improvements"] },
  { key: "integrations", sections: ["publishing", "analytics"] },
  { key: "socials", sections: ["reddit", "quora"] },
] as const;

/** Agency settings (/clients/settings), shown in agency mode. */
export const AGENCY_SETTINGS_GROUPS = [
  { key: "account", sections: ["profile", "members"] },
  { key: "whiteLabel", sections: ["branding", "hosting", "talk-with-team"] },
] as const;

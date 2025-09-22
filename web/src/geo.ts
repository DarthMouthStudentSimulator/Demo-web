export type CampusPlaceKey =
  | "hall1"
  | "hall2"
  | "green"
  | "dormitory"
  | "inn"
  | "art center"
  | "dining hall"
  | "cafeteria"
  | "library"
  | "gym"
  | "medical center"
  | "study building"
  | "alumni gym"
  | "main building"
  | "community club"
  | "laboratory";

export type CampusPlace = {
  key: CampusPlaceKey;
  label: string;
  // pixel position over the background image (0..1 relative coordinates)
  x: number;
  y: number;
  // heuristics for matching free-text
  aliases: string[];
};

// Coordinates calibrated to match the actual campus map image positions
// export const CAMPUS_PLACES: CampusPlace[] = [
//   { key: "study building", label: "Study building", x: 0.15, y: 0.45, aliases: ["study", "study building", "lsb", "silsby", "rocky"] },
//   { key: "alumni gym", label: "alumni gym", x: 0.11, y: 0.55, aliases: ["alumni gym"] },
//   { key: "laboratory", label: "Laboratory", x: 0.06, y: 0.70, aliases: ["laboratory", "lab", "life sciences", "lsr"] },
//   { key: "community club", label: "Community club", x: 0.26, y: 0.85, aliases: ["community", "community club"] },
//   { key: "library", label: "Library", x: 0.32, y: 0.75, aliases: ["library", "baker", "berry"] },
//   { key: "gym", label: "gym", x: 0.32, y: 0.60, aliases: ["gym", "alumni", "fitness"] },
//   { key: "medical center", label: "medical center", x: 0.30, y: 0.52, aliases: ["medical", "health", "medical center"] },
//   { key: "main building", label: "Main building", x: 0.50, y: 0.42, aliases: ["main building", "parkhurst", "administration"] },
//   { key: "art center", label: "art center", x: 0.62, y: 0.58, aliases: ["hop", "hopkins", "art center", "hood", "museum"] },
//   { key: "hall2", label: "hall 2", x: 0.62, y: 0.70, aliases: ["hall 2", "cummings", "engineering"] },
//   { key: "dormitory", label: "Dormitory", x: 0.70, y: 0.82, aliases: ["dorm", "dormitory", "residence"] },
//   { key: "inn", label: "inn", x: 0.72, y: 0.45, aliases: ["inn", "hanover inn"] },
//   { key: "cafeteria", label: "cafeteria", x: 0.83, y: 0.52, aliases: ["cafeteria", "collis", "snack"] },
//   { key: "dining hall", label: "Dining hall", x: 0.83, y: 0.63, aliases: ["dining", "foco", "dining hall"] },
//   { key: "hall1", label: "hall 1", x: 0.87, y: 0.70, aliases: ["hall 1", "math", "kst", "kst hall"] },
//   { key: "green", label: "green", x: 0.87, y: 0.88, aliases: ["green", "dartmouth green"] },
// ];

export const CAMPUS_PLACES: CampusPlace[] = [
  { key: "study building", label: "Study building", x: 0.175, y: 0.52, aliases: ["study", "study building", "lsb", "silsby", "rocky"] },
  { key: "alumni gym", label: "alumni gym", x: 0.13, y: 0.62, aliases: ["alumni gym","alumni"] },
  { key: "laboratory", label: "Laboratory", x: 0.08, y: 0.8, aliases: ["laboratory", "lab", "life sciences", "lsr"] },
  { key: "community club", label: "Community club", x: 0.30, y: 0.99, aliases: ["community", "community club"] },
  { key: "library", label: "Library", x: 0.33, y: 0.8, aliases: ["library", "baker", "berry"] },
  { key: "gym", label: "gym", x: 0.4, y: 0.65, aliases: ["gym", "fitness"] },
  { key: "medical center", label: "medical center", x: 0.40, y: 0.65, aliases: ["medical", "health", "medical center"] },
  { key: "main building", label: "Main building", x: 0.51, y: 0.5, aliases: ["main building", "parkhurst", "administration","Admissions Office"] },
  { key: "art center", label: "art center", x: 0.68, y: 0.64, aliases: ["art center", "hood", "museum","The Hopkins Center for the Arts"] },
  { key: "hall2", label: "hall 2", x: 0.62, y: 0.70, aliases: ["hall 2", "cummings", "engineering","McNutt Hall"] },
  { key: "dormitory", label: "Dormitory", x: 0.64, y: 0.85, aliases: ["dorm", "dormitory", "residence"] },
  { key: "inn", label: "inn", x: 0.81, y: 0.50, aliases: ["inn", "hanover inn"] },
  { key: "cafeteria", label: "cafeteria", x: 0.83, y: 0.52, aliases: ["cafeteria", "collis", "snack"] },
  { key: "dining hall", label: "Dining hall", x: 0.83, y: 0.63, aliases: ["dining", "foco", "dining hall"] },
  { key: "hall1", label: "hall 1", x: 0.87, y: 0.70, aliases: ["hall 1", "math", "kst", "kst hall"] },
  { key: "green", label: "green", x: 0.87, y: 0.88, aliases: ["green", "dartmouth green","park"] },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim();
}

export function matchPlaceByText(text: string | null | undefined): CampusPlace | undefined {
  if (!text) return undefined;
  const t = normalize(text);
  // direct alias match
  for (const p of CAMPUS_PLACES) {
    if (normalize(p.label) === t) return p;
    if (p.aliases.some(a => normalize(a) === t)) return p;
  }
  // substring heuristic
  return CAMPUS_PLACES.find(p => [p.label, ...p.aliases].some(a => t.includes(normalize(a))));
}


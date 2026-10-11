export const aliasDictionary: Record<string, string[]> = {
  React: ["reactjs", "react.js", "react js"],
  "Node.js": ["node", "nodejs", "node js"],
  JavaScript: ["js", "javascript", "ecmascript"],
  SQL: ["structured query language", "sql"],
  Excel: ["ms excel", "microsoft excel", "excel"],
  Git: ["git", "git version control"],
  Docker: ["docker", "docker containers"],
  Python: ["python", "python3"],
  "Data Visualization": ["data visualisation", "data visualization", "charts"],
  "Basic Computer": ["computer basics", "basic computer", "computer literacy"],
  Communication: ["communication", "communication skills"],
  "First Aid": ["first aid", "firstaid"],
  "Medical Records": ["medical records", "patient records"],
  "Quality Control": ["quality control", "qc"],
  CAD: ["cad", "computer aided design"],
  Safety: ["safety", "workplace safety"],
  Welding: ["welding"],
  "Machine Operation": ["machine operation", "machine operating"],
  Statistics: ["statistics", "stats"],
};
const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function normalizeSkill(text: string): string {
  const key = clean(text);
  for (const [canonical, aliases] of Object.entries(aliasDictionary))
    if ([canonical, ...aliases].some((x) => clean(x) === key))
      return clean(canonical);
  return key;
}
export function canonicalSkill(text: string): string {
  const key = normalizeSkill(text);
  return (
    Object.keys(aliasDictionary).find((x) => clean(x) === key) || text.trim()
  );
}
// Deterministic, explicitly curated aliases are the only non-literal eligibility matches.
export function compulsorySimilarity(a: string, b: string): number {
  return normalizeSkill(a) !== "" && normalizeSkill(a) === normalizeSkill(b)
    ? 1
    : 0;
}
export function skillSimilarity(a: string, b: string): number {
  const x = normalizeSkill(a),
    y = normalizeSkill(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  let previous = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const row = [i];
    for (let j = 1; j <= y.length; j++)
      row[j] = Math.min(
        row[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
    previous = row;
  }
  return Math.max(0, 1 - previous[y.length] / Math.max(x.length, y.length));
}
export const evaluationPairs = [
  { a: "ReactJS", b: "React", match: true },
  { a: "React.js", b: "React", match: true },
  { a: "Node", b: "Node.js", match: true },
  { a: "MS Excel", b: "Excel", match: true },
  { a: "stats", b: "Statistics", match: true },
  { a: "computer literacy", b: "Basic Computer", match: true },
  { a: "Communication skill", b: "Communication", match: true },
  { a: "Kubernetes", b: "K8s", match: true },
  { a: "Java", b: "JavaScript", match: false },
  { a: "React", b: "Excel", match: false },
  { a: "SQL", b: "Safety", match: false },
  { a: "Git", b: "GitHub", match: false },
  { a: "Python", b: "Welding", match: false },
  { a: "Medical Records", b: "Machine Operation", match: false },
];
export function matcherEvaluation() {
  const records = evaluationPairs.map((p) => ({
    ...p,
    similarity: skillSimilarity(p.a, p.b),
    predicted: skillSimilarity(p.a, p.b) >= 0.8,
  }));
  const tp = records.filter((p) => p.match && p.predicted).length,
    fp = records.filter((p) => !p.match && p.predicted).length,
    fn = records.filter((p) => p.match && !p.predicted).length;
  return {
    records,
    tp,
    fp,
    fn,
    precision: tp / (tp + fp || 1),
    recall: tp / (tp + fn || 1),
  };
}

// Royal blueprint rewards. Passing level 7 (the last practice level) grants the level 8 and 9 diagrams;
// each later odd level grants the next two. Levels are 1-based; only advanced (royal) levels have blueprints.
export function blueprintLevels(lessons) {
  return lessons.map((c, i) => (c.advanced ? i + 1 : 0)).filter(Boolean);
}
export function blueprintGrants(level, lessons) {
  const out = level === 7 ? [8, 9] : level >= 9 && level % 2 === 1 ? [level + 1, level + 2] : [];
  return out.filter(l => l <= lessons.length && lessons[l - 1]?.advanced);
}
// The level whose pass unlocks a blueprint, for the locked card's hint.
export function blueprintSource(level) {
  return level <= 9 ? 7 : level % 2 === 0 ? level - 1 : level - 2;
}
// Adds newly earned levels to the owned list (kept sorted) and returns only the fresh ones.
export function addBlueprints(owned, levels) {
  const fresh = levels.filter(l => !owned.includes(l));
  owned.push(...fresh);
  owned.sort((a, b) => a - b);
  return fresh;
}

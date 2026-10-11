// Defender order never changes the type-chart result or learning record.
export function matchupKey(attack, defenders) {
  return `${attack}>${[...defenders].sort().join('+')}`;
}
export function normalizeKey(key) {
  const [attack, defenders] = key.split('>');
  return matchupKey(attack, defenders.split('+'));
}

/** The label under the country name on a country's share card: "42 upcoming tournaments", "1 upcoming tournament", or a neutral line when there are none. */
export function eventCountLabel(count: number): string {
  if (count <= 0) return 'Chess tournaments worldwide';
  return `${count.toLocaleString('en-US')} upcoming ${count === 1 ? 'tournament' : 'tournaments'}`;
}

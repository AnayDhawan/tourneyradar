export function getCountdown(dateStr: string, now: Date | string = new Date()): string {
  if (!dateStr) return "";
  const targetDate = new Date(dateStr);
  const nowDate = now instanceof Date ? now : new Date(now);

  if (Number.isNaN(targetDate.getTime()) || Number.isNaN(nowDate.getTime())) return "";

  const targetUtcDays =
    Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()) / 86400000;
  const nowUtcDays =
    Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()) / 86400000;

  const days = Math.round(targetUtcDays - nowUtcDays);

  if (days < 0) return "";
  if (days === 0) return "Starting today!";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days} days`;
  if (days <= 30) return `In ${Math.ceil(days / 7)} weeks`;

  const months = Math.floor(days / 30);
  return months === 1 ? "In 1 month" : `In ${months} months`;
}

export function isNewTournament(createdAt: string, now: Date | string = new Date()): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const nowDate = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(created.getTime()) || Number.isNaN(nowDate.getTime())) return false;
  const diffDays = (nowDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

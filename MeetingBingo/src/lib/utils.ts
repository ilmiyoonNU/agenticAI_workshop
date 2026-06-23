/**
 * Lightweight classname combiner — joins truthy class strings with a space.
 * Avoids pulling in clsx/tailwind-merge for the MVP.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

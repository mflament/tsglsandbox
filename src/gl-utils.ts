export function glCreate<T>(creator: () => T | null): T {
  const res = creator();
  if (res == null) throw Error('Error creating gl object');
  return res;
}

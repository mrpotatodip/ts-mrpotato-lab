export function scanSuccessRate(succeeded: number, failed: number) {
  const finished = succeeded + failed;
  return finished === 0 ? null : Math.round((succeeded / finished) * 100);
}

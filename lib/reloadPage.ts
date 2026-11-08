/**
 * Load the page again — a retry on a built page, whose data was read at build
 * (MOTIR-10644). On its own so a test can watch it: jsdom's `location` cannot
 * be spied on.
 */
export function reloadPage(): void {
  window.location.reload()
}

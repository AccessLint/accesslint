/**
 * Inject HTML into the live browser document, placing <style> blocks in <head>
 * (tagged data-test for cleanup) so the cascade applies before body content is
 * parsed. Does not clear the entire <head> to preserve Vite's injected runtime
 * scripts.
 */
export function setContent(html: string): void {
  const styles: string[] = [];
  const body = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (match) => {
    styles.push(match.replace(/<\/?style[^>]*>/gi, ""));
    return "";
  });
  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-test", "");
  styleEl.textContent = styles.join("\n");
  document.head.appendChild(styleEl);
  document.body.innerHTML = body;
}

/** Remove test-injected styles and body content. Call from afterEach. */
export function resetDocument(): void {
  document.querySelectorAll("style[data-test]").forEach((el) => el.remove());
  document.body.innerHTML = "";
}

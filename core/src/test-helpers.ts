export function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

// Note: URL helper functions

/**
 * Combine the base URL and the rest of the search params
 * @param url 
 * @param fromURL 
 * @param removeParams 
 * @returns The final URL that includes the base URL and the rest of the search params
 */
export function addUtmParams(url: string, fromURL: string, removeParams: string[]) {
  const urlObject = new URL(url);
  const searchParams = new URLSearchParams(urlObject.search);
  const fromUrlObject = new URL(fromURL);
  const fromSearchParams = new URLSearchParams(fromUrlObject.search);
  fromSearchParams.forEach((value, key) => {
    if (!removeParams.includes(key)) {
      searchParams.set(key, value);
    }
  });
  urlObject.search = searchParams.toString();
  return urlObject.toString();
}


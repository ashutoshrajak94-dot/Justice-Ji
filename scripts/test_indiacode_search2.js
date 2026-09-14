async function test() {
  const query = "Madhya Pradesh Land Revenue Code 1959";
  const url = `https://indiacode.gov.in/server/api/discover/search/objects?query=${encodeURIComponent(query)}&size=10`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
  });
  const data = await res.json();
  const searchResults = data._embedded?.searchResult?._embedded?.objects || [];
  for (const obj of searchResults) {
    const item = obj._embedded?.indexableObject;
    console.log("Name:", item?.name, "Type:", item?.type);
    if (item?.metadata?.['dc.identifier.uri']) {
      console.log("URI:", item.metadata['dc.identifier.uri']?.[0]?.value);
    }
  }
}
test();

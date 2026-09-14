async function test() {
  const query = "Madhya Pradesh Land Revenue Code 130";
  const url = `https://indiacode.gov.in/server/api/discover/search/objects?query=${encodeURIComponent(query)}&size=5`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
  });
  const data = await res.json();
  const searchResults = data._embedded?.searchResult?._embedded?.objects || [];
  console.log("Found:", searchResults.length);
  for (const obj of searchResults) {
    const item = obj._embedded?.indexableObject;
    console.log("Name:", item?.name);
    console.log("Metadata:", item?.metadata);
  }
}
test();

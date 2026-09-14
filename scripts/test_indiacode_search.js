async function test() {
  const query = "Madhya Pradesh Land Revenue Code";
  const url = `https://indiacode.gov.in/server/api/discover/search/objects?query=${encodeURIComponent(query)}&size=5`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Embedded keys:", Object.keys(data._embedded || {}));
  const searchResults = data._embedded?.searchResult?._embedded?.objects || [];
  console.log("Found objects:", searchResults.length);
  for (const obj of searchResults) {
    const item = obj._embedded?.indexableObject;
    console.log("Name:", item?.name);
    console.log("ID:", item?.id);
    console.log("Metadata:", Object.keys(item?.metadata || {}));
  }
}
test();

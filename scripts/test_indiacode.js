async function test() {
  const res = await fetch("https://indiacode.gov.in/main.1c7fdf8b3282bb50.js");
  const text = await res.text();
  const matches = text.match(/\/api\/[a-zA-Z0-9_\-\/]+/g) || [];
  console.log("Unique API paths:", [...new Set(matches)].slice(0, 20));
}
test();

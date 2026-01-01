## understanding the structure of the html of the share URL page

REFERENCE:
`schema-NEXT-DATA.json`       = JSON schema describing the body of XPath expression `//*[@id="__NEXT_DATA__"]/text()`
`types-combined-NEXT-DATA.ts` = exports a single `Root` type describing body 
`types-interface-NEXT-DATA.ts` = exports interfaces for each node level

XPath to NEXT_DATA=`//*[@id="__NEXT_DATA__"]/text()`
Full XPath to NEXT_DATA=`/html/body/script[3]/text()`

ideas for possibly browser side. because browser still gets the JSON_DATA that we want. also, be we are sending (no keep-alive) requests. 

CODE for Full XPath:
```js
// If using Puppeteer with XPath
const elements = await page.$x('/html/body/script[3]/text()');
const results = await Promise.all(
  elements.map(el => el.evaluate(node =>
    node.nodeType === 1 ? node.textContent : node.nodeValue
  ))
);

// If using Vanilla JavaScript (browser)
const result = document.evaluate(
  '/html/body/script[3]/text()',
  document,
  null,
  XPathResult.ANY_TYPE,
  null
);

const results = [];
let node;
while (node = result.iterateNext()) {
  results.push(node.textContent || node.nodeValue);
}
```

CODE for XPath:
```js
// If using Puppeteer with XPath
const elements = await page.$x('//*[@id="__NEXT_DATA__"]/text()');
const results = await Promise.all(
  elements.map(el => el.evaluate(node =>
    node.nodeType === 1 ? node.textContent : node.nodeValue
  ))
);

// If using Vanilla JavaScript (browser)
const result = document.evaluate(
  '//*[@id="__NEXT_DATA__"]/text()',
  document,
  null,
  XPathResult.ANY_TYPE,
  null
);

const results = [];
let node;
while (node = result.iterateNext()) {
  results.push(node.textContent || node.nodeValue);
}
```
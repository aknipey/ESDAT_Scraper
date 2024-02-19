const puppeteer = require("puppeteer");
const fs = require("fs").promises; // Include the filesystem module to write files

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeData() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto("https://online.esdat.net/EnvironmentalStandards");
    await page.setViewport({ width: 1020, height: 800 });

    await page.click("div#environmental-standards-selector");
    await page.waitForSelector("ul > li:first-child .k-icon.k-i-expand");

    await page.click("ul > li:first-child .k-icon.k-i-expand");

    const nthListItemSelector = `ul > li:nth-child(2) .k-icon.k-i-expand`;
    await page.waitForSelector(nthListItemSelector, { visible: true });
    await page.click(nthListItemSelector);

    await wait(1000); // Waits for animations or data loading
    await page.mouse.click(312, 185, { clickCount: 2 });

    await wait(1000); // Waits for the search results to load
    await page.mouse.click(26, 781, { clickCount: 1 });

    await wait(1000); // Waits to submit the search
    await page.mouse.click(748, 110, { clickCount: 1 });

    await wait(1000); // Additional wait to ensure everything has loaded

    let results = [];
    async function extractDataFromPage() {
      return await page.evaluate(() => {
        const data = [];
        const rows = document.querySelectorAll("tr.k-alt, tr.k-master-row");
        rows.forEach((row) => {
          const chemCode = row.querySelector("td:nth-child(2)").innerText;
          const chemName = row.querySelector("td:nth-child(3)").innerText;
          const value = row.querySelector("td:nth-child(5)").innerText;
          const units = row.querySelector("td:nth-child(6)").innerText;
          const comments = row.querySelector("td:nth-child(8)").innerText;
          data.push({
            chemCode,
            chemName,
            value,
            units,
            comments,
          });
        });
        return data;
      });
    }

    async function handlePagination() {
      await wait(1000); // Wait a bit before checking for the next page
      const isPaginationDone = await page.evaluate(() => {
        const xpathExpression = "//a[@title='Go to the next page']";
        const result = document.evaluate(
          xpathExpression,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        const button = result.singleNodeValue;
        if (
          button &&
          !button.disabled &&
          !button.classList.contains("k-state-disabled")
        ) {
          button.click();
          return false;
        }
        return true;
      });

      if (!isPaginationDone) {
        await wait(1000);
        const newData = await extractDataFromPage();
        results = results.concat(newData);
        await handlePagination();
      }
    }

    const firstPageData = await extractDataFromPage();
    results = results.concat(firstPageData);
    await handlePagination();

    console.log("length of results", results.length);

    await fs.writeFile(
      "environmentalData.txt",
      `const ESDATStandard = [`,
      "utf-8"
    );
    let i = 0;
    while (i < results.length) {
      let { chemCode, chemName, value, units, comments } = results[i];
      if (value === units) {
        value = -999; //!! -999 mean no limit set
      } else if (chemName === "pH") {
        values = value.split(" ");
        value = `{
          min: ${Number(values[0])},
          max: ${Number(values[2])},
        }`;
      } else if (value.split(" ")[0] === ">") {
        value = value.split(" ")[1];
      } else {
        value = parseFloat(value);
      }
      if (isNaN(value)) {
        console.log(value, units, chemName, chemCode);
      }
      await fs.appendFile(
        "environmentalData.txt",
        `{
          chemCode: "${chemCode}",
          chemName: "${chemName}",
          value: ${value},
          units: "${units}",
          comments: "${comments}",
        },
        `,
        "utf-8"
      );
      i++;
    }
    await fs.appendFile(
      "environmentalData.txt",
      `],
      `,
      "utf-8"
    );
    console.log("Data extraction complete and saved to file.");
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    // Uncomment the line below to close the browser after scraping
    // await browser.close();
  }
}

scrapeData();

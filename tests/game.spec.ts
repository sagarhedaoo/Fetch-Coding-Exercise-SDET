import {
  test,
  expect,
  chromium,
  Browser,
  BrowserContext,
  Page,
  Locator,
  TestInfo,
} from "@playwright/test";

test.describe("SDET Challenge", async () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  let weighingPans: Locator[];
  let goldCoins: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  let weighings: string[] = [];
  let fakeCoin: Locator;
  let dialogMessage: string;

  async function getNthResult(nthResult: number): Promise<string> {
    const result: Locator = page.locator(`ol li:nth-child(${nthResult})`);
    const resultText: string = (await result.textContent()) as string;

    return resultText;
  }

  test.beforeAll(async () => {
    // For Debugging Only
    // browser = await chromium.launch({ headless: false });
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
    await context.close();
    await browser.close();
  });

  test("SDET Challenge Site is Loaded", async () => {
    await page.goto("http://sdetchallenge.fetch.com/");
    expect(await page.title()).toEqual("React App");

    weighingPans = await page.locator(".game-board").all();
    expect(weighingPans).toHaveLength(2);
    await expect(weighingPans[0]).toHaveText("left bowl");
    await expect(weighingPans[1]).toHaveText("right bowl");
  });

  test("Step 1 - Determine which group of 3", async () => {
    await page.getByTestId("left_0").fill(`${goldCoins[0]}`);
    await page.getByTestId("left_1").fill(`${goldCoins[1]}`);
    await page.getByTestId("left_2").fill(`${goldCoins[2]}`);

    await page.getByTestId("right_0").fill(`${goldCoins[3]}`);
    await page.getByTestId("right_1").fill(`${goldCoins[4]}`);
    await page.getByTestId("right_2").fill(`${goldCoins[5]}`);

    await page.getByTestId("weigh").click();

    const result = await page.locator(".result > button");
    const resultDetails = await getNthResult(1);

    await expect(result).not.toHaveText("?");
    const resultOperator = (await result.textContent()) as string;
    await expect(resultDetails).toContain(resultOperator);

    weighings.push(resultDetails);
    await expect(weighings).toHaveLength(1);

    if (resultOperator == "=") {
      goldCoins = goldCoins.slice(6);
    } else if (resultOperator == "<") {
      goldCoins = goldCoins.slice(0, 3);
    } else if (resultOperator == ">") {
      goldCoins = goldCoins.slice(3, 6);
    }
  });

  test("Step 2 - Eliminate 2 of 3 possible suspects", async () => {
    await page.getByText("Reset").click();

    await page.getByTestId("left_0").fill(`${goldCoins[0]}`);
    await page.getByTestId("right_0").fill(`${goldCoins[1]}`);

    await page.getByTestId("weigh").click();

    const result = await page.locator(".result > button");
    const resultDetails = await getNthResult(2);

    await expect(result).not.toHaveText("?");
    const resultOperator = (await result.textContent()) as string;
    await expect(resultDetails).toContain(resultOperator);

    weighings.push(resultDetails);
    await expect(weighings).toHaveLength(2);

    if (resultOperator == "=") {
      fakeCoin = page.getByTestId(`coin_${goldCoins[2]}`);
    } else if (resultOperator == "<") {
      fakeCoin = page.getByTestId(`coin_${goldCoins[0]}`);
    } else if (resultOperator == ">") {
      fakeCoin = page.getByTestId(`coin_${goldCoins[1]}`);
    }
  });

  test("Step 3 - Guess the fake coin", async () => {
    page.on("dialog", async (dialog) => {
      dialogMessage = await dialog.message();
      await dialog.accept();
    });

    await fakeCoin.click();
    await expect(dialogMessage).toEqual("Yay! You find it!");

    console.log("Weighings:");
    for (let i in weighings) {
      console.log(weighings[i]);
    }
    console.log(`Fake Coin: ${await fakeCoin.textContent()}`);
    console.log(`End-of-Game Message: ${dialogMessage}`);
  });
});

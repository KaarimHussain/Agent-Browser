import { chromium, Browser, BrowserContext, Page, Locator } from "playwright";

// Singleton — keeps browser alive between agent steps
let browser: Browser | null = null;
let page: Page | null = null;

// Parses various selector formats into Playwright locators.
function resolveLocator(selector: string): Locator {
  // 1. ARIA format: role=button[name="Search"]
  const ariaMatch = selector.match(
    /^role=(\w+)\[name=["'](.+?)["']\]$/i
  );
  if (ariaMatch) {
    const [, role, name] = ariaMatch;
    return page!.getByRole(role as any, { name });
  }

  // 2. Pure XPath: //div[@role='search']/button
  if (selector.startsWith("//") || selector.startsWith("(//")) {
    return page!.locator(`xpath=${selector}`);
  }

  // 3. Text selector: text=Submit
  if (selector.startsWith("text=")) {
    return page!.getByText(selector.slice(5), { exact: false });
  }

  // 4. Fallback: treat as CSS selector
  return page!.locator(selector);
}

// Strip garbage prefixes the model sometimes hallucinates
function cleanSelector(selector: string): string {
  return selector
    .replace(/^button:xpath=/i, "xpath=")
    .replace(/^input:xpath=/i, "xpath=")
    .replace(/^a:xpath=/i, "xpath=");
}

export async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-web-security",
        "--disable-dev-shm-usage",
      ],
    });
  }

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    locale: "en-US",
    timezoneId: "Asia/Karachi",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    (window as any).chrome = { runtime: {} };
  });

  return page;
}

export async function navigateTo(url: string) {
  try {
    // 1. Try to go to the URL and wait for the 'load' event first (standard wait)
    await page!.goto(url, { waitUntil: "load", timeout: 25000 });
  } catch (error: any) {
    if (error.message.includes("Timeout")) {
      // 2. If full load takes too long, fall back to 'domcontentloaded' which is usually enough
      try {
        await page!.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      } catch (e: any) {
        // 3. Last resort: just wait for the commit (header received)
        await page!.goto(url, { waitUntil: "commit", timeout: 10000 });
      }
    } else {
      throw error;
    }
  }

  // Mandatory 2s grace period for client-side rendering (React/Vue sites)
  await page!.waitForTimeout(2000);
  
  // Try waiting for network idle in the background
  try {
    await page!.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {
    // Ignore timeout
  }
}

export async function clickElement(selector: string) {
  const cleaned = cleanSelector(selector);
  try {
    const locator = resolveLocator(cleaned);
    await locator.click({ timeout: 5000 });
    try {
      await page!.waitForLoadState("networkidle", { timeout: 6000 });
    } catch {
      // Ignore networkidle timeout after a click
    }
  } catch (e) {
    throw new Error(
      `Could not click "${selector}". Use get_accessibility_tree to find the correct role and name, then use format: role=button[name="exact name from tree"]`
    );
  }
}

export async function typeIntoElement(selector: string, text: string) {
  const cleaned = cleanSelector(selector);
  try {
    const locator = resolveLocator(cleaned);
    await locator.fill(text);
  } catch (e) {
    throw new Error(
      `Could not type into "${selector}". Use get_accessibility_tree to find correct role, use format: role=textbox[name="exact name from tree"]`
    );
  }
}

export async function takeScreenshot(): Promise<string> {
  const buffer = await page!.screenshot({ fullPage: false });
  return buffer.toString("base64");
}

export async function readPageText(): Promise<string> {
  // If the page is empty, wait up to 5s for content to appear
  let text = (await page!.innerText("body")).trim();
  if (text.length < 10) {
    await page!.waitForTimeout(3000);
    text = (await page!.innerText("body")).trim();
  }
  return text.length > 6000 ? text.slice(0, 6000) + "..." : text;
}

export async function getAccessibilityTree(): Promise<string> {
  // Wait for body to be visible/present
  await page!.waitForSelector("body", { timeout: 5000 });
  
  let snapshot = await page!.locator("body").ariaSnapshot();
  // If snapshot is basically empty, wait a bit for hydration
  if (snapshot.length < 50) {
    await page!.waitForTimeout(3000);
    snapshot = await page!.locator("body").ariaSnapshot();
  }
  return snapshot.length > 4000 ? snapshot.slice(0, 4000) + "..." : snapshot;
}

export async function pressKey(key: string) {
  await page!.keyboard.press(key);
  try {
    await page!.waitForLoadState("networkidle", { timeout: 8000 });
  } catch {
    await page!.waitForTimeout(2000);
  }
}

export async function closeBrowser() {
  await browser?.close();
  browser = null;
  page = null;
}

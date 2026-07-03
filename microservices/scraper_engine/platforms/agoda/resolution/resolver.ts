import { Page } from '@playwright/test';

/**
 * Resolves a hotel name to a canonical Agoda URL
 * @param page Playwright Page object
 * @param hotelName Name of the hotel to resolve
 * @returns Clean Agoda search URL with hotel ID
 */
export async function getHotelBaseUrl(page: Page, hotelName: string): Promise<string> {
    await page.goto('https://www.agoda.com', { waitUntil: 'domcontentloaded' });
    
    // 1. Dismiss potential popups
    try {
        await page.keyboard.press('Escape');
    } catch (e) {
        // Ignore errors if Escape fails
    }

    // 2. Perform Search
    const searchInput = page.locator('#textInput, [data-selenium="textInput"]').first();
    await searchInput.click();
    await searchInput.fill(hotelName);

    // 3. Attempt to click first suggestion for faster resolution
    try {
        const firstSuggestion = page.locator('li.AutocompleteItem, li.Suggest__Item').first();
        await firstSuggestion.waitFor({ state: 'visible', timeout: 5000 });
        await firstSuggestion.click();
    } catch (e) {
        // Fallback: Click the main search button
        const searchBtn = page.locator('button:has-text("SEARCH"), [data-selenium="searchButton"]').first();
        await searchBtn.click();
    }

    // 4. Wait for the URL to resolve or the property card to appear
    await page.waitForURL(/hotel|search/, { timeout: 20000 });
    
    const currentUrl = page.url();
    const hotelIdMatch = currentUrl.match(/hotel=(\d+)/) || currentUrl.match(/hotel_id=(\d+)/);
    
    if (hotelIdMatch) {
        const hotelId = hotelIdMatch[1];
        if (currentUrl.includes('/hotel/')) {
            return currentUrl.split('?')[0];
        }
        return `https://www.agoda.com/search?hotel=${hotelId}`;
    }
    
    // 5. Extraction Fallback: Grab from the first property card in results
    try {
        await page.waitForSelector('[data-selenium="hotel-item"]', { timeout: 10000 });
        const hotelId = await page.getAttribute('[data-selenium="hotel-item"]', 'data-hotelid');
        if (hotelId) {
            return `https://www.agoda.com/search?hotel=${hotelId}`;
        }
    } catch (e) {
        throw new Error(`Failed to extract hotel ID for: ${hotelName}`);
    }
    
    throw new Error(`Hotel ID not found in results for: ${hotelName}`);
}

/** 
 * Verifies if the generated URL lands on the correct property
 */
export async function verifyAgodaEndpoint(page: Page, targetUrl: string, expectedName: string) {
    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle' });
        const pageTitle = await page.title();
        const isValid = pageTitle.toLowerCase().includes(expectedName.toLowerCase());
        
        const hotelIdMatch = targetUrl.match(/hotel=(\d+)/);
        
        return {
            status: isValid ? "active" : "inactive",
            hotelId: hotelIdMatch ? parseInt(hotelIdMatch[1]) : null,
            resolved_name: pageTitle,
            url: targetUrl,
            meta: {
                title: pageTitle,
                url: page.url()
            }
        };
    } catch (error: any) {
        return { status: "error", error: error.message };
    }
}

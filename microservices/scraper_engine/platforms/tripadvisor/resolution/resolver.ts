import { Page } from '@playwright/test';

/**
 * Resolves a hotel name to a canonical TripAdvisor URL
 * @param page Playwright Page object
 * @param hotelName Name of the hotel to resolve
 * @returns Clean TripAdvisor hotel URL
 */
export async function getTripAdvisorHotelUrl(page: Page, hotelName: string): Promise<string> {
    const encodedName = hotelName.replace(/ /g, '+');
    const searchUrl = `https://www.tripadvisor.com/Search?q=${encodedName}&ssrc=h`;
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    
    // 1. Dismiss potential popups/consent
    try {
        const consentBtn = page.locator('#onetrust-accept-btn-handler, button:has-text("Accept"), button:has-text("Allow")').first();
        if (await consentBtn.isVisible()) {
            await consentBtn.click();
        }
    } catch (e) {
        // Ignore overlay errors
    }

    // 2. Extract first valid link
    try {
        await page.waitForSelector('a[href*="Hotel_Review-"]', { timeout: 15000 });
        
        const extractedData = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="Hotel_Review-"]')) as HTMLAnchorElement[];
            const firstValidLink = links.find(l => l.href.includes('/Hotel_Review-'));
            
            return firstValidLink ? { href: firstValidLink.href } : null;
        });
        
        if (extractedData && extractedData.href) {
            return extractedData.href.split('?')[0];
        }
    } catch (e) {
        const currentUrl = page.url();
        if (currentUrl.includes('/Hotel_Review-')) {
            return currentUrl.split('?')[0];
        }
        throw new Error(`Failed to resolve TripAdvisor URL for: ${hotelName}`);
    }
    
    throw new Error(`No results found on TripAdvisor for: ${hotelName}`);
}

/** 
 * Verifies if the generated URL lands on the correct property
 */
export async function verifyTripAdvisorEndpoint(page: Page, targetUrl: string, expectedName: string) {
    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle' });
        const pageTitle = await page.title();
        const isValid = pageTitle.toLowerCase().includes(expectedName.toLowerCase());
        
        const idMatch = targetUrl.match(/Hotel_Review-g(\d+)-d(\d+)-/);
        
        return {
            status: isValid ? "active" : "inactive",
            hotelId: idMatch ? idMatch[2] : null,
            locationId: idMatch ? idMatch[1] : null,
            resolved_name: pageTitle.split('-')[0].strip(),
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

import { Page } from '@playwright/test';

/**
 * Resolves a hotel name to a canonical Booking.com URL
 * @param page Playwright Page object
 * @param hotelName Name of the hotel to resolve
 * @returns Clean Booking.com hotel URL
 */
export async function getBookingHotelUrl(page: Page, hotelName: string): Promise<string> {
    const encodedName = hotelName.replace(/ /g, '+');
    const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodedName}`;
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    
    // 1. Dismiss potential popups
    try {
        await page.keyboard.press('Escape');
        const dismissBtn = page.locator('button[aria-label="Dismiss sign-in info"]').first();
        if (await dismissBtn.isVisible()) {
            await dismissBtn.click();
        }
    } catch (e) {
        // Ignore overlay errors
    }

    // 2. Extract first property card
    try {
        await page.waitForSelector('[data-testid="property-card"]', { timeout: 15000 });
        
        const extractedData = await page.evaluate(() => {
            const card = document.querySelector('[data-testid="property-card"]');
            if (!card) return null;
            
            const link = card.querySelector('a[data-testid="title-link"]') as HTMLAnchorElement;
            const hotelId = card.getAttribute('data-hotelid') || card.querySelector('[data-hotelid]')?.getAttribute('data-hotelid');
            
            return {
                href: link ? link.href : null,
                hotelId: hotelId
            };
        });
        
        if (extractedData && extractedData.href) {
            return extractedData.href.split('?')[0];
        }
    } catch (e) {
        const currentUrl = page.url();
        if (currentUrl.includes('/hotel/')) {
            return currentUrl.split('?')[0];
        }
        throw new Error(`Failed to resolve Booking.com URL for: ${hotelName}`);
    }
    
    throw new Error(`No results found on Booking.com for: ${hotelName}`);
}

/** 
 * Verifies if the generated URL lands on the correct property
 */
export async function verifyBookingEndpoint(page: Page, targetUrl: string, expectedName: string) {
    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle' });
        const pageTitle = await page.title();
        const isValid = pageTitle.toLowerCase().includes(expectedName.toLowerCase());
        
        // Extract ID from page content for verification
        const content = await page.content();
        const idMatch = content.match(/hotel_id:\s*'(\d+)'/) || content.match(/b_hotel_id:\s*'(\d+)'/);
        
        return {
            status: isValid ? "active" : "inactive",
            hotelId: idMatch ? idMatch[1] : null,
            resolved_name: pageTitle.split(',')[0].trim(),
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

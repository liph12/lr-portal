// A4 landscape at 96 dpi: what a printout page is laid out at (CSS px).
export const PDF_PAGE = { width: 1123, height: 794 };

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// Each element becomes one A4 landscape page, as a picture: the report keeps its charts and colours exactly as drawn.
export async function pagesToPdf(pages: HTMLElement[], fileName: string): Promise<void> {
    // Loaded on the first download, not with the page.
    const [{ jsPDF }, { getFontEmbedCSS, toJpeg }] = await Promise.all([import("jspdf"), import("html-to-image")]);
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    // The page's fonts, read once for every page (else each capture downloads them again).
    const fontEmbedCSS = pages.length ? await getFontEmbedCSS(pages[0]).catch(() => undefined) : undefined;

    for (const [i, page] of pages.entries()) {
        // Photos from another host that refuse to be read become blanks rather than failing the whole file.
        const image = await toJpeg(page, { pixelRatio: 2, quality: 0.92, fontEmbedCSS, imagePlaceholder: BLANK, width: PDF_PAGE.width, height: PDF_PAGE.height });
        if (i > 0) pdf.addPage();
        pdf.addImage(image, "JPEG", 0, 0, width, height);
    }

    pdf.save(fileName);
}

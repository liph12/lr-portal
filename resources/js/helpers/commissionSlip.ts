// A brokerage sale's sums from the commission received (BrokerageSaleService::amounts does the same on save): the
// property's total = commission / the fixed commission rate; the company's share = commission × its rate.
export function brokerageAmounts(commission: string, commissionRate: number, shareRate: number) {
    const received = Number(commission.replace(/,/g, "")) || 0;

    return {
        total: received > 0 ? Math.round((received / (commissionRate / 100)) * 100) / 100 : 0,
        share: Math.round(received * shareRate) / 100,
    };
}

// A rental sale's sums (RentalSaleService::amounts): the contract's total = amount received / 8.3%; Rent.ph's share
// (never stored) = 20% of it.
export function rentalAmounts(received: string | number, commissionRate: number, shareRate: number) {
    const amount = typeof received === "number" ? received : Number(received.replace(/,/g, "")) || 0;

    return {
        total: amount > 0 ? Math.round((amount / (commissionRate / 100)) * 100) / 100 : 0,
        share: Math.round(amount * shareRate) / 100,
    };
}

// Encoded from a commission slip (not a legacy brokerage / rental sale): has the fixed commission rate stored.
export function isSlipSale(detail: { category: string; property: Record<string, unknown> }): boolean {
    return (detail.category === "brokerage" || detail.category === "rental") && detail.property.commission_rate !== null && detail.property.commission_rate !== undefined;
}

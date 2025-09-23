"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coinsForLocalCurrency = coinsForLocalCurrency;
exports.isThroneAffordable = isThroneAffordable;
const constants_1 = require("./constants");
function coinsForLocalCurrency(amount, currencyCode) {
    const normalized = currencyCode.toUpperCase();
    if (normalized === 'NPR') {
        // Rs.10 = 500 coins => Rs.1 = 50 coins
        return Math.floor(amount * 50);
    }
    // Fallback: 1 unit = 50 coins (approx). Replace with FX service.
    return Math.floor(amount * 50);
}
function isThroneAffordable(coinBalance) {
    return coinBalance >= constants_1.THRONE_PRICE_COINS;
}

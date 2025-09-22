"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THRONE_VALIDITY_DAYS = exports.THRONE_PRICE_COINS = exports.OG_LEVEL_PERKS = exports.DEFAULT_DAILY_REWARD_COINS = exports.COIN_RATE_PER_LOCAL_CURRENCY = void 0;
exports.COIN_RATE_PER_LOCAL_CURRENCY = {
    NPR: 50, // Rs.1 = 50 coins so Rs.10 = 500 coins
    USD: 5, // $1 = 5*10 = 50 coins baseline; override with FX as needed
};
exports.DEFAULT_DAILY_REWARD_COINS = 100;
exports.OG_LEVEL_PERKS = {
    1: ['Basic perks', 'Daily small reward'],
    2: ['Increased rewards', 'Priority support'],
    3: ['Auto Gifter Bot access', 'Exclusive badge'],
    4: ['Ghost mode', 'Unsend/delete messages'],
    5: ['Exclusive lounges', 'Max rewards and perks'],
};
exports.THRONE_PRICE_COINS = 15000;
exports.THRONE_VALIDITY_DAYS = 25;

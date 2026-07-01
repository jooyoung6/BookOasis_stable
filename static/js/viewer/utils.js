// utils.js — 공용 유틸
export function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
export function safeParseInt(v, def=0) { const n = parseInt(v, 10); return Number.isNaN(n) ? def : n; }

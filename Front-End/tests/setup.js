import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom không có matchMedia / ResizeObserver (sidebar & radix cần)
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

// jsdom không có IntersectionObserver (hiệu ứng xuất hiện khi cuộn của motion cần) → coi như luôn trong khung nhìn
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el }], this); }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

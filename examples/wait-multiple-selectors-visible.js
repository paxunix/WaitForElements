/* Resolve once all required selectors are present and simultaneously visible. */

const requiredSelectors = [ "#header", ".content", "footer" ];

const waiters = requiredSelectors.map(selector => new WaitForElements({
    selectors: [ selector ],
    allowMultipleMatches: false,
    skipExisting: false,
    requireVisible: false,
    timeout: 10000,
}));

const results = await Promise.all(waiters.map(waiter => waiter.match()));
const elements = results.map(list => list[0]);

const waitForAllVisible = (els, options = {}) => new Promise((resolve) => {
    const seen = new Map();
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            seen.set(entry.target, entry.isIntersecting);
        }

        const allVisible = els.every(el => seen.get(el));
        if (allVisible) {
            observer.disconnect();
            resolve(els);
        }
    }, options);

    for (const el of els) {
        observer.observe(el);
    }
});

await waitForAllVisible(elements, { threshold: 0.01 });

console.log("All required elements are present and visible:", elements);

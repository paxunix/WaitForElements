/* Resolve once all required selectors are present. */

const requiredSelectors = [ "#header", ".content", "footer" ];

const waiters = requiredSelectors.map(selector => new WaitForElements({
    selectors: [ selector ],
    allowMultipleMatches: false,
    skipExisting: false,
    timeout: 10000,
}));

const results = await Promise.all(waiters.map(waiter => waiter.match()));
const elements = results.map(list => list[0]);

console.log("All required elements found:", elements);

/* Wait for a visible element using IntersectionObserver. */

let waiter = new WaitForElements({
    selectors: [ ".hero" ],
    requireVisible: true,
    allowMultipleMatches: false,
    timeout: 10000,
});

let els = await waiter.match();
console.log("Visible element:", els[0]);

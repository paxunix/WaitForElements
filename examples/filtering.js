/* Use filter as a final gate for matches. */

let waiter = new WaitForElements({
    selectors: [ ".card" ],
    filter: els => els.filter(el => el.dataset.ready === "true"),
    allowMultipleMatches: true,
    timeout: -1,
});

waiter.match((els) => {
    console.log("Ready cards:", els);
});

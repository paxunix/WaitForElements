/* Return each matched element only once across multiple mutations. */

let waiter = new WaitForElements({
    selectors: [ ".item" ],
    onlyOnce: true,
    allowMultipleMatches: true,
    timeout: -1,
});

waiter.match((els) => {
    console.log("New matches:", els);
});

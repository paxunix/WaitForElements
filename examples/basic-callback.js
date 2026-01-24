/* Wait for a matching element using callbacks, then stop. */

let waiter = new WaitForElements({
    selectors: [ ".notice" ],
    timeout: 5000,
    allowMultipleMatches: false,
});

waiter.match((els) => {
    console.log("Found:", els);
}, (err) => {
    console.error("Timed out:", err.message);
});

/* Wait for elements that are removed from the DOM. */

let waiter = new WaitForElements({
    selectors: [ ".remove-me" ],
    removedOnly: true,
    skipExisting: true,
    allowMultipleMatches: true,
    timeout: -1,
});

waiter.match((els) => {
    console.log("Removed elements:", els);
});

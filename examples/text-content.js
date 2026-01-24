/* Wait forever for any elements under (and including) `document.body` to
 * get `textContent` that contains `"blah"`. Don't bother with node changes
 * or attribute changes.  (This is waiting for text within the document to
 * contain `"blah"`).
 */

let matcher = new WaitForElements({
    selectors: [ "*" ],
    target: document.body,
    timeout: -1,
    filter: els => els.filter(el => el.textContent.includes("blah")),
    observerOptions: {
        subtree: true,
        characterData: true
    }
});

// It will resolve with a list of elements in document order from body down
// to every element with text containing `"blah"`.
let els = await matcher.match();

# WaitForElements.js

Basic promise-based mechanism to wait for elements meeting constraints to appear in the DOM.

Does NOT support waiting for elements to be removed from the DOM.


## API

#### WaitForElements.match(options)

Return a promise to wait for elements to show up in the DOM for which particular constraints are true.  The mutation observer used will fire for added nodes, attribute changes, and text changes.  The promise will resolve with the set of elements matching the selector under the target for which any filtering is true.

#### Return

##### Promise

Resolve with an array of matched elements.  Reject on error or failure to find any elements within timeout.

#### Parameters

`options` is an object:

##### options.selectors

Array of CSS selectors to wait for appearance in the DOM.  If no elements match within the timeout, the promise is rejected.

##### options.target

Default=`document.body`.  Target DOM element to watch, including its children.

##### options.timeout

Default=`2000`.  The promise is rejected if no elements match within this many milliseconds after the promise is created.  If -1, wait for as long as the document is alive.

##### options.visible

Default=`undef` (no filtering based on visibility).  The set of elements matching the selectors is filtered only to those that are visible.  **NOTE:** visible means that the element is not hidden in the DOM, NOT that it's overlapping the viewport (for example, this will not detect if an element scrolls into view).  If set to `all`, all matched elements must be visible to resolve the promise.  For all other truthy values, one or more elements must be visible to resolve the promise.

##### options.filter

Default = no-op (no filtering).  Function that takes an array of elements that match the selectors and returns a new array of elements.  If the returned array is empty, waiting continues (if the timeout permits).  Otherwise, the promise is resolved with the returned array of unique elements.  If `options.visible` is non-nullish, the array of input elements passed to this function is filtered for visibility (see above).

##### options.attributeFilter

Default = `undef`.  Array used to set the `attributeFilter` option for the mutation observer.  It contains the names of attributes for which matching should be considered (since attribute updates may be many and expensive).  Ignored if `observerOptions` is given.

##### options.observerOptions

Optional.  Default is to observe all child nodes, subtrees, attributes, and character data beneath `target`.  If given, must conform to the `MutationObserver.observe()` API.

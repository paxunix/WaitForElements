# WaitForElements.js

Basic promise/callback mechanism to wait for elements meeting constraints to appear in the DOM.

Does NOT support waiting for elements to be removed from the DOM.


## API

### _constructor(options)_

`options` is an object.

#### options.allowMultipleMatches

Default=false.  If true, matches can continue to be found until timeout.  Otherwise, the first match found will terminate matching.

#### options.selectors

Array of CSS selectors to wait for appearance in the DOM.  If no elements match within the timeout, the promise is rejected, or match()'s `onTimeoutFn` is called.

#### options.target

Default=`document.body`.  Target DOM element to watch, including its children.

#### options.skipExisting

Default=`false`.  If true, elements currently in the DOM when `match()` is called will be ignored.  Mutations to those elements in the future can still return those elements.

#### options.onlyOnce

Default=false.  If a matched and filtered element has already been returned, do not return it again if it reappears in a DOM mutation.

NOTE:  For `attribute` or `characterData` mutations, enabling `onlyOnce` may be a bad idea because you'll never see the updates if the element was already returned by matching.

#### options.timeout

Default=`-1`.  The promise is rejected or match()'s `onTimeoutFn` is called if no elements match within this many milliseconds after match() is called.  If -1, wait for as long as the document is alive.

#### options.filter

Default = no-op (no filtering).  Function that takes an array of elements that match `options.selectors` and returns a new (possibly empty) array of elements.  If the returned array is empty, waiting continues (if the timeout permits).  Otherwise, the promise is resolved or match()'s `onMatchFn` is called with the returned array of unique elements.

#### options.observerOptions

Default is to observe all child nodes, subtrees, attributes, and character data at and under `target`.  If given, must conform to the `MutationObserver.observe()` API's options.

#### options.verbose

Default=`false`.  Log diagnostic information to the console.  If you want the actual MutationRecords to also be logged, set this to 2 (otherwise it can get very spammy).


### _WaitForElements.match(onMatchFn, onTimeoutFn)_

Wait for DOM elements to exist for which particular constraints are true.  The mutation observer used will fire for added nodes, attribute changes, and text changes.

#### Return

If either `onMatchFn` or `onTimeoutFn` are given, `match()` returns undefined after setting up a DOM observer.  Then `onMatchFn` and `onTimeoutFn` are called as indicated above.

Otherwise, `match()` returns a Promise that resolves to an array of unique matched elements.  The promise is rejected if there was an error or failure to match any element within the given timeout.  In this case, `allowMultipleMatches` isn't meaningful since a Promise can only be resolved once.

#### Parameters

##### onMatchFn

Reference to a function that is called when elements are matched.  Its parameter is an array of the matched DOM elements.

##### onTimeoutFn

Reference to a function that is called if `options.timeout` is reached before any elements are matched.  Its parameter is an Error object indicating the timeout was reached.


### _WaitForElements.stop()_

Silently stop waiting for matches.  No callbacks are invoked.  Any outstanding promise will remain pending.

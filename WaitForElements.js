/*
await WaitForElements.match({
    selectors: [ "p" ],
    target: document.body,
    timeout: -1,
    // visible: false,
    filter: els => els.filter(el => el.textContent.includes("blah")),
    //attributeFilter: [ "blah" ]
})
*/

"use strict";

class WaitForElements
{
    static _querySelectors(rootEl, selectors)
    {
        if (!(rootEl instanceof Element))
            return [];

        let results = [];
        for (let sel of Array.isArray(selectors) ? selectors : [ selectors ])
        {
            if (rootEl.matches(sel))
                results.push(rootEl);

            results = results.concat(... rootEl.querySelectorAll(sel));
        }

        return [... new Set(results)];
    }


    static _filterVisible(els, allMustBeVisible)
    {
        let visibleEls = Array.from(els).filter(el => {
            let elRect = el.getBoundingClientRect();
            let winRect = {
                left: 0,
                top: 0,
                right: window.innerWidth ||
                    document.documentElement.clientWidth,
                bottom: window.innerHeight ||
                    document.documentElement.clientHeight,
            };

            let noOverlap = elRect.left > winRect.right ||
                elRect.right < winRect.left ||
                elRect.top > winRect.bottom ||
                elRect.bottom < winRect.top;
            return !noOverlap;
        });

        if (allMustBeVisible && visibleEls.length !== els.length)
            return [];

        return visibleEls;
    }


    static _filterVisible(els, visibility)
    {
        if (visibility ?? false)
        {
            return WaitForElements._filterVisible(els,
                visibility === "all");
        }

        return els;
    }


    static _getMatchedParents(el, rootEl, selectors)
    {
        if (!(el instanceof Element))
            return [];

        let matchedEls = [];

        do {
            for (let sel of Array.isArray(selectors) ? selectors : [ selectors ])
            {
                if (el.matches(sel))
                    matchedEls.push(el);
            }

            if (el === rootEl)
                break;

            el = el.parentElement;
        } while (el !== null);

        // Reverse the list so it is ordered by innermost to outermost
        // matching elements.
        return matchedEls.reverse();
    }


    /**
     * Return a promise to wait for elements to show up in the DOM for which
     * particular constraints are true.  The mutation observer used will
     * fire for added nodes, attribute changes, and text changes.  The
     * promise will resolve with the set of elements matching the selector
     * under the target for which any filtering is true.
     *
     * @param {options.selectors} - Array of CSS selectors to wait for
     * appearance in the DOM.  If no elements match within the timeout, the
     * promise is rejected.
     *
     * @param {options.target} - target DOM element to watch (including its
     * children).  Default=document.body.
     *
     * @param {options.timeout} - the promise is rejected if no elements
     * match within this many milliseconds.  If -1, wait for as long as the
     * document is alive.  Default=2000.
     *
     * @param {options.visible} - the set of elements matching the selectors
     * is filtered only to those that are visible.  NOTE!!  visible does NOT
     * mean strictly in the viewport--it means that the element is not
     * hidden in the DOM (for example, this will not detect if an element
     * scrolls into view).  Default=undef/null (no visibility filtering is
     * done).  If set to "all", all elements in the set must be visible (or
     * the returned set will be empty).  For all other truthy values, one or
     * more elements must be visible (or the returned set will be empty).
     *
     * @param {options.filter} - function that takes a list of elements that
     * match the selectors and returns a new list of elements.  If this list
     * of elements is empty, waiting continues (timeout permitting).
     * Otherwise, the promise is resolved with the filtered list of
     * unique elements.  Default = no-op.  If options.visible is
     * non-nullish, its associated behaviour is applied before this
     * filtering.
     *
     * @param {options.attributeFilter} - array used to set the
     * attributeFilter option for the mutation observer.  Useful only if
     * filtering on attributes.  Default = undef.
     *
     * @returns {Promise} - resolve to the matched (possibly visible)
     * elements; rejects on error or failure to find any elements within
     * timeout.
     */
    static match(options)
    {
        return new Promise((resolve, reject) => {
            let rootEl = options.target || document.body;

            // Check for element in case it already exists
            let existingEls = WaitForElements.
                _querySelectors(rootEl, options.selectors);

            let matchEls = WaitForElements._filterVisible(existingEls, options.visible);

            if (options.filter)
            {
                matchEls = options.filter(matchEls, null);
            }

            if (matchEls.length !== 0)
            {
                resolve([... new Set(matchEls)]);
                return;
            }

            // No existing matching elements, so observe for added/updated
            // elements.
            let timerId = null;
            let observer = null;
            observer = new MutationObserver(mutations => {
                // Handling characterData is special, because the target is
                // the text node itself.  We have to search up the parent
                // element hierarchy to the root element, matching those
                // elements against the selectors, and including any matched
                // nodes in the set that are affected by the characterData
                // change (because the text content change applies to all of
                // them, even if the observer only fires it for the affected
                // text node).
                let checkEls = [ ... new Set(mutations.map(m => [
                    m.type === "childList" ? Array.from(m.addedNodes) : [],
                    m.type === "attributes" ? m.target : [],
                    m.type === "characterData" ? WaitForElements._getMatchedParents(m.target.parentElement, options.target, options.selectors) : [],
                ]).flat(Infinity)) ];

                // Evaluate selectors against any of the added nodes to get
                // added (and nested) elements that match.
                let matchEls = [ ... new Set(checkEls.map(el =>
                    WaitForElements._querySelectors(el, options.selectors)
                ).flat(Infinity)) ];

                matchEls = WaitForElements._filterVisible(matchEls, options.visible);
                if (options.filter)
                {
                    matchEls = options.filter(matchEls);
                }

                if (matchEls.length !== 0)
                {
                    if (observer)
                        observer.disconnect();

                    if (timerId)
                        clearTimeout(timerId);

                    resolve([... new Set(matchEls)]);
                    return;
                }
            });

            let opts = {
                attributeOldValue: true,
                attributes: true,
                characterDataOldValue: true,
                characterData: true,
                childList: true,
                subtree: true,
            };

            if (options.attributeFilter ?? false)
                opts.attributeFilter = options.attributeFilter;

            observer.observe(rootEl, opts);

            let timeout = options.timeout || 2000;
            if (timeout === -1)
                return;

            timerId = window.setTimeout(() => {
                observer.disconnect();

                reject(new Error(`Failed to find elements matching ${options.selectors} within ${timeout} milliseconds`));
            }, timeout);
        });
    }
}


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


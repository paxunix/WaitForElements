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


    static _normalizeOptions(options)
    {
        options.target = options.target ?? document.body;
        options.filter = options.filter ?? (() => true);
    }


    static _handleMutations(mutations, options, resolveFn)
    {
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

        matchEls = matchEls.filter(el => {
            if (!options.onlyUnique)
                return true;

            if (!el.__WaitForElements_seen)
            {
                el.__WaitForElements_seen = true;
                return true;
            }

            return false;
        });

        matchEls = options.filter(matchEls);

        if (matchEls.length !== 0)
        {
            if (options.verbose)
            {
                console.log("match(), mutations:", mutations);
                console.log("match(), matched in mutations:", matchEls);
            }

            if (observer)
                observer.disconnect();

            if (timerId)
                clearTimeout(timerId);

            resolveFn([... new Set(matchEls)]);
        }
    }


    static match(options)
    {
        _normalizeOptions(options);

        return new Promise((resolve, reject) => {
            let rootEl = options.target;

            if (options.verbose)
            {
                console.log("match(), waiting for selectors:", options.selectors);
            }

            if (!options.skipExisting)
            {
                // Check for element in case it already exists
                let existingEls = WaitForElements.
                    _querySelectors(rootEl, options.selectors);

                let matchEls = options.filter ?
                    options.filter(existingEls) : existingEls;

                if (matchEls.length !== 0)
                {
                    let els = [... new Set(matchEls)];

                    if (options.verbose)
                    {
                        console.log("match(), found existing:", els);
                    }

                    resolve(els);
                    return;
                }
            }

            // No existing matching elements, so observe for added/updated
            // elements.
            let timerId = null;
            let observer = null;
            observer = new MutationObserver(mutations => WaitForElements._handleMutations(mutations, options, resolve));

            let opts = null;
            if (options.observerOptions)
            {
                opts = Object.create(options.observerOptions);
            }
            else
            {
                opts = {
                    attributeOldValue: true,
                    attributes: true,
                    characterDataOldValue: true,
                    characterData: true,
                    childList: true,
                    subtree: true,
                };

                if ("attributeFilter" in options)
                    opts.attributeFilter = options.attributeFilter;
            }

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


    static matchOngoing(options, onMatchFn, onTimeoutFn = null)
    {
        _normalizeOptions(options);

        // By default, matchOngoing won't return elements it has already
        // returned.
        options.onlyUnique = options.onlyUnique ?? true;

        let rootEl = options.target;

        if (options.verbose)
        {
            console.log("matchOngoing(), waiting for selectors:", options.selectors);
        }

        if (!options.skipExisting)
        {
            // Check for element in case it already exists
            let matchEls = WaitForElements.
                _querySelectors(rootEl, options.selectors);

            let matchEls = options.filter ?
                options.filter(existingEls) : existingEls;

            if (matchEls.length !== 0)
            {
                let els = [... new Set(matchEls)];
                if (options.verbose)
                {
                    console.log("matchOngoing(), found existing:", els);
                }

                els.forEach(el => el.__WaitForElements_seen = true);

                onMatchFn(els);
            }
        }

        // Observe for added/updated elements.
        let timerId = null;
        let observer = null;
        observer = new MutationObserver(mutations => WaitForElements._handleMutations(mutations, options, onMatchFn));

        let opts = null;
        if (options.observerOptions)
        {
            opts = Object.create(options.observerOptions);
        }
        else
        {
            opts = {
                attributeOldValue: true,
                attributes: true,
                characterDataOldValue: true,
                characterData: true,
                childList: true,
                subtree: true,
            };

            if ("attributeFilter" in options)
                opts.attributeFilter = options.attributeFilter;
        }

        observer.observe(rootEl, opts);

        let timeout = options.timeout ?? -1;
        if (timeout === -1)
            return;

        timerId = window.setTimeout(() => {
            observer.disconnect();

            if (onTimeoutFn !== null)
            {
                onTimeoutFn({
                    message: new Error(`Failed to find elements matching ${options.selectors} within ${timeout} milliseconds`),
                    options: options,
                });
            }
        }, timeout);
    }
}

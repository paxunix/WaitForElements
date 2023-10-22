/* jshint esversion: 11, browser: true */

class WaitForElements
{

    static _version = "20231018";


    constructor(options)
    {
        "use strict";

        this.options = WaitForElements._normalizeOptions(options ?? {});
        this.seen = new Map();
        this.observer = null;
        this.timerId = null;
    }


    // Return list of elements matching any of the selectors, starting at
    // (and including) rootEl.
    static _querySelectors(rootEl, selectors)
    {
        "use strict";

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


    // Walk up the DOM from el to rootEl to build up the hierarchy of nodes.
    static _getElementsFromElementToRoot(el, rootEl)
    {
        "use strict";

        if (!(el instanceof Element))
            return [];

        let els = [ el ];

        while (el.parentElement !== null && el !== rootEl)
        {
            el = el.parentElement;
            els.unshift(el);
        }

        // not finding the root element means el is not a child of it
        if (el !== rootEl)
            els = [];

        return els;
    }


    static _normalizeOptions(options, defaults)
    {
        "use strict";

        let builtinDefaults = {
            target: document.body,
            selectors: [],
            filter: ((el) => el),
            onlyOnce: false,
            skipExisting: false,
            timeout: -1,
            observerOptions: {
                attributeOldValue: true,
                attributes: true,
                characterDataOldValue: true,
                characterData: true,
                childList: true,
                subtree: true,
            },
            verbose: false,
        };

        return Object.assign({}, builtinDefaults, defaults ?? {}, options);
    }


    static _getElementsMatchingSelectors(els, selectors)
    {
        "use strict";

        return [ ... new Set(els.map(el =>
                WaitForElements._querySelectors(el, selectors)
            ).flat(Infinity)
        )];
    }


    _filterOutSeenElements(els)
    {
        "use strict";

        return els.filter(el => {
            if (!this.seen.has(el))
            {
                this.seen.set(el, true);
                return true;
            }

            return false;
        });
    }


    _applyFilters(els)
    {
        "use strict";

        let newels = this.options.onlyOnce ?
            this._filterOutSeenElements(els) :
            els;

        newels = this.options.filter(newels);

        return newels;
    }


    _getExistingElements()
    {
        "use strict";

        let els = WaitForElements._getElementsMatchingSelectors([this.options.target], this.options.selectors);

        els = this._applyFilters(els);

        if (els.length !== 0)
        {
            if (this.options.verbose)
            {
                console.log("match(), found existing:", els);
            }
        }

        return els;
    }


    _getElementsFromMutations(mutations)
    {
        "use strict";

        // Handling characterData is special, because the target is
        // the text node itself.  We have to search up the parent
        // element hierarchy to the root element, matching those
        // elements against the selectors, and including any matched
        // nodes in the set that are affected by the characterData
        // change (because the text content change applies to all of
        // them, even if the observer only fires it for the affected
        // text node).
        // Also dedupe elements here because the same element could have
        // been returned by multiple mutation types.
        return [ ... new Set(mutations.map(m => [
            m.type === "childList" ? Array.from(m.addedNodes) : [],
            m.type === "attributes" ? m.target : [],
            m.type === "characterData" ? WaitForElements._getElementsFromElementToRoot(m.target.parentElement, this.options.target) : [],
        ]).flat(Infinity)) ];
    }


    _handleMutations(mutations)
    {
        "use strict";

        let els = this._getElementsFromMutations(mutations);

        els = WaitForElements._getElementsMatchingSelectors(els,
            this.options.selectors);

        els = this._applyFilters(els);

        if (els.length !== 0)
        {
            if (this.options.verbose)
            {
                console.log("match(), mutations:", mutations);
                console.log("match(), matched in mutations:", els);
            }
        }

        return els;
    }


    _setupTimeout(onTimeoutFn)
    {
        "use strict";

        this.timerId = window.setTimeout(() => {
            this.observer.disconnect();

            onTimeoutFn(new Error(`Failed to find elements matching ${this.options.selectors} within ${this.options.timeout} milliseconds`));
        }, this.options.timeout);
    }


    _clearTimeout()
    {
        "use strict";

        if (this.timerId !== null)
            window.clearTimeout(this.timerId);
    }


    _disconnectObserver()
    {
        "use strict";

        if (this.observer !== null)
            this.observer.disconnect();
    }


    _startMatching(onMatchFn, onTimeoutFn)
    {
        "use strict";

        if (this.options.verbose)
        {
            console.log("match(), waiting for selectors:", this.options.selectors);
        }

        if (!this.options.skipExisting)
        {
            let els = this._getExistingElements();
            if (els.length > 0)
            {
                onMatchFn(els);

                // if not ongoing matching, return as soon as we have
                // existing elements.
                if (!this.options.isOngoing)
                    return;
            }
        }

        this.observer = new MutationObserver(mutations => {
            let els = this._handleMutations(mutations, onMatchFn);

            if (!this.options.isOngoing)
            {
                this._disconnectObserver();
                this._clearTimeout();
            }

            onMatchFn(els);
        });

        this.observer.observe(this.options.target, this.options.observerOptions);

        if (this.options.timeout === -1)
            return;

        this._setupTimeout(onTimeoutFn);
    }


    match(onMatchFn, onTimeoutFn)
    {
        "use strict";

        if (this.options.isOngoing)
        {
            onMatchFn = onMatchFn ?? (() => undefined);
            onTimeoutFn = onTimeoutFn ?? (() => undefined);

            this._startMatching(onMatchFn, onTimeoutFn);
            return;
        }

        return new Promise((resolve, reject) => {
            this._startMatching(resolve, reject);
        });
    }


    stop()
    {
        "use strict";

        // XXX: if there is an ongoing or waiting match, disconnect its
        // observer and delete any timer ID
    }


}   // class WaitForElements

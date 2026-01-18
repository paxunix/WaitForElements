/* jshint esversion: 11, browser: true */

class WaitForElements
{
    static _version = "2.1.0";

    constructor(options)
    {
        "use strict";

        this.options = WaitForElements._normalizeOptions(options ?? {});
        this.seen = new Map();
        this.observer = null;
        this.timerId = null;
        this.intersectionObservers = new Map();
        this.pendingVisible = null;
        this.pendingVisibleScheduled = false;
        this.stopped = false;
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
            filter: null,
            allowMultipleMatches: false,
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
            requireVisible: false,
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

        if (!this.options.filter)
            return newels;

        let oldlen = newels.length;

        newels = this.options.filter(newels);

        if (this.options.verbose)
            console.log("Elements after applying filter:", newels);

        return newels;
    }


    _getMatchingElements()
    {
        "use strict";

        let els = WaitForElements._getElementsMatchingSelectors([this.options.target], this.options.selectors);

        if (this.options.verbose)
            if (els.length > 0)
                console.log("Found existing elements matching selectors:", els);

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

        if (this.options.verbose == 2)
        {
            console.log("Mutations:", mutations);
        }

        let els = this._getElementsFromMutations(mutations);

        els = WaitForElements._getElementsMatchingSelectors(els,
            this.options.selectors);

        if (els.length !== 0)
        {
            if (this.options.verbose)
                console.log("Found mutated elements matching selectors:", els);
        }

        return els;
    }

    _queueVisibleMatch(el, onMatchFn)
    {
        "use strict";

        if (this.options.allowMultipleMatches)
        {
            let filtered = this._applyFilters([el]);
            if (filtered.length > 0)
                onMatchFn(filtered);
            return;
        }

        // pendingVisible is the microtask queue buffer for elements that
        // became visible if allowMultipleMatches is false.  Multiple
        // elements can intersect in the same tick (or in rapid succession)
        // and we push them into pendingVisible so they can be delivered as
        // a single batch to onMatchFn after the current call stack.
        if (!this.pendingVisible)
            this.pendingVisible = [];

        this.pendingVisible.push(el);

        // pendingVisibleScheduled is the guard that ensures only one
        // queueMicrotask is scheduled at a time.  Without it, every visible
        // element would schedule its own microtask, potentially calling
        // stop/onMatchFn multiple times and defeating the "single match"
        // behavior. It also lets _disconnectObserver reset state cleanly
        // when stopping.
        if (!this.pendingVisibleScheduled)
        {
            this.pendingVisibleScheduled = true;
            queueMicrotask(() => {
                let pending = this.pendingVisible;
                this.pendingVisible = null;
                this.pendingVisibleScheduled = false;

                if (!pending || pending.length === 0)
                    return;

                let filtered = this._applyFilters(pending);
                if (filtered.length === 0)
                    return;

                this.stop();
                onMatchFn(filtered);
            });
        }
    }


    _waitForElementToIntersect(el, options, onVisible)
    {
        return new Promise((resolve, reject) => {
            let root = options.intersectionOptions?.root ?? null;

            if (root !== null)
            {
                if (!(root instanceof Element))
                {
                    /* istanbul ignore next */
                    if (options.verbose)
                        console.warn("intersectionOptions.root is not an Element; skipping observe", root);

                    return;
                }

                if (!root.isConnected && options.verbose)
                    console.warn("intersectionOptions.root is not connected; intersections may never fire", root);

                if (!root.contains(el))
                {
                    /* istanbul ignore next */
                    if (options.verbose)
                        console.warn("Element is not contained within intersectionOptions.root; skipping observe", el, root);

                    return;
                }
            }

            let prevIntersecting = false;
            let obs = new IntersectionObserver((entries) => {
                for (let entry of entries)
                {
                    let nowIntersecting = entry.isIntersecting;
                    if (!prevIntersecting && nowIntersecting)
                    {
                        if (!options.allowMultipleMatches)
                        {
                            obs.unobserve(el);
                            obs.disconnect();
                            this.intersectionObservers.delete(el);
                        }

                        try {
                            // We need an explicit callback here because the
                            // promise resolves only once;
                            // allowMultipleMatches relies on repeated
                            // observer callbacks to emit multiple visible
                            // matches, so this ensures the original
                            // callback function is invoked.
                            if (onVisible) onVisible(el);
                            resolve(el);
                        } catch (err) {
                            reject(err);
                        }
                    }

                    prevIntersecting = nowIntersecting;
                }
            }, options.intersectionOptions);

            let existingObs = this.intersectionObservers.get(el);
            if (existingObs)
                existingObs.disconnect();
            obs.observe(el);
            this.intersectionObservers.set(el, obs);
        });
    }

    // --- timeout / mutation observer lifecycle ---
    _setupTimeout(onTimeoutFn)
    {
        "use strict";

        this.timerId = window.setTimeout(() => {

            if (this.options.verbose)
            {
                console.log(`Timeout ${this.options.timeout} reached for selectors:`, this.options.selectors);
            }

            this.stop();

            onTimeoutFn(new Error(`Timeout ${this.options.timeout} reached waiting for selectors`));
        }, this.options.timeout);
    }


    _clearTimeout()
    {
        "use strict";

        if (this.timerId !== null)
        {
            window.clearTimeout(this.timerId);
            this.timerId = null;
        }
    }


    _disconnectObserver()
    {
        "use strict";

        if (this.observer !== null)
        {
            if (this.options.verbose)
            {
                console.log("Disconnecting observer for selectors:", this.options.selectors);
            }

            this.observer.disconnect();
            this.observer = null;
        }

        if (this.intersectionObservers.size > 0)
        {
            for (let obs of this.intersectionObservers.values())
                obs.disconnect();
            this.intersectionObservers.clear();
        }

        this.pendingVisible = null;
        this.pendingVisibleScheduled = false;
    }


    _continueMatching(onMatchFn)
    {
        "use strict";

        this.observer = new MutationObserver(mutations => {
            let els = this._handleMutations(mutations);
            if (els.length === 0) return;

            if (this.options.requireVisible)
            {
                // For each candidate, create a per-element
                // IntersectionObserver and call onMatchFn when visible
                for (let el of els)
                {
                    if (this.intersectionObservers.has(el))
                        continue;

                    this._waitForElementToIntersect(el, this.options,
                        (element) => this._queueVisibleMatch(element, onMatchFn));
                }
            }
            else
            {
                let filtered = this._applyFilters(els);

                if (filtered.length === 0)
                {
                    if (this.options.verbose == 2)
                        console.log("No mutated elements matched after filters");

                    filtered = null;
                }

                if (filtered)
                    onMatchFn(filtered);

                if (filtered && !this.options.allowMultipleMatches)
                {
                    this.stop();
                    return;
                }
            }
        });

        this.observer.observe(this.options.target, this.options.observerOptions);
    }


    _startMatching(onMatchFn, onTimeoutFn)
    {
        "use strict";

        if (this.stopped)
            throw new Error("WaitForElements instance is stopped and cannot be restarted");

        if (this.options.verbose)
        {
            console.log("Waiting for selectors:", this.options.selectors);
        }

        if (!this.options.skipExisting || this.options.requireVisible)
        {
            let els = this._getMatchingElements();
            if (els.length > 0)
            {
                if (this.options.requireVisible)
                {
                    // If elements already exist and requireVisible is true,
                    // wait per element.
                    for (let el of els)
                    {
                        if (this.intersectionObservers.has(el))
                            continue;

                        this._waitForElementToIntersect(el, this.options,
                            (element) => this._queueVisibleMatch(element, onMatchFn));
                    }
                }
                else
                {
                    let filtered = this._applyFilters(els);
                    if (filtered.length === 0)
                    {
                        if (this.options.verbose == 2)
                            console.log("No mutated elements matched after filters");
                    }
                    else
                    {
                        onMatchFn(filtered);

                        if (!this.options.allowMultipleMatches)
                        {
                            this.stop();
                            return;
                        }
                    }
                }
            }
        }

        this._continueMatching(onMatchFn);

        if (this.options.timeout !== -1)
            this._setupTimeout(onTimeoutFn);
    }


    match(onMatchFn, onTimeoutFn)
    {
        "use strict";

        if ((onMatchFn ?? null) || (onTimeoutFn ?? null))
        {
            onMatchFn = onMatchFn ?? (() => undefined);
            onTimeoutFn = onTimeoutFn ?? (() => undefined);

            this._startMatching(onMatchFn, onTimeoutFn);
            return;
        }

        return (new Promise((resolve, reject) => {
            this._startMatching(resolve, reject);
        })).finally(() => {
            this.stop();
        });
    }


    stop()
    {
        "use strict";

        this.stopped = true;
        this._disconnectObserver();
        this._clearTimeout();
    }

}

// Export for module consumers (if used as a module)
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = WaitForElements;
} else {
    window.WaitForElements = WaitForElements;
}

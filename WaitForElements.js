/* jshint esversion: 11, browser: true */

class WaitForElements
{

    static _version = "2.0.4";


    constructor(options)
    {
        "use strict";

        this.options = WaitForElements._normalizeOptions(options ?? {});
        this.seen = new Map();
        this.observer = null;
        this.visibilityObserver = null;
        this.visibilityPending = new Map();
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


    static checkVisibility(el, options)
    {
        "use strict";

        if (!(el instanceof Element))
            return false;

        return Boolean(el.checkVisibility())
            && WaitForElements.isOverlappingRootBounds(el, options);
    }


    static isOverlappingRootBounds(el, options)
    {
        "use strict";

        if (!(el instanceof Element))
            return false;

        let rect = el.getBoundingClientRect();
        let rootRect = null;

        if (options?.root instanceof Element)
            rootRect = options.root.getBoundingClientRect();

        let viewportTop = rootRect ? rootRect.top : 0;
        let viewportLeft = rootRect ? rootRect.left : 0;
        let viewportRight = rootRect ? rootRect.right : window.innerWidth;
        let viewportBottom = rootRect ? rootRect.bottom : window.innerHeight;

        if ((options?.threshold ?? 0) < 1)
        {
            return rect.bottom > viewportTop
                && rect.top < viewportBottom
                && rect.right > viewportLeft
                && rect.left < viewportRight;
        }

        return rect.top >= viewportTop
            && rect.bottom <= viewportBottom
            && rect.left >= viewportLeft
            && rect.right <= viewportRight;
    }


    static isInViewport(el, options)
    {
        "use strict";

        return WaitForElements.isOverlappingRootBounds(el, options);
    }


    static isVisibleDefault(el, options)
    {
        "use strict";

        return WaitForElements.checkVisibility(el, options);
    }


    static _normalizeOptions(options, defaults)
    {
        "use strict";

        let builtinDefaults = {
            target: document.body,
            selectors: [],
            filter: null,
            visibility: null,
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

        if (!this.options.filter)
            return els;

        let newels = this.options.onlyOnce ?
            this._filterOutSeenElements(els) :
            els;

        let oldlen = newels.length;

        newels = this.options.filter(newels);

        if (this.options.verbose)
            console.log("Elements after applying filter:", newels);

        return newels;
    }


    _getElementsFiltered()
    {
        "use strict";

        let els = WaitForElements._getElementsMatchingSelectors([this.options.target], this.options.selectors);

        if (this.options.verbose)
            if (els.length > 0)
                console.log("Found existing elements matching selectors:", els);

        els = this._applyFilters(els);

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

        els = this._applyFilters(els);

        return els;
    }


    _setupTimeout(onTimeoutFn)
    {
        "use strict";

        this.timerId = window.setTimeout(() => {

            if (this.options.verbose)
            {
                console.log(`Timeout ${this.options.timeout} reached for selectors:`, this.options.selectors);
            }

            this.stop();

            onTimeoutFn();
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

    _getVisibilityOptions()
    {
        "use strict";

        return {
            root: this.options.target,
            ...(this.options.visibility ?? {}),
        };
    }


    _setupVisibilityObserver(onMatchFn)
    {
        "use strict";

        if (this.visibilityObserver !== null)
            return;

        this.visibilityObserver = new IntersectionObserver(entries => {
            this._handleVisibilityEntries(entries, onMatchFn);
        }, this._getVisibilityOptions());
    }


    _handleVisibilityEntries(entries, onMatchFn)
    {
        "use strict";

        let visibleEls = [];

        for (let entry of entries)
        {
            let el = entry.target;

            if (!this.visibilityPending.has(el))
                continue;

            if (entry.isIntersecting)
            {
                this.visibilityPending.delete(el);
                this.visibilityObserver.unobserve(el);
                visibleEls.push(el);
            }
        }

        if (visibleEls.length > 0)
        {
            onMatchFn(visibleEls);

            if (!this.options.allowMultipleMatches)
            {
                this.stop();
            }
        }
    }


    _applyVisibility(els, onMatchFn)
    {
        "use strict";

        if (!this.options.visibility)
        {
            if (els.length > 0)
            {
                onMatchFn(els);

                if (!this.options.allowMultipleMatches)
                {
                    this.stop();
                    return true;
                }
            }

            return false;
        }

        let visibilityOptions = this._getVisibilityOptions();
        let visibleNow = [];

        for (let el of els)
        {
            if (WaitForElements.isOverlappingRootBounds(el, visibilityOptions))
            {
                visibleNow.push(el);
            }
            else if (!this.visibilityPending.has(el))
            {
                this.visibilityPending.set(el, true);
                this._setupVisibilityObserver(onMatchFn);
                this.visibilityObserver.observe(el);
            }
        }

        if (visibleNow.length > 0)
        {
            onMatchFn(visibleNow);

            if (!this.options.allowMultipleMatches)
            {
                this.stop();
                return true;
            }
        }

        return false;
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
    }


    _disconnectVisibilityObserver()
    {
        "use strict";

        if (this.visibilityObserver !== null)
        {
            this.visibilityObserver.disconnect();
            this.visibilityObserver = null;
        }

        this.visibilityPending.clear();
    }


    _continueMatching(onMatchFn)
    {
        "use strict";

        this.observer = new MutationObserver(mutations => {
            let els = this._handleMutations(mutations);

            if (els.length > 0)
            {
                this._applyVisibility(els, onMatchFn);
            }
        });

        this.observer.observe(this.options.target, this.options.observerOptions);
    }


    _startMatching(onMatchFn, onTimeoutFn)
    {
        "use strict";

        if (this.options.verbose)
        {
            console.log("Waiting for selectors:", this.options.selectors);
        }

        if (!this.options.skipExisting)
        {
            let els = this._getElementsFiltered();
            if (els.length > 0)
            {
                if (this._applyVisibility(els, onMatchFn))
                    return;
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

        this._disconnectObserver();
        this._disconnectVisibilityObserver();
        this._clearTimeout();
    }


}   // class WaitForElements

/* jshint esversion: 11, browser: true */
/* globals describe, beforeAll, afterEach, it, expect, WaitForElements, jasmine, beforeEach, spyOn, expectAsync */

describe("WaitForElements", function() {


beforeAll(function() {
    this._maindiv = document.createElement("div");
    this._maindiv.id = "_maindiv";

    document.body.appendChild(this._maindiv);
});


afterEach(function() {
    this._maindiv.innerHTML = "";
});


describe("_querySelectors", function() {


    it("returns empty list if target is not an Element", function() {
        expect(WaitForElements._querySelectors("a string", "*"))
            .toEqual([]);
    });


    it("accepts a single selector", function() {
        this._maindiv.innerHTML = "<span>span1</span> <span>span2</span>";
        expect(WaitForElements._querySelectors(this._maindiv, "span"))
            .toEqual(Array.from(this._maindiv.querySelectorAll("span")));
    });


    it("accepts an array of selectors", function() {
        this._maindiv.innerHTML = "<span>span1</span> <p>p1</p> <span>span2</span>";
        expect(WaitForElements._querySelectors(this._maindiv, [ "span", "p" ]))
            .toEqual([Array.from(this._maindiv.querySelectorAll("span")),
                Array.from(this._maindiv.querySelectorAll("p"))].flat(Infinity)
            );
    });


    it("root element included if it matches selectors", function() {
        this._maindiv.innerHTML = "<span>span1</span>";
        expect(WaitForElements._querySelectors(this._maindiv, [ "*" ]))
            .toEqual([this._maindiv,
                Array.from(this._maindiv.querySelectorAll("span"))].flat(Infinity)
            );
    });


    it("returned elements are unique", function() {
        this._maindiv.innerHTML = "<span id=span1>span1</span> <p id=p1>p1</p> <span id=span2>span2</span>";
        // since the first selector is *, all the found nodes will be in
        // document order and the subsequent selectors will de-dupe to
        // those.
        expect(WaitForElements._querySelectors(this._maindiv, [ "*", "span", "span,p" ]))
            .toEqual([this._maindiv,
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#p1"),
                this._maindiv.querySelector("#span2"),
                ].flat(Infinity)
            );
    });


    it("if no matches found at or beneath root element, return empty", function() {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
                <span id=span3>
                    <p id=p2>p2</p>
                    span3
                </span>
             </div>
        </span>
        `;
        let el = this._maindiv.querySelector("#interdiv");

        expect(WaitForElements._querySelectors(el, "#p2"))
            .toEqual([]);
    });


    it("returns empty list when selectors array is empty", function() {
        this._maindiv.innerHTML = "<span>span1</span>";
        expect(WaitForElements._querySelectors(this._maindiv, []))
            .toEqual([]);
    });


    it("throws on invalid selector", function() {
        this._maindiv.innerHTML = "<span>span1</span>";
        expect(() => WaitForElements._querySelectors(this._maindiv, "span["))
            .toThrowError(DOMException);
    });

});


describe("_getElementsFromElementToRoot", function() {


    it("returns empty list if start is not an Element", function() {
        expect(WaitForElements._getElementsFromElementToRoot("a string"))
            .toEqual([]);
    });


    it("if root element not found from start element, return empty", function() {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
                <span id=span3>
                    <p id=p2>p2</p>
                    span3
                </span>
             </div>
        </span>
        `;
        let el = this._maindiv.querySelector("#p1");
        let rootEl = this._maindiv.querySelector("#otherdiv");

        expect(WaitForElements._getElementsFromElementToRoot(el, rootEl))
            .toEqual([]);
    });


    it("return all elements from start to root, including both", function() {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
                <span id=span3>
                    <p id=p2>p2</p>
                    span3
                </span>
             </div>
        </span>
        `;
        let el = this._maindiv.querySelector("#p2");

        expect(WaitForElements._getElementsFromElementToRoot(el, this._maindiv))
            .toEqual([
                this._maindiv,
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#otherdiv"),
                this._maindiv.querySelector("#span3"),
                this._maindiv.querySelector("#p2"),
            ]);
    });


    it("returns root element when start is root", function() {
        expect(WaitForElements._getElementsFromElementToRoot(this._maindiv, this._maindiv))
            .toEqual([this._maindiv]);
    });


    it("returns empty list if root is not an Element", function() {
        let el = document.createElement("div");
        expect(WaitForElements._getElementsFromElementToRoot(el, "not an element"))
            .toEqual([]);
    });

});


describe("visibility helpers", function() {


    it("checkVisibility returns false for non-elements", function() {
        expect(WaitForElements.checkVisibility("nope")).toBeFalse();
    });


    it("checkVisibility passes threshold to viewport check", function() {
        let el = document.createElement("div");
        el.checkVisibility = () => true;
        let spy_iv = spyOn(WaitForElements, "isOverlappingRootBounds").and.returnValue(true);

        expect(WaitForElements.checkVisibility(el, { threshold: 1 })).toBeTrue();
        expect(spy_iv).toHaveBeenCalledWith(el, { threshold: 1 });
    });


    it("checkVisibility returns false when element not visible", function() {
        let el = document.createElement("div");
        el.checkVisibility = () => false;
        let spy_iv = spyOn(WaitForElements, "isOverlappingRootBounds").and.returnValue(true);

        expect(WaitForElements.checkVisibility(el, { threshold: 0 })).toBeFalse();
        expect(spy_iv).not.toHaveBeenCalled();
    });


    it("checkVisibility returns false when outside root bounds", function() {
        let el = document.createElement("div");
        el.checkVisibility = () => true;
        spyOn(WaitForElements, "isOverlappingRootBounds").and.returnValue(false);

        expect(WaitForElements.checkVisibility(el, { threshold: 0 })).toBeFalse();
    });


    it("isInViewport returns true when element intersects viewport", function() {
        let el = document.createElement("div");
        spyOn(el, "getBoundingClientRect").and.returnValue({
            top: 0,
            left: 0,
            right: 50,
            bottom: 50,
        });

        let originalWidth = window.innerWidth;
        let originalHeight = window.innerHeight;
        window.innerWidth = 100;
        window.innerHeight = 100;

        expect(WaitForElements.isOverlappingRootBounds(el)).toBeTrue();
        expect(WaitForElements.isInViewport(el)).toBeTrue();

        window.innerWidth = originalWidth;
        window.innerHeight = originalHeight;
    });


    it("isInViewport returns false when element is outside viewport", function() {
        let el = document.createElement("div");
        spyOn(el, "getBoundingClientRect").and.returnValue({
            top: 200,
            left: 200,
            right: 250,
            bottom: 250,
        });

        let originalWidth = window.innerWidth;
        let originalHeight = window.innerHeight;
        window.innerWidth = 100;
        window.innerHeight = 100;

        expect(WaitForElements.isOverlappingRootBounds(el)).toBeFalse();
        expect(WaitForElements.isInViewport(el)).toBeFalse();

        window.innerWidth = originalWidth;
        window.innerHeight = originalHeight;
    });


    it("isInViewport uses root bounds when provided", function() {
        let el = document.createElement("div");
        let root = document.createElement("div");
        spyOn(el, "getBoundingClientRect").and.returnValue({
            top: 40,
            left: 40,
            right: 60,
            bottom: 60,
        });
        spyOn(root, "getBoundingClientRect").and.returnValue({
            top: 0,
            left: 0,
            right: 50,
            bottom: 50,
        });

        expect(WaitForElements.isOverlappingRootBounds(el, { root })).toBeTrue();
    });


    it("isInViewport requires full visibility when threshold is 1", function() {
        let el = document.createElement("div");
        spyOn(el, "getBoundingClientRect").and.returnValue({
            top: -10,
            left: 0,
            right: 50,
            bottom: 50,
        });

        let originalWidth = window.innerWidth;
        let originalHeight = window.innerHeight;
        window.innerWidth = 100;
        window.innerHeight = 100;

        expect(WaitForElements.isOverlappingRootBounds(el, { threshold: 0 })).toBeTrue();
        expect(WaitForElements.isOverlappingRootBounds(el, { threshold: 1 })).toBeFalse();

        window.innerWidth = originalWidth;
        window.innerHeight = originalHeight;
    });


    it("isOverlappingRootBounds returns false for non-elements", function() {
        expect(WaitForElements.isOverlappingRootBounds("nope")).toBeFalse();
    });


    it("isOverlappingRootBounds requires full visibility for threshold >= 1", function() {
        let el = document.createElement("div");
        spyOn(el, "getBoundingClientRect").and.returnValue({
            top: 10,
            left: 10,
            right: 40,
            bottom: 40,
        });

        let originalWidth = window.innerWidth;
        let originalHeight = window.innerHeight;
        window.innerWidth = 50;
        window.innerHeight = 50;

        expect(WaitForElements.isOverlappingRootBounds(el, { threshold: 1 })).toBeTrue();

        window.innerWidth = originalWidth;
        window.innerHeight = originalHeight;
    });


    it("isOverlappingRootBounds falls back to viewport when root is not an element", function() {
        let el = document.createElement("div");
        spyOn(el, "getBoundingClientRect").and.returnValue({
            top: 0,
            left: 0,
            right: 10,
            bottom: 10,
        });

        let originalWidth = window.innerWidth;
        let originalHeight = window.innerHeight;
        window.innerWidth = 100;
        window.innerHeight = 100;

        expect(WaitForElements.isOverlappingRootBounds(el, { root: "nope" })).toBeTrue();

        window.innerWidth = originalWidth;
        window.innerHeight = originalHeight;
    });


    it("isVisibleDefault requires both checkVisibility and isInViewport", function() {
        let el = document.createElement("div");
        let originalCheckVisibility = WaitForElements.checkVisibility;
        let spy_cv = spyOn(WaitForElements, "checkVisibility").and.returnValue(false);

        expect(WaitForElements.isVisibleDefault(el)).toBeFalse();
        expect(spy_cv).toHaveBeenCalledWith(el, undefined);

        spy_cv.and.returnValue(true);

        expect(WaitForElements.isVisibleDefault(el)).toBeTrue();

        WaitForElements.checkVisibility = originalCheckVisibility;
    });


    it("isVisibleDefault passes options through to checkVisibility", function() {
        let el = document.createElement("div");
        let spy_cv = spyOn(WaitForElements, "checkVisibility").and.returnValue(true);

        expect(WaitForElements.isVisibleDefault(el, { threshold: 1 })).toBeTrue();
        expect(spy_cv).toHaveBeenCalledWith(el, { threshold: 1 });
    });


});


describe("_normalizeOptions", function() {


    it("sets builtin default options", function() {
        expect(WaitForElements._normalizeOptions({}))
            .toEqual({
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
            });
    });


    it("can set own defaults to override builtin defaults", function() {
        expect(WaitForElements._normalizeOptions({ }, { timeout: 4242 } ))
            .toEqual({
                target: document.body,
                selectors: [],
                filter: null,
                visibility: null,
                allowMultipleMatches: false,
                onlyOnce: false,
                skipExisting: false,
                timeout: 4242,
                observerOptions: {
                    attributeOldValue: true,
                    attributes: true,
                    characterDataOldValue: true,
                    characterData: true,
                    childList: true,
                    subtree: true,
                },
                verbose: false,
            });
        });


    it("defaults don't override given options", function() {
        expect(WaitForElements._normalizeOptions({ timeout: 42 }, { timeout: 4242 } ))
            .toEqual({
                target: document.body,
                selectors: [],
                filter: null,
                visibility: null,
                onlyOnce: false,
                allowMultipleMatches: false,
                skipExisting: false,
                timeout: 42,
                observerOptions: {
                    attributeOldValue: true,
                    attributes: true,
                    characterDataOldValue: true,
                    characterData: true,
                    childList: true,
                    subtree: true,
                },
                verbose: false,
            });
        });


    it("custom options override defaults", function() {
        let customFilter = () => [];
        expect(WaitForElements._normalizeOptions({
            selectors: [ "div" ],
            filter: customFilter,
            visibility: { threshold: 0.5 },
            observerOptions: { subtree: false },
            verbose: true,
        })).toEqual({
            target: document.body,
            selectors: [ "div" ],
            filter: customFilter,
            visibility: { threshold: 0.5 },
            allowMultipleMatches: false,
            onlyOnce: false,
            skipExisting: false,
            timeout: -1,
            observerOptions: { subtree: false },
            verbose: true,
        });
    });


});


describe("_getElementsMatchingSelectors", function() {


    it("returns de-duped elements matching given selectors", function() {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
                <span id=span3>
                    <p id=p2>p2</p>
                    span3
                </span>
             </div>
        </span>
        `;

        expect(WaitForElements._getElementsMatchingSelectors([
                this._maindiv.querySelector("#span2"),
                this._maindiv.querySelector("#otherdiv") ],
                [ "*", "p", "span" ]))
            .toEqual([
                this._maindiv.querySelector("#span2"),
                this._maindiv.querySelector("#p1"),
                this._maindiv.querySelector("#otherdiv"),
                this._maindiv.querySelector("#span3"),
                this._maindiv.querySelector("#p2"),
            ]);
    });

});


describe("constructor", function() {


    it("usable default object", function() {
        expect(new WaitForElements())
            .toEqual(jasmine.objectContaining({
                options: {
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
                },
                seen: jasmine.any(Map),
                observer: null,
                visibilityObserver: null,
                visibilityPending: jasmine.any(Map),
                timerId: null,
            }));
    });


});


describe("_filterOutSeenElements", function() {


    it("keep elements not previously seen, filter out the rest", function() {
        let waiter = new WaitForElements();
        let o1 = {};
        let o2 = {};
        expect(waiter._filterOutSeenElements([ o1, o2, o1, o2 ]))
            .toEqual([ o1, o2 ]);
    });


});


describe("_getElementsFiltered", function() {


    it("returns existing elements that have not been matched", function() {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
                <span id=span3>
                    <p id=p2>p2</p>
                    span3
                </span>
             </div>
        </span>
        `;

        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: "span",
        });

        expect(waiter._getElementsFiltered())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
                this._maindiv.querySelector("#span3"),
            ]);
    });


    it("filter function filters out matched elements", function() {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        <span id=span3>span3</span>
        `;

        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: "span",
            filter: els => els.filter(e => e.id !== "span2"),
        });

        expect(waiter._getElementsFiltered())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span3"),
            ]);
    });


    it("filter function filters out matched elements after seen-check", function() {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;

        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: "span",
            onlyOnce: true,
            filter: els => els.filter(e => e.id !== "span3"),
        });

        expect(waiter._getElementsFiltered())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
            ]);

        let newspan = document.createElement("span");
        newspan.id = "span3";
        this._maindiv.append(newspan);

        expect(waiter._getElementsFiltered())
            .toEqual([ ]);
    });


    it("dedupes returned elements", function() {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;

        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: [ "span", "#span1", "#span2" ]
        });

        expect(waiter._getElementsFiltered())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
            ]);
    });

    it("logs when verbose and elements are found", function() {
        this._maindiv.innerHTML = `<span id=span1>span1</span>`;
        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: "span",
            verbose: true,
        });
        let logSpy = spyOn(console, "log");

        waiter._getElementsFiltered();

        expect(logSpy).toHaveBeenCalledWith(
            "Found existing elements matching selectors:",
            [ this._maindiv.querySelector("#span1") ]
        );
    });

});


describe("_setupTimeout", function() {

    beforeEach(function() {
        jasmine.clock().install();
    });

    afterEach(function() {
        jasmine.clock().uninstall();
    });


    it("sets a timeout, after which it disconnects the observer and calls the callback", function () {
        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: [ "span" ],
            timeout: 10000,
        });

        let callbackFn = jasmine.createSpy("timeoutCallbackFn");

        // Fake the observer so it can be disconnected
        waiter.observer = jasmine.createSpyObj("fakeObserver", [ "disconnect" ]);
        waiter._setupTimeout(callbackFn);

        jasmine.clock().tick(10000);

        expect(waiter.observer).toBe(null);
        expect(callbackFn).toHaveBeenCalledTimes(1);
    });

});


describe("_getElementsFromMutations", function() {

    it("childlist mutation", function() {
        let waiter = new WaitForElements();
        let newdiv = document.createElement("div");
        let mut = {
            type: "childList",
            addedNodes: [ newdiv, newdiv ],
        };

        // doubled to verify de-deduping
        expect(waiter._getElementsFromMutations([mut, mut]))
            .toEqual([newdiv]);
    });


    it("attributes mutation", function() {
        let waiter = new WaitForElements();
        let newdiv = document.createElement("div");
        let mut = {
            type: "attributes",
            target: newdiv,
        };

        // doubled to verify de-deduping
        expect(waiter._getElementsFromMutations([mut, mut]))
            .toEqual([newdiv]);
    });


    it("characterData mutation", function() {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let div = this._maindiv.querySelector("#otherdiv");
        let waiter = new WaitForElements({
                target: this._maindiv.querySelector("#span1"),
                selectors: [ "*" ]
            });
        let mut = {
            type: "characterData",
            target: div.firstChild,     // characterData mutation target is
                                        // the text node, not the element
                                        // that contains it
        };

        // doubled to verify de-deduping
        expect(waiter._getElementsFromMutations([mut, mut]))
            .toEqual([this._maindiv.querySelector("#span1"), div]);
    });

    it("characterData mutation with detached text node returns empty", function() {
        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: [ "*" ]
        });
        let textNode = document.createTextNode("detached");
        let mut = {
            type: "characterData",
            target: textNode,
        };

        expect(waiter._getElementsFromMutations([mut]))
            .toEqual([]);
    });
});


describe("_applyFilters", function() {

    it("if onyOnce is true, filters out seen elements", function() {
        let filterSpy = jasmine.createSpy("filterSpy", els => els).and.callThrough();
        let waiter = new WaitForElements({
            onlyOnce: true,
            filter: filterSpy,
        });
        let spy_fose = spyOn(waiter, "_filterOutSeenElements").and.callThrough();

        let o1 = {};
        let o2 = {};
        let els = waiter._applyFilters([ o1, o2, o1, o2]);

        expect(els).toEqual([o1, o2]);
        expect(spy_fose).toHaveBeenCalledOnceWith([o1, o2, o1, o2]);
        expect(spy_fose).toHaveBeenCalledBefore(filterSpy);
        expect(filterSpy).toHaveBeenCalledOnceWith([o1, o2]);
    });

    it("if onyOnce is false, does not filter out seen elements", function() {
        let filterSpy = jasmine.createSpy("filterSpy", els => els).and.callThrough();
        let waiter = new WaitForElements({
            onlyOnce: false,
            filter: filterSpy,
        });
        let spy_fose = spyOn(waiter, "_filterOutSeenElements").and.callThrough();

        let o1 = {};
        let o2 = {};
        let els = waiter._applyFilters([ o1, o2, o1, o2]);

        expect(els).toEqual([o1, o2, o1, o2]);
        expect(spy_fose).not.toHaveBeenCalled();
        expect(filterSpy).toHaveBeenCalledOnceWith([o1, o2, o1, o2]);
    });

    it("returns original elements when filter is not set", function() {
        let waiter = new WaitForElements({ filter: null });
        let o1 = {};
        let o2 = {};
        expect(waiter._applyFilters([ o1, o2 ])).toEqual([ o1, o2 ]);
    });

    it("onlyOnce filters even without filter function", function() {
        let waiter = new WaitForElements({ onlyOnce: true, filter: null });
        let o1 = {};
        let o2 = {};
        expect(waiter._applyFilters([ o1, o2, o1 ])).toEqual([ o1, o2, o1 ]);
    });

});


describe("_applyVisibility", function() {

    beforeEach(function() {
        this._originalIntersectionObserver = window.IntersectionObserver;
        this._originalIsOverlappingRootBounds = WaitForElements.isOverlappingRootBounds;
    });

    afterEach(function() {
        window.IntersectionObserver = this._originalIntersectionObserver;
        WaitForElements.isOverlappingRootBounds = this._originalIsOverlappingRootBounds;
    });


    it("defers matches until elements become visible", function() {
        let visible = false;
        let observerInstance;

        class FakeIntersectionObserver {
            constructor(callback, options) {
                this.callback = callback;
                this.options = options;
                this.observed = new Set();
                observerInstance = this;
            }
            observe(el) {
                this.observed.add(el);
            }
            unobserve(el) {
                this.observed.delete(el);
            }
            disconnect() {
                this.observed.clear();
            }
            trigger(entries) {
                this.callback(entries);
            }
        }

        window.IntersectionObserver = FakeIntersectionObserver;

        let waiter = new WaitForElements({
            visibility: {},
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");
        spyOn(WaitForElements, "isOverlappingRootBounds").and.callFake(() => visible);

        let el = document.createElement("div");
        waiter._applyVisibility([el], onMatchFn);

        expect(observerInstance.options.root).toBe(waiter.options.target);
        expect(observerInstance.options.rootMargin).toBeUndefined();
        expect(observerInstance.options.threshold).toBeUndefined();
        expect(onMatchFn).not.toHaveBeenCalled();
        expect(observerInstance.observed.has(el)).toBeTrue();

        visible = true;
        observerInstance.trigger([{ target: el, isIntersecting: true }]);

        expect(onMatchFn).toHaveBeenCalledOnceWith([el]);
    });


    it("returns matches immediately when already visible", function() {
        class FakeIntersectionObserver {
            constructor() {
                throw new Error("IntersectionObserver should not be used");
            }
        }

        window.IntersectionObserver = FakeIntersectionObserver;

        let waiter = new WaitForElements({
            visibility: {},
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");
        spyOn(WaitForElements, "isOverlappingRootBounds").and.returnValue(true);

        let el = document.createElement("div");
        waiter._applyVisibility([el], onMatchFn);

        expect(onMatchFn).toHaveBeenCalledOnceWith([el]);
    });

    it("stops matching when allowMultipleMatches is false", function() {
        window.IntersectionObserver = jasmine.createSpy("IntersectionObserver");
        let waiter = new WaitForElements({
            visibility: {},
            allowMultipleMatches: false,
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");
        spyOn(WaitForElements, "isOverlappingRootBounds").and.returnValue(true);
        let spy_stop = spyOn(waiter, "stop").and.callThrough();

        let el = document.createElement("div");
        let shouldStop = waiter._applyVisibility([el], onMatchFn);

        expect(shouldStop).toBeTrue();
        expect(onMatchFn).toHaveBeenCalledOnceWith([el]);
        expect(spy_stop).toHaveBeenCalled();
    });

    it("does not stop matching when allowMultipleMatches is true", function() {
        window.IntersectionObserver = jasmine.createSpy("IntersectionObserver");
        let waiter = new WaitForElements({
            visibility: {},
            allowMultipleMatches: true,
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");
        spyOn(WaitForElements, "isOverlappingRootBounds").and.returnValue(true);
        let spy_stop = spyOn(waiter, "stop").and.callThrough();

        let el = document.createElement("div");
        let shouldStop = waiter._applyVisibility([el], onMatchFn);

        expect(shouldStop).toBeFalse();
        expect(onMatchFn).toHaveBeenCalledOnceWith([el]);
        expect(spy_stop).not.toHaveBeenCalled();
    });

    it("returns false when no elements are provided without visibility", function() {
        let waiter = new WaitForElements({
            visibility: null,
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");
        expect(waiter._applyVisibility([], onMatchFn)).toBeFalse();
        expect(onMatchFn).not.toHaveBeenCalled();
    });

});


describe("_handleMutations", function() {

    it("all matching selectors' elements are filtered and returned", function () {
        let filterSpy = jasmine.createSpy("filterSpy", els => els).and.callThrough();
        let waiter = new WaitForElements({
            filter: filterSpy,
            selectors: [ "div" ],
        });
        let spy_gefm = spyOn(waiter, "_getElementsFromMutations").and.callThrough();
        let spy_gems= spyOn(WaitForElements, "_getElementsMatchingSelectors").and.callThrough();
        let spy_af = spyOn(waiter, "_applyFilters").and.callThrough();
        let newdiv = document.createElement("div");
        let mut = {
            type: "childList",
            addedNodes: [ newdiv, newdiv ],
        };
        let els = waiter._handleMutations([mut, mut]);

        expect(spy_gefm).toHaveBeenCalledBefore(spy_gems);
        expect(spy_gems).toHaveBeenCalledBefore(spy_af);
        expect(spy_af).toHaveBeenCalledOnceWith([newdiv]);
        expect(els).toEqual([newdiv]);
    });

    it("returns empty when selectors are empty", function() {
        let waiter = new WaitForElements({
            selectors: [],
        });
        let newdiv = document.createElement("div");
        let mut = {
            type: "childList",
            addedNodes: [ newdiv ],
        };
        expect(waiter._handleMutations([mut]))
            .toEqual([]);
    });
});

describe("_getVisibilityOptions", function() {
    it("merges visibility options with target root", function() {
        let waiter = new WaitForElements({
            target: this._maindiv,
            visibility: { threshold: 0.5, rootMargin: "10px" },
        });

        expect(waiter._getVisibilityOptions()).toEqual({
            root: this._maindiv,
            threshold: 0.5,
            rootMargin: "10px",
        });
    });
});


describe("_setupVisibilityObserver", function() {
    beforeEach(function() {
        this._originalIntersectionObserver = window.IntersectionObserver;
    });

    afterEach(function() {
        window.IntersectionObserver = this._originalIntersectionObserver;
    });

    it("only creates one observer instance", function() {
        let callCount = 0;
        class FakeIntersectionObserver {
            constructor() {
                callCount += 1;
            }
        }
        window.IntersectionObserver = FakeIntersectionObserver;

        let waiter = new WaitForElements({
            visibility: {},
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");

        waiter._setupVisibilityObserver(onMatchFn);
        waiter._setupVisibilityObserver(onMatchFn);

        expect(callCount).toBe(1);
    });
});


describe("_handleVisibilityEntries", function() {
    beforeEach(function() {
        this._originalIntersectionObserver = window.IntersectionObserver;
    });

    afterEach(function() {
        window.IntersectionObserver = this._originalIntersectionObserver;
    });

    it("ignores entries not in pending set", function() {
        class FakeIntersectionObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
        window.IntersectionObserver = FakeIntersectionObserver;

        let waiter = new WaitForElements({
            visibility: {},
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let el = document.createElement("div");

        waiter._handleVisibilityEntries([{ target: el, isIntersecting: true }], onMatchFn);

        expect(onMatchFn).not.toHaveBeenCalled();
    });

    it("ignores non-intersecting entries", function() {
        class FakeIntersectionObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
        window.IntersectionObserver = FakeIntersectionObserver;

        let waiter = new WaitForElements({
            visibility: {},
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let el = document.createElement("div");
        waiter.visibilityPending.set(el, true);

        waiter._handleVisibilityEntries([{ target: el, isIntersecting: false }], onMatchFn);

        expect(onMatchFn).not.toHaveBeenCalled();
        expect(waiter.visibilityPending.has(el)).toBeTrue();
    });

    it("stops when allowMultipleMatches is false", function() {
        class FakeIntersectionObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
        window.IntersectionObserver = FakeIntersectionObserver;

        let waiter = new WaitForElements({
            visibility: {},
            allowMultipleMatches: false,
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let spy_stop = spyOn(waiter, "stop").and.callThrough();
        let el = document.createElement("div");
        waiter.visibilityPending.set(el, true);
        waiter.visibilityObserver = new FakeIntersectionObserver();

        waiter._handleVisibilityEntries([{ target: el, isIntersecting: true }], onMatchFn);

        expect(onMatchFn).toHaveBeenCalledWith([el]);
        expect(spy_stop).toHaveBeenCalled();
    });
});


describe("_continueMatching", function() {
    beforeEach(function() {
        this._originalMutationObserver = window.MutationObserver;
    });

    afterEach(function() {
        window.MutationObserver = this._originalMutationObserver;
    });

    it("uses provided target and observer options", function() {
        let observeSpy = jasmine.createSpy("observe");
        class FakeMutationObserver {
            constructor() {}
            observe(target, options) {
                observeSpy(target, options);
            }
        }
        window.MutationObserver = FakeMutationObserver;

        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: [ "span" ],
            observerOptions: { subtree: false },
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");

        waiter._continueMatching(onMatchFn);

        expect(observeSpy).toHaveBeenCalledWith(this._maindiv, { subtree: false });
    });
});


describe("_startMatching", function() {


    it("skipExisting==false, matching elements already present, allowMultipleMatches=false, timeout=-1", function () {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: false,
            });
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_hm = spyOn(waiter, "_handleMutations").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).toHaveBeenCalled();
        expect(onMatchFn).toHaveBeenCalledOnceWith(Array.from(this._maindiv.querySelectorAll("span")));
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_hm).not.toHaveBeenCalled();
        expect(spy_st).not.toHaveBeenCalled();
        expect(waiter.observer).toEqual(null);
    });

    it("skipExisting==false, visibility enabled, matching elements already present", function () {
        this._maindiv.innerHTML = `
        <span id=span1>span1</span>
        `;
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: false,
                visibility: {},
            });
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_av = spyOn(waiter, "_applyVisibility").and.returnValue(true);
        let spy_cm = spyOn(waiter, "_continueMatching").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).toHaveBeenCalled();
        expect(spy_av).toHaveBeenCalledWith([this._maindiv.querySelector("#span1")], onMatchFn);
        expect(spy_cm).not.toHaveBeenCalled();
        expect(spy_st).not.toHaveBeenCalled();
        expect(waiter.observer).toEqual(null);
    });

    it("skipExisting==false, visibility enabled, timeout=-1 does not set timeout", function () {
        this._maindiv.innerHTML = "";
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: false,
                visibility: {},
                timeout: -1,
            });
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_st).not.toHaveBeenCalled();
    });


    it("skipExisting==false, matching elements show up later, allowMultipleMatches=false, timeout=-1", function (done) {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "#newspan" ],
                skipExisting: false,
            });
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_hm = spyOn(waiter, "_handleMutations").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();
        let spy_stop = spyOn(waiter, "stop").and.callThrough();
        let onMatchFn;
        onMatchFn = jasmine.createSpy("onMatchFn", (args) => {
            expect(onMatchFn).toHaveBeenCalledOnceWith([this._maindiv.querySelector("#newspan")]);
            expect(spy_gee).toHaveBeenCalled();
            expect(onTimeoutFn).not.toHaveBeenCalled();
            expect(spy_hm).toHaveBeenCalled();
            expect(spy_st).not.toHaveBeenCalled();
            expect(spy_stop).not.toHaveBeenCalled();

            done();
        }).and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        // trigger a mutation by adding an element
        window.setTimeout(() => {
            let newspan = document.createElement("span");
            newspan.id = "newspan";
            this._maindiv.append(newspan);
        }, 0);
    });


    it("skipExisting==false, allowMultipleMatches=true, timeout=-1", function (done) {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let argsLists = [];
        let onMatchFn = (args) => {
            argsLists.push(args);

            if (argsLists.length === 2)
            {
                expect(argsLists).toEqual([
                    [
                        this._maindiv.querySelector("#span1"),
                        this._maindiv.querySelector("#span2"),
                    ], [
                        this._maindiv.querySelector("#newspan"),
                    ]
                ]);

                done();
            }
        };

        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: false,
                allowMultipleMatches: true,
            });
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_cm = spyOn(waiter, "_continueMatching").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).toHaveBeenCalled();
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_cm).toHaveBeenCalled();
        expect(spy_st).not.toHaveBeenCalled();
        expect(waiter.observer).not.toEqual(null);

        // trigger a mutation by adding an element
        window.setTimeout(() => {
            let newspan = document.createElement("span");
            newspan.id = "newspan";
            this._maindiv.append(newspan);
        }, 0);
    });


    it("skipExisting==true, allowMultipleMatches=false, timeout=-1 (wait forever until an matching element shows up)", function () {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: true,
                allowMultipleMatches: false,
            });
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).not.toHaveBeenCalled();
        expect(onMatchFn).not.toHaveBeenCalled();
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_st).not.toHaveBeenCalled();
        expect(waiter.observer).not.toEqual(null);

        waiter.stop();
    });


    it("skipExisting==true, allowMultipleMatches=true, timeout=-1", function (done) {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let argsLists = [];
        let onMatchFn = (args) => {
            argsLists.push(args);

            if (argsLists.length === 1)
            {
                expect(argsLists).toEqual([
                    [
                        this._maindiv.querySelector("#newspan"),
                    ]
                ]);

                done();
            }
        };

        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: true,
                allowMultipleMatches: true,
            });
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_cm = spyOn(waiter, "_continueMatching").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).not.toHaveBeenCalled();
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_cm).toHaveBeenCalled();
        expect(spy_st).not.toHaveBeenCalled();
        expect(waiter.observer).not.toEqual(null);

        // trigger a mutation by adding an element, to execute after this
        // function returns
        window.setTimeout(() => {
            let newspan = document.createElement("span");
            newspan.id = "newspan";
            this._maindiv.append(newspan);
        }, 0);
    });


    describe("exceeding timeouts", function () {

    beforeEach(function() {
        jasmine.clock().install();
    });

    afterEach(function() {
        jasmine.clock().uninstall();
    });


    it("skipExisting==false, allowMultipleMatches=false, exceeding timeout", function () {
        // this doesn't make sense, since you can never hit the timeout if
        // there are matching elements in DOM before matching is tried
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let onMatchFn = jasmine.createSpy("onMatchFn").and.callThrough();
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn").and.callThrough();
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: false,
                allowMultipleMatches: false,
                timeout: 10000,
            });
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_hm = spyOn(waiter, "_handleMutations").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).toHaveBeenCalled();
        expect(onMatchFn).toHaveBeenCalledOnceWith(Array.from(this._maindiv.querySelectorAll("span")));
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_hm).not.toHaveBeenCalled();
        expect(spy_st).not.toHaveBeenCalled();
        expect(waiter.observer).toEqual(null);

        // exceed timeout
        jasmine.clock().tick(11000);

        // timeout was already killed when the first matches were found,
        // before observer started
        expect(onTimeoutFn).toHaveBeenCalledTimes(0);
    });


    it("skipExisting==false, allowMultipleMatches=true, exceeding timeout", function (done) {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let onMatchFn;
        let onTimeoutFn;
        let spy_do;
        onTimeoutFn = jasmine.createSpy("onTimeoutFn", () => {
            expect(spy_do).toHaveBeenCalled();
            expect(onMatchFn).toHaveBeenCalledTimes(2);
            expect(onTimeoutFn).toHaveBeenCalledTimes(1);

            done();
        }).and.callThrough();

        onMatchFn = jasmine.createSpy("onMatchFn", (els) => {
            // exceed the timeout after detecting a mutation prior to
            // timeout, thus forcing the timeout to occur
            jasmine.clock().tick(6000);
        }).and.callThrough();

        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: false,
                allowMultipleMatches: true,
                timeout: 10000,
            });
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_cm = spyOn(waiter, "_continueMatching").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();
        spy_do = spyOn(waiter, "_disconnectObserver").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).toHaveBeenCalled();
        expect(spy_cm).toHaveBeenCalled();
        expect(spy_st).toHaveBeenCalled();
        expect(waiter.observer).not.toEqual(null);
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_do).not.toHaveBeenCalled();
        expect(onMatchFn).toHaveBeenCalledWith([
            this._maindiv.querySelector("#span1"),
            this._maindiv.querySelector("#span2")
        ]);

        // trigger a mutation by adding an element
        window.setTimeout(() => {
            let newspan = document.createElement("span");
            newspan.id = "newspan";
            this._maindiv.append(newspan);
        }, 0);

        jasmine.clock().tick(5000);

        // Note that for the mutation to be detected, the observer handler function needs to run, which can only happen once this function has returned.  So, we have to advance the clock past the timeout within the match function (see above).
    });


    it("skipExisting==true, allowMultipleMatches=false, exceeding timeout", function () {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: true,
                allowMultipleMatches: false,
                timeout: 10000,
            });
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_hm = spyOn(waiter, "_handleMutations").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).not.toHaveBeenCalled();
        expect(onMatchFn).not.toHaveBeenCalled();
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_hm).not.toHaveBeenCalled();
        expect(spy_st).toHaveBeenCalled();
        expect(waiter.observer).not.toEqual(null);

        jasmine.clock().tick(11000);
        expect(onTimeoutFn).toHaveBeenCalled();
    });


    it("skipExisting==true, allowMultipleMatches=true, exceeding timeout", function (done) {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let onMatchFn;
        let onTimeoutFn;
        let spy_do;
        onTimeoutFn = jasmine.createSpy("onTimeoutFn", () => {
            expect(spy_do).toHaveBeenCalled();
            expect(onMatchFn).toHaveBeenCalledWith([this._maindiv.querySelector("#newspan")]);
            expect(onTimeoutFn).toHaveBeenCalledTimes(1);

            done();
        }).and.callThrough();

        onMatchFn = jasmine.createSpy("onMatchFn", (els) => {
            // exceed the timeout after detecting a mutation prior to
            // timeout, thus forcing the timeout to occur
            jasmine.clock().tick(6000);
        }).and.callThrough();

        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: true,
                allowMultipleMatches: true,
                timeout: 10000,
            });
        let spy_gee = spyOn(waiter, "_getElementsFiltered").and.callThrough();
        let spy_cm = spyOn(waiter, "_continueMatching").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();
        spy_do = spyOn(waiter, "_disconnectObserver").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).not.toHaveBeenCalled();
        expect(spy_cm).toHaveBeenCalled();
        expect(spy_st).toHaveBeenCalled();
        expect(waiter.observer).not.toEqual(null);
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_do).not.toHaveBeenCalled();
        expect(onMatchFn).not.toHaveBeenCalled();

        // trigger a mutation by adding an element
        window.setTimeout(() => {
            let newspan = document.createElement("span");
            newspan.id = "newspan";
            this._maindiv.append(newspan);
        }, 0);

        jasmine.clock().tick(5000);

        // Note that for the mutation to be detected, the observer handler function needs to run, which can only happen once this function has returned.  So, we have to advance the clock past the timeout within the match function (see above).
    });


});     // exceeding timeouts

});     // _startMatching


describe("match", function() {
    it("allowMultipleMatches=false, returns a Promise resolved with matches", async function () {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                allowMultipleMatches: false,
            });

        let spy_sm = spyOn(waiter, "_startMatching").and.callThrough();

        await expectAsync(waiter.match())
            .toBeResolvedTo(Array.from(this._maindiv.querySelectorAll("span")));

        expect(spy_sm).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Function));
    });


    it("allowMultipleMatches=false, no matches until mutation, returns a Promise resolved with matches", function (done) {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "#newspan" ],
                allowMultipleMatches: false,
            });

        let spy_sm = spyOn(waiter, "_startMatching").and.callThrough();

        // trigger a mutation by adding an element; must be done after this
        // function returns so the mutation handler will run
        window.setTimeout(() => {
            let newspan = document.createElement("span");
            newspan.id = "newspan";
            newspan.textContent = "newspan";
            this._maindiv.append(newspan);
        }, 0);

        let p = waiter.match();
        p.then(v => {
            expect(v).toEqual(Array.from(this._maindiv.querySelectorAll("#newspan")));
            expect(spy_sm).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Function));
            done();
        });
    });


    it("allowMultipleMatches=true, starts matching no promise returned", function () {
        // full-on whitebox testing here; I only have to care if
        // _startMatching is called with the functions I passed.  Everything
        // beyond that is already tested in _startMatching etc.
        // So, this just tests a very basic use case.
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "#span1" ],
                allowMultipleMatches: true,
                skipExisting: false,
                timeout: 10000,
            });

        let spy_sm = spyOn(waiter, "_startMatching").and.callThrough();
        let spy_cm = spyOn(waiter, "_continueMatching").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");

        waiter.match(onMatchFn, onTimeoutFn);

        expect(spy_sm).toHaveBeenCalledWith(onMatchFn, onTimeoutFn);
        expect(spy_sm).toHaveBeenCalledBefore(spy_cm);
        expect(spy_cm).toHaveBeenCalledBefore(spy_st);
        expect(onMatchFn).toHaveBeenCalledWith([this._maindiv.querySelector("#span1")]);
    });

    it("only onMatchFn provided uses default timeout handler", function () {
        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: [ "span" ],
        });
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let spy_sm = spyOn(waiter, "_startMatching").and.callThrough();

        waiter.match(onMatchFn);

        expect(spy_sm).toHaveBeenCalledWith(onMatchFn, jasmine.any(Function));
    });


    it("only onTimeoutFn provided uses default match handler", function () {
        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: [ "span" ],
        });
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let spy_sm = spyOn(waiter, "_startMatching").and.callThrough();

        waiter.match(null, onTimeoutFn);

        expect(spy_sm).toHaveBeenCalledWith(jasmine.any(Function), onTimeoutFn);
    });


    it("promise-based match stops after resolution", async function () {
        this._maindiv.innerHTML = "<span id=span1>span1</span>";
        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: [ "span" ],
            allowMultipleMatches: false,
        });
        let spy_stop = spyOn(waiter, "stop").and.callThrough();

        await expectAsync(waiter.match())
            .toBeResolvedTo([this._maindiv.querySelector("#span1")]);

        expect(spy_stop).toHaveBeenCalled();
    });


    describe("exceeding timeout", function () {

    beforeEach(function() {
        jasmine.clock().install();
    });

    afterEach(function() {
        jasmine.clock().uninstall();
    });


    it("allowMultipleMatches=false, returns a Promise rejected if no matches by timeout", async function () {
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "noelement" ],
                allowMultipleMatches: false,
                skipExisting: false,
                timeout: 10000,
            });

        let spy_sm = spyOn(waiter, "_startMatching").and.callThrough();

        let p = waiter.match();
        jasmine.clock().tick(11000);

        expect(spy_sm).toHaveBeenCalledWith(jasmine.any(Function), jasmine.any(Function));

        await expectAsync(p).toBeRejected();

        expect(waiter.observer).toBe(null);
        expect(waiter.timerId).toBe(null);
    });


    it("allowMultipleMatches=true, matches and calls timeoutfn, no promise returned", function (done) {

        // full-on whitebox testing here
        this._maindiv.innerHTML = `
        <span id=span1>span1
            <div id=interdiv>
                <span id=span2>
                    <p id=p1>p1</p>
                    span2
                </span>
             </div>
            <div id=otherdiv>
            </div>
        </span>
        `;
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "#newspan" ],
                allowMultipleMatches: true,
                skipExisting: true,
                timeout: 10000,
            });

        let spy_sm = spyOn(waiter, "_startMatching").and.callThrough();
        let spy_cm = spyOn(waiter, "_continueMatching").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();
        let onTimeoutFn;
        onTimeoutFn = jasmine.createSpy("onTimeoutFn", () => {
            expect(onMatchFn).toHaveBeenCalledWith([this._maindiv.querySelector("#newspan")]);
            expect(onTimeoutFn).toHaveBeenCalledTimes(1);
            expect(waiter.observer).toBe(null);
            expect(waiter.timerId).toBe(null);

            done();
        }).and.callThrough();

        let onMatchFn;
        onMatchFn = jasmine.createSpy("onMatchFn", (els) => {
            // exceed the timeout after detecting a mutation prior to
            // timeout, thus forcing the timeout to occur
            jasmine.clock().tick(6000);
        }).and.callThrough();

        waiter.match(onMatchFn, onTimeoutFn);

        // trigger a mutation by adding an element
        window.setTimeout(() => {
            let newspan = document.createElement("span");
            newspan.id = "newspan";
            this._maindiv.append(newspan);
        }, 0);

        jasmine.clock().tick(5000);

        expect(spy_sm).toHaveBeenCalledWith(onMatchFn, onTimeoutFn);
        expect(spy_sm).toHaveBeenCalledBefore(spy_cm);
        expect(spy_cm).toHaveBeenCalledBefore(spy_st);
    });

    }); // exceeding timeout

});     // match

describe("stop", function() {
    it("any observer and timer are destroyed", function () {
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "nomatter" ],
            });

        let spy_do = spyOn(waiter, "_disconnectObserver").and.callThrough();
        let spy_dvo = spyOn(waiter, "_disconnectVisibilityObserver").and.callThrough();
        let spy_ct = spyOn(waiter, "_clearTimeout").and.callThrough();

        waiter.stop();

        expect(spy_do).toHaveBeenCalled();
        expect(spy_dvo).toHaveBeenCalled();
        expect(spy_ct).toHaveBeenCalled();
    });

    it("clears internal state for observers and timers", function () {
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "nomatter" ],
            });

        waiter.observer = jasmine.createSpyObj("fakeObserver", [ "disconnect" ]);
        waiter.visibilityObserver = jasmine.createSpyObj("fakeVisibilityObserver", [ "disconnect" ]);
        waiter.visibilityPending.set(document.createElement("div"), true);
        waiter.timerId = window.setTimeout(() => undefined, 1000);

        waiter.stop();

        expect(waiter.observer).toBe(null);
        expect(waiter.visibilityObserver).toBe(null);
        expect(waiter.visibilityPending.size).toBe(0);
        expect(waiter.timerId).toBe(null);
    });
});

});

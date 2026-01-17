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


describe("_normalizeOptions", function() {


    it("sets builtin default options", function() {
        expect(WaitForElements._normalizeOptions({}))
            .toEqual({
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
            });
    });


    it("can set own defaults to override builtin defaults", function() {
        expect(WaitForElements._normalizeOptions({ }, { timeout: 4242 } ))
            .toEqual({
                target: document.body,
                selectors: [],
                filter: null,
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
                requireVisible: false,
                verbose: false,
            });
        });


    it("defaults don't override given options", function() {
        expect(WaitForElements._normalizeOptions({ timeout: 42 }, { timeout: 4242 } ))
            .toEqual({
                target: document.body,
                selectors: [],
                filter: null,
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
                requireVisible: false,
                verbose: false,
            });
        });


    it("custom options override defaults", function() {
        let customFilter = () => [];
        expect(WaitForElements._normalizeOptions({
            selectors: [ "div" ],
            filter: customFilter,
            observerOptions: { subtree: false },
            verbose: true,
        })).toEqual({
            target: document.body,
            selectors: [ "div" ],
            filter: customFilter,
            allowMultipleMatches: false,
            onlyOnce: false,
            skipExisting: false,
            timeout: -1,
            observerOptions: { subtree: false },
            requireVisible: false,
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
                },
                seen: jasmine.any(Map),
                observer: null,
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


describe("_getMatchingElements", function() {


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

        expect(waiter._getMatchingElements())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
                this._maindiv.querySelector("#span3"),
            ]);
    });


    it("filter function does not apply in _getMatchingElements", function() {
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

        expect(waiter._getMatchingElements())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
                this._maindiv.querySelector("#span3"),
            ]);
    });


    it("onlyOnce and filter do not apply in _getMatchingElements", function() {
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

        expect(waiter._getMatchingElements())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
            ]);

        let newspan = document.createElement("span");
        newspan.id = "span3";
        this._maindiv.append(newspan);

        expect(waiter._getMatchingElements())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
                this._maindiv.querySelector("#span3"),
            ]);
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

        expect(waiter._getMatchingElements())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
            ]);
    });

    it("includes the root element when it matches selectors", function() {
        this._maindiv.innerHTML = `<span id=span1>span1</span>`;
        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: [ "#_maindiv" ],
        });

        expect(waiter._getMatchingElements())
            .toEqual([ this._maindiv ]);
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
        expect(callbackFn).toHaveBeenCalledWith(jasmine.any(Error));
        expect(callbackFn.calls.argsFor(0)[0].message)
            .toBe("Timeout 10000 reached waiting for selectors");
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
        expect(waiter._applyFilters([ o1, o2, o1 ])).toEqual([ o1, o2 ]);
    });

    it("throws if filter throws", function() {
        let waiter = new WaitForElements({
            filter: () => { throw new Error("boom"); },
        });
        let o1 = {};
        expect(() => waiter._applyFilters([ o1 ])).toThrowError("boom");
    });

});


describe("_handleMutations", function() {

    it("all matching selectors' elements are returned", function () {
        let waiter = new WaitForElements({
            selectors: [ "div" ],
        });
        let spy_gefm = spyOn(waiter, "_getElementsFromMutations").and.callThrough();
        let spy_gems= spyOn(WaitForElements, "_getElementsMatchingSelectors").and.callThrough();
        let newdiv = document.createElement("div");
        let mut = {
            type: "childList",
            addedNodes: [ newdiv, newdiv ],
        };
        let els = waiter._handleMutations([mut, mut]);

        expect(spy_gefm).toHaveBeenCalledBefore(spy_gems);
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
        let spy_gee = spyOn(waiter, "_getMatchingElements").and.callThrough();
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
        let spy_gee = spyOn(waiter, "_getMatchingElements").and.callThrough();
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
        let spy_gee = spyOn(waiter, "_getMatchingElements").and.callThrough();
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
        let spy_gee = spyOn(waiter, "_getMatchingElements").and.callThrough();
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
        let spy_gee = spyOn(waiter, "_getMatchingElements").and.callThrough();
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
        let spy_gee = spyOn(waiter, "_getMatchingElements").and.callThrough();
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
        onTimeoutFn = jasmine.createSpy("onTimeoutFn", (err) => {
            expect(spy_do).toHaveBeenCalled();
            expect(onMatchFn).toHaveBeenCalledTimes(2);
            expect(onTimeoutFn).toHaveBeenCalledTimes(1);
            expect(err).toEqual(jasmine.any(Error));
            expect(err.message).toBe("Timeout 10000 reached waiting for selectors");

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
        let spy_gee = spyOn(waiter, "_getMatchingElements").and.callThrough();
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

    it("skipExisting==false, allowMultipleMatches=true, timeout fires even after immediate matches", function () {
        this._maindiv.innerHTML = `
        <span id=span1>span1</span>
        `;
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: false,
                allowMultipleMatches: true,
                timeout: 10000,
            });

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(onMatchFn).toHaveBeenCalledWith([this._maindiv.querySelector("#span1")]);
        jasmine.clock().tick(11000);

        expect(onTimeoutFn).toHaveBeenCalledWith(jasmine.any(Error));
        expect(onTimeoutFn.calls.argsFor(0)[0].message)
            .toBe("Timeout 10000 reached waiting for selectors");
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
        let spy_gee = spyOn(waiter, "_getMatchingElements").and.callThrough();
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
        expect(onTimeoutFn).toHaveBeenCalledWith(jasmine.any(Error));
        expect(onTimeoutFn.calls.argsFor(0)[0].message)
            .toBe("Timeout 10000 reached waiting for selectors");
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
        onTimeoutFn = jasmine.createSpy("onTimeoutFn", (err) => {
            expect(spy_do).toHaveBeenCalled();
            expect(onMatchFn).toHaveBeenCalledWith([this._maindiv.querySelector("#newspan")]);
            expect(onTimeoutFn).toHaveBeenCalledTimes(1);
            expect(err).toEqual(jasmine.any(Error));
            expect(err.message).toBe("Timeout 10000 reached waiting for selectors");

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
        let spy_gee = spyOn(waiter, "_getMatchingElements").and.callThrough();
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

    it("onlyOnce=true with allowMultipleMatches=true does not re-emit matches across mutations", function (done) {
        this._maindiv.innerHTML = `
        <span id=span1>span1</span>
        `;
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                allowMultipleMatches: true,
                onlyOnce: true,
            });

        let onMatchFn = jasmine.createSpy("onMatchFn");
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");

        waiter.match(onMatchFn, onTimeoutFn);

        expect(onMatchFn).toHaveBeenCalledTimes(1);
        expect(onMatchFn).toHaveBeenCalledWith([this._maindiv.querySelector("#span1")]);
        expect(onTimeoutFn).not.toHaveBeenCalled();

        window.setTimeout(() => {
            let span1 = this._maindiv.querySelector("#span1");
            span1.setAttribute("data-test", "1");

            window.setTimeout(() => {
                expect(onMatchFn).toHaveBeenCalledTimes(1);
                expect(onTimeoutFn).not.toHaveBeenCalled();
                waiter.stop();
                done();
            }, 0);
        }, 0);
    });


    it("selectors can be a string and not an array", function (done) {
        this._maindiv.innerHTML = ``;
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: "span",
            });

        let onMatchFn = jasmine.createSpy("onMatchFn", (els) => {
            expect(els).toEqual([ this._maindiv.querySelector("#newspan") ]);
            waiter.stop();
            done();
        }).and.callThrough();

        waiter.match(onMatchFn);

        window.setTimeout(() => {
            let newspan = document.createElement("span");
            newspan.id = "newspan";
            this._maindiv.append(newspan);
        }, 0);
    });


    it("rejects when filter throws", async function () {
        this._maindiv.innerHTML = `<span id=span1>span1</span>`;
        let waiter = new WaitForElements({
            target: this._maindiv,
            selectors: [ "span" ],
            allowMultipleMatches: false,
            filter: () => { throw new Error("boom"); },
        });

        let p = waiter.match();

        await expectAsync(p).toBeRejectedWithError("boom");
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

        await expectAsync(p).toBeRejectedWithError("Timeout 10000 reached waiting for selectors");

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
        onTimeoutFn = jasmine.createSpy("onTimeoutFn", (err) => {
            expect(onMatchFn).toHaveBeenCalledWith([this._maindiv.querySelector("#newspan")]);
            expect(onTimeoutFn).toHaveBeenCalledTimes(1);
            expect(waiter.observer).toBe(null);
            expect(waiter.timerId).toBe(null);
            expect(err).toEqual(jasmine.any(Error));
            expect(err.message).toBe("Timeout 10000 reached waiting for selectors");

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
        let spy_ct = spyOn(waiter, "_clearTimeout").and.callThrough();

        waiter.stop();

        expect(spy_do).toHaveBeenCalled();
        expect(spy_ct).toHaveBeenCalled();
    });

    it("clears internal state for observers and timers", function () {
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "nomatter" ],
            });

        waiter.observer = jasmine.createSpyObj("fakeObserver", [ "disconnect" ]);
        waiter.timerId = window.setTimeout(() => undefined, 1000);

        waiter.stop();

        expect(waiter.observer).toBe(null);
        expect(waiter.timerId).toBe(null);
    });

    it("prevents reuse after stop", async function () {
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "nomatter" ],
            });

        waiter.stop();

        await expectAsync(waiter.match())
            .toBeRejectedWithError("WaitForElements instance is stopped and cannot be restarted");
    });

    it("prevents reuse after stop when callbacks are provided", function () {
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "nomatter" ],
            });

        waiter.stop();

        expect(() => waiter.match(() => undefined, () => undefined))
            .toThrowError("WaitForElements instance is stopped and cannot be restarted");
    });
});

describe("intersection observers", function() {
    it("multiple instances do not interfere with each other's observers", function() {
        let obs1 = {
            observe: jasmine.createSpy("observe1"),
            unobserve: jasmine.createSpy("unobserve1"),
            disconnect: jasmine.createSpy("disconnect1"),
        };
        let obs2 = {
            observe: jasmine.createSpy("observe2"),
            unobserve: jasmine.createSpy("unobserve2"),
            disconnect: jasmine.createSpy("disconnect2"),
        };
        let ctorCalls = 0;
        let originalIntersectionObserver = window.IntersectionObserver;
        function FakeIntersectionObserver() {
            ctorCalls += 1;
            return ctorCalls === 1 ? obs1 : obs2;
        }
        window.IntersectionObserver = FakeIntersectionObserver;
        let ctorSpy = spyOn(window, "IntersectionObserver").and.callThrough();

        let el = document.createElement("div");
        let waiter1 = new WaitForElements({ requireVisible: true });
        let waiter2 = new WaitForElements({ requireVisible: true });

        waiter1._waitForElementToIntersect(el, waiter1.options, null);
        waiter2._waitForElementToIntersect(el, waiter2.options, null);

        expect(waiter1.intersectionObservers.get(el)).toBe(obs1);
        expect(waiter2.intersectionObservers.get(el)).toBe(obs2);

        waiter1.stop();

        expect(obs1.disconnect).toHaveBeenCalled();
        expect(obs2.disconnect).not.toHaveBeenCalled();

        window.IntersectionObserver = originalIntersectionObserver;
    });

    it("stop disconnects all tracked intersection observers", function() {
        let obs1 = {
            observe: jasmine.createSpy("observe1"),
            unobserve: jasmine.createSpy("unobserve1"),
            disconnect: jasmine.createSpy("disconnect1"),
        };
        let obs2 = {
            observe: jasmine.createSpy("observe2"),
            unobserve: jasmine.createSpy("unobserve2"),
            disconnect: jasmine.createSpy("disconnect2"),
        };
        let ctorCalls = 0;
        let originalIntersectionObserver = window.IntersectionObserver;
        function FakeIntersectionObserver() {
            ctorCalls += 1;
            return ctorCalls === 1 ? obs1 : obs2;
        }
        window.IntersectionObserver = FakeIntersectionObserver;
        spyOn(window, "IntersectionObserver").and.callThrough();

        let waiter = new WaitForElements({ requireVisible: true });
        let el1 = document.createElement("div");
        let el2 = document.createElement("div");

        waiter._waitForElementToIntersect(el1, waiter.options, null);
        waiter._waitForElementToIntersect(el2, waiter.options, null);

        waiter.stop();

        expect(obs1.disconnect).toHaveBeenCalled();
        expect(obs2.disconnect).toHaveBeenCalled();
        expect(waiter.intersectionObservers.size).toBe(0);

        window.IntersectionObserver = originalIntersectionObserver;
    });
});

});

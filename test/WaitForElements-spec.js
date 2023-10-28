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


});


describe("_normalizeOptions", function() {


    it("sets builtin default options", function() {
        expect(WaitForElements._normalizeOptions({}))
            .toEqual({
                target: document.body,
                selectors: [],
                filter: jasmine.any(Function),
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
                filter: jasmine.any(Function),
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
                filter: jasmine.any(Function),
                onlyOnce: false,
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


    it("default filter function returns its argument", function() {
        let f = WaitForElements._normalizeOptions({}).filter;
        expect(f([42])).toEqual([42]);
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
                    filter: jasmine.any(Function),
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


describe("_getExistingElements", function() {


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

        expect(waiter._getExistingElements())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
                this._maindiv.querySelector("#span3"),
            ]);
    });


    it("if onlyOnce is true, only returns existing elements that have not been matched", function() {
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
        });

        expect(waiter._getExistingElements())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
            ]);

        let newspan = document.createElement("span");
        this._maindiv.append(newspan);

        expect(waiter._getExistingElements())
            .toEqual([ newspan ]);
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

        expect(waiter._getExistingElements())
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

        expect(waiter._getExistingElements())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
            ]);

        let newspan = document.createElement("span");
        newspan.id = "span3";
        this._maindiv.append(newspan);

        expect(waiter._getExistingElements())
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

        expect(waiter._getExistingElements())
            .toEqual([
                this._maindiv.querySelector("#span1"),
                this._maindiv.querySelector("#span2"),
            ]);
    });

});


describe("_setupTimeout", function() {

    beforeEach(function() {
        jasmine.clock().install();
    });

    afterEach(function() {
        jasmine.clock().uninstall();
    });


    it("sets a timeout, after which it disconnects the observer and calls the callback with a message", function () {
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

        expect(waiter.observer.disconnect).toHaveBeenCalled();
        expect(callbackFn).toHaveBeenCalledOnceWith(jasmine.any(Error));
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
});


describe("_startMatching", function() {
    it("skipExisting==false, isOngoing=false, timeout=-1", function () {
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
        let spy_gee = spyOn(waiter, "_getExistingElements").and.callThrough();
        let spy_cm = spyOn(waiter, "_continueMatching").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).toHaveBeenCalled();
        expect(onMatchFn).toHaveBeenCalledOnceWith(Array.from(this._maindiv.querySelectorAll("span")));
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_cm).not.toHaveBeenCalled();
        expect(spy_st).not.toHaveBeenCalled();
        expect(waiter.observer).toEqual(null);
    });


    it("skipExisting==false, isOngoing=true, timeout=-1", function (done) {
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
                isOngoing: true,
            });
        let spy_gee = spyOn(waiter, "_getExistingElements").and.callThrough();
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


    it("skipExisting==true, isOngoing=false, timeout=-1", function () {
        // this is an odd use case:  why would you skip existing but not do
        // ongoing matching???  You'll never get anything.
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
        let onMatchFn = jasmine.createSpy("onMatchFn");
        let onTimeoutFn = jasmine.createSpy("onTimeoutFn");
        let waiter = new WaitForElements({
                target: this._maindiv,
                selectors: [ "span" ],
                skipExisting: true,
                isOngoing: false,
            });
        let spy_gee = spyOn(waiter, "_getExistingElements").and.callThrough();
        let spy_cm = spyOn(waiter, "_continueMatching").and.callThrough();
        let spy_st = spyOn(waiter, "_setupTimeout").and.callThrough();

        waiter._startMatching(onMatchFn, onTimeoutFn);

        expect(spy_gee).not.toHaveBeenCalled();
        expect(onMatchFn).not.toHaveBeenCalled();
        expect(onTimeoutFn).not.toHaveBeenCalled();
        expect(spy_cm).not.toHaveBeenCalled();
        expect(spy_st).not.toHaveBeenCalled();
        expect(waiter.observer).toEqual(null);
    });


    it("skipExisting==true, isOngoing=true, timeout=-1", function (done) {
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
                isOngoing: true,
            });
        let spy_gee = spyOn(waiter, "_getExistingElements").and.callThrough();
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
});


xdescribe("match", function() {
    xit("xxx", ()=>"");
});

xdescribe("stop", function() {
    xit("xxx", ()=>"");
});

});

// ==UserScript==
// @name         ehpeek: E-H/ExH viewer
// @namespace    ehpeek
// @version      260718.1825
// @description  A mobile-optimized E-H/ExH viewer
// @icon         https://raw.githubusercontent.com/yamipot/ehpeek/master/icon.svg
// @icon64       https://raw.githubusercontent.com/yamipot/ehpeek/master/icon.svg
// @license      MIT
// @namespace    https://github.com/yamipot/ehpeek
// @homepage     https://github.com/yamipot/ehpeek
// @match        *://exhentai.org/*
// @match        *://exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*
// @match        *://e-hentai.org/*
// @match        *://*.exhentai.org/*
// @match        *://*.exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*
// @match        *://*.e-hentai.org/*
// @match        *://*.hath.network/*
// @exclude      *://forums.e-hentai.org/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_download
// @run-at       document-end
// @updateURL    https://github.com/yamipot/ehpeek/raw/build-master/ehpeek.user.js
// @downloadURL  https://github.com/yamipot/ehpeek/raw/build-master/ehpeek.user.js
// ==/UserScript==

"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key != "symbol" ? key + "" : key, value);

  // node_modules/.pnpm/solid-js@1.9.14/node_modules/solid-js/dist/solid.js
  var sharedConfig = {
    context: void 0,
    registry: void 0,
    effects: void 0,
    done: !1,
    getContextId() {
      return getContextId(this.context.count);
    },
    getNextContextId() {
      return getContextId(this.context.count++);
    }
  };
  function getContextId(count) {
    let num = String(count), len = num.length - 1;
    return sharedConfig.context.id + (len ? String.fromCharCode(96 + len) : "") + num;
  }
  function setHydrateContext(context) {
    sharedConfig.context = context;
  }
  function nextHydrateContext() {
    return {
      ...sharedConfig.context,
      id: sharedConfig.getNextContextId(),
      count: 0
    };
  }
  var IS_DEV = !1, equalFn = (a, b) => a === b, $PROXY = /* @__PURE__ */ Symbol("solid-proxy");
  var $TRACK = /* @__PURE__ */ Symbol("solid-track");
  var signalOptions = {
    equals: equalFn
  }, ERROR = null, runEffects = runQueue, STALE = 1, PENDING = 2, UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var Owner = null, Transition = null, Scheduler = null, ExternalSourceConfig = null, Listener = null, Updates = null, Effects = null, ExecCount = 0;
  function createRoot(fn, detachedOwner) {
    let listener = Listener, owner = Owner, unowned = fn.length === 0, current = detachedOwner === void 0 ? owner : detachedOwner, root = unowned ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: current ? current.context : null,
      owner: current
    }, updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
    Owner = root, Listener = null;
    try {
      return runUpdates(updateFn, !0);
    } finally {
      Listener = listener, Owner = owner;
    }
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    let s = {
      value,
      observers: null,
      observerSlots: null,
      comparator: options.equals || void 0
    }, setter = (value2) => (typeof value2 == "function" && (Transition && Transition.running && Transition.sources.has(s) ? value2 = value2(s.tValue) : value2 = value2(s.value)), writeSignal(s, value2));
    return [readSignal.bind(s), setter];
  }
  function createRenderEffect(fn, value, options) {
    let c = createComputation(fn, value, !1, STALE);
    Scheduler && Transition && Transition.running ? Updates.push(c) : updateComputation(c);
  }
  function createEffect(fn, value, options) {
    runEffects = runUserEffects;
    let c = createComputation(fn, value, !1, STALE), s = SuspenseContext && useContext(SuspenseContext);
    s && (c.suspense = s), (!options || !options.render) && (c.user = !0), Effects ? Effects.push(c) : updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    let c = createComputation(fn, value, !0, 0);
    return c.observers = null, c.observerSlots = null, c.comparator = options.equals || void 0, Scheduler && Transition && Transition.running ? (c.tState = STALE, Updates.push(c)) : updateComputation(c), readSignal.bind(c);
  }
  function batch(fn) {
    return runUpdates(fn, !1);
  }
  function untrack(fn) {
    if (!ExternalSourceConfig && Listener === null) return fn();
    let listener = Listener;
    Listener = null;
    try {
      return ExternalSourceConfig ? ExternalSourceConfig.untrack(fn) : fn();
    } finally {
      Listener = listener;
    }
  }
  function onMount(fn) {
    createEffect(() => untrack(fn));
  }
  function onCleanup(fn) {
    return Owner === null || (Owner.cleanups === null ? Owner.cleanups = [fn] : Owner.cleanups.push(fn)), fn;
  }
  function getListener() {
    return Listener;
  }
  function startTransition(fn) {
    if (Transition && Transition.running)
      return fn(), Transition.done;
    let l = Listener, o = Owner;
    return Promise.resolve().then(() => {
      Listener = l, Owner = o;
      let t;
      return (Scheduler || SuspenseContext) && (t = Transition || (Transition = {
        sources: /* @__PURE__ */ new Set(),
        effects: [],
        promises: /* @__PURE__ */ new Set(),
        disposed: /* @__PURE__ */ new Set(),
        queue: /* @__PURE__ */ new Set(),
        running: !0
      }), t.done || (t.done = new Promise((res) => t.resolve = res)), t.running = !0), runUpdates(fn, !1), Listener = Owner = null, t ? t.done : void 0;
    });
  }
  var [transPending, setTransPending] = /* @__PURE__ */ createSignal(!1);
  function useContext(context) {
    let value;
    return Owner && Owner.context && (value = Owner.context[context.id]) !== void 0 ? value : context.defaultValue;
  }
  var SuspenseContext;
  function readSignal() {
    let runningTransition = Transition && Transition.running;
    if (this.sources && (runningTransition ? this.tState : this.state))
      if ((runningTransition ? this.tState : this.state) === STALE) updateComputation(this);
      else {
        let updates = Updates;
        Updates = null, runUpdates(() => lookUpstream(this), !1), Updates = updates;
      }
    if (Listener) {
      let observers = this.observers;
      if (!observers || observers[observers.length - 1] !== Listener) {
        let sSlot = observers ? observers.length : 0;
        Listener.sources ? (Listener.sources.push(this), Listener.sourceSlots.push(sSlot)) : (Listener.sources = [this], Listener.sourceSlots = [sSlot]), observers ? (observers.push(Listener), this.observerSlots.push(Listener.sources.length - 1)) : (this.observers = [Listener], this.observerSlots = [Listener.sources.length - 1]);
      }
    }
    return runningTransition && Transition.sources.has(this) ? this.tValue : this.value;
  }
  function writeSignal(node, value, isComp) {
    let current = Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value;
    if (!node.comparator || !node.comparator(current, value)) {
      if (Transition) {
        let TransitionRunning = Transition.running;
        (TransitionRunning || !isComp && Transition.sources.has(node)) && (Transition.sources.add(node), node.tValue = value), TransitionRunning || (node.value = value);
      } else node.value = value;
      node.observers && node.observers.length && runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          let o = node.observers[i], TransitionRunning = Transition && Transition.running;
          TransitionRunning && Transition.disposed.has(o) || ((TransitionRunning ? !o.tState : !o.state) && (o.pure ? Updates.push(o) : Effects.push(o), o.observers && markDownstream(o)), TransitionRunning ? o.tState = STALE : o.state = STALE);
        }
        if (Updates.length > 1e6)
          throw Updates = [], new Error();
      }, !1);
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn) return;
    cleanNode(node);
    let time = ExecCount;
    runComputation(node, Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value, time), Transition && !Transition.running && Transition.sources.has(node) && queueMicrotask(() => {
      runUpdates(() => {
        Transition && (Transition.running = !0), Listener = Owner = node, runComputation(node, node.tValue, time), Listener = Owner = null;
      }, !1);
    });
  }
  function runComputation(node, value, time) {
    let nextValue, owner = Owner, listener = Listener;
    Listener = Owner = node;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      return node.pure && (Transition && Transition.running ? (node.tState = STALE, node.tOwned && node.tOwned.forEach(cleanNode), node.tOwned = void 0) : (node.state = STALE, node.owned && node.owned.forEach(cleanNode), node.owned = null)), node.updatedAt = time + 1, handleError(err);
    } finally {
      Listener = listener, Owner = owner;
    }
    (!node.updatedAt || node.updatedAt <= time) && (node.updatedAt != null && "observers" in node ? writeSignal(node, nextValue, !0) : Transition && Transition.running && node.pure ? (Transition.sources.has(node) || (node.value = nextValue), Transition.sources.add(node), node.tValue = nextValue) : node.value = nextValue, node.updatedAt = time);
  }
  function createComputation(fn, init, pure, state2 = STALE, options) {
    let c = {
      fn,
      state: state2,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: Owner ? Owner.context : null,
      pure
    };
    if (Transition && Transition.running && (c.state = 0, c.tState = state2), Owner === null || Owner !== UNOWNED && (Transition && Transition.running && Owner.pure ? Owner.tOwned ? Owner.tOwned.push(c) : Owner.tOwned = [c] : Owner.owned ? Owner.owned.push(c) : Owner.owned = [c]), ExternalSourceConfig && c.fn) {
      let sourceFn = c.fn, [track, trigger] = createSignal(void 0, {
        equals: !1
      }), ordinary = ExternalSourceConfig.factory(sourceFn, trigger);
      onCleanup(() => ordinary.dispose());
      let inTransition, triggerInTransition = () => startTransition(trigger).then(() => {
        inTransition && (inTransition.dispose(), inTransition = void 0);
      });
      c.fn = (x) => (track(), Transition && Transition.running ? (inTransition || (inTransition = ExternalSourceConfig.factory(sourceFn, triggerInTransition)), inTransition.track(x)) : ordinary.track(x));
    }
    return c;
  }
  function runTop(node) {
    let runningTransition = Transition && Transition.running;
    if ((runningTransition ? node.tState : node.state) === 0) return;
    if ((runningTransition ? node.tState : node.state) === PENDING) return lookUpstream(node);
    if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
    let ancestors = [node];
    for (; (node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount); ) {
      if (runningTransition && Transition.disposed.has(node)) return;
      (runningTransition ? node.tState : node.state) && ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (node = ancestors[i], runningTransition) {
        let top = node, prev = ancestors[i + 1];
        for (; (top = top.owner) && top !== prev; )
          if (Transition.disposed.has(top)) return;
      }
      if ((runningTransition ? node.tState : node.state) === STALE)
        updateComputation(node);
      else if ((runningTransition ? node.tState : node.state) === PENDING) {
        let updates = Updates;
        Updates = null, runUpdates(() => lookUpstream(node, ancestors[0]), !1), Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates) return fn();
    let wait = !1;
    init || (Updates = []), Effects ? wait = !0 : Effects = [], ExecCount++;
    try {
      let res = fn();
      return completeUpdates(wait), res;
    } catch (err) {
      wait || (Effects = null), Updates = null, handleError(err);
    }
  }
  function completeUpdates(wait) {
    if (Updates && (Scheduler && Transition && Transition.running ? scheduleQueue(Updates) : runQueue(Updates), Updates = null), wait) return;
    let res;
    if (Transition) {
      if (!Transition.promises.size && !Transition.queue.size) {
        let sources = Transition.sources, disposed = Transition.disposed;
        Effects.push.apply(Effects, Transition.effects), res = Transition.resolve;
        for (let e2 of Effects)
          "tState" in e2 && (e2.state = e2.tState), delete e2.tState;
        Transition = null, runUpdates(() => {
          for (let d of disposed) cleanNode(d);
          for (let v of sources) {
            if (v.value = v.tValue, v.owned)
              for (let i = 0, len = v.owned.length; i < len; i++) cleanNode(v.owned[i]);
            v.tOwned && (v.owned = v.tOwned), delete v.tValue, delete v.tOwned, v.tState = 0;
          }
          setTransPending(!1);
        }, !1);
      } else if (Transition.running) {
        Transition.running = !1, Transition.effects.push.apply(Transition.effects, Effects), Effects = null, setTransPending(!0);
        return;
      }
    }
    let e = Effects;
    Effects = null, e.length && runUpdates(() => runEffects(e), !1), res && res();
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++) runTop(queue[i]);
  }
  function scheduleQueue(queue) {
    for (let i = 0; i < queue.length; i++) {
      let item = queue[i], tasks = Transition.queue;
      tasks.has(item) || (tasks.add(item), Scheduler(() => {
        tasks.delete(item), runUpdates(() => {
          Transition.running = !0, runTop(item);
        }, !1), Transition && (Transition.running = !1);
      }));
    }
  }
  function runUserEffects(queue) {
    let i, userLength = 0;
    for (i = 0; i < queue.length; i++) {
      let e = queue[i];
      e.user ? queue[userLength++] = e : runTop(e);
    }
    if (sharedConfig.context) {
      if (sharedConfig.count) {
        sharedConfig.effects || (sharedConfig.effects = []), sharedConfig.effects.push(...queue.slice(0, userLength));
        return;
      }
      setHydrateContext();
    }
    for (sharedConfig.effects && (sharedConfig.done || !sharedConfig.count) && (queue = [...sharedConfig.effects, ...queue], userLength += sharedConfig.effects.length, delete sharedConfig.effects), i = 0; i < userLength; i++) runTop(queue[i]);
  }
  function lookUpstream(node, ignore) {
    let runningTransition = Transition && Transition.running;
    runningTransition ? node.tState = 0 : node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      let source = node.sources[i];
      if (source.sources) {
        let state2 = runningTransition ? source.tState : source.state;
        state2 === STALE ? source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount) && runTop(source) : state2 === PENDING && lookUpstream(source, ignore);
      }
    }
  }
  function markDownstream(node) {
    let runningTransition = Transition && Transition.running;
    for (let i = 0; i < node.observers.length; i += 1) {
      let o = node.observers[i];
      (runningTransition ? !o.tState : !o.state) && (runningTransition ? o.tState = PENDING : o.state = PENDING, o.pure ? Updates.push(o) : Effects.push(o), o.observers && markDownstream(o));
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources)
      for (; node.sources.length; ) {
        let source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
        if (obs && obs.length) {
          let n = obs.pop(), s = source.observerSlots.pop();
          index < obs.length && (n.sourceSlots[s] = index, obs[index] = n, source.observerSlots[index] = s);
        }
      }
    if (node.tOwned) {
      for (i = node.tOwned.length - 1; i >= 0; i--) cleanNode(node.tOwned[i]);
      delete node.tOwned;
    }
    if (Transition && Transition.running && node.pure)
      reset(node, !0);
    else if (node.owned) {
      for (i = node.owned.length - 1; i >= 0; i--) cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = node.cleanups.length - 1; i >= 0; i--) node.cleanups[i]();
      node.cleanups = null;
    }
    Transition && Transition.running ? node.tState = 0 : node.state = 0;
  }
  function reset(node, top) {
    if (top || (node.tState = 0, Transition.disposed.add(node)), node.owned)
      for (let i = 0; i < node.owned.length; i++) reset(node.owned[i]);
  }
  function castError(err) {
    return err instanceof Error ? err : new Error(typeof err == "string" ? err : "Unknown error", {
      cause: err
    });
  }
  function runErrors(err, fns, owner) {
    try {
      for (let f of fns) f(err);
    } catch (e) {
      handleError(e, owner && owner.owner || null);
    }
  }
  function handleError(err, owner = Owner) {
    let fns = ERROR && owner && owner.context && owner.context[ERROR], error = castError(err);
    if (!fns) throw error;
    Effects ? Effects.push({
      fn() {
        runErrors(error, fns, owner);
      },
      state: STALE
    }) : runErrors(error, fns, owner);
  }
  var FALLBACK = /* @__PURE__ */ Symbol("fallback");
  function dispose(d) {
    for (let i = 0; i < d.length; i++) d[i]();
  }
  function mapArray(list, mapFn, options = {}) {
    let items = [], mapped = [], disposers = [], len = 0, indexes = mapFn.length > 1 ? [] : null;
    return onCleanup(() => dispose(disposers)), () => {
      let newItems = list() || [], newLen = newItems.length, i, j;
      return newItems[$TRACK], untrack(() => {
        let newIndices, newIndicesNext, temp, tempdisposers, tempIndexes, start, end, newEnd, item;
        if (newLen === 0)
          len !== 0 && (dispose(disposers), disposers = [], items = [], mapped = [], len = 0, indexes && (indexes = [])), options.fallback && (items = [FALLBACK], mapped[0] = createRoot((disposer) => (disposers[0] = disposer, options.fallback())), len = 1);
        else if (len === 0) {
          for (mapped = new Array(newLen), j = 0; j < newLen; j++)
            items[j] = newItems[j], mapped[j] = createRoot(mapper);
          len = newLen;
        } else {
          for (temp = new Array(newLen), tempdisposers = new Array(newLen), indexes && (tempIndexes = new Array(newLen)), start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++) ;
          for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--)
            temp[newEnd] = mapped[end], tempdisposers[newEnd] = disposers[end], indexes && (tempIndexes[newEnd] = indexes[end]);
          for (newIndices = /* @__PURE__ */ new Map(), newIndicesNext = new Array(newEnd + 1), j = newEnd; j >= start; j--)
            item = newItems[j], i = newIndices.get(item), newIndicesNext[j] = i === void 0 ? -1 : i, newIndices.set(item, j);
          for (i = start; i <= end; i++)
            item = items[i], j = newIndices.get(item), j !== void 0 && j !== -1 ? (temp[j] = mapped[i], tempdisposers[j] = disposers[i], indexes && (tempIndexes[j] = indexes[i]), j = newIndicesNext[j], newIndices.set(item, j)) : disposers[i]();
          for (j = start; j < newLen; j++)
            j in temp ? (mapped[j] = temp[j], disposers[j] = tempdisposers[j], indexes && (indexes[j] = tempIndexes[j], indexes[j](j))) : mapped[j] = createRoot(mapper);
          mapped = mapped.slice(0, len = newLen), items = newItems.slice(0);
        }
        return mapped;
      });
      function mapper(disposer) {
        if (disposers[j] = disposer, indexes) {
          let [s, set] = createSignal(j);
          return indexes[j] = set, mapFn(newItems[j], s);
        }
        return mapFn(newItems[j]);
      }
    };
  }
  var hydrationEnabled = !1;
  function createComponent(Comp, props) {
    if (hydrationEnabled && sharedConfig.context) {
      let c = sharedConfig.context;
      setHydrateContext(nextHydrateContext());
      let r = untrack(() => Comp(props || {}));
      return setHydrateContext(c), r;
    }
    return untrack(() => Comp(props || {}));
  }
  var counter = 0;
  function createUniqueId() {
    return sharedConfig.context ? sharedConfig.getNextContextId() : `cl-${counter++}`;
  }
  var narrowedError = (name) => `Stale read from <${name}>.`;
  function For(props) {
    let fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(mapArray(() => props.each, props.children, fallback || void 0));
  }
  function Show(props) {
    let keyed = props.keyed, conditionValue = createMemo(() => props.when, void 0, void 0), condition = keyed ? conditionValue : createMemo(conditionValue, void 0, {
      equals: (a, b) => !a == !b
    });
    return createMemo(() => {
      let c = condition();
      if (c) {
        let child = props.children;
        return typeof child == "function" && child.length > 0 ? untrack(() => child(keyed ? c : () => {
          if (!untrack(condition)) throw narrowedError("Show");
          return conditionValue();
        })) : child;
      }
      return props.fallback;
    }, void 0, void 0);
  }

  // node_modules/.pnpm/solid-js@1.9.14/node_modules/solid-js/web/dist/web.js
  var booleans = [
    "allowfullscreen",
    "async",
    "alpha",
    "autofocus",
    "autoplay",
    "checked",
    "controls",
    "default",
    "disabled",
    "formnovalidate",
    "hidden",
    "indeterminate",
    "inert",
    "ismap",
    "loop",
    "multiple",
    "muted",
    "nomodule",
    "novalidate",
    "open",
    "playsinline",
    "readonly",
    "required",
    "reversed",
    "seamless",
    "selected",
    "adauctionheaders",
    "browsingtopics",
    "credentialless",
    "defaultchecked",
    "defaultmuted",
    "defaultselected",
    "defer",
    "disablepictureinpicture",
    "disableremoteplayback",
    "preservespitch",
    "shadowrootclonable",
    "shadowrootcustomelementregistry",
    "shadowrootdelegatesfocus",
    "shadowrootserializable",
    "sharedstoragewritable"
  ], Properties = /* @__PURE__ */ new Set([
    "className",
    "value",
    "readOnly",
    "noValidate",
    "formNoValidate",
    "isMap",
    "noModule",
    "playsInline",
    "adAuctionHeaders",
    "allowFullscreen",
    "browsingTopics",
    "defaultChecked",
    "defaultMuted",
    "defaultSelected",
    "disablePictureInPicture",
    "disableRemotePlayback",
    "preservesPitch",
    "shadowRootClonable",
    "shadowRootCustomElementRegistry",
    "shadowRootDelegatesFocus",
    "shadowRootSerializable",
    "sharedStorageWritable",
    ...booleans
  ]);
  var memo = (fn) => createMemo(() => fn());
  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
    for (; aStart < aEnd || bStart < bEnd; ) {
      if (a[aStart] === b[bStart]) {
        aStart++, bStart++;
        continue;
      }
      for (; a[aEnd - 1] === b[bEnd - 1]; )
        aEnd--, bEnd--;
      if (aEnd === aStart) {
        let node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
        for (; bStart < bEnd; ) parentNode.insertBefore(b[bStart++], node);
      } else if (bEnd === bStart)
        for (; aStart < aEnd; )
          (!map || !map.has(a[aStart])) && a[aStart].remove(), aStart++;
      else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        let node = a[--aEnd].nextSibling;
        parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling), parentNode.insertBefore(b[--bEnd], node), a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = /* @__PURE__ */ new Map();
          let i = bStart;
          for (; i < bEnd; ) map.set(b[i], i++);
        }
        let index = map.get(a[aStart]);
        if (index != null)
          if (bStart < index && index < bEnd) {
            let i = aStart, sequence = 1, t;
            for (; ++i < aEnd && i < bEnd && !((t = map.get(a[i])) == null || t !== index + sequence); )
              sequence++;
            if (sequence > index - bStart) {
              let node = a[aStart];
              for (; bStart < index; ) parentNode.insertBefore(b[bStart++], node);
            } else parentNode.replaceChild(b[bStart++], a[aStart++]);
          } else aStart++;
        else a[aStart++].remove();
      }
    }
  }
  var $$EVENTS = "_$DX_DELEGATE";
  function render(code, element, init, options = {}) {
    let disposer;
    return createRoot((dispose2) => {
      disposer = dispose2, element === document ? code() : insert(element, code(), element.firstChild ? null : void 0, init);
    }, options.owner), () => {
      disposer(), element.textContent = "";
    };
  }
  function template(html, isImportNode, isSVG, isMathML) {
    let node, create = () => {
      let t = isMathML ? document.createElementNS("http://www.w3.org/1998/Math/MathML", "template") : document.createElement("template");
      return t.innerHTML = html, isSVG ? t.content.firstChild.firstChild : isMathML ? t.firstChild : t.content.firstChild;
    }, fn = isImportNode ? () => untrack(() => document.importNode(node || (node = create()), !0)) : () => (node || (node = create())).cloneNode(!0);
    return fn.cloneNode = fn, fn;
  }
  function delegateEvents(eventNames, document2 = window.document) {
    let e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
    for (let i = 0, l = eventNames.length; i < l; i++) {
      let name = eventNames[i];
      e.has(name) || (e.add(name), document2.addEventListener(name, eventHandler));
    }
  }
  function setAttribute(node, name, value) {
    isHydrating(node) || (value == null ? node.removeAttribute(name) : node.setAttribute(name, value));
  }
  function className(node, value) {
    isHydrating(node) || (value == null ? node.removeAttribute("class") : node.className = value);
  }
  function addEventListener(node, name, handler, delegate) {
    if (delegate)
      Array.isArray(handler) ? (node[`$$${name}`] = handler[0], node[`$$${name}Data`] = handler[1]) : node[`$$${name}`] = handler;
    else if (Array.isArray(handler)) {
      let handlerFn = handler[0];
      node.addEventListener(name, handler[0] = (e) => handlerFn.call(node, handler[1], e));
    } else node.addEventListener(name, handler, typeof handler != "function" && handler);
  }
  function style(node, value, prev) {
    if (!value) return prev ? setAttribute(node, "style") : value;
    let nodeStyle = node.style;
    if (typeof value == "string") return nodeStyle.cssText = value;
    typeof prev == "string" && (nodeStyle.cssText = prev = void 0), prev || (prev = {}), value || (value = {});
    let v, s;
    for (s in prev)
      value[s] == null && nodeStyle.removeProperty(s), delete prev[s];
    for (s in value)
      v = value[s], v !== prev[s] && (nodeStyle.setProperty(s, v), prev[s] = v);
    return prev;
  }
  function setStyleProperty(node, name, value) {
    value != null ? node.style.setProperty(name, value) : node.style.removeProperty(name);
  }
  function use(fn, element, arg) {
    return untrack(() => fn(element, arg));
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== void 0 && !initial && (initial = []), typeof accessor != "function") return insertExpression(parent, accessor, initial, marker);
    createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
  }
  function isHydrating(node) {
    return !!sharedConfig.context && !sharedConfig.done && (!node || node.isConnected);
  }
  function eventHandler(e) {
    if (sharedConfig.registry && sharedConfig.events && sharedConfig.events.find(([el, ev]) => ev === e))
      return;
    let node = e.target, key = `$$${e.type}`, oriTarget = e.target, oriCurrentTarget = e.currentTarget, retarget = (value) => Object.defineProperty(e, "target", {
      configurable: !0,
      value
    }), handleNode = () => {
      let handler = node[key];
      if (handler && !node.disabled) {
        let data = node[`${key}Data`];
        if (data !== void 0 ? handler.call(node, data, e) : handler.call(node, e), e.cancelBubble) return;
      }
      return node.host && typeof node.host != "string" && !node.host._$host && node.contains(e.target) && retarget(node.host), !0;
    }, walkUpTree = () => {
      for (; handleNode() && (node = node._$host || node.parentNode || node.host); ) ;
    };
    if (Object.defineProperty(e, "currentTarget", {
      configurable: !0,
      get() {
        return node || document;
      }
    }), sharedConfig.registry && !sharedConfig.done && (sharedConfig.done = _$HY.done = !0), e.composedPath) {
      let path = e.composedPath();
      retarget(path[0]);
      for (let i = 0; i < path.length - 2 && (node = path[i], !!handleNode()); i++) {
        if (node._$host) {
          node = node._$host, walkUpTree();
          break;
        }
        if (node.parentNode === oriCurrentTarget)
          break;
      }
    } else walkUpTree();
    retarget(oriTarget);
  }
  function insertExpression(parent, value, current, marker, unwrapArray) {
    let hydrating = isHydrating(parent);
    if (hydrating) {
      !current && (current = [...parent.childNodes]);
      let cleaned = [];
      for (let i = 0; i < current.length; i++) {
        let node = current[i];
        node.nodeType === 8 && node.data.slice(0, 2) === "!$" ? node.remove() : cleaned.push(node);
      }
      current = cleaned;
    }
    for (; typeof current == "function"; ) current = current();
    if (value === current) return current;
    let t = typeof value, multi = marker !== void 0;
    if (parent = multi && current[0] && current[0].parentNode || parent, t === "string" || t === "number") {
      if (hydrating || t === "number" && (value = value.toString(), value === current))
        return current;
      if (multi) {
        let node = current[0];
        node && node.nodeType === 3 ? node.data !== value && (node.data = value) : node = document.createTextNode(value), current = cleanChildren(parent, current, marker, node);
      } else
        current !== "" && typeof current == "string" ? current = parent.firstChild.data = value : current = parent.textContent = value;
    } else if (value == null || t === "boolean") {
      if (hydrating) return current;
      current = cleanChildren(parent, current, marker);
    } else {
      if (t === "function")
        return createRenderEffect(() => {
          let v = value();
          for (; typeof v == "function"; ) v = v();
          current = insertExpression(parent, v, current, marker);
        }), () => current;
      if (Array.isArray(value)) {
        let array = [], currentArray = current && Array.isArray(current);
        if (normalizeIncomingArray(array, value, current, unwrapArray))
          return createRenderEffect(() => current = insertExpression(parent, array, current, marker, !0)), () => current;
        if (hydrating) {
          if (!array.length) return current;
          if (marker === void 0) return current = [...parent.childNodes];
          let node = array[0];
          if (node.parentNode !== parent) return current;
          let nodes = [node];
          for (; (node = node.nextSibling) !== marker; ) nodes.push(node);
          return current = nodes;
        }
        if (array.length === 0) {
          if (current = cleanChildren(parent, current, marker), multi) return current;
        } else currentArray ? current.length === 0 ? appendNodes(parent, array, marker) : reconcileArrays(parent, current, array) : (current && cleanChildren(parent), appendNodes(parent, array));
        current = array;
      } else if (value.nodeType) {
        if (hydrating && value.parentNode) return current = multi ? [value] : value;
        if (Array.isArray(current)) {
          if (multi) return current = cleanChildren(parent, current, marker, value);
          cleanChildren(parent, current, null, value);
        } else current == null || current === "" || !parent.firstChild ? parent.appendChild(value) : parent.replaceChild(value, parent.firstChild);
        current = value;
      }
    }
    return current;
  }
  function normalizeIncomingArray(normalized, array, current, unwrap2) {
    let dynamic = !1;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i], prev = current && current[normalized.length], t;
      if (!(item == null || item === !0 || item === !1)) if ((t = typeof item) == "object" && item.nodeType)
        normalized.push(item);
      else if (Array.isArray(item))
        dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
      else if (t === "function")
        if (unwrap2) {
          for (; typeof item == "function"; ) item = item();
          dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], Array.isArray(prev) ? prev : [prev]) || dynamic;
        } else
          normalized.push(item), dynamic = !0;
      else {
        let value = String(item);
        prev && prev.nodeType === 3 && prev.data === value ? normalized.push(prev) : normalized.push(document.createTextNode(value));
      }
    }
    return dynamic;
  }
  function appendNodes(parent, array, marker = null) {
    for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
  }
  function cleanChildren(parent, current, marker, replacement) {
    if (marker === void 0) return parent.textContent = "";
    let node = replacement || document.createTextNode("");
    if (current.length) {
      let inserted = !1;
      for (let i = current.length - 1; i >= 0; i--) {
        let el = current[i];
        if (node !== el) {
          let isParent = el.parentNode === parent;
          !inserted && !i ? isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker) : isParent && el.remove();
        } else inserted = !0;
      }
    } else parent.insertBefore(node, marker);
    return [node];
  }

  // src/components/PointerGesture.tsx
  var DEFAULT_TAP_MOVE_THRESHOLD_PX = 8, DEFAULT_DRAG_START_THRESHOLD_PX = 8, DEFAULT_DRAG_INTENT_RATIO = 1, PointerGesture = class {
    constructor(target, callbacks) {
      __publicField(this, "mousePointerId", -1);
      __publicField(this, "pinchPointers", /* @__PURE__ */ new Map());
      __publicField(this, "drag", null);
      __publicField(this, "suppressClick", !1);
      __publicField(this, "suppressClickTimer", null);
      __publicField(this, "pinch", null);
      __publicField(this, "onDragStart", (event) => {
        this.drag?.canDrag && event.preventDefault();
      });
      __publicField(this, "onClick", (event) => {
        this.suppressClick && (this.suppressClick = !1, event.preventDefault(), event.stopPropagation());
      });
      __publicField(this, "onContextMenu", () => {
        this.drag?.active || (this.cancel(), this.clearPinch());
      });
      __publicField(this, "onPointerDown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0 || this.trackPinchPointerDown(event) || this.pinch || this.drag)
          return;
        let canDrag = this.callbacks.shouldCaptureDrag?.(event) ?? !0;
        (canDrag || (this.callbacks.shouldObserveTap?.(event) ?? !1)) && (this.start(event.pointerId, event.pointerType, event.clientX, event.clientY, event, canDrag), event.pointerType === "mouse" && this.addMouseListeners());
      });
      __publicField(this, "onMouseDown", (event) => {
        event.button !== 0 || typeof PointerEvent < "u" || this.drag || !(this.callbacks.shouldCaptureDrag?.(event) ?? !0) || (this.start(this.mousePointerId, "mouse", event.clientX, event.clientY, event, !0), this.addMouseListeners());
      });
      __publicField(this, "onPointerMove", (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || this.drag.pointerType === "mouse" || this.move(event.clientX, event.clientY, event);
      });
      __publicField(this, "onPointerUp", (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || (this.finish(event.clientX, event.clientY, event), this.releasePinchPointer(event));
      });
      __publicField(this, "onPointerCancel", (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || (this.finish(event.clientX, event.clientY, event, !0), this.releasePinchPointer(event));
      });
      __publicField(this, "onMouseMove", (event) => {
        !this.drag || this.drag.pointerType !== "mouse" || this.move(event.clientX, event.clientY, event);
      });
      __publicField(this, "onMouseUp", (event) => {
        !this.drag || this.drag.pointerType !== "mouse" || this.finish(event.clientX, event.clientY, event);
      });
      __publicField(this, "onPinchPointerMove", (event) => {
        if (!this.pinch || !this.pinchPointers.has(event.pointerId))
          return;
        this.pinchPointers.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY
        });
        let snapshot = this.pinchSnapshot();
        snapshot && (this.callbacks.onPinchMove?.({
          ...snapshot,
          scale: snapshot.distance / this.pinch.startDistance
        }, event), event.preventDefault());
      });
      __publicField(this, "onPinchPointerEnd", (event) => {
        this.pinchPointers.has(event.pointerId) && (this.pinchPointers.delete(event.pointerId), !(!this.pinch || this.pinchPointers.size >= 2) && (this.callbacks.onPinchEnd?.(), this.clearPinch(), event.preventDefault()));
      });
      this.target = target, this.callbacks = callbacks, this.setDragging(!1), target.addEventListener("pointerdown", this.onPointerDown), target.addEventListener("mousedown", this.onMouseDown), target.addEventListener("dragstart", this.onDragStart), target.addEventListener("click", this.onClick, !0), target.addEventListener("contextmenu", this.onContextMenu);
    }
    dispose() {
      this.drag && this.releaseCapture(this.drag), this.drag = null, this.setDragging(!1), this.clearPinch(), this.removePointerListeners(), this.removeMouseListeners(), this.target.removeEventListener("pointerdown", this.onPointerDown), this.target.removeEventListener("mousedown", this.onMouseDown), this.target.removeEventListener("dragstart", this.onDragStart), this.target.removeEventListener("click", this.onClick, !0), this.target.removeEventListener("contextmenu", this.onContextMenu), this.suppressClickTimer !== null && (window.clearTimeout(this.suppressClickTimer), this.suppressClickTimer = null);
    }
    isDragging() {
      return this.drag?.active === !0;
    }
    cancel() {
      this.drag && (this.releaseCapture(this.drag), this.drag = null, this.setDragging(!1), this.removePointerListeners(), this.removeMouseListeners());
    }
    start(pointerId, pointerType, clientX, clientY, event, canDrag) {
      this.drag = {
        active: !1,
        canDrag,
        captureTarget: null,
        pointerId,
        pointerType,
        startClientX: clientX,
        startClientY: clientY,
        lastClientX: clientX,
        lastClientY: clientY,
        lastMoveTime: event.timeStamp,
        startTarget: event.target,
        tapCancelled: !1,
        velocityY: 0
      };
      let captureTarget = event.target;
      canDrag && "pointerId" in event && typeof captureTarget?.setPointerCapture == "function" && (captureTarget.setPointerCapture(pointerId), this.drag.captureTarget = captureTarget), this.addPointerListeners();
    }
    move(clientX, clientY, event) {
      let drag = this.drag;
      if (!drag)
        return;
      let dx = clientX - drag.startClientX, dy = clientY - drag.startClientY;
      if ((Math.abs(dx) >= this.tapMoveThreshold() || Math.abs(dy) >= this.tapMoveThreshold()) && (drag.tapCancelled = !0), !drag.canDrag) {
        this.updateLastMove(drag, clientX, clientY, event);
        return;
      }
      let intent = this.dragIntent(dx, dy);
      if (!drag.active && intent === "cancel") {
        this.cancel();
        return;
      }
      if (!drag.active && intent !== "start") {
        this.updateLastMove(drag, clientX, clientY, event);
        return;
      }
      drag.active || this.activateDrag(drag, event);
      let elapsed = Math.max(1, event.timeStamp - drag.lastMoveTime);
      drag.velocityY = (clientY - drag.lastClientY) / elapsed, drag.lastClientX = clientX, drag.lastClientY = clientY, drag.lastMoveTime = event.timeStamp, this.callbacks.onMove?.({
        pointerId: drag.pointerId,
        clientX,
        clientY,
        dx: clientX - drag.startClientX,
        dy: clientY - drag.startClientY,
        velocityY: drag.velocityY
      }, event), event.preventDefault();
    }
    finish(clientX, clientY, event, cancelled = !1) {
      let drag = this.drag;
      if (!drag)
        return;
      this.drag = null, this.setDragging(!1), this.releaseCapture(drag), this.removePointerListeners(), this.removeMouseListeners();
      let info = {
        pointerId: drag.pointerId,
        clientX,
        clientY,
        dx: clientX - drag.startClientX,
        dy: clientY - drag.startClientY,
        velocityY: drag.velocityY
      }, isTap = !drag.tapCancelled && Math.abs(info.dx) < this.tapMoveThreshold() && Math.abs(info.dy) < this.tapMoveThreshold();
      if (!cancelled && !drag.active && isTap && this.callbacks.onTap?.({
        ...info,
        startTarget: drag.startTarget
      }, event), drag.active) {
        if (cancelled) {
          this.callbacks.onEnd?.({
            ...info,
            dx: 0,
            dy: 0,
            velocityY: 0
          }, event);
          return;
        }
        this.suppressNextClick(), this.callbacks.onEnd?.(info, event);
      }
    }
    addPointerListeners() {
      document.addEventListener("pointermove", this.onPointerMove, !0), document.addEventListener("pointerup", this.onPointerUp, !0), document.addEventListener("pointercancel", this.onPointerCancel, !0);
    }
    removePointerListeners() {
      document.removeEventListener("pointermove", this.onPointerMove, !0), document.removeEventListener("pointerup", this.onPointerUp, !0), document.removeEventListener("pointercancel", this.onPointerCancel, !0);
    }
    addMouseListeners() {
      window.addEventListener("mousemove", this.onMouseMove, !0), window.addEventListener("mouseup", this.onMouseUp, !0);
    }
    removeMouseListeners() {
      window.removeEventListener("mousemove", this.onMouseMove, !0), window.removeEventListener("mouseup", this.onMouseUp, !0);
    }
    trackPinchPointerDown(event) {
      if (!this.callbacks.onPinchStart || event.pointerType === "mouse" || (this.pinchPointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY
      }), this.pinch || this.pinchPointers.size !== 2))
        return !1;
      let snapshot = this.pinchSnapshot();
      return snapshot ? this.callbacks.onPinchStart(snapshot, event) ? (this.cancel(), this.pinch = {
        startDistance: snapshot.distance
      }, this.addPinchListeners(), event.preventDefault(), event.stopPropagation(), !0) : (this.pinchPointers.delete(event.pointerId), !1) : !1;
    }
    addPinchListeners() {
      document.addEventListener("pointermove", this.onPinchPointerMove, !0), document.addEventListener("pointerup", this.onPinchPointerEnd, !0), document.addEventListener("pointercancel", this.onPinchPointerEnd, !0);
    }
    removePinchListeners() {
      document.removeEventListener("pointermove", this.onPinchPointerMove, !0), document.removeEventListener("pointerup", this.onPinchPointerEnd, !0), document.removeEventListener("pointercancel", this.onPinchPointerEnd, !0);
    }
    clearPinch() {
      this.pinch = null, this.pinchPointers.clear(), this.removePinchListeners();
    }
    releasePinchPointer(event) {
      this.pinch || this.pinchPointers.delete(event.pointerId);
    }
    pinchSnapshot() {
      let points = Array.from(this.pinchPointers.values());
      if (points.length < 2)
        return null;
      let [first, second] = points, dx = second.clientX - first.clientX, dy = second.clientY - first.clientY;
      return {
        clientX: (first.clientX + second.clientX) / 2,
        clientY: (first.clientY + second.clientY) / 2,
        distance: Math.hypot(dx, dy)
      };
    }
    tapMoveThreshold() {
      return this.callbacks.tapMoveThreshold ?? DEFAULT_TAP_MOVE_THRESHOLD_PX;
    }
    dragStartThreshold() {
      return this.callbacks.dragStartThreshold ?? DEFAULT_DRAG_START_THRESHOLD_PX;
    }
    dragIntentRatio() {
      return this.callbacks.dragIntentRatio ?? DEFAULT_DRAG_INTENT_RATIO;
    }
    dragAxis() {
      return this.callbacks.dragAxis ?? "any";
    }
    dragIntent(dx, dy) {
      let absX = Math.abs(dx), absY = Math.abs(dy), threshold = this.dragStartThreshold(), ratio = this.dragIntentRatio();
      return this.dragAxis() === "x" ? absY >= threshold && absY > absX ? "cancel" : absX >= threshold && absX >= absY * ratio ? "start" : "pending" : this.dragAxis() === "y" ? absX >= threshold && absX > absY ? "cancel" : absY >= threshold && absY >= absX * ratio ? "start" : "pending" : Math.hypot(dx, dy) >= threshold ? "start" : "pending";
    }
    activateDrag(drag, event) {
      drag.active = !0, this.setDragging(!0), this.callbacks.onStart?.({
        pointerId: drag.pointerId,
        clientX: drag.startClientX,
        clientY: drag.startClientY
      }, event), event.preventDefault();
    }
    updateLastMove(drag, clientX, clientY, event) {
      let elapsed = Math.max(1, event.timeStamp - drag.lastMoveTime);
      drag.velocityY = (clientY - drag.lastClientY) / elapsed, drag.lastClientX = clientX, drag.lastClientY = clientY, drag.lastMoveTime = event.timeStamp;
    }
    suppressNextClick() {
      this.suppressClick = !0, this.suppressClickTimer !== null && window.clearTimeout(this.suppressClickTimer), this.suppressClickTimer = window.setTimeout(() => {
        this.suppressClick = !1, this.suppressClickTimer = null;
      }, 400);
    }
    setDragging(dragging) {
      this.target.dataset.dragging = String(dragging);
    }
    releaseCapture(drag) {
      drag.captureTarget?.hasPointerCapture(drag.pointerId) && drag.captureTarget.releasePointerCapture(drag.pointerId);
    }
  };
  function createPointerGestureElement(target, callbacks) {
    let gesture = null;
    return createEffect(() => {
      let element = target();
      element && (gesture = new PointerGesture(element, pointerGestureCallbackProxy(callbacks)), onCleanup(() => {
        gesture?.dispose(), gesture = null;
      }));
    }), () => gesture?.isDragging() ?? !1;
  }
  function pointerGestureCallbackProxy(callbacks) {
    return {
      get dragAxis() {
        return callbacks().dragAxis;
      },
      get dragIntentRatio() {
        return callbacks().dragIntentRatio;
      },
      get dragStartThreshold() {
        return callbacks().dragStartThreshold;
      },
      shouldCaptureDrag: (event) => callbacks().shouldCaptureDrag?.(event) ?? !0,
      shouldObserveTap: (event) => callbacks().shouldObserveTap?.(event) ?? !1,
      onStart: (info, event) => callbacks().onStart?.(info, event),
      onMove: (info, event) => callbacks().onMove?.(info, event),
      onEnd: (info, event) => callbacks().onEnd?.(info, event),
      onTap: (info, event) => callbacks().onTap?.(info, event),
      onPinchStart: (info, event) => callbacks().onPinchStart?.(info, event) ?? !1,
      onPinchMove: (info, event) => callbacks().onPinchMove?.(info, event),
      onPinchEnd: () => callbacks().onPinchEnd?.(),
      get tapMoveThreshold() {
        return callbacks().tapMoveThreshold;
      }
    };
  }

  // src/components/Widgets/Loading.tsx
  var _tmpl$ = /* @__PURE__ */ template('<span class="inline-flex items-center justify-center gap-md ehp-color-text"role=status aria-live=polite><span aria-hidden=true></span><span>'), _tmpl$2 = /* @__PURE__ */ template('<div class="fixed left-1/2 top-1/2 z-overlay flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-elevated)] px-lg py-md text-[var(--color-text)] shadow-[0_6px_20px_var(--color-shadow-floating)] pointer-events-none select-none">');
  function LoadingSpinner(props) {
    let sizeClass = props.size === "lg" ? "w-sm h-sm border-4" : "w-xs h-xs border-3";
    return (() => {
      var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling;
      return className(_el$2, `${sizeClass} inline-block box-border animate-spin rounded-full border-solid ehp-color-spinner`), insert(_el$3, () => props.label), _el$;
    })();
  }
  function LoadingOverlay(props) {
    return createComponent(Show, {
      get when() {
        return props.visible;
      },
      get children() {
        var _el$4 = _tmpl$2();
        return insert(_el$4, createComponent(LoadingSpinner, {
          get label() {
            return props.label;
          },
          size: "lg"
        })), _el$4;
      }
    });
  }
  function loadingSpinnerElement(label, size) {
    let host = document.createElement("span");
    return render(() => createComponent(LoadingSpinner, {
      label,
      size
    }), host), host;
  }

  // src/components/Widgets/Icon.tsx
  var _tmpl$3 = /* @__PURE__ */ template('<svg viewBox="0 0 24 24"stroke-linecap=round stroke-linejoin=round aria-hidden=true>'), _tmpl$22 = /* @__PURE__ */ template("<svg><path fill=currentColor stroke=none></svg>", !1, !0, !1), _tmpl$32 = /* @__PURE__ */ template("<svg><path></svg>", !1, !0, !1);
  function Icon(props) {
    let definition = createMemo(() => ICON_DEFINITIONS[props.name]), filled = createMemo(() => definition().solid || definition().fillable && props.filled);
    return (() => {
      var _el$ = _tmpl$3();
      return insert(_el$, createComponent(For, {
        get each() {
          return definition().filledPaths;
        },
        children: (path) => (() => {
          var _el$2 = _tmpl$22();
          return setAttribute(_el$2, "d", path), _el$2;
        })()
      }), null), insert(_el$, createComponent(For, {
        get each() {
          return definition().paths;
        },
        children: (path) => (() => {
          var _el$3 = _tmpl$32();
          return setAttribute(_el$3, "d", path), _el$3;
        })()
      }), null), createRenderEffect((_p$) => {
        var _v$ = `ehpeek-icon block flex-none${props.className ? ` ${props.className}` : ""}`, _v$2 = props.size ?? 24, _v$3 = props.size ?? 24, _v$4 = filled() ? "currentColor" : "none", _v$5 = filled() ? "none" : "currentColor", _v$6 = props.strokeWidth ?? 2, _v$7 = props.name;
        return _v$ !== _p$.e && setAttribute(_el$, "class", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$, "width", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$, "height", _p$.a = _v$3), _v$4 !== _p$.o && setAttribute(_el$, "fill", _p$.o = _v$4), _v$5 !== _p$.i && setAttribute(_el$, "stroke", _p$.i = _v$5), _v$6 !== _p$.n && setAttribute(_el$, "stroke-width", _p$.n = _v$6), _v$7 !== _p$.s && setAttribute(_el$, "data-icon-name", _p$.s = _v$7), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0,
        s: void 0
      }), _el$;
    })();
  }
  var ICON_DEFINITIONS = {
    "arrow-left": {
      paths: ["M19 12H5", "m12 19-7-7 7-7"]
    },
    "arrow-right": {
      paths: ["M5 12h14", "m12 5 7 7-7 7"]
    },
    "arrow-up": {
      paths: ["m5 12 7-7 7 7", "M12 5v14"]
    },
    "arrows-horizontal": {
      paths: ["M3 12h18", "m7 8-4 4 4 4", "m17 8 4 4-4 4"]
    },
    "arrows-vertical": {
      paths: ["M12 3v18", "m8 7 4-4 4 4", "m8 17 4 4 4-4"]
    },
    check: {
      paths: ["m5 12.5 4.25 4.25L19.5 6.5"]
    },
    "chevron-left": {
      paths: ["m15 18-6-6 6-6"]
    },
    "chevron-right": {
      paths: ["m9 18 6-6-6-6"]
    },
    close: {
      paths: ["M6 6l12 12", "M18 6 6 18"]
    },
    download: {
      paths: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"]
    },
    "external-link": {
      paths: ["M14 4h6v6", "m20 4-9 9", "M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"]
    },
    fullscreen: {
      paths: ["M8 3H3v5", "M16 3h5v5", "M3 16v5h5", "M21 16v5h-5"]
    },
    "fullscreen-exit": {
      paths: ["M8 3v5H3", "M16 3v5h5", "M3 16h5v5", "M21 16h-5v5"]
    },
    heart: {
      fillable: !0,
      paths: ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"]
    },
    home: {
      paths: ["m3 10.5 9-7.5 9 7.5", "M5.5 9v11h13V9", "M9.5 20v-6h5v6"]
    },
    menu: {
      paths: ["M12 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"],
      solid: !0
    },
    "panda-peek": {
      filledPaths: ["M7.2 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z", "M16.8 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z", "M7.6 9.8c.5-1.2 1.6-1.8 2.6-1.3s1.3 1.8.8 3-1.6 1.8-2.6 1.3-1.3-1.8-.8-3Z", "M13.8 8.5c1-.5 2.1.1 2.6 1.3s.2 2.5-.8 3-2.1-.1-2.6-1.3-.2-2.5.8-3Z", "M10.9 13.6c0-.6.5-.9 1.1-.9s1.1.3 1.1.9-.5 1-1.1 1-1.1-.4-1.1-1Z", "M5.2 13.7a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z", "M18.8 14.1a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z"],
      paths: ["M5 17c-.8-6.4 2.1-10.8 7-10.8s7.8 4.4 7 10.8", "M12 14.6v.7c0 .7-.6 1.2-1.3 1.2m1.3-1.2c0 .7.6 1.2 1.3 1.2", "M2 17h20"]
    },
    search: {
      paths: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", "m16.2 16.2 4.3 4.3"]
    },
    settings: {
      paths: ["M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4A2 2 0 0 0 4 9.9l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z", "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"]
    },
    star: {
      fillable: !0,
      paths: ["m12 2.75 2.85 5.77 6.37.93-4.61 4.49 1.09 6.34L12 17.24 6.3 20.23l1.09-6.34-4.61-4.49 6.37-.93Z"]
    }
  };

  // src/components/Widgets/SwipeIndicator.tsx
  var _tmpl$4 = /* @__PURE__ */ template('<div class="ehpeek-swipe-indicator fixed top-1/2 z-overlay flex w-42px h-108px items-center justify-center border border-[var(--color-site-swipe-border)] rounded-full bg-[var(--color-site-swipe-background)] text-[var(--color-site-text)] shadow-[0_6px_20px_var(--color-shadow-floating)] pointer-events-none select-none transition-opacity duration-120 ease-in-out"style=backdrop-filter:blur(8px)>'), HIDE_PROGRESS = 1e-3;
  function SwipeIndicator(props) {
    let progress = createMemo(() => Math.min(1, Math.max(0, props.state.progress))), hidden = createMemo(() => progress() <= HIDE_PROGRESS), pull = createMemo(() => Math.round(48 * progress())), offset = createMemo(() => props.state.direction === "left" ? 42 - pull() : pull() - 42), iconName = createMemo(() => props.state.blocked ? "close" : props.state.direction === "left" ? "chevron-left" : "chevron-right");
    return (() => {
      var _el$ = _tmpl$4();
      return insert(_el$, createComponent(Icon, {
        get name() {
          return iconName();
        },
        size: 36
      })), createRenderEffect((_p$) => {
        var _v$ = hidden() ? "true" : "false", _v$2 = hidden() ? "none" : "flex", _v$3 = props.state.direction === "right" ? "6px" : "", _v$4 = hidden() ? "0" : String(0.35 + progress() * 0.65), _v$5 = props.state.direction === "left" ? "6px" : "", _v$6 = `translate(${offset()}px, -50%)`;
        return _v$ !== _p$.e && setAttribute(_el$, "aria-hidden", _p$.e = _v$), _v$2 !== _p$.t && setStyleProperty(_el$, "display", _p$.t = _v$2), _v$3 !== _p$.a && setStyleProperty(_el$, "left", _p$.a = _v$3), _v$4 !== _p$.o && setStyleProperty(_el$, "opacity", _p$.o = _v$4), _v$5 !== _p$.i && setStyleProperty(_el$, "right", _p$.i = _v$5), _v$6 !== _p$.n && setStyleProperty(_el$, "transform", _p$.n = _v$6), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0
      }), _el$;
    })();
  }

  // src/texts.json
  var texts_default = {
    description: "A mobile-optimized E-H/ExH viewer",
    reader: {
      close: "Close",
      scrollMode: "Switch to scroll mode",
      pagedMode: "Switch to page-flip mode",
      readLeftToRight: "Read left to right",
      readRightToLeft: "Read right to left",
      rightTapPrevious: "Right tap goes to previous page",
      rightTapNext: "Right tap goes to next page",
      openOriginalPage: "Open original image page",
      enterFullscreen: "Enter fullscreen",
      exitFullscreen: "Exit fullscreen",
      download: "Download",
      downloadDisplayedImage: "Displayed image",
      downloadOriginalImage: "Original image",
      originalImageSource: "Original source provided by E-Hentai",
      originalImageUnavailable: "Original image unavailable",
      startReading: "Read",
      continueReading: "Continue",
      backToTop: "Back to top",
      loading: "Loading...",
      pages: "Pages",
      endPage: "End",
      end: "End of gallery. Tap to exit.",
      failedPrefix: "Failed",
      reload: "Reload"
    },
    navigation: {
      favorites: "Favorites",
      github: "Ehpeek on GitHub",
      home: "Home",
      menu: "Menu"
    },
    favorites: {
      all: "All",
      categories: "Favorite category"
    },
    gallery: {
      favoriteTag: "Favorite",
      removeFavoriteTag: "Remove My Tag",
      tagCollection: "Collection",
      tagBehavior: "Behavior",
      markTag: "Mark",
      watchTag: "Watch",
      hideTag: "Hide",
      voteUp: "Vote Up",
      voteDown: "Vote Down",
      withdrawVote: "Withdraw Vote",
      showTaggedGalleries: "Show Tagged Galleries",
      showTagDefinition: "Show Tag Definition",
      addNewTag: "Add New Tag"
    },
    settings: {
      openSettings: "Settings",
      menuLabel: "Ehpeek",
      showHelp: "What does this setting do?",
      on: "On",
      off: "Off",
      singlePageApp: "Single Page App",
      singlePageAppHelp: "Loads pages without a full page refresh; requires Touch UI",
      readerLabel: "Reader",
      readerHelp: "Opens gallery images in Ehpeek's reader",
      readerFullscreenLabel: "Open in Fullscreen",
      readerFullscreenHelp: "Fullscreen when reader opens",
      readerOptions: "Reader Options",
      showReaderOptions: "Show Reader options",
      hideReaderOptions: "Hide Reader options",
      enhance: "Enhance",
      showEnhance: "Show Enhance settings",
      hideEnhance: "Hide Enhance settings",
      enhanceSearchLabel: "Search Grids",
      enhanceSearchHelp: "Adds swipe navigation to search pages",
      enhanceThumbsLabel: "Thumbs Grids",
      enhanceThumbsHelp: "Adds swipe navigation and scrollable pages bar for gallery preview",
      myTagsLabel: "My Tag",
      myTagsHelp: "Highlights your saved tags with colors in gallery",
      readHistoryLabel: "Read History",
      readHistoryHelp: "Remembers reading progress",
      searchHistoryLabel: "Search History",
      searchHistoryHelp: "Remembers previous searches",
      touchUiLabel: "Touch UI",
      touchUiHelp: "Uses touch-friendly navigation UI.",
      apply: "Apply",
      default: "Default",
      close: "Close"
    },
    search: {
      advancedOptions: "Advanced Options",
      categories: "Categories",
      fileSearch: "File Search",
      history: "Search History",
      deleteHistory: "Delete search history item"
    },
    singlePageApp: {
      loadFailed: "Could not load this page",
      openOriginal: "Open original page",
      dismiss: "Dismiss"
    },
    text: {
      confirm: "Confirm"
    },
    errors: {
      imageNotFound: "Image not found",
      downloadFailed: "Download failed",
      loadFailed: "Load failed",
      imageLoadFailed: "Image load failed",
      previewPageSizeUnknown: "Cannot determine gallery preview page size",
      searchPageContentNotFound: "Cannot find search page content"
    }
  };

  // src/utils.ts
  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
  function normalizeUrl(url, baseUrl = window.location.href) {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return "";
    }
  }
  function normalizedAspectRatio(value, fallback) {
    return value && Number.isFinite(value) && value > 0 ? value : fallback;
  }
  function positiveNumber(value) {
    return value && Number.isFinite(value) && value > 0 ? value : null;
  }
  function stopEvent(event) {
    event.stopPropagation();
  }
  function registerGlobalStyle(id, css) {
    let styleId = `style-${id}`;
    if (document.getElementById(styleId))
      return;
    let style2 = document.createElement("style");
    style2.id = styleId, style2.textContent = css, document.head.append(style2);
  }
  function targetSummary(target) {
    if (!(target instanceof Element))
      return String(target);
    let id = target.id ? `#${target.id}` : "", className2 = typeof target.className == "string" && target.className ? `.${target.className.replace(/\s+/g, ".")}` : "";
    return `${target.tagName.toLowerCase()}${id}${className2}`;
  }

  // src/eh/request.ts
  async function requestPage(url, options = {}) {
    let controller = new AbortController(), abort = () => controller.abort(), timeoutMs = options.timeoutMs === void 0 ? 3e4 : options.timeoutMs, timeout = timeoutMs === null ? null : window.setTimeout(abort, timeoutMs);
    options.signal?.aborted ? controller.abort() : options.signal?.addEventListener("abort", abort, { once: !0 });
    try {
      let response = await fetch(url, {
        method: options.method ?? "GET",
        body: options.body,
        credentials: "include",
        headers: options.headers,
        signal: controller.signal
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      let html = await response.text();
      return {
        document: new DOMParser().parseFromString(html, "text/html"),
        url: response.url || url
      };
    } finally {
      timeout !== null && window.clearTimeout(timeout), options.signal?.removeEventListener("abort", abort);
    }
  }
  async function updateGalleryFavorite(actionUrl, value) {
    let body = new URLSearchParams();
    body.set("favcat", value), body.set("favnote", ""), body.set("apply", "Apply Changes"), body.set("update", "1"), await requestPage(actionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
  }
  async function addMyTag(tagName, tagSet, mode) {
    let body = new URLSearchParams();
    body.set("usertag_action", "add"), body.set("tagname_new", tagName), body.set("tagcolor_new", ""), body.set("tagweight_new", "10"), mode === "watched" ? body.set("tagwatch_new", "on") : mode === "hidden" && body.set("taghide_new", "on");
    let url = new URL("/mytags", window.location.origin);
    return url.searchParams.set("tagset", tagSet), requestPage(url.href, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
  }
  async function deleteMyTag(tagId, tagSet) {
    let body = new URLSearchParams();
    body.set("usertag_action", "mass"), body.set("usertag_target", "0"), body.append("modify_usertags[]", tagId);
    let url = new URL("/mytags", window.location.origin);
    return url.searchParams.set("tagset", tagSet), requestPage(url.href, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
  }
  async function updateGalleryRating(info, value) {
    let result = await requestGalleryApi(info, {
      method: "rategallery",
      rating: Math.round(value * 2)
    }), average = Number(result.rating_avg), count = Number(result.rating_cnt), rating = Number(result.rating_usr);
    if (!Number.isFinite(average) || !Number.isFinite(count) || !Number.isFinite(rating))
      throw new Error("Gallery rating response is invalid.");
    return { average, count, value: rating };
  }
  async function updateGalleryTagVote(info, tag, vote) {
    let result = await requestGalleryApi(info, {
      method: "taggallery",
      tags: tag,
      vote
    });
    if (typeof result.tagpane != "string")
      throw new Error("Gallery tag response is invalid.");
    return result.tagpane;
  }
  async function requestGalleryApi(info, payload) {
    let controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 3e4), requestLog = {
      action: typeof payload.method == "string" ? payload.method : "unknown",
      apiOrigin: new URL(info.apiUrl).origin,
      galleryId: info.galleryId
    };
    console.info("[ehpeek] Gallery API request started", requestLog);
    try {
      let response = await fetch(info.apiUrl, {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          apiuid: info.apiUid,
          apikey: info.apiKey,
          gid: info.galleryId,
          token: info.token
        }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        signal: controller.signal
      });
      if (console.info("[ehpeek] Gallery API response received", {
        ...requestLog,
        status: response.status
      }), !response.ok)
        throw new Error(`HTTP ${response.status}`);
      let result = await response.json();
      if (!result || typeof result != "object" || Array.isArray(result))
        throw new Error("Gallery API response is invalid.");
      let record = result;
      if (typeof record.error == "string" && record.error)
        throw new Error(record.error);
      return record;
    } catch (error) {
      throw console.error("[ehpeek] Gallery API request failed", requestLog, error), error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // src/eh/galleryRearrange.css
  var galleryRearrange_default = `/* Shared content gutter for the touch gallery page. */
:root {
  --touch-gallery-gutter: clamp(16px, 2.5vw, 36px);
}

/* Remove the original desktop page's minimum width and horizontal page overflow. */
html,
body {
  min-width: 0 !important;
  overflow-x: hidden !important;
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
}

/* Reset the original page shell and apply the active E-H/ExH page palette. */
body {
  box-sizing: border-box;
  padding-left: 0 !important;
  padding-right: 0 !important;
  background: var(--color-site-page) !important;
  font-size: var(--font-size-sm) !important;
  line-height: 1.35 !important;
}

/* Align enhanced and original gallery sections to one responsive content column. */
.ehpeek-touch-gallery-host,
.gpc,
body #gdt[class],
#cdiv,
.ptt,
.ptb {
  box-sizing: border-box !important;
  width: calc(100% - (var(--touch-gallery-gutter) * 2)) !important;
  max-width: none !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

/* Keep wide thumbnail and pagination rows scrollable inside the viewport. */
body #gdt[class],
.ptt,
.ptb,
.ehpeek-scroll-page-bar {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}

/* Give original thumbnail cells a consistent mobile-friendly width. */
#gdt .gdtm,
#gdt .gdtl,
#gdt > div {
  display: inline-flex !important;
  min-width: 132px !important;
  align-items: center !important;
  justify-content: center !important;
  vertical-align: top;
}

/* Center thumbnails inside their enlarged cells. */
#gdt a {
  display: flex !important;
  min-height: 150px;
  align-items: center;
  justify-content: center;
}

/* Establish readable base typography for the original comments section. */
#cdiv {
  font-size: var(--font-size-md) !important;
  line-height: 1.5 !important;
}

/* Enlarge comment bodies while allowing long content to wrap safely. */
#cdiv .c6 {
  font-size: var(--font-size-md) !important;
  line-height: 1.5 !important;
  overflow-wrap: anywhere;
}

/* Keep comment metadata and form hints visually secondary to comment bodies. */
#cdiv .c3,
#cdiv .c4,
#cdiv .c5,
#cdiv .c7,
#formdiv {
  font-size: var(--font-size-sm) !important;
  line-height: 1.4 !important;
}

/* Space the new-comment entry point and suppress the original bracket decoration. */
#postnewcomment {
  margin: 16px 0 !important;
  font-size: 0 !important;
}

/* Present the new-comment entry point as a full touch target. */
#postnewcomment a {
  display: inline-flex !important;
  min-height: 52px;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--color-site-border);
  border-radius: 6px;
  background: var(--color-site-elevated);
  color: var(--color-site-accent);
  font-size: var(--font-size-md);
  text-decoration: none;
}

/* Let comment form fields wrap into a vertical layout on narrow screens. */
#cdiv form {
  display: flex !important;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

/* Make the comment editor full-width and comfortable for touch typing. */
#cdiv textarea,
#commenttext {
  display: block !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-height: 160px !important;
  flex: 1 0 100%;
  padding: 16px !important;
  border-radius: 6px !important;
  font: inherit !important;
  font-size: var(--font-size-md) !important;
  line-height: 1.5 !important;
}

/* Normalize original form controls to the touch sizing scale. */
#cdiv button,
#cdiv input[type="button"],
#cdiv input[type="submit"],
#cdiv input[type="text"],
#cdiv select {
  box-sizing: border-box !important;
  min-height: 52px !important;
  padding: 12px 16px !important;
  border-radius: 6px !important;
  font: inherit !important;
  font-size: var(--font-size-md) !important;
}

/* Let comment form actions share the available row width evenly. */
#cdiv button,
#cdiv input[type="button"],
#cdiv input[type="submit"] {
  flex: 1 1 180px;
  cursor: pointer;
}

/* Keep short text fields useful without forcing them wider than the viewport. */
#cdiv input[type="text"] {
  min-width: min(100%, 240px);
}
`;

  // src/eh/dom.ts
  var TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID = "ehpeek-touch-gallery-page-rearrange-style", TOUCH_FAVORITES_PAGE_CLASS_NAME = "!min-w-0 !max-w-full !overflow-x-hidden", TOUCH_FAVORITES_CONTENT_CLASS_NAME = "box-border !min-w-0 !w-full !max-w-full !overflow-x-hidden", TOUCH_FAVORITES_NAV_CLASS_NAME = "box-border !max-w-full overflow-x-auto", TOUCH_FAVORITES_RESULTS_CLASS_NAME = "ehpeek-touch-favorites-results box-border !min-w-0 !w-full !max-w-full overflow-x-auto", TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME = "!min-w-0 !w-full !max-w-full", TOUCH_FAVORITES_ALL_RESULTS_CLASS_NAME = "!overflow-x-hidden", TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME = "!min-w-0 !max-w-full !overflow-x-hidden", TOUCH_SEARCH_RESULTS_CONTENT_CLASS_NAME = "box-border !min-w-0 !w-full !max-w-full !overflow-x-hidden", TOUCH_SEARCH_RESULTS_WRAPPER_CLASS_NAME = "ehpeek-touch-search-results box-border !min-w-0 !w-full !max-w-full overflow-x-auto", TOUCH_SEARCH_RESULT_LIST_CLASS_NAME = "!min-w-0 !w-full !max-w-full", GALLERY_PAGE_DESCRIPTION_SELECTOR = ".gpc:not(.eh-syringe-ignore)", EXHENTAI_ONION_HOST = "exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion", SINGLE_PAGE_PERSISTENT_SELECTOR = "[data-ehpeek-persistent], #eh-syringe-popup-button, #eh-syringe-popup-back, .eh-syringe-lite-auto-complete-list", galleryApiSession = null;
  function imageAspectRatio(image) {
    let width = image?.naturalWidth || image?.width || Number(image?.getAttribute("width") || ""), height = image?.naturalHeight || image?.height || Number(image?.getAttribute("height") || "");
    return width > 0 && height > 0 ? height / width : 1.42;
  }
  function readImagePageInfo(root, baseUrl) {
    let image = root.querySelector("img#img"), imageSrc = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.currentSrc || "", originalImageUrl = Array.from(root.querySelectorAll("a[href]")).map((link) => normalizeUrl(link.getAttribute("href") || "", baseUrl)).find((url) => imageUrlPath(url).includes("/fullimg")) ?? null;
    return {
      imageUrl: normalizeUrl(imageSrc, baseUrl),
      originalImageUrl,
      width: numericAttribute(image, "width"),
      height: numericAttribute(image, "height")
    };
  }
  function imageGalleryUrl(root = document, baseUrl = window.location.href) {
    for (let link of Array.from(root.querySelectorAll("a[href]"))) {
      let url = normalizeUrl(link.getAttribute("href") || "", baseUrl);
      try {
        if (/^\/g\/\d+\/[^/]+\/?$/i.test(new URL(url).pathname))
          return url;
      } catch {
        continue;
      }
    }
    return null;
  }
  function imageUrlPath(url) {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return "";
    }
  }
  function collectGalleryPages(extractPageType2, root = document, baseUrl = window.location.href) {
    let links = Array.from(
      root.querySelectorAll("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']")
    ), seen = /* @__PURE__ */ new Set(), pages = [];
    for (let link of links) {
      let url = normalizeUrl(link.getAttribute("href") || "", baseUrl), page = extractPageType2(url);
      !url || page.type !== "image" || seen.has(url) || (seen.add(url), pages.push({
        url,
        aspectRatio: imageAspectRatio(link.querySelector("img")),
        pageNum: page.pageNum
      }));
    }
    return pages.sort((left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER));
  }
  function readShowingRange(root = document) {
    let match = (galleryPageDescription(root)?.textContent ?? "").match(/([\d,]+)\s*-\s*([\d,]+)\D+([\d,]+)/);
    if (!match)
      return null;
    let start = Number(match[1].replace(/,/g, "")), end = Number(match[2].replace(/,/g, "")), total = Number(match[3].replace(/,/g, ""));
    return [start, end, total].every((value) => Number.isFinite(value) && value > 0) ? { start, end, total } : null;
  }
  function searchPageNavigation(root = document) {
    let previousUrl = root.querySelector(".searchnav a[id$='prev'][href]")?.href ?? null, nextUrl = root.querySelector(".searchnav a[id$='next'][href]")?.href ?? null;
    return previousUrl || nextUrl ? { previousUrl, nextUrl } : null;
  }
  function searchResultList(root = document) {
    return root.querySelector(".itg");
  }
  function prepareEhPeekSearchGrid() {
    let resultList = searchResultList();
    if (!resultList)
      return;
    document.querySelector(".ehpeek-search-grid-host")?.remove(), resultList.hidden = !1, resultList.style.setProperty("display", "block", "important"), resultList.style.setProperty("width", "100%", "important"), resultList.style.setProperty("table-layout", "auto", "important"), resultList.querySelector("tbody")?.style.setProperty("display", "block", "important");
    for (let row of Array.from(resultList.querySelectorAll("tbody > tr"))) {
      let thumbnailCell = row.querySelector(":scope > .gl1e"), contentCell = row.querySelector(":scope > .gl2e");
      if (!thumbnailCell || !contentCell)
        continue;
      let selectionCell = row.querySelector(":scope > .glfe");
      row.style.setProperty("display", "grid", "important"), row.style.setProperty(
        "grid-template-columns",
        selectionCell ? "clamp(112px, 34%, 250px) minmax(0, 1fr) auto" : "clamp(112px, 34%, 250px) minmax(0, 1fr)",
        "important"
      ), row.style.setProperty("align-items", "start", "important"), row.style.setProperty("column-gap", "0", "important"), row.style.setProperty("width", "100%", "important"), thumbnailCell.style.setProperty("width", "auto", "important"), contentCell.style.setProperty("width", "auto", "important"), contentCell.style.setProperty("min-width", "0", "important"), contentCell.style.setProperty("align-self", "stretch", "important"), contentCell.style.setProperty("height", "100%", "important"), contentCell.style.setProperty("box-sizing", "border-box", "important"), contentCell.style.setProperty("padding-left", "0", "important"), selectionCell?.style.setProperty("width", "auto", "important"), selectionCell?.style.setProperty("margin-left", "6px", "important"), mergeEhPeekSearchContent(contentCell);
      let thumbnail = thumbnailCell.querySelector(":scope > div");
      thumbnail?.style.setProperty("width", "100%", "important"), thumbnail?.style.setProperty("height", "auto", "important");
      let image = thumbnail?.querySelector("img");
      image?.style.setProperty("width", "100%", "important"), image?.style.setProperty("height", "auto", "important");
      let title = contentCell.querySelector(".glink");
      title?.style.setProperty("height", "auto", "important"), title?.style.setProperty("min-height", "0", "important"), title?.style.setProperty("overflow", "visible", "important"), title?.style.setProperty("overflow-wrap", "anywhere", "important"), title?.style.setProperty("white-space", "normal", "important"), title?.style.setProperty("word-break", "normal", "important"), title?.style.setProperty("text-align", "left", "important"), title?.style.setProperty("font-size", "var(--font-size-md)", "important"), title?.style.setProperty("font-weight", "700", "important"), title?.style.setProperty("line-height", "1.35", "important");
    }
  }
  function mergeEhPeekSearchContent(contentCell) {
    let detail = contentCell.querySelector(".gl4e"), metadata = contentCell.querySelector(".gl3e");
    if (!detail || !metadata || detail.dataset.ehpeekMerged === "true")
      return;
    let galleryLink = detail.parentElement instanceof HTMLAnchorElement ? detail.parentElement : null, title = detail.querySelector(":scope > .glink"), tags = Array.from(detail.children).filter((element) => element !== title);
    if (galleryLink && title) {
      let titleLink = document.createElement("a");
      titleLink.href = galleryLink.href, titleLink.className = "block min-w-0 ehp-color-site-text no-underline", titleLink.append(title), galleryLink.before(detail), galleryLink.remove(), detail.replaceChildren(titleLink, metadata, ...tags), makeEhPeekSearchContentClickable(contentCell, titleLink);
    } else
      title?.after(metadata);
    detail.dataset.ehpeekMerged = "true", detail.style.setProperty("display", "flex", "important"), detail.style.setProperty("flex-direction", "column", "important"), detail.style.setProperty("justify-content", "flex-start", "important"), detail.style.setProperty("align-items", "stretch", "important"), detail.style.setProperty("gap", "var(--space-md, 12px)", "important"), detail.style.setProperty("min-height", "0", "important"), detail.style.setProperty("width", "100%", "important"), detail.style.setProperty("box-sizing", "border-box", "important"), detail.style.setProperty("padding-left", "6px", "important"), metadata.style.setProperty("display", "flex", "important"), metadata.style.setProperty("flex-direction", "row", "important"), metadata.style.setProperty("flex-wrap", "wrap", "important"), metadata.style.setProperty("align-items", "center", "important"), metadata.style.setProperty("align-content", "flex-start", "important"), metadata.style.setProperty("justify-content", "flex-start", "important"), metadata.style.setProperty("gap", "8px 12px", "important"), metadata.style.setProperty("float", "none", "important"), metadata.style.setProperty("position", "static", "important"), metadata.style.setProperty("width", "100%", "important"), metadata.style.setProperty("height", "auto", "important"), metadata.style.setProperty("min-height", "0", "important"), metadata.style.setProperty("margin", "0", "important"), metadata.style.setProperty("padding", "0", "important"), metadata.style.setProperty("font-weight", "600", "important");
    for (let tagsContainer of tags)
      if (tagsContainer instanceof HTMLElement) {
        tagsContainer.style.setProperty("position", "static", "important"), tagsContainer.style.setProperty("width", "100%", "important"), tagsContainer.style.setProperty("height", "auto", "important"), tagsContainer.style.setProperty("min-height", "0", "important"), tagsContainer.style.setProperty("flex", "0 0 auto", "important"), tagsContainer.style.setProperty("margin", "0", "important"), tagsContainer.style.setProperty("padding", "0", "important");
        for (let table of Array.from(tagsContainer.querySelectorAll("table, tbody, tr")))
          table.style.setProperty("height", "auto", "important"), table.style.setProperty("min-height", "0", "important"), table.style.setProperty("margin", "0", "important");
        for (let cell of Array.from(tagsContainer.querySelectorAll("td")))
          cell.style.setProperty("height", "auto", "important"), cell.style.setProperty("min-height", "0", "important"), cell.style.setProperty("vertical-align", "top", "important");
      }
    for (let tag of Array.from(detail.querySelectorAll(".gt, .gtl, .gtw, td.tc")))
      tag.style.setProperty("font-size", "var(--font-size-sm)", "important"), tag.style.setProperty("line-height", "1.2", "important");
    for (let item of Array.from(metadata.children))
      if (item instanceof HTMLElement) {
        if (item.style.setProperty("float", "none", "important"), item.style.setProperty("position", "static", "important"), item.style.setProperty("flex", "0 0 auto", "important"), item.style.setProperty("min-width", "0", "important"), item.style.setProperty("margin", "0", "important"), item.style.setProperty("font-size", "var(--font-size-sm)", "important"), item.style.setProperty("font-weight", "600", "important"), item.matches(".ir, .gldown")) {
          item.style.removeProperty("width"), item.style.removeProperty("height");
          continue;
        }
        item.style.setProperty("width", "auto", "important"), item.style.setProperty("height", "auto", "important"), item.style.setProperty("padding", "0", "important"), item.style.setProperty("line-height", "1.3", "important"), item.matches(".cn, .cs, [class*='ct']") && (item.style.setProperty("display", "inline-flex", "important"), item.style.setProperty("align-items", "center", "important"), item.style.setProperty("justify-content", "center", "important"), item.style.setProperty("box-sizing", "border-box", "important"), item.style.setProperty("width", "72px", "important"), item.style.setProperty("height", "32px", "important"), item.style.setProperty("padding", "0 8px", "important"));
      }
  }
  function makeEhPeekSearchContentClickable(contentCell, galleryLink) {
    if (contentCell.dataset.ehpeekClickable === "true")
      return;
    contentCell.dataset.ehpeekClickable = "true", contentCell.style.setProperty("position", "relative", "important"), contentCell.style.setProperty("cursor", "pointer", "important");
    let coarseOverlay = document.createElement("a");
    coarseOverlay.href = galleryLink.href, coarseOverlay.className = "hidden coarse:block absolute inset-0 z-1", coarseOverlay.setAttribute("aria-label", galleryLink.textContent?.trim() || "Open gallery"), contentCell.append(coarseOverlay), contentCell.addEventListener("click", (event) => {
      event.target instanceof Element && event.target.closest("a[href], button, input, select, textarea, label, [onclick]") || galleryLink.click();
    });
  }
  function prepareSearchGridModeSelect(selected, onEhPeekSelect, onOriginalSelect) {
    let selects = Array.from(
      document.querySelectorAll(
        "select[onchange*='inline_set=dm_'], select[data-ehpeek-grid-mode-source='true']"
      )
    );
    for (let select of selects) {
      let option = Array.from(select.options).find((item) => item.value === "ehpeek");
      option || (option = new Option("EhPeek", "ehpeek"), select.add(option)), option.selected = selected, select.dataset.ehpeekGridMode !== "true" && (select.dataset.ehpeekGridMode = "true", select.addEventListener("change", (event) => {
        if (select.value !== "ehpeek") {
          event.preventDefault(), event.stopImmediatePropagation(), onOriginalSelect(select.value);
          return;
        }
        event.preventDefault(), event.stopImmediatePropagation(), onEhPeekSelect();
      }, !0));
    }
  }
  function searchNavigationBars(root = document) {
    return Array.from(root.querySelectorAll(".searchnav"));
  }
  function searchTopNavigationBar(root = document) {
    return searchNavigationBars(root)[0] ?? null;
  }
  function searchNavigationLinkForUrl(url, root = document) {
    let targetUrl = normalizeUrl(url, window.location.href);
    for (let bar of searchNavigationBars(root)) {
      let link = Array.from(bar.querySelectorAll("a[href]")).find(
        (candidate) => candidate.href === targetUrl
      );
      if (link)
        return link;
    }
    return null;
  }
  function singlePageContentNodes(root = document.body) {
    return Array.from(root.childNodes).filter(
      (node) => !(node instanceof Element && node.matches(SINGLE_PAGE_PERSISTENT_SELECTOR))
    );
  }
  function prepareSinglePageContent(root, baseUrl) {
    captureGalleryApiSession(root, baseUrl), preserveSinglePageGalleryData(root, baseUrl), preserveSinglePageGalleryUtilityLinks(root, baseUrl);
    for (let form of Array.from(root.querySelectorAll("form"))) {
      let action = form.getAttribute("action") ?? "";
      form.action = normalizeUrl(action || baseUrl, baseUrl);
    }
    for (let element of Array.from(root.querySelectorAll("*")))
      for (let attribute of Array.from(element.attributes))
        /^on/i.test(attribute.name) && (preserveSinglePageControlRole(element, attribute.value), element.removeAttribute(attribute.name));
    for (let script of Array.from(root.querySelectorAll("script")))
      script.remove();
  }
  function preserveSinglePageGalleryUtilityLinks(root, baseUrl) {
    for (let link of Array.from(root.querySelectorAll("#gd5 a[onclick]"))) {
      let popupUrl = (link.getAttribute("onclick") ?? "").match(/\bpopUp\(['\"]([^'\"]+)['\"]/)?.[1];
      popupUrl && (link.href = new URL(popupUrl, baseUrl).href, link.target = "_blank", link.rel = "noopener noreferrer", link.dataset.ehpeekGalleryUtility = "true");
    }
  }
  function preserveSinglePageGalleryData(root, baseUrl) {
    let scripts = Array.from(root.querySelectorAll("script"), (item) => item.textContent ?? ""), ratingScript = scripts.find((text) => text.includes("display_rating")), rating = ratingScript ? scriptNumberValue(ratingScript, "display_rating") : null, ratingImage = root.querySelector("#rating_image");
    ratingImage && rating !== null && (ratingImage.dataset.ehpeekRating = String(rating));
    let gallery = new URL(baseUrl).pathname.match(/^\/g\/(\d+)\/([^/]+)/i), favoriteMatch = scripts.find((text) => text.includes("popbase") && text.includes("addfav"))?.match(
      /popbase\s*=\s*base_url\s*\+\s*"gallerypopups\.php\?gid=(\d+)&t=([^"&]+)&act="/
    ), favorite = root.querySelector("#fav");
    favorite && gallery && favoriteMatch?.[1] === gallery[1] && favoriteMatch[2] === gallery[2] && (favorite.dataset.ehpeekActionUrl = `/gallerypopups.php?gid=${favoriteMatch[1]}&t=${favoriteMatch[2]}&act=addfav`);
  }
  function preserveSinglePageControlRole(element, handler) {
    handler.includes("toggle_advsearch") && (element.dataset.ehpeekSearchAdvancedToggle = "true"), handler.includes("toggle_filesearch") && (element.dataset.ehpeekSearchFileToggle = "true"), handler.includes("inline_set=dm_") && (element.dataset.ehpeekGridModeSource = "true");
  }
  function importSinglePageContent(doc, baseUrl) {
    return absolutizeDocumentUrls(doc, baseUrl), prepareSinglePageContent(doc, baseUrl), Array.from(doc.body.childNodes, (node) => document.importNode(node, !0));
  }
  function singlePageNavigationLink(target) {
    let link = target instanceof Element ? target.closest("a[href]") : null;
    return !(link instanceof HTMLAnchorElement) || link.hasAttribute("data-ehpeek-single-page-bypass") ? null : link;
  }
  function singlePageSearchForm(target) {
    let form = target instanceof HTMLFormElement ? target : null;
    return !form || !form.matches("#searchbox form, #fsdiv form") && !form.querySelector("[name='f_search']") ? null : form;
  }
  function resetTouchPageLayout() {
    document.documentElement.classList.remove(
      ...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "),
      ...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" ")
    ), document.body.classList.remove(
      ...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "),
      ...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" ")
    );
  }
  function preparePageViewportForFullscreen() {
    return {
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
  }
  async function restorePageViewport(snapshot) {
    await nextAnimationFrame(), await nextAnimationFrame(), await nextAnimationFrame(), window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  }
  function nextAnimationFrame() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
  function absolutizeDocumentUrls(doc, baseUrl) {
    let attributes = [
      ["a[href]", "href"],
      ["area[href]", "href"],
      ["form[action]", "action"],
      ["img[src]", "src"],
      ["input[src]", "src"],
      ["script[src]", "src"],
      ["source[src]", "src"]
    ];
    for (let [selector, attribute] of attributes)
      for (let element of Array.from(doc.querySelectorAll(selector))) {
        let value = element.getAttribute(attribute);
        !value || value.startsWith("#") || /^(?:data|javascript|mailto):/i.test(value) || element.setAttribute(attribute, normalizeUrl(value, baseUrl));
      }
  }
  function readTouchSearchPanelInfo(root = document) {
    let searchInput = root.querySelector("#f_search, input[name='f_search']"), form = searchInput?.form ?? null, standardSearchBox = searchInput?.closest("#searchbox") ?? null, searchControls = document.createElement("div"), searchBox = standardSearchBox ?? searchControls, categories = searchBox?.querySelector("form > table") ?? null, advancedPanel = searchBox?.querySelector("#advdiv") ?? null, optionLinksCandidate = advancedPanel?.previousElementSibling, optionLinks = optionLinksCandidate instanceof HTMLElement ? optionLinksCandidate : null, advancedToggle = optionLinks?.querySelector(
      "a[onclick*='toggle_advsearch'], a[data-ehpeek-search-advanced-toggle='true']"
    ) ?? null, fileSearchToggle = optionLinks?.querySelector(
      "a[onclick*='toggle_filesearch'], a[data-ehpeek-search-file-toggle='true']"
    ) ?? null, searchSubmit = form?.querySelector("input[name='f_apply'], button[name='f_apply']") ?? searchInput?.parentElement?.querySelector(
      "input[type='submit'], button[type='submit']"
    ), clearButton = form?.querySelector("input[name='f_clear'], button[name='f_clear']") ?? searchInput?.parentElement?.querySelector(
      "input[type='button'], button[type='button']"
    ) ?? null;
    if (!searchBox || !form || !searchInput || !searchSubmit)
      return null;
    let categoryToggleMount = categories && optionLinks ? document.createElement("span") : null, advancedToggleMount = advancedToggle ? document.createElement("span") : null, fileSearchToggleMount = fileSearchToggle ? document.createElement("span") : null, searchActionMount = document.createElement("span"), clearActionMount = clearButton ? document.createElement("span") : null;
    return categoryToggleMount && (categoryToggleMount.className = "contents"), advancedToggleMount && (advancedToggleMount.className = "contents"), fileSearchToggleMount && (fileSearchToggleMount.className = "contents"), searchActionMount.className = "contents", clearActionMount && (clearActionMount.className = "contents"), {
      advancedPanel,
      advancedToggle,
      advancedToggleMount,
      categories,
      categoryToggleMount,
      clearActionMount,
      clearButton,
      clearLabel: clearButton ? searchActionLabel(clearButton) : null,
      fileSearch: root.querySelector("#fsdiv"),
      fileSearchToggle,
      fileSearchToggleMount,
      form,
      optionLinks,
      searchActionMount,
      searchBox,
      searchControls,
      searchInput,
      searchLabel: searchActionLabel(searchSubmit),
      searchSubmit
    };
  }
  function readSearchHistorySource(root = document) {
    let searchInput = root.querySelector("#f_search, input[name='f_search']"), searchSubmit = searchInput?.form?.querySelector("input[name='f_apply'], button[name='f_apply']") ?? searchInput?.parentElement?.querySelector(
      "input[type='submit'], button[type='submit']"
    );
    return searchInput && searchSubmit ? { searchInput, searchSubmit } : null;
  }
  function prepareTouchSearchPanel(info, optionClassName) {
    let form = info.form, searchInput = info.searchInput, advancedPanel = form?.querySelector("#advdiv");
    if (info.searchBox.contains(form) || (form.id || (form.id = "ehpeek-search-form"), searchInput.setAttribute("form", form.id), info.searchSubmit.setAttribute("form", form.id), info.clearButton?.setAttribute("form", form.id)), info.searchBox.className = "box-border !w-full !m-0 !p-0 !border-0 !text-left !textsize-md [&_.searchadv]:box-border [&_.searchadv]:!w-full [&_.searchadv]:!pt-md [&_.searchadv]:!textsize-md [&_.searchadv>div]:!flex-wrap [&_.searchadv>div]:!justify-start [&_.searchadv>div]:!gap-sm [&_.searchadv>div>div]:!p-sm", info.searchBox.contains(form) && (form.removeAttribute("style"), form.className = "flex w-full flex-col gap-md m-0 p-0"), info.categories && info.optionLinks) {
      info.categories.className = "hidden !w-full !m-0 border-collapse", info.categories.hidden = !0, info.optionLinks.insertAdjacentElement("afterend", info.categories), info.categories.tBodies[0]?.classList.add(
        "grid",
        "grid-cols-[repeat(auto-fit,minmax(140px,1fr))]",
        "gap-xs"
      );
      for (let row of Array.from(info.categories.rows)) {
        row.className = "contents";
        for (let cell of Array.from(row.cells))
          cell.className = "!p-0";
      }
      for (let category of Array.from(info.categories.querySelectorAll("[id^='cat_']"))) {
        let colorClass = Array.from(category.classList).find((className2) => /^ct(?:[1-9a])$/.test(className2));
        category.className = `${colorClass ? `${colorClass} ` : ""}flex box-border w-full min-w-0 !h-lg items-center justify-center px-md border rounded-md text-white text-center textsize-md font-700 leading-[1.15] whitespace-nowrap shadow-[0_2px_6px_var(--color-shadow-control)] cursor-pointer select-none transition-opacity [touch-action:manipulation] active:opacity-70 [&[data-disabled]]:opacity-40`, prepareTouchSearchCategory(category, form);
      }
    }
    if (info.searchControls.className = `${info.clearButton ? "grid-cols-[minmax(0,1fr)_60px_60px]" : "grid-cols-[minmax(0,1fr)_60px]"} grid w-full items-start gap-0 !p-0`, searchInput && (searchInput.className = `appearance-none !box-border !w-full !h-60px min-w-0 col-span-full row-start-1 !m-0 !py-0 !pl-lg ${info.clearButton ? "!pr-[132px]" : "!pr-[72px]"} !border !border-[var(--color-site-border)] rounded-md !bg-[var(--color-site-elevated)] !text-[var(--color-site-text)] !text-[length:var(--font-size-md)] leading-[1.2] outline-none focus:(!border-[var(--color-site-accent)] !bg-[var(--color-site-elevated)] shadow-[0_0_0_3px_var(--color-site-accent-hover)])`), searchInput.before(info.searchControls), info.searchSubmit.replaceWith(info.searchActionMount), info.clearButton && info.clearActionMount && info.clearButton.replaceWith(info.clearActionMount), info.searchControls.append(searchInput), info.clearActionMount && info.searchControls.append(info.clearActionMount), info.searchControls.append(info.searchActionMount), info.optionLinks && info.categoryToggleMount && info.optionLinks.prepend(info.categoryToggleMount), info.advancedToggle && info.advancedToggleMount && info.advancedToggle.replaceWith(info.advancedToggleMount), info.fileSearchToggle && info.fileSearchToggleMount && info.fileSearchToggle.replaceWith(info.fileSearchToggleMount), info.optionLinks) {
      info.optionLinks.className = "flex w-full flex-wrap items-center justify-start gap-x-md gap-y-sm !p-0 !text-0";
      for (let link of Array.from(info.optionLinks.querySelectorAll("a")))
        link.className = optionClassName;
    }
    advancedPanel && (advancedPanel.className = "box-border w-full !p-0 ehp-color-site-text"), info.fileSearch && (info.fileSearch.style.removeProperty("margin-top"), info.fileSearch.className = "box-border !w-full !m-0 !mt-0 p-lg border ehp-color-site-border rounded-md bg-[var(--color-site-elevated)] ehp-color-site-text !textsize-md text-left [&_form]:flex [&_form]:flex-col [&_form]:gap-sm [&_form>div]:!p-0 [&_.searchadv>div]:!flex-wrap [&_.searchadv>div]:!justify-start [&_.searchadv>div]:!gap-sm [&_.searchadv>div>div]:!p-sm");
  }
  function prepareTouchSearchCategory(category, form) {
    if (category.dataset.ehpeekCategory === "true")
      return;
    let categoryMask = form.querySelector("input[name='f_cats']"), bit = Number(category.id.match(/^cat_(\d+)$/)?.[1]);
    if (!categoryMask || !Number.isInteger(bit) || bit <= 0)
      return;
    category.dataset.ehpeekCategory = "true";
    let update = () => {
      category.toggleAttribute("data-disabled", (Number(categoryMask.value) & bit) !== 0);
    };
    update(), category.addEventListener("click", () => {
      categoryMask.value = String(Number(categoryMask.value) ^ bit), update();
    });
  }
  function searchActionLabel(element) {
    return element instanceof HTMLInputElement ? element.value : element.textContent?.trim() ?? "";
  }
  function findSearchNavigationLink(target) {
    let link = target instanceof Element ? target.closest(
      ".searchnav a[id$='first'][href], .searchnav a[id$='prev'][href], .searchnav a[id$='next'][href], .searchnav a[id$='last'][href]"
    ) : null;
    return link instanceof HTMLAnchorElement ? link : null;
  }
  function replaceSearchPageContent(doc) {
    let currentList = searchResultList(), incomingList = searchResultList(doc);
    if (!currentList || !incomingList)
      return null;
    replaceFirstElement("#rangebar", doc), replaceFirstElement(".searchtext", doc), replaceSearchNavigationBars(doc);
    let importedList = document.importNode(incomingList, !0);
    return currentList.replaceWith(importedList), importedList;
  }
  function maxPreviewPageIndex(root = document, baseUrl = window.location.href) {
    let range2 = readShowingRange(root);
    if (!range2)
      return null;
    let currentIndex;
    try {
      let value = Number(new URL(baseUrl, window.location.href).searchParams.get("p") || "0");
      currentIndex = Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return null;
    }
    let pageSize = currentIndex === 0 ? range2.end - range2.start + 1 : (range2.start - 1) / currentIndex;
    return !Number.isInteger(pageSize) || pageSize <= 0 ? null : Math.max(currentIndex, Math.ceil(range2.total / pageSize) - 1);
  }
  function findClickedImageLink(target, extractPageType2) {
    let link = target instanceof Element ? target.closest("a[href]") : null;
    return !(link instanceof HTMLAnchorElement) || extractPageType2(link.href).type !== "image" ? null : link.querySelector("img") || link.closest("#gdt, .gdtm, .gdtl") ? link : null;
  }
  function replaceGalleryPageBarMounts(topClassName, bottomClassName) {
    let originals = Array.from(document.querySelectorAll(".ptt, .ptb")), topSource = originals.find((item) => item.classList.contains("ptt")) ?? originals[0], bottomSource = originals.find((item) => item.classList.contains("ptb")) ?? originals[1] ?? originals[0], mounts = [], description = galleryPageDescription(), descriptionText = description?.textContent?.trim() || null;
    description && (description.hidden = !0), topSource && mounts.push(replaceGalleryPageBarAt(topSource, !0, topClassName, descriptionText)), bottomSource && mounts.push(replaceGalleryPageBarAt(bottomSource, !1, bottomClassName, descriptionText));
    for (let original of originals)
      original.hidden = !0;
    return mounts;
  }
  function snapshotPreview() {
    return {
      description: galleryPageDescription()?.cloneNode(!0) ?? null,
      thumbs: document.querySelector("#gdt")?.cloneNode(!0) ?? null
    };
  }
  function showPreviewPlaceholder(content) {
    let current = document.querySelector("#gdt");
    if (!current)
      return;
    let rect = current.getBoundingClientRect(), placeholder = document.createElement("div");
    placeholder.id = "gdt", placeholder.className = "ehpeek-preview-placeholder flex items-center justify-center opacity-72", placeholder.style.minHeight = `${Math.max(160, Math.round(rect.height))}px`, placeholder.setAttribute("aria-busy", "true"), placeholder.append(content), current.replaceWith(placeholder);
  }
  function replacePreviewContent(doc) {
    let description = galleryPageDescription(doc);
    description && replaceGalleryPageDescription(description), replaceFirstElement("#gdt", doc);
  }
  function prepareThumbsGridSwipeTargets(thumbs) {
    thumbs.style.touchAction = "pan-y", thumbs.style.userSelect = "none", thumbs.querySelectorAll("a, img, .gdtm, .gdtl").forEach((element) => {
      element.style.touchAction = "pan-y", element.style.userSelect = "none", element instanceof HTMLImageElement && (element.draggable = !1, element.style.setProperty("-webkit-user-drag", "none"));
    });
  }
  function thumbsGrid() {
    return document.querySelector("#gdt");
  }
  function restorePreview(snapshot) {
    let currentThumbs = document.querySelector("#gdt");
    snapshot.description && replaceGalleryPageDescription(snapshot.description), snapshot.thumbs && currentThumbs && currentThumbs.replaceWith(snapshot.thumbs);
  }
  function settingsMenuMountTarget() {
    let thumbnailContainer = document.querySelector("#gdt"), titleContainer = document.querySelector("#gd2, h1"), topNav = document.querySelector("#nb"), anchor = thumbnailContainer ?? titleContainer;
    if (topNav) {
      let item = document.createElement("div");
      return topNav.append(item), item;
    }
    if (!anchor?.parentElement)
      return null;
    let wrapper = document.createElement("div");
    return wrapper.style.textAlign = "right", thumbnailContainer ? anchor.parentElement.insertBefore(wrapper, anchor) : anchor.insertAdjacentElement("afterend", wrapper), wrapper;
  }
  function applySiteTheme() {
    let hostname = window.location.hostname;
    document.documentElement.dataset.ehpeekSite = hostname.endsWith("exhentai.org") || hostname === EXHENTAI_ONION_HOST || hostname.endsWith(`.${EXHENTAI_ONION_HOST}`) ? "exhentai" : "e-hentai";
  }
  function applyTouchGalleryPanelPageStyle() {
    if (document.getElementById(TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID))
      return;
    let style2 = document.createElement("style");
    style2.id = TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID, style2.textContent = galleryRearrange_default, document.head.append(style2);
  }
  function prepareTouchGalleryComments() {
    let items = Array.from(document.querySelectorAll("#cdiv .c5")).map((trigger) => ({
      trigger,
      details: trigger.closest(".c1")?.querySelector(".c7[id^='cvotes_']") ?? null
    })).filter((item) => item.details !== null), setExpanded = (item, expanded) => {
      item.trigger.setAttribute("aria-expanded", String(expanded)), item.details.setAttribute("aria-hidden", String(!expanded)), item.details.style.display = expanded ? "" : "none";
    };
    for (let item of items) {
      if (item.trigger.dataset.ehpeekTouchCommentScore === "true")
        continue;
      item.trigger.dataset.ehpeekTouchCommentScore = "true", item.trigger.classList.add("whitespace-nowrap"), item.trigger.removeAttribute("onmouseover"), item.trigger.removeAttribute("onmouseout"), item.trigger.removeAttribute("onclick"), item.trigger.setAttribute("role", "button"), item.trigger.setAttribute("tabindex", "0"), item.trigger.setAttribute("aria-controls", item.details.id), setExpanded(item, !1);
      let toggle = (event) => {
        event.preventDefault(), event.stopImmediatePropagation();
        let shouldExpand = item.trigger.getAttribute("aria-expanded") !== "true";
        for (let candidate of items)
          setExpanded(candidate, candidate === item && shouldExpand);
      };
      item.trigger.addEventListener("click", toggle), item.trigger.addEventListener("keydown", (event) => {
        (event.key === "Enter" || event.key === " ") && toggle(event);
      });
    }
  }
  function prepareTouchFavoritesPage() {
    document.documentElement.classList.add(...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" ")), document.body.classList.add(...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "));
    let page = document.querySelector(".ido");
    page?.style.removeProperty("min-width"), page?.classList.add(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" "));
    let categories = document.querySelector(".ido > .nosel"), categorySelect = categories ? prepareTouchFavoritesCategorySelect(categories) : null, searchContainer = document.querySelector("input[name='f_search']")?.form?.parentElement;
    searchContainer instanceof HTMLElement && (searchContainer.style.removeProperty("width"), searchContainer.classList.add("box-border", "!w-full", "!min-w-0", "!max-w-full"));
    for (let navigation of searchNavigationBars())
      navigation.classList.add(...TOUCH_FAVORITES_NAV_CLASS_NAME.split(" "));
    let resultList = searchResultList();
    resultList?.classList.add(...TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME.split(" "));
    let allSelected = categorySelect?.categories[0]?.selected === !0, existingWrapper = resultList?.parentElement?.classList.contains("ehpeek-touch-favorites-results") ? resultList.parentElement : null;
    if ((existingWrapper?.parentElement ?? resultList?.parentElement)?.classList.add(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" ")), !resultList || existingWrapper)
      return categorySelect;
    let wrapper = document.createElement("div");
    return wrapper.className = TOUCH_FAVORITES_RESULTS_CLASS_NAME, (allSelected || window.innerWidth < 850) && (wrapper.classList.add(...TOUCH_FAVORITES_ALL_RESULTS_CLASS_NAME.split(" ")), compactTouchFavoritesResultList(resultList)), resultList.replaceWith(wrapper), wrapper.append(resultList), categorySelect;
  }
  function compactTouchFavoritesResultList(resultList) {
    resultList.style.setProperty("table-layout", "auto", "important"), resultList.style.setProperty("width", "100%", "important");
    for (let content of Array.from(resultList.querySelectorAll("tbody > tr > .gl2e")))
      content.style.setProperty("width", "auto", "important"), content.style.overflowWrap = "anywhere";
    for (let title of Array.from(resultList.querySelectorAll(".glink")))
      title.style.whiteSpace = "normal", title.style.overflowWrap = "anywhere";
    for (let tags of Array.from(resultList.querySelectorAll(".gl4e table")))
      tags.style.setProperty("table-layout", "fixed", "important"), tags.style.setProperty("width", "100%", "important"), tags.style.setProperty("max-width", "100%", "important");
    for (let cell of Array.from(resultList.querySelectorAll(".gl4e td")))
      cell.style.setProperty("min-width", "0", "important"), cell.style.overflowWrap = "anywhere";
    for (let namespace of Array.from(resultList.querySelectorAll(".gl4e td.tc")))
      namespace.style.setProperty("width", "4em", "important"), namespace.style.whiteSpace = "nowrap";
    for (let selection of Array.from(resultList.querySelectorAll("tbody > tr > .glfe")))
      selection.style.setProperty("width", "1%", "important"), selection.style.whiteSpace = "nowrap";
  }
  function prepareTouchFavoritesCategorySelect(container) {
    let nodes = Array.from(container.querySelectorAll(":scope > .fp, :scope > .fps"));
    if (nodes.length === 0)
      return null;
    let parsed = nodes.map((node) => {
      let children = Array.from(node.children), countText = children[0]?.textContent?.trim() ?? "0", label = children[children.length - 1]?.textContent?.trim() || node.textContent?.trim() || "", count = Number(countText.replace(/,/g, "")), indicator = node.querySelector(".i"), indicatorStyle = indicator ? window.getComputedStyle(indicator) : null, href = node.getAttribute("onclick")?.match(/document\.location\s*=\s*['\"]([^'\"]+)['\"]/)?.[1] ?? "";
      return {
        appearance: indicatorStyle ? {
          backgroundImage: indicatorStyle.backgroundImage,
          backgroundPosition: indicatorStyle.backgroundPosition,
          backgroundSize: indicatorStyle.backgroundSize
        } : null,
        count: Number.isFinite(count) ? count : 0,
        href: normalizeUrl(href, window.location.href),
        label,
        node,
        selected: node.classList.contains("fps")
      };
    }), all = parsed.find((category) => category.node.children.length === 0), favorites = parsed.filter((category) => category !== all), total = favorites.reduce((sum, category) => sum + category.count, 0);
    return container.hidden = !0, {
      categories: [
        ...all ? [{ ...all, count: total, label: texts_default.favorites.all }] : [],
        ...favorites
      ].map(({ appearance, count, href, label, selected }) => ({
        appearance,
        count,
        href,
        label,
        selected
      }))
    };
  }
  function prepareTouchSearchResultsPage() {
    document.documentElement.classList.add(...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" ")), document.body.classList.add(...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" "));
    let rangeBar = document.querySelector("#rangebar");
    rangeBar && (rangeBar.hidden = !0, rangeBar.style.setProperty("display", "none", "important"));
    let resultList = searchResultList();
    resultList?.classList.add(...TOUCH_SEARCH_RESULT_LIST_CLASS_NAME.split(" "));
    let existingWrapper = resultList?.parentElement?.classList.contains("ehpeek-touch-search-results") ? resultList.parentElement : null, content = existingWrapper?.parentElement ?? resultList?.parentElement;
    if (resultList?.closest(".ido")?.classList.add(...TOUCH_SEARCH_RESULTS_CONTENT_CLASS_NAME.split(" ")), content?.classList.add(...TOUCH_SEARCH_RESULTS_CONTENT_CLASS_NAME.split(" ")), !resultList || existingWrapper)
      return;
    let wrapper = document.createElement("div");
    wrapper.className = TOUCH_SEARCH_RESULTS_WRAPPER_CLASS_NAME, resultList.replaceWith(wrapper), wrapper.append(resultList);
  }
  function insertTouchTopBar(topBar) {
    let original = document.querySelector("#nb");
    return original?.parentElement ? (original.replaceWith(topBar), !0) : !1;
  }
  function insertTouchSearchPanel(panel) {
    let original = document.querySelector("#searchbox") ?? document.querySelector("input[name='f_search']")?.form;
    return original?.parentElement ? (original.before(panel), !0) : !1;
  }
  function insertTouchGalleryPanel(panel) {
    let host = document.querySelector("#gmid")?.parentElement ?? document.querySelector("#gleft")?.parentElement;
    if (!host)
      return !1;
    host.classList.add("ehpeek-touch-gallery-host");
    for (let child of Array.from(host.children)) {
      let element = child;
      element.hidden = !0, element.classList.add("!hidden");
    }
    return host.prepend(panel), !0;
  }
  function readTouchTopBarInfo(menuItemClassName) {
    let navItems = Array.from(document.querySelectorAll("#nb a[href]")).map((link) => {
      let clone = link.cloneNode(!0);
      return clone.removeAttribute("id"), clone.className = menuItemClassName, clone;
    });
    return {
      available: navItems.length > 0,
      navItems,
      homeHref: navItems.find((item) => item instanceof HTMLAnchorElement)?.href ?? "/",
      favoritesHref: new URL("/favorites.php", window.location.href).href
    };
  }
  function readGalleryInfo(actionMenuItemClassName) {
    let meta = readGalleryMeta(), range2 = readShowingRange(), coverSource = document.querySelector("#gd1 img"), coverUrl = coverSource?.currentSrc || coverSource?.src || coverSource?.getAttribute("src") || backgroundImageUrl(document.querySelector("#gd1")), summary = [
      meta.get("language"),
      range2?.total ? `${range2.total} ${texts_default.reader.pages.toLowerCase()}` : void 0,
      meta.get("file size") ?? meta.get("size"),
      meta.get("favorited"),
      meta.get("posted") ?? meta.get("parent")
    ].filter((value) => !!value).slice(0, 6).map((value) => ({ value }));
    return {
      available: !!document.querySelector("#gmid"),
      titleMain: textOf("#gn"),
      titleSub: textOf("#gj"),
      category: textOf("#gdc"),
      categoryAppearance: readGalleryCategoryAppearance(),
      cover: coverUrl ? galleryCoverImageElement(coverUrl) : null,
      favorite: readGalleryFavoriteInfo(),
      newTag: readGalleryNewTagInfo(),
      tagApi: readGalleryTagApiInfo(),
      summary,
      actions: readGalleryActionsDom(
        actionMenuItemClassName,
        !!document.querySelector("[data-ehpeek-single-page-app='true']")
      ),
      rating: readGalleryRatingInfo(),
      tagGroups: readGalleryTagGroups()
    };
  }
  function replaceGalleryPageBarAt(source, top, className2, descriptionText) {
    let existing = document.querySelector(`.${className2}`), descriptionElement = top ? document.querySelector("[data-ehpeek-gallery-page-description-mount]") ?? document.createElement("div") : null;
    if (descriptionElement && (descriptionElement.dataset.ehpeekGalleryPageDescriptionMount = "true"), existing)
      return descriptionElement && existing.insertAdjacentElement("beforebegin", descriptionElement), { descriptionElement, descriptionText, element: existing, top };
    let pageBar = document.createElement("div");
    return source.insertAdjacentElement("afterend", pageBar), descriptionElement && pageBar.insertAdjacentElement("beforebegin", descriptionElement), { descriptionElement, descriptionText, element: pageBar, top };
  }
  function replaceFirstElement(selector, doc) {
    let current = document.querySelector(selector), incoming = doc.querySelector(selector);
    !current || !incoming || current.replaceWith(document.importNode(incoming, !0));
  }
  function galleryPageDescription(root = document) {
    return root.querySelector(GALLERY_PAGE_DESCRIPTION_SELECTOR);
  }
  function replaceGalleryPageDescription(incoming) {
    let current = galleryPageDescription();
    if (!current)
      return;
    let staleDescriptions = Array.from(document.querySelectorAll(".gpc"));
    current.replaceWith(document.importNode(incoming, !0));
    for (let description of staleDescriptions)
      description !== current && description.remove();
  }
  function replaceSearchNavigationBars(doc) {
    let currentBars = searchNavigationBars(), incomingBars = searchNavigationBars(doc), count = Math.min(currentBars.length, incomingBars.length);
    for (let index = 0; index < count; index += 1)
      currentBars[index].replaceWith(document.importNode(incomingBars[index], !0));
  }
  function readGalleryMeta() {
    let entries = Array.from(document.querySelectorAll("#gdd tr")).map((row) => {
      let cells = Array.from(row.cells), label = cells[0]?.textContent?.trim().replace(/:$/, "").toLowerCase() ?? "", value = cells.slice(1).map((cell) => cell.textContent?.trim() ?? "").filter(Boolean).join(" ");
      return [label, value];
    }).filter(([label, value]) => label && value);
    return new Map(entries);
  }
  function readGalleryCategoryAppearance() {
    let category = document.querySelector("#gdc"), categoryStyleElement = category?.querySelector("[class*='ct']") ?? category, style2 = categoryStyleElement ? window.getComputedStyle(categoryStyleElement) : null;
    return {
      "background-color": style2?.backgroundColor ?? "",
      "background-image": style2?.backgroundImage ?? "",
      "border-color": style2?.borderColor ?? "",
      color: style2?.color ?? ""
    };
  }
  function readGalleryRatingInfo() {
    let label = textOf("#rating_label"), count = textOf("#rating_count"), ratingImage = document.querySelector("#rating_image"), preservedValue = ratingImage instanceof HTMLElement ? Number(ratingImage.dataset.ehpeekRating) : Number.NaN, value = Number.isFinite(preservedValue) ? preservedValue : scriptNumberValue(galleryRatingScript(), "display_rating");
    return !label || value === null ? null : {
      count,
      label,
      rated: ["irb", "irg", "irr"].some((className2) => ratingImage?.classList.contains(className2)),
      value
    };
  }
  function galleryRatingScript() {
    return Array.from(document.scripts).map((item) => item.textContent ?? "").find((text) => text.includes("display_rating")) ?? "";
  }
  function scriptNumberValue(script, name) {
    let match = script.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`)), value = Number(match?.[1]);
    return match && Number.isFinite(value) ? value : null;
  }
  async function setGalleryRating(info, value) {
    let rating = Math.round(value * 2);
    if (rating < 1 || rating > 10)
      throw new RangeError("Gallery rating must be between 0.5 and 5 stars.");
    return updateGalleryRating(info, value);
  }
  function readGalleryActionsDom(actionMenuItemClassName, singlePage) {
    return Array.from(document.querySelectorAll("#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']")).filter((item) => !singlePage || item instanceof HTMLAnchorElement && isSinglePageGalleryUtilityLink(item)).map((item) => {
      let clone = item.cloneNode(!1);
      return clone.removeAttribute("id"), clone.removeAttribute("style"), clone.className = actionMenuItemClassName, clone instanceof HTMLInputElement || (clone.textContent = item.textContent?.trim() || item.getAttribute("title")?.trim() || item.getAttribute("aria-label")?.trim() || ""), clone;
    }).slice(0, 6);
  }
  function isSinglePageGalleryUtilityLink(link) {
    try {
      let path = new URL(link.href).pathname;
      return link.dataset.ehpeekGalleryUtility === "true" || /^\/mpv\/\d+\/[^/]+\/?$/.test(path);
    } catch {
      return !1;
    }
  }
  function readGalleryTagGroups() {
    let rows = Array.from(document.querySelectorAll("#taglist tr"));
    if (rows.length > 0)
      return rows.map((row) => {
        let namespace = row.querySelector(".tc, td:first-child")?.textContent?.trim().replace(/:$/, "") || "tag", tags = Array.from(row.querySelectorAll("a")).map(readGalleryTag).filter((tag) => tag !== null).slice(0, 30);
        return { namespace, tags };
      }).filter((group) => group.tags.length > 0);
    let groups = /* @__PURE__ */ new Map();
    for (let tag of Array.from(document.querySelectorAll("#taglist a")).slice(0, 60)) {
      let galleryTag = readGalleryTag(tag);
      if (!galleryTag)
        continue;
      let tags = groups.get("tag") ?? [];
      tags.push(galleryTag), groups.set("tag", tags);
    }
    return Array.from(groups, ([namespace, tags]) => ({ namespace, tags }));
  }
  function isMyTagsPage(root = document) {
    return root.querySelector("#usertags_outer") !== null;
  }
  function readMyTagAppearances(root, tagSet) {
    let defaultColor = root.querySelector("#tagcolor")?.value.trim() ?? "", output = [];
    for (let item of Array.from(root.querySelectorAll("#usertags_outer > [id^='usertag_']"))) {
      let preview = item.querySelector("[id^='tagpreview_'][title]"), name = normalizeTagName(preview?.title ?? "");
      if (!preview || !name)
        continue;
      let itemColor = item.querySelector("input[id^='tagcolor_']")?.value ?? "", backgroundColor = normalizeTagColor(itemColor) || normalizeTagColor(defaultColor), id = item.id.match(/^usertag_(\d+)$/)?.[1] ?? "";
      id && output.push({
        name,
        backgroundColor,
        color: readableTagColor(backgroundColor),
        id,
        tagSet
      });
    }
    return output;
  }
  function readMyTagSetOptions(root) {
    return Array.from(root.querySelectorAll("#tagset_outer select option"), (option) => ({
      label: option.textContent?.trim() ?? option.value,
      selected: option.selected,
      value: option.value
    }));
  }
  function isMyTagSetEnabled(root) {
    return root.querySelector("#tagset_enable")?.checked ?? !0;
  }
  function cacheMyTagSetOptions(options) {
    window.localStorage.setItem("ehpeek:my-tag-sets", JSON.stringify(options));
  }
  function readCachedMyTagSetOptions() {
    try {
      let value = JSON.parse(window.localStorage.getItem("ehpeek:my-tag-sets") ?? "[]");
      return Array.isArray(value) ? value.filter((option) => option !== null && typeof option == "object" && typeof option.label == "string" && typeof option.selected == "boolean" && typeof option.value == "string") : [];
    } catch {
      return [];
    }
  }
  function applyMyTagAppearances(appearances, root = document) {
    let byName = new Map(appearances.map((appearance) => [appearance.name, appearance]));
    for (let tag of Array.from(root.querySelectorAll("#taglist a"))) {
      let name = galleryTagName(tag), appearance = name ? byName.get(normalizeTagName(name)) : void 0, container = tag.closest("div.gt, div.gtl, div.gtw") ?? tag;
      appearance && appearance.backgroundColor && (container.style.setProperty("background-color", appearance.backgroundColor, "important"), tag.style.setProperty("color", appearance.color, "important"), tag.dataset.ehpeekMyTagId = appearance.id, tag.dataset.ehpeekMyTagSet = appearance.tagSet);
    }
  }
  async function favoriteGalleryTag(tag, tagSet, mode) {
    let response = await addMyTag(tag.name, tagSet, mode);
    if (new URL(response.url).origin !== window.location.origin || !isMyTagsPage(response.document))
      throw new Error("My Tags page is unavailable");
    window.localStorage.removeItem("ehpeek:my-tags");
  }
  async function removeGalleryTagFavorite(tag) {
    if (!tag.myTag)
      return;
    let response = await deleteMyTag(tag.myTag.id, tag.myTag.tagSet);
    if (new URL(response.url).origin !== window.location.origin || !isMyTagsPage(response.document))
      throw new Error("My Tags page is unavailable");
    window.localStorage.removeItem("ehpeek:my-tags");
  }
  function normalizeTagName(value) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
  }
  function normalizeTagColor(value) {
    let color = value.trim();
    return /^#[\da-f]{6}$/i.test(color) ? color : "";
  }
  function readableTagColor(backgroundColor) {
    let red = Number.parseInt(backgroundColor.slice(1, 3), 16) / 255, green = Number.parseInt(backgroundColor.slice(3, 5), 16) / 255, blue = Number.parseInt(backgroundColor.slice(5, 7), 16) / 255, linear = (channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue) > 0.179 ? "#000000" : "#ffffff";
  }
  function readGalleryTag(tag) {
    let label = tag.textContent?.trim() || tag.getAttribute("ehs-tag")?.trim() || tag.title.trim(), name = galleryTagName(tag);
    if (!label || !name || !tag.href)
      return null;
    let container = tag.closest("div.gt, div.gtl, div.gtw") ?? tag, tagStyle = window.getComputedStyle(tag), containerStyle = window.getComputedStyle(container);
    return {
      appearance: {
        backgroundColor: containerStyle.backgroundColor,
        borderColor: containerStyle.borderColor,
        color: tagStyle.color
      },
      contentSource: tag,
      definitionHref: `https://ehwiki.org/wiki/${encodeURIComponent(name.replace(/^[a-z]+:\s*/i, ""))}`,
      href: tag.href,
      label,
      myTag: tag.dataset.ehpeekMyTagId && tag.dataset.ehpeekMyTagSet ? { id: tag.dataset.ehpeekMyTagId, tagSet: tag.dataset.ehpeekMyTagSet } : null,
      name,
      vote: tag.classList.contains("tup") ? "up" : tag.classList.contains("tdn") ? "down" : null
    };
  }
  function observeGalleryTagChanges(onChange) {
    let tagList = document.querySelector("#taglist");
    if (!tagList)
      return () => {
      };
    let observer = new MutationObserver(onChange);
    return observer.observe(tagList, { childList: !0, subtree: !0 }), () => observer.disconnect();
  }
  async function runGalleryTagAction(info, tag, action) {
    let vote = action === "voteUp" ? 1 : action === "voteDown" || tag.vote === "up" ? -1 : tag.vote === "down" ? 1 : 0, tagPane = await updateGalleryTagVote(info, tag.name, vote), tagList = document.querySelector("#taglist");
    if (!tagList)
      throw new Error("Gallery tag list is unavailable.");
    let template2 = document.createElement("template");
    template2.innerHTML = tagPane, tagList.replaceChildren(...Array.from(template2.content.childNodes));
  }
  function prepareGalleryNewTag(info) {
    if (info.container.hidden = !1, info.container.style.removeProperty("display"), addClassNames(info.container, "ehpeek-touch-gallery-new-tag box-border w-full pt-md"), addClassNames(info.form, "flex w-full min-w-0 items-center gap-sm"), addClassNames(info.field, "box-border min-w-0 flex-1 h-md px-md rounded-xs border ehp-color-site-border bg-[var(--color-site-surface)] ehp-color-site-text font-inherit textsize-md outline-none focus:border-[var(--color-site-accent)]"), info.field.removeAttribute("size"), addClassNames(info.button, "box-border flex-none h-md px-lg rounded-xs border border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-background)] font-inherit textsize-md font-700 cursor-pointer"), document.querySelector("[data-ehpeek-single-page-app='true']")) {
      let action = new URL(window.location.href);
      action.hash = "", info.form.action = action.href, info.button.removeAttribute("onclick");
    }
  }
  function focusGalleryNewTag(info) {
    info.container.scrollIntoView({ block: "nearest" }), info.field.focus();
  }
  function addClassNames(element, classNames) {
    element.classList.add(...classNames.split(" "));
  }
  function galleryTagName(tag) {
    try {
      let encodedName = new URL(tag.href).pathname.match(/^\/tag\/(.+?)\/?$/i)?.[1];
      return encodedName ? decodeURIComponent(encodedName.replace(/\+/g, " ")) : null;
    } catch {
      return null;
    }
  }
  function readGalleryNewTagInfo() {
    let container = document.querySelector("#tagmenu_new"), form = container?.querySelector("form") ?? null, field = container?.querySelector("#newtagfield") ?? null, button = container?.querySelector("#newtagbutton") ?? null;
    return !container || !form || !field || !button ? null : {
      button,
      container,
      field,
      form
    };
  }
  function captureGalleryApiSession(root = document, baseUrl = window.location.href) {
    if (galleryApiSession)
      return !0;
    let script = Array.from(root.querySelectorAll("script")).map((item) => item.textContent ?? "").find((text) => text.includes("var api_url") && text.includes("var apikey"));
    if (!script)
      return console.warn("[ehpeek] Gallery API session capture failed", {
        reason: "api-script-not-found",
        pathname: new URL(baseUrl).pathname
      }), !1;
    let apiUrlValue = scriptStringValue(script, "api_url"), apiKey = scriptStringValue(script, "apikey"), apiUid = scriptNumberValue(script, "apiuid");
    if (!apiUrlValue || !apiKey || apiUid === null)
      return console.warn("[ehpeek] Gallery API session capture failed", {
        reason: "api-values-missing",
        hasApiKey: !!apiKey,
        hasApiUid: apiUid !== null,
        hasApiUrl: !!apiUrlValue
      }), !1;
    let apiUrl = new URL(apiUrlValue, baseUrl), pageUrl = new URL(baseUrl);
    return !(apiUrl.origin === pageUrl.origin || apiUrl.protocol === "https:" && ["api.e-hentai.org", "s.exhentai.org"].includes(apiUrl.hostname)) || !/^\/api\.php$/i.test(apiUrl.pathname) || (apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) || !Number.isSafeInteger(apiUid) || apiUid <= 0 || !/^[A-Za-z0-9_-]{8,128}$/.test(apiKey) ? (console.warn("[ehpeek] Gallery API session capture failed", {
      reason: "api-values-invalid",
      apiOrigin: apiUrl.origin,
      apiPathname: apiUrl.pathname,
      apiUidValid: Number.isSafeInteger(apiUid) && apiUid > 0,
      apiKeyLength: apiKey.length
    }), !1) : (galleryApiSession = {
      apiKey,
      apiUid,
      apiUrl: apiUrl.href
    }, !0);
  }
  function readGalleryTagApiInfo() {
    let galleryMatch = window.location.pathname.match(/^\/g\/(\d+)\/([^/]+)/i);
    if (!galleryMatch)
      return console.warn("[ehpeek] Gallery API context unavailable", {
        reason: "gallery-path-invalid",
        pathname: window.location.pathname
      }), null;
    if (!galleryApiSession && !captureGalleryApiSession())
      return console.warn("[ehpeek] Gallery API context unavailable", {
        reason: "api-session-unavailable",
        galleryId: Number(galleryMatch[1])
      }), null;
    let galleryId = Number(galleryMatch[1]), token = galleryMatch[2], session = galleryApiSession;
    return !session || !Number.isSafeInteger(galleryId) || galleryId <= 0 || !/^[A-Za-z0-9]+$/.test(token) ? (console.warn("[ehpeek] Gallery API context unavailable", {
      reason: "gallery-identity-invalid",
      galleryId,
      hasSession: !!session
    }), null) : {
      apiKey: session.apiKey,
      apiUid: session.apiUid,
      apiUrl: session.apiUrl,
      galleryId,
      token
    };
  }
  function scriptStringValue(script, name) {
    return script.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`))?.[2] ?? null;
  }
  function readGalleryFavoriteInfo() {
    let label = textOf("#favoritelink"), iconTitle = document.querySelector("#fav [title]")?.getAttribute("title")?.trim() ?? "", text = label || iconTitle, favorited = /^favorites?\s+\d+/i.test(text);
    return {
      actionUrl: galleryFavoriteActionUrl(),
      color: galleryFavoriteColor(text),
      favorited,
      label: favorited ? text : "Not Favorited"
    };
  }
  function parseGalleryFavoriteOptions(doc, favorited) {
    return Array.from(doc.querySelectorAll("input[name='favcat']")).map((input) => {
      let label = input.closest("div[style*='height']")?.textContent?.trim().replace(/\s+/g, " ") || input.value;
      return {
        color: galleryFavoriteColor(input.value),
        label,
        selected: favorited && input.checked,
        value: input.value
      };
    });
  }
  function galleryFavoriteColor(value) {
    let slot = value.match(/^(?:fav)?([0-9])$/i)?.[1] ?? value.match(/^favorites?\s+([0-9])$/i)?.[1];
    return slot === void 0 ? null : `var(--color-site-favorite-${slot})`;
  }
  function galleryFavoriteActionUrl() {
    let preserved = document.querySelector("#fav")?.dataset.ehpeekActionUrl;
    if (preserved)
      return preserved;
    let match = (Array.from(document.scripts).map((item) => item.textContent ?? "").find((text) => text.includes("popbase") && text.includes("addfav")) ?? "").match(/popbase\s*=\s*base_url\s*\+\s*"gallerypopups\.php\?gid=(\d+)&t=([^"]+)&act="/);
    return match ? `/gallerypopups.php?gid=${match[1]}&t=${match[2]}&act=addfav` : "";
  }
  function galleryContinueReadingButtonMountTarget() {
    let host = document.createElement("div"), viewerOptions = document.querySelector("#gd5");
    return viewerOptions ? (viewerOptions.classList.add("ehpeek-gallery-actions"), viewerOptions.append(host), host) : (document.body.append(host), host);
  }
  function textOf(selector) {
    return document.querySelector(selector)?.textContent?.trim() ?? "";
  }
  function galleryCoverImageElement(imageUrl) {
    let image = document.createElement("img");
    return image.className = "block w-full max-w-full h-full max-h-full mx-auto object-contain object-center", image.src = imageUrl, image.alt = "", image.decoding = "async", image.loading = "eager", image;
  }
  function backgroundImageUrl(root) {
    if (!root)
      return "";
    for (let item of [root, ...Array.from(root.querySelectorAll("*"))]) {
      let match = window.getComputedStyle(item).backgroundImage.match(/url\(["']?(.+?)["']?\)/);
      if (match?.[1])
        return match[1];
    }
    return "";
  }
  function numericAttribute(element, attribute) {
    let value = Number(element?.getAttribute(attribute) || "");
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  // src/eh/index.ts
  function extractPageType(url = window.location.href) {
    try {
      let parsed = new URL(url, window.location.href), galleryMatch = parsed.pathname.match(/^\/g\/(\d+)\/([^/]+)\/?$/i);
      if (galleryMatch) {
        let galleryId = Number(galleryMatch[1]);
        if (Number.isFinite(galleryId) && galleryId > 0)
          return {
            type: "gallery",
            url: parsed.href,
            galleryId,
            token: galleryMatch[2],
            previewIndex: previewPageIndex(parsed.href),
            peekPage: peekPageFromHash(parsed.hash)
          };
      }
      let imageMatch = parsed.pathname.match(/^\/s\/[^/]+\/(\d+)-(\d+)\/?$/i);
      if (imageMatch) {
        let galleryId = Number(imageMatch[1]), pageNum = Number(imageMatch[2]);
        if (Number.isFinite(galleryId) && galleryId > 0 && Number.isFinite(pageNum) && pageNum > 0)
          return {
            type: "image",
            url: parsed.href,
            galleryId,
            pageNum
          };
      }
      return parsed.pathname === "/favorites.php" ? {
        type: "favorites",
        url: parsed.href
      } : parsed.pathname === "/" || parsed.pathname.startsWith("/tag/") || parsed.pathname.startsWith("/uploader/") || /^\/(?:popular|watched)\/?$/.test(parsed.pathname) ? {
        type: "search",
        url: parsed.href
      } : {
        type: "other",
        url: parsed.href
      };
    } catch {
      return {
        type: "other",
        url
      };
    }
  }
  function singlePageRoute(url) {
    let page = extractPageType(url);
    if (page.type === "search" || page.type === "favorites")
      return page;
    if (page.type !== "gallery")
      return null;
    try {
      let parsed = new URL(url, window.location.href), unsupportedParameter = !1;
      parsed.searchParams.forEach((_value, key) => {
        unsupportedParameter || (unsupportedParameter = key !== "p");
      });
      let hash = new URLSearchParams(parsed.hash.replace(/^#/, "")), unsupportedHash = !1;
      return hash.forEach((_value, key) => {
        unsupportedHash || (unsupportedHash = key !== "peek_page");
      }), unsupportedParameter || unsupportedHash ? null : page;
    } catch {
      return null;
    }
  }
  function galleryPageNumber(url) {
    let page = extractPageType(url);
    return page.type === "image" ? page.pageNum : void 0;
  }
  function imageGalleryPage(root = document) {
    let url = imageGalleryUrl(root);
    if (!url)
      return null;
    let page = extractPageType(url);
    return page.type === "gallery" ? page : null;
  }
  function previewPageIndexFromUrl(url, pageUrl = window.location.href) {
    try {
      let parsed = new URL(url, pageUrl), current = new URL(pageUrl);
      if (parsed.origin !== current.origin || parsed.pathname !== current.pathname)
        return null;
      let value = Number(parsed.searchParams.get("p") || "0");
      return Number.isFinite(value) && value >= 0 ? value : null;
    } catch {
      return null;
    }
  }
  function previewPageIndex(url = window.location.href) {
    try {
      let value = Number(new URL(url).searchParams.get("p") || "0");
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }
  function previewUrlForIndex(previewIndex, pageUrl = window.location.href) {
    let url = new URL(pageUrl);
    return previewIndex <= 0 ? url.searchParams.delete("p") : url.searchParams.set("p", String(previewIndex)), url.hash = "", url.href;
  }
  function previewPageIndexForGalleryPage(galleryPage, pageSize, maxPreviewIndex) {
    let previewIndex = Math.max(0, Math.floor((galleryPage - 1) / pageSize));
    return maxPreviewIndex === null ? previewIndex : Math.min(previewIndex, maxPreviewIndex);
  }
  function peekPageFromHash(hash = window.location.hash) {
    let params = new URLSearchParams(hash.replace(/^#/, "")), page = Number(params.get("peek_page") || "");
    return Number.isFinite(page) && page > 0 ? page : null;
  }
  function updatePeekLocation(pageNumber, pageSize, maxPreviewIndex) {
    if (!pageNumber || pageNumber <= 0)
      return;
    let url = new URL(window.location.href), params = new URLSearchParams(window.location.hash.replace(/^#/, "")), nextValue = String(pageNumber), nextPreviewIndex = previewPageIndexForGalleryPage(pageNumber, pageSize, maxPreviewIndex), changed = !1;
    nextPreviewIndex === 0 ? url.searchParams.has("p") && (url.searchParams.delete("p"), changed = !0) : url.searchParams.get("p") !== String(nextPreviewIndex) && (url.searchParams.set("p", String(nextPreviewIndex)), changed = !0), params.get("peek_page") !== nextValue && (params.set("peek_page", nextValue), changed = !0), changed && (url.hash = params.toString(), window.history.replaceState(window.history.state, "", url.href));
  }
  function collectGalleryPages2(root = document, baseUrl = window.location.href) {
    return collectGalleryPages(extractPageType, root, baseUrl);
  }
  async function replaceSearchPageContentFromUrl(url) {
    let response = await requestPage(url), list = replaceSearchPageContent(response.document);
    if (!list)
      throw new Error(texts_default.errors.searchPageContentNotFound);
    return list;
  }
  function computePreviewPageSize(root = document) {
    let range2 = readShowingRange(root);
    if (!range2)
      throw new Error(texts_default.errors.previewPageSizeUnknown);
    let currentPageCount = range2.end - range2.start + 1;
    if (range2.end < range2.total)
      return currentPageCount;
    let lastPreviewIndex = maxPreviewPageIndex(root);
    if (lastPreviewIndex === null || lastPreviewIndex <= 0)
      return currentPageCount;
    let fullPageCount = (range2.total - currentPageCount) / lastPreviewIndex;
    if (!Number.isInteger(fullPageCount) || fullPageCount <= 0)
      throw new Error(texts_default.errors.previewPageSizeUnknown);
    return fullPageCount;
  }
  async function pullPreviewPage(index) {
    let previewUrl = previewUrlForIndex(index), response = await requestPage(previewUrl);
    return collectGalleryPages2(response.document, previewUrl);
  }
  function findClickedImageLink2(target) {
    return findClickedImageLink(target, extractPageType);
  }
  async function loadEhImagePage(page) {
    let response = await requestPage(page.url), info = readImagePageInfo(response.document, page.url);
    if (!info.imageUrl)
      throw new Error(texts_default.errors.imageNotFound);
    return info;
  }
  function replacePreviewContent2(doc) {
    replacePreviewContent(doc);
  }

  // src/components/Enhance/EnhanceSearchGrids.tsx
  var SWIPE_MIN_DISTANCE = 96, SWIPE_INTENT_DISTANCE = 28, HORIZONTAL_INTENT_RATIO = 2.2, SWIPE_MAX_VERTICAL_RATIO = 0.38, installed = !1, swipeElement = null, setSearchLoading = null, setSwipeGestureTarget = null, onSearchPageChange = null, searchNavigationLoading = !1;
  function EnhanceSearchGrids(props) {
    let [gestureTarget, setGestureTarget] = createSignal(null), [loading, setLoading] = createSignal(!1), [swipeIndicatorState, setSwipeIndicatorState] = createSignal({
      blocked: !1,
      direction: "left",
      progress: 0
    }), swipeState = null, handlePageChange = props.onPageChange ?? null, updateLoading = (value) => setLoading(value), updateGestureTarget = (target) => setGestureTarget(target), hideSwipeIndicator = () => {
      setSwipeIndicatorState((current) => ({
        ...current,
        blocked: !1,
        progress: 0
      }));
    }, updateSwipeIndicator = (info) => {
      if (!swipeState?.horizontal || swipeState.cancelled)
        return;
      let direction = info.dx < 0 ? "left" : "right";
      setSwipeIndicatorState({
        blocked: !swipeUrlForDelta(info.dx),
        direction,
        progress: swipeProgressForDelta(info.dx)
      });
    }, navigateBySwipe = (info, event) => {
      if (!swipeState?.horizontal || swipeState.cancelled)
        return;
      let dx = info.dx, absX = Math.abs(dx), absY = Math.abs(info.dy);
      if (absX < SWIPE_MIN_DISTANCE || absY > absX * SWIPE_MAX_VERTICAL_RATIO)
        return;
      let url = swipeUrlForDelta(dx);
      url && (event.preventDefault(), navigateSearchPage(url));
    };
    return onMount(() => {
      setSearchLoading = updateLoading, setSwipeGestureTarget = updateGestureTarget, onSearchPageChange = handlePageChange, setResultListSwipeTarget(props.resultList), installed || (installed = !0, document.addEventListener("click", onSearchNavigationClick, !0)), onCleanup(() => {
        setSearchLoading === updateLoading && (setSearchLoading = null), setSwipeGestureTarget === updateGestureTarget && (setSwipeGestureTarget = null), onSearchPageChange === handlePageChange && (onSearchPageChange = null);
      });
    }), createPointerGestureElement(gestureTarget, () => ({
      onStart: () => {
        swipeState = {
          horizontal: !0,
          cancelled: !1
        }, hideSwipeIndicator();
      },
      onMove: (info) => {
        updateSwipeIndicator(info);
      },
      onEnd: (info, event) => {
        navigateBySwipe(info, event), swipeState = null, hideSwipeIndicator();
      },
      dragAxis: "x",
      dragIntentRatio: HORIZONTAL_INTENT_RATIO,
      dragStartThreshold: SWIPE_INTENT_DISTANCE
    })), [createComponent(SwipeIndicator, {
      get state() {
        return swipeIndicatorState();
      }
    }), createComponent(LoadingOverlay, {
      get label() {
        return texts_default.reader.loading;
      },
      get visible() {
        return loading();
      }
    })];
  }
  function setResultListSwipeTarget(resultList) {
    resultList.style.touchAction = "pan-y", resultList.style.overscrollBehaviorX = "contain", swipeElement = resultList, setSwipeGestureTarget?.(resultList);
  }
  function onSearchNavigationClick(event) {
    let link = findSearchNavigationLink(event.target);
    link && (document.querySelector("[data-ehpeek-single-page-app='true']") || (event.preventDefault(), event.stopPropagation(), navigateSearchPage(link.href)));
  }
  async function navigateSearchPage(url) {
    if (document.querySelector("[data-ehpeek-single-page-app='true']")) {
      searchNavigationLinkForUrl(url)?.click();
      return;
    }
    if (!searchNavigationLoading) {
      searchNavigationLoading = !0, setSearchLoading?.(!0), swipeElement?.setAttribute("aria-busy", "true");
      try {
        let resultList = await replaceSearchPageContentFromUrl(url);
        window.history.pushState(window.history.state, "", url), onSearchPageChange?.(), setResultListSwipeTarget(resultList), searchTopNavigationBar()?.scrollIntoView({
          block: "start",
          behavior: "auto"
        });
      } catch (error) {
        console.error("[ehpeek]", error);
      } finally {
        searchNavigationLoading = !1, setSearchLoading?.(!1), swipeElement?.removeAttribute("aria-busy");
      }
    }
  }
  function swipeUrlForDelta(dx) {
    let nav = searchPageNavigation();
    return nav ? dx < 0 ? nav.nextUrl : nav.previousUrl : null;
  }
  function swipeProgressForDelta(dx) {
    return Math.min(1, Math.max(0, (Math.abs(dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE)));
  }

  // src/components/Enhance/ScrollPageBar.tsx
  var _tmpl$5 = /* @__PURE__ */ template('<div class="w-full mb-xs text-center textsize-sm">'), _tmpl$23 = /* @__PURE__ */ template('<td class="!w-sm !h-sm touch:!w-md touch:!h-md !p-0 rounded-sm touch:rounded-md cursor-pointer text-center align-middle select-none"><span>'), _tmpl$33 = /* @__PURE__ */ template('<td class="!w-sm !h-sm touch:!w-md touch:!h-md !p-0 rounded-sm touch:rounded-md cursor-pointer text-center align-middle select-none"><a class="flex !w-sm !h-sm touch:!w-md touch:!h-md items-center justify-center box-border !p-0 rounded-sm touch:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline !border-transparent !bg-transparent !text-[var(--color-site-text)] visited:!text-[var(--color-site-text)] hover:!bg-[var(--color-site-item-hover)] hover:!text-[var(--color-site-text)] active:!text-[var(--color-site-text)]">'), _tmpl$42 = /* @__PURE__ */ template('<td class="!w-sm !h-sm touch:!w-md touch:!h-md !p-0 rounded-sm touch:rounded-md cursor-pointer text-center align-middle select-none cursor-default"><span class="flex !w-sm !h-sm touch:!w-md touch:!h-md items-center justify-center box-border !p-0 rounded-sm touch:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline !border-transparent !bg-transparent !text-[var(--color-site-text)] visited:!text-[var(--color-site-text)] hover:!bg-[var(--color-site-item-hover)] hover:!text-[var(--color-site-text)] active:!text-[var(--color-site-text)] invisible">'), _tmpl$52 = /* @__PURE__ */ template('<table class="border-separate border-spacing-4px touch:border-spacing-6px"><tbody><tr>'), SCROLL_PAGE_BAR_CLASS = "ehpeek-scroll-page-bar", SCROLL_PAGE_BAR_TOP_CLASS = "ehpeek-scroll-page-bar-top", SCROLL_PAGE_BAR_BOTTOM_CLASS = "ehpeek-scroll-page-bar-bottom", SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR = "data-ehpeek-window-index", DRAG_PIXEL_STEP = 18, PAGE_BAR_BOTTOM_CLASS = "mt-0 mb-10px";
  var PAGE_BAR_CLASS = "w-max mx-auto touch-pan-y [&[data-dragging=true]]:select-none", PAGE_BAR_LINK_CLASS = "flex !w-sm !h-sm touch:!w-md touch:!h-md items-center justify-center box-border !p-0 rounded-sm touch:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline";
  var PAGE_BAR_CURRENT_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)]", PAGE_BAR_DISABLED_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)] opacity-40 cursor-default";
  var PAGE_BAR_TOP_CLASS = "mt-2px mb-0", galleryPageBarWindowIndex = null;
  function GalleryPageDescription(props) {
    return (() => {
      var _el$ = _tmpl$5();
      return insert(_el$, () => props.text), _el$;
    })();
  }
  function ScrollPageBar(options) {
    let maxIndex = Math.max(0, options.maxIndex ?? options.currentIndex), currentIndex = clamp(options.currentIndex, 0, maxIndex), [windowIndex, setWindowIndex] = createSignal(clamp(galleryPageBarWindowIndex ?? options.initialWindowIndex ?? currentIndex, 0, maxIndex)), dragStartWindowIndex = windowIndex(), draggable = () => maxIndex + 1 > 7, slots = createMemo(() => pageSlots(windowIndex(), currentIndex, maxIndex)), firstSlotIndex = createMemo(() => slots()[0]?.pageIndex ?? currentIndex), lastSlotIndex = createMemo(() => slots()[slots().length - 1]?.pageIndex ?? currentIndex), currentBeforeWindow = () => currentIndex < firstSlotIndex(), currentAfterWindow = () => currentIndex > lastSlotIndex(), linkCell = (text, pageIndex, itemState = "link") => itemState !== "link" ? (() => {
      var _el$2 = _tmpl$23(), _el$3 = _el$2.firstChild;
      return className(_el$3, `${PAGE_BAR_LINK_CLASS} ${itemState === "current" ? PAGE_BAR_CURRENT_COLOR_CLASS : PAGE_BAR_DISABLED_COLOR_CLASS}`), setAttribute(_el$3, "aria-current", itemState === "current" ? "page" : void 0), setAttribute(_el$3, "aria-disabled", itemState === "disabled" ? "true" : void 0), insert(_el$3, text), _el$2;
    })() : (() => {
      var _el$4 = _tmpl$33(), _el$5 = _el$4.firstChild;
      return setAttribute(_el$5, "draggable", !1), insert(_el$5, text), createRenderEffect((_p$) => {
        var _v$ = options.urlForIndex(pageIndex), _v$2 = String(pageIndex);
        return _v$ !== _p$.e && setAttribute(_el$5, "href", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$5, "data-page-index", _p$.t = _v$2), _p$;
      }, {
        e: void 0,
        t: void 0
      }), _el$4;
    })(), emptyCell = () => (() => {
      var _el$6 = _tmpl$42(), _el$7 = _el$6.firstChild;
      return _el$6;
    })();
    return createEffect(() => {
      options.element.className = `${SCROLL_PAGE_BAR_CLASS} ${PAGE_BAR_CLASS} ${options.top ? `${SCROLL_PAGE_BAR_TOP_CLASS} ${PAGE_BAR_TOP_CLASS}` : `${SCROLL_PAGE_BAR_BOTTOM_CLASS} ${PAGE_BAR_BOTTOM_CLASS}`}`, options.element.setAttribute(SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR, String(windowIndex()));
    }), createPointerGestureElement(() => options.element, () => ({
      shouldCaptureDrag: draggable,
      dragAxis: "x",
      onStart: () => {
        dragStartWindowIndex = windowIndex();
      },
      onMove: (info) => {
        if (Math.abs(info.dx) < Math.abs(info.dy))
          return;
        let nextIndex = clamp(dragStartWindowIndex - acceleratedPageOffset(info.dx), 0, maxIndex);
        nextIndex !== windowIndex() && (galleryPageBarWindowIndex = nextIndex, setWindowIndex(nextIndex));
      }
    })), (() => {
      var _el$8 = _tmpl$52(), _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild;
      return insert(_el$0, () => linkCell("<<", 0, currentIndex === 0 ? "disabled" : "link"), null), insert(_el$0, (() => {
        var _c$ = memo(() => !!currentBeforeWindow());
        return () => _c$() ? linkCell(String(currentIndex + 1), currentIndex, "current") : emptyCell();
      })(), null), insert(_el$0, () => linkCell("<", Math.max(0, currentIndex - 1), currentIndex === 0 ? "disabled" : "link"), null), insert(_el$0, createComponent(For, {
        get each() {
          return slots();
        },
        children: (slot) => slot ? linkCell(String(slot.pageIndex + 1), slot.pageIndex, slot.pageIndex === currentIndex ? "current" : "link") : emptyCell()
      }), null), insert(_el$0, () => linkCell(">", Math.min(maxIndex, currentIndex + 1), currentIndex === maxIndex ? "disabled" : "link"), null), insert(_el$0, (() => {
        var _c$2 = memo(() => !!currentAfterWindow());
        return () => _c$2() ? linkCell(String(currentIndex + 1), currentIndex, "current") : emptyCell();
      })(), null), insert(_el$0, () => linkCell(">>", maxIndex, currentIndex === maxIndex ? "disabled" : "link"), null), _el$8;
    })();
  }
  function setScrollPageBarWindowIndex(index) {
    galleryPageBarWindowIndex = Math.max(0, Math.round(index));
  }
  function pageSlots(windowIndex, currentIndex, maxIndex) {
    if (maxIndex + 1 <= 7)
      return range(0, maxIndex).map((pageIndex) => ({
        type: "page",
        pageIndex
      }));
    let windowStart = clamp(windowIndex - 3, -1, maxIndex - 5);
    return range(windowStart, windowStart + 6).map((pageIndex) => pageIndex >= 0 && pageIndex <= maxIndex ? {
      type: "page",
      pageIndex
    } : null);
  }
  function range(start, end) {
    let output = [];
    for (let index = start; index <= end; index += 1)
      output.push(index);
    return output;
  }
  function acceleratedPageOffset(dx) {
    let distance = Math.abs(dx), direction = dx > 0 ? 1 : -1, pages = Math.floor((distance / DRAG_PIXEL_STEP) ** 1.35);
    return direction * pages;
  }

  // src/components/Enhance/EnhanceThumbsGrids.tsx
  var SWIPE_MIN_DISTANCE2 = 96, SWIPE_INTENT_DISTANCE2 = 28, HORIZONTAL_INTENT_RATIO2 = 2.2, SWIPE_MAX_VERTICAL_RATIO2 = 0.38, galleryThumbEnhancementOnError = null, galleryThumbEnhancementClickInstalled = !1, swipeElement2 = null, setSwipeGestureTarget2 = null, galleryNavigationLoading = !1, replaceGalleryPageBar = null, thumbsGridsEnabled = !1;
  function EnhanceThumbsGrids(props) {
    let [gestureTarget, setGestureTarget] = createSignal(null), [swipeIndicatorState, setSwipeIndicatorState] = createSignal({
      blocked: !1,
      direction: "left",
      progress: 0
    }), swipeState = null, updateGestureTarget = (target) => setGestureTarget(target), hideSwipeIndicator = () => {
      setSwipeIndicatorState((current) => ({
        ...current,
        blocked: !1,
        progress: 0
      }));
    }, updateSwipeIndicator = (info) => {
      if (!swipeState?.horizontal || swipeState.cancelled)
        return;
      let direction = info.dx < 0 ? "left" : "right";
      setSwipeIndicatorState({
        blocked: !swipeUrlForDelta2(info.dx),
        direction,
        progress: swipeProgressForDelta2(info.dx)
      });
    }, navigateBySwipe = (info, event) => {
      if (!swipeState?.horizontal || swipeState.cancelled)
        return;
      let dx = info.dx, absX = Math.abs(dx), absY = Math.abs(info.dy);
      if (absX < SWIPE_MIN_DISTANCE2 || absY > absX * SWIPE_MAX_VERTICAL_RATIO2)
        return;
      let url = swipeUrlForDelta2(dx);
      url && (event.preventDefault(), navigateGalleryPreview(url, {
        scrollToPageBar: dx < 0 ? "top" : "bottom"
      }).catch((error) => galleryThumbEnhancementOnError?.(error)));
    };
    return onMount(() => {
      thumbsGridsEnabled = props.enabled, setSwipeGestureTarget2 = updateGestureTarget, replaceGalleryPageBar = props.replaceGalleryPageBar, props.enabled && (galleryThumbEnhancementOnError = props.onError, replaceGalleryPageBar(previewPageIndex(), maxPreviewPageIndex()), setThumbsGridSwipeTarget(), galleryThumbEnhancementClickInstalled || (galleryThumbEnhancementClickInstalled = !0, document.addEventListener("click", onPageBarClick, !0))), onCleanup(() => {
        setSwipeGestureTarget2 === updateGestureTarget && (setSwipeGestureTarget2 = null), replaceGalleryPageBar === props.replaceGalleryPageBar && (replaceGalleryPageBar = null), thumbsGridsEnabled === props.enabled && (thumbsGridsEnabled = !1);
      });
    }), createPointerGestureElement(gestureTarget, () => ({
      onStart: () => {
        swipeState = {
          horizontal: !0,
          cancelled: !1
        }, hideSwipeIndicator();
      },
      onMove: (info) => {
        updateSwipeIndicator(info);
      },
      onEnd: (info, event) => {
        navigateBySwipe(info, event), swipeState = null, hideSwipeIndicator();
      },
      dragAxis: "x",
      dragIntentRatio: HORIZONTAL_INTENT_RATIO2,
      dragStartThreshold: SWIPE_INTENT_DISTANCE2
    })), createComponent(Show, {
      get when() {
        return props.enabled;
      },
      get children() {
        return createComponent(SwipeIndicator, {
          get state() {
            return swipeIndicatorState();
          }
        });
      }
    });
  }
  async function navigateGalleryPreview(url, options = {}) {
    if (galleryNavigationLoading)
      return;
    let previousUrl = window.location.href, snapshot = snapshotPreview(), targetPreviewIndex = previewPageIndexFromUrl(url), maxPreviewIndex = maxPreviewPageIndex();
    galleryNavigationLoading = !0, swipeElement2?.setAttribute("aria-busy", "true"), window.history.replaceState(window.history.state, "", url), targetPreviewIndex !== null && (setScrollPageBarWindowIndex(targetPreviewIndex), replaceGalleryPageBar?.(targetPreviewIndex, maxPreviewIndex)), options.scrollToPageBar && scrollToPageBar(options.scrollToPageBar), showPreviewPlaceholder(loadingSpinnerElement(texts_default.reader.loading, "lg"));
    try {
      let response = await requestPage(url), nextMaxPreviewIndex = maxPreviewPageIndex(response.document, url);
      replacePreviewContent2(response.document), replaceGalleryPageBar?.(previewPageIndexFromUrl(url) ?? previewPageIndex(), nextMaxPreviewIndex), setThumbsGridSwipeTarget(), options.scrollToPageBar && scrollToPageBar(options.scrollToPageBar);
    } catch (error) {
      throw restorePreview(snapshot), window.history.replaceState(window.history.state, "", previousUrl), replaceGalleryPageBar?.(previewPageIndex(), maxPreviewPageIndex()), error;
    } finally {
      galleryNavigationLoading = !1, swipeElement2?.removeAttribute("aria-busy");
    }
  }
  function setThumbsGridSwipeTarget() {
    if (!thumbsGridsEnabled)
      return;
    let thumbs = thumbsGrid();
    thumbs && (swipeElement2 = thumbs, prepareThumbsGridSwipeTargets(thumbs), setSwipeGestureTarget2?.(thumbs));
  }
  function swipeUrlForDelta2(dx) {
    let currentIndex = previewPageIndex(), maxIndex = maxPreviewPageIndex(), nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    return nextIndex < 0 || maxIndex !== null && nextIndex > maxIndex ? null : previewUrlForIndex(nextIndex);
  }
  function swipeProgressForDelta2(dx) {
    return Math.min(1, Math.max(0, (Math.abs(dx) - SWIPE_INTENT_DISTANCE2) / (SWIPE_MIN_DISTANCE2 - SWIPE_INTENT_DISTANCE2)));
  }
  function onPageBarClick(event) {
    if (!thumbsGridsEnabled || !(event.target instanceof Element))
      return;
    let barItem = event.target.closest(`.${SCROLL_PAGE_BAR_CLASS} a[data-page-index], .${SCROLL_PAGE_BAR_CLASS} button[data-page-jump]`);
    if (!barItem)
      return;
    event.preventDefault(), event.stopPropagation();
    let url = pageBarUrl(barItem);
    if (!url)
      return;
    let targetPreviewIndex = previewPageIndexFromUrl(url);
    targetPreviewIndex !== null && setScrollPageBarWindowIndex(targetPreviewIndex), navigateGalleryPreview(url, {
      scrollToPageBar: pageBarScrollTarget(barItem, targetPreviewIndex)
    }).catch((error) => galleryThumbEnhancementOnError?.(error));
  }
  function pageBarScrollTarget(item, targetPreviewIndex) {
    if (item instanceof HTMLButtonElement)
      return "top";
    let currentIndex = previewPageIndex(), maxIndex = maxPreviewPageIndex();
    return targetPreviewIndex !== null && (targetPreviewIndex === currentIndex - 1 || targetPreviewIndex === maxIndex) ? "bottom" : "top";
  }
  function scrollToPageBar(target) {
    let selector = target === "top" ? `.${SCROLL_PAGE_BAR_TOP_CLASS}` : `.${SCROLL_PAGE_BAR_BOTTOM_CLASS}`, block = target === "top" ? "start" : "end";
    document.querySelector(selector)?.scrollIntoView({
      block,
      behavior: "smooth"
    });
  }
  function pageBarUrl(item) {
    if (item instanceof HTMLAnchorElement)
      return previewPageIndexFromUrl(item.href) === null ? null : item.href;
    let maxPreviewIndex = maxPreviewPageIndex();
    if (maxPreviewIndex === null)
      return null;
    let page = window.prompt(`Jump to page: (1-${maxPreviewIndex + 1})`, String(previewPageIndex() + 1)), pageNumber = Number(page || "");
    return Number.isFinite(pageNumber) ? previewUrlForIndex(clamp(Math.round(pageNumber) - 1, 0, maxPreviewIndex)) : null;
  }

  // src/components/Enhance/ReadHistory.tsx
  var _tmpl$6 = /* @__PURE__ */ template("<button type=button><span>");
  function ReadButton(props) {
    let buttonClassName = props.variant === "touchGallery" ? "ehpeek-continue-reading ehpeek-touch-gallery-primary-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-md font-700" : "ehpeek-continue-reading block box-border w-full max-w-full mt-xs min-h-sm py-xs px-sm rounded-sm border ehp-color-site-border bg-transparent ehp-color-site-accent hover:bg-[var(--color-site-accent-hover)] shadow-none cursor-pointer text-center font-sans textsize-md font-700 leading-[1.15]", detailClassName = props.variant === "touchGallery" ? "ehpeek-continue-reading-page block mt-2px ehp-color-site-accent textsize-md font-600 opacity-78 normal-case" : "ehpeek-continue-reading-page block mt-1px opacity-72 textsize-sm font-600";
    return (() => {
      var _el$ = _tmpl$6(), _el$2 = _el$.firstChild;
      return _el$.$$click = (event) => {
        event.preventDefault(), event.stopPropagation(), props.onClick();
      }, className(_el$, buttonClassName), insert(_el$, () => props.info.label, _el$2), className(_el$2, detailClassName), insert(_el$2, () => props.info.detail), _el$;
    })();
  }
  var HISTORY_KEY_PREFIX = "ehpeek:history:", HISTORY_COUNT_KEY = "ehpeek:history-count", HISTORY_LIMIT = 2e3, HISTORY_PRUNE_COUNT = 1e3, SAVE_DELAY_MS = 1e4, ReadHistorySession = class {
    constructor(baseRecord) {
      __publicField(this, "pending", null);
      __publicField(this, "lastSaved", null);
      __publicField(this, "timer", null);
      __publicField(this, "flush", () => {
        this.timer !== null && (window.clearTimeout(this.timer), this.timer = null), this.pending && (this.sameProgress(this.pending, this.lastSaved) || (saveReadHistory(this.pending), this.lastSaved = this.pending), this.pending = null);
      });
      __publicField(this, "onVisibilityChange", () => {
        document.visibilityState === "hidden" && this.flush();
      });
      this.baseRecord = baseRecord, window.addEventListener("pagehide", this.flush), document.addEventListener("visibilitychange", this.onVisibilityChange);
    }
    update(pageNum, totalPages) {
      if (!pageNum || pageNum <= 0)
        return;
      let nextRecord = {
        ...this.baseRecord,
        pageNum,
        totalPages,
        updatedAt: Date.now()
      };
      this.sameProgress(nextRecord, this.lastSaved) || (this.pending = nextRecord, this.schedule());
    }
    dispose() {
      this.flush(), window.removeEventListener("pagehide", this.flush), document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
    schedule() {
      this.timer === null && (this.timer = window.setTimeout(this.flush, SAVE_DELAY_MS));
    }
    sameProgress(left, right) {
      return !!(left && right && left.galleryId === right.galleryId && left.token === right.token && left.pageNum === right.pageNum && left.totalPages === right.totalPages);
    }
  };
  function loadReadHistory(galleryId, token) {
    return GM_getValue(historyKey(galleryId, token), null);
  }
  function saveReadHistory(record) {
    let key = historyKey(record.galleryId, record.token), exists = GM_getValue(key, null) !== null;
    if (GM_setValue(key, record), !exists) {
      let count = GM_getValue(HISTORY_COUNT_KEY, 0) + 1;
      GM_setValue(HISTORY_COUNT_KEY, count), count > HISTORY_LIMIT && pruneReadHistory();
    }
  }
  function historyKey(galleryId, token) {
    return `${HISTORY_KEY_PREFIX}${galleryId}:${token}`;
  }
  function pruneReadHistory() {
    let records = GM_listValues().filter((key) => key.startsWith(HISTORY_KEY_PREFIX)).map((key) => ({
      key,
      record: GM_getValue(key, null)
    })).filter((entry) => entry.record !== null).sort((left, right) => left.record.updatedAt - right.record.updatedAt);
    for (let entry of records.slice(0, HISTORY_PRUNE_COUNT))
      GM_deleteValue(entry.key);
    GM_setValue(HISTORY_COUNT_KEY, Math.max(0, records.length - HISTORY_PRUNE_COUNT));
  }
  delegateEvents(["click"]);

  // src/components/Enhance/SearchHistory.tsx
  var _tmpl$7 = /* @__PURE__ */ template('<section class="ehpeek-search-history fixed z-ui flex box-border max-h-[60dvh] flex-col overflow-hidden overflow-y-auto overscroll-contain rounded-md border ehp-color-site-border ehp-color-site-elevated ehp-color-site-text font-sans"role=list>'), _tmpl$24 = /* @__PURE__ */ template('<div class="flex min-w-0 flex-none items-stretch border-0 border-b ehp-color-site-border-subtle-b last:border-b-0"role=listitem><button type=button></button><button type=button class="appearance-none inline-flex w-60px min-h-lg flex-none items-center justify-center border-0 border-l ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text textsize-xl font-inherit leading-1 cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]">×'), SEARCH_HISTORY_KEY = "ehpeek:search:history";
  function SearchHistory(props) {
    let dropdown, [searchValue, setSearchValue] = createSignal(props.source.searchInput.value), [history, setHistory] = createSignal(loadSearchHistory()), [open, setOpen] = createSignal(!1), [activeIndex, setActiveIndex] = createSignal(-1), [position, setPosition] = createSignal(null), itemButtons = [], visiblePosition = () => open() && !searchValue().trim() && history().length > 0 ? position() : null, selectHistory = (item) => {
      let input = props.source.searchInput;
      input.value = item, input.dispatchEvent(new Event("input", {
        bubbles: !0
      })), input.focus(), input.setSelectionRange(item.length, item.length), setOpen(!1);
    };
    return onMount(() => {
      let input = props.source.searchInput, form = input.form, updatePosition = () => {
        let rect = input.getBoundingClientRect();
        setPosition({
          left: rect.left,
          top: rect.bottom,
          width: rect.width
        });
      }, showHistory = () => {
        updatePosition(), setActiveIndex(-1), setOpen(!0);
      }, moveSelection = (offset) => {
        let items = history();
        if (items.length === 0)
          return;
        let current = activeIndex(), next = current < 0 ? offset > 0 ? 0 : items.length - 1 : (current + offset + items.length) % items.length;
        setActiveIndex(next), window.requestAnimationFrame(() => itemButtons[next]?.scrollIntoView({
          block: "nearest"
        }));
      }, onInputKeyDown = (event) => {
        visiblePosition() && (event.key === "ArrowDown" || event.key === "ArrowUp" ? (event.preventDefault(), moveSelection(event.key === "ArrowDown" ? 1 : -1)) : event.key === "Enter" && activeIndex() >= 0 ? (event.preventDefault(), selectHistory(history()[activeIndex()])) : event.key === "Escape" && (event.preventDefault(), setOpen(!1)));
      }, updateSearchValue = () => {
        setSearchValue(input.value), !input.value.trim() && document.activeElement === input && showHistory();
      }, recordSearch = () => {
        let value = input.value.trim();
        if (!value)
          return;
        let next = [value, ...loadSearchHistory().filter((item) => item !== value)];
        saveSearchHistory(next), setHistory(next);
      }, closeOnOutsidePointer = (event) => {
        let target = event.target;
        target === input || target instanceof Node && dropdown?.contains(target) || setOpen(!1);
      };
      input.addEventListener("input", updateSearchValue), input.addEventListener("focus", showHistory), input.addEventListener("pointerdown", showHistory), input.addEventListener("keydown", onInputKeyDown), form?.addEventListener("submit", recordSearch), props.source.searchSubmit.addEventListener("click", recordSearch), document.addEventListener("pointerdown", closeOnOutsidePointer, !0), document.addEventListener("scroll", updatePosition, !0), window.addEventListener("resize", updatePosition), updateSearchValue(), onCleanup(() => {
        input.removeEventListener("input", updateSearchValue), input.removeEventListener("focus", showHistory), input.removeEventListener("pointerdown", showHistory), input.removeEventListener("keydown", onInputKeyDown), form?.removeEventListener("submit", recordSearch), props.source.searchSubmit.removeEventListener("click", recordSearch), document.removeEventListener("pointerdown", closeOnOutsidePointer, !0), document.removeEventListener("scroll", updatePosition, !0), window.removeEventListener("resize", updatePosition);
      });
    }), createComponent(Show, {
      get when() {
        return visiblePosition();
      },
      keyed: !0,
      children: (currentPosition) => (() => {
        var _el$ = _tmpl$7(), _ref$ = dropdown;
        return typeof _ref$ == "function" ? use(_ref$, _el$) : dropdown = _el$, insert(_el$, createComponent(For, {
          get each() {
            return history();
          },
          children: (item, index) => (() => {
            var _el$2 = _tmpl$24(), _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling;
            return _el$3.$$click = () => selectHistory(item), _el$3.addEventListener("pointerenter", () => setActiveIndex(index())), use((button) => {
              itemButtons[index()] = button;
            }, _el$3), setAttribute(_el$3, "title", item), insert(_el$3, item), _el$4.$$click = () => {
              let next = history().filter((candidate) => candidate !== item);
              saveSearchHistory(next), setHistory(next);
            }, createRenderEffect((_p$) => {
              var _v$5 = `appearance-none block min-w-0 min-h-lg flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-lg border-0 ehp-color-site-text text-left textsize-lg font-inherit cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)] ${activeIndex() === index() ? "bg-[var(--color-site-item-hover)]" : "bg-transparent"}`, _v$6 = `${texts_default.search.deleteHistory}: ${item}`, _v$7 = texts_default.search.deleteHistory;
              return _v$5 !== _p$.e && className(_el$3, _p$.e = _v$5), _v$6 !== _p$.t && setAttribute(_el$4, "aria-label", _p$.t = _v$6), _v$7 !== _p$.a && setAttribute(_el$4, "title", _p$.a = _v$7), _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0
            }), _el$2;
          })()
        })), createRenderEffect((_p$) => {
          var _v$ = `${currentPosition.left}px`, _v$2 = `${currentPosition.top}px`, _v$3 = `${currentPosition.width}px`, _v$4 = texts_default.search.history;
          return _v$ !== _p$.e && setStyleProperty(_el$, "left", _p$.e = _v$), _v$2 !== _p$.t && setStyleProperty(_el$, "top", _p$.t = _v$2), _v$3 !== _p$.a && setStyleProperty(_el$, "width", _p$.a = _v$3), _v$4 !== _p$.o && setAttribute(_el$, "aria-label", _p$.o = _v$4), _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0
        }), _el$;
      })()
    });
  }
  function loadSearchHistory() {
    return GM_getValue(SEARCH_HISTORY_KEY, []);
  }
  function saveSearchHistory(history) {
    GM_setValue(SEARCH_HISTORY_KEY, history);
  }
  delegateEvents(["click"]);

  // src/components/Enhance/MyTags.ts
  var MY_TAGS_STORAGE_KEY = "ehpeek:my-tags";
  async function applyMyTagsEnhance(gallery) {
    if (isMyTagsPage()) {
      let appearances2 = await fetchMyTags(document);
      return appearances2 && saveMyTags(appearances2), () => {
      };
    }
    if (!gallery)
      return () => {
      };
    let appearances = loadMyTags() ?? await fetchMyTags();
    return appearances ? (applyMyTagAppearances(appearances), observeGalleryTagChanges(() => applyMyTagAppearances(appearances))) : () => {
    };
  }
  async function fetchMyTags(initialDocument) {
    try {
      let initial = initialDocument ?? (await requestMyTags()).document;
      if (!isMyTagsPage(initial))
        return null;
      let options = readMyTagSetOptions(initial);
      cacheMyTagSetOptions(options);
      let appearances = (options.length > 0 ? await Promise.all(options.map(async (option) => option.selected ? initial : (await requestMyTags(option.value)).document)) : [initial]).flatMap((document2, index) => isMyTagSetEnabled(document2) ? readMyTagAppearances(document2, options[index]?.value ?? "1") : []), unique = Array.from(new Map(appearances.map((appearance) => [appearance.name, appearance])).values());
      return saveMyTags(unique), unique;
    } catch (error) {
      return console.error("[ehpeek] Could not load My Tags", error), null;
    }
  }
  async function requestMyTags(tagSet) {
    let url = new URL("/mytags", window.location.origin);
    tagSet && url.searchParams.set("tagset", tagSet);
    let response = await requestPage(url.href);
    if (new URL(response.url).origin !== window.location.origin || !isMyTagsPage(response.document))
      throw new Error("My Tags page is unavailable");
    return response;
  }
  function loadMyTags() {
    let value = window.localStorage.getItem(MY_TAGS_STORAGE_KEY);
    if (value === null)
      return null;
    try {
      let parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(isMyTagAppearance) : null;
    } catch {
      return null;
    }
  }
  function saveMyTags(appearances) {
    window.localStorage.setItem(MY_TAGS_STORAGE_KEY, JSON.stringify(appearances));
  }
  function isMyTagAppearance(value) {
    if (!value || typeof value != "object" || Array.isArray(value))
      return !1;
    let item = value;
    return typeof item.name == "string" && typeof item.backgroundColor == "string" && typeof item.color == "string" && typeof item.id == "string" && typeof item.tagSet == "string";
  }

  // node_modules/.pnpm/solid-js@1.9.14/node_modules/solid-js/store/dist/store.js
  var $RAW = /* @__PURE__ */ Symbol("store-raw"), $NODE = /* @__PURE__ */ Symbol("store-node"), $HAS = /* @__PURE__ */ Symbol("store-has"), $SELF = /* @__PURE__ */ Symbol("store-self");
  function wrap$1(value) {
    let p = value[$PROXY];
    if (!p && (Object.defineProperty(value, $PROXY, {
      value: p = new Proxy(value, proxyTraps$1)
    }), !Array.isArray(value))) {
      let keys = Object.keys(value), desc = Object.getOwnPropertyDescriptors(value), proto = Object.getPrototypeOf(value), isClass = proto !== null && value !== null && typeof value == "object" && !Array.isArray(value) && proto !== Object.prototype;
      if (isClass) {
        let descriptors = Object.getOwnPropertyDescriptors(proto);
        keys.push(...Object.keys(descriptors)), Object.assign(desc, descriptors);
      }
      for (let i = 0, l = keys.length; i < l; i++) {
        let prop = keys[i];
        isClass && prop === "constructor" || desc[prop].get && Object.defineProperty(value, prop, {
          configurable: !0,
          enumerable: desc[prop].enumerable,
          get: desc[prop].get.bind(p)
        });
      }
    }
    return p;
  }
  function isWrappable(obj) {
    let proto;
    return obj != null && typeof obj == "object" && (obj[$PROXY] || !(proto = Object.getPrototypeOf(obj)) || proto === Object.prototype || Array.isArray(obj));
  }
  function unwrap(item, set = /* @__PURE__ */ new Set()) {
    let result, unwrapped, v, prop;
    if (result = item != null && item[$RAW]) return result;
    if (!isWrappable(item) || set.has(item)) return item;
    if (Array.isArray(item)) {
      Object.isFrozen(item) ? item = item.slice(0) : set.add(item);
      for (let i = 0, l = item.length; i < l; i++)
        v = item[i], (unwrapped = unwrap(v, set)) !== v && (item[i] = unwrapped);
    } else {
      Object.isFrozen(item) ? item = Object.assign({}, item) : set.add(item);
      let keys = Object.keys(item), desc = Object.getOwnPropertyDescriptors(item);
      for (let i = 0, l = keys.length; i < l; i++)
        prop = keys[i], !desc[prop].get && (v = item[prop], (unwrapped = unwrap(v, set)) !== v && (item[prop] = unwrapped));
    }
    return item;
  }
  function getNodes(target, symbol) {
    let nodes = target[symbol];
    return nodes || Object.defineProperty(target, symbol, {
      value: nodes = /* @__PURE__ */ Object.create(null)
    }), nodes;
  }
  function getNode(nodes, property, value) {
    if (nodes[property]) return nodes[property];
    let [s, set] = createSignal(value, {
      equals: !1,
      internal: !0
    });
    return s.$ = set, nodes[property] = s;
  }
  function proxyDescriptor$1(target, property) {
    let desc = Reflect.getOwnPropertyDescriptor(target, property);
    return !desc || desc.get || !desc.configurable || property === $PROXY || property === $NODE || (delete desc.value, delete desc.writable, desc.get = () => target[$PROXY][property]), desc;
  }
  function trackSelf(target) {
    getListener() && getNode(getNodes(target, $NODE), $SELF)();
  }
  function ownKeys(target) {
    return trackSelf(target), Reflect.ownKeys(target);
  }
  var proxyTraps$1 = {
    get(target, property, receiver) {
      if (property === $RAW) return target;
      if (property === $PROXY) return receiver;
      if (property === $TRACK)
        return trackSelf(target), receiver;
      let nodes = getNodes(target, $NODE), tracked = nodes[property], value = tracked ? tracked() : target[property];
      if (property === $NODE || property === $HAS || property === "__proto__") return value;
      if (!tracked) {
        let desc = Object.getOwnPropertyDescriptor(target, property);
        getListener() && (typeof value != "function" || Object.prototype.hasOwnProperty.call(target, property)) && !(desc && desc.get) && (value = getNode(nodes, property, value)());
      }
      return isWrappable(value) ? wrap$1(value) : value;
    },
    has(target, property) {
      return property === $RAW || property === $PROXY || property === $TRACK || property === $NODE || property === $HAS || property === "__proto__" ? !0 : (getListener() && getNode(getNodes(target, $HAS), property)(), property in target);
    },
    set() {
      return !0;
    },
    deleteProperty() {
      return !0;
    },
    ownKeys,
    getOwnPropertyDescriptor: proxyDescriptor$1
  };
  function setProperty(state2, property, value, deleting = !1) {
    if (property === "__proto__" || !deleting && state2[property] === value) return;
    let prev = state2[property], len = state2.length;
    value === void 0 ? (delete state2[property], state2[$HAS] && state2[$HAS][property] && prev !== void 0 && state2[$HAS][property].$()) : (state2[property] = value, state2[$HAS] && state2[$HAS][property] && prev === void 0 && state2[$HAS][property].$());
    let nodes = getNodes(state2, $NODE), node;
    if ((node = getNode(nodes, property, prev)) && node.$(() => value), Array.isArray(state2) && state2.length !== len) {
      for (let i = state2.length; i < len; i++) (node = nodes[i]) && node.$();
      (node = getNode(nodes, "length", len)) && node.$(state2.length);
    }
    (node = nodes[$SELF]) && node.$();
  }
  function mergeStoreNode(state2, value) {
    let keys = Object.keys(value);
    for (let i = 0; i < keys.length; i += 1) {
      let key = keys[i];
      isUnsafeKey$1(key) || setProperty(state2, key, value[key]);
    }
  }
  function isUnsafeKey$1(property) {
    return property === "__proto__" || property === "constructor" || property === "prototype";
  }
  function updateArray(current, next) {
    if (typeof next == "function" && (next = next(current)), next = unwrap(next), Array.isArray(next)) {
      if (current === next) return;
      let i = 0, len = next.length;
      for (; i < len; i++) {
        let value = next[i];
        current[i] !== value && setProperty(current, i, value);
      }
      setProperty(current, "length", len);
    } else mergeStoreNode(current, next);
  }
  function updatePath(current, path, traversed = []) {
    let part, prev = current;
    if (path.length > 1) {
      part = path.shift();
      let partType = typeof part, isArray = Array.isArray(current);
      if (partType === "string" && (part === "__proto__" || path.length > 1 && isUnsafeKey$1(part)))
        return;
      if (Array.isArray(part)) {
        for (let i = 0; i < part.length; i++)
          updatePath(current, [part[i]].concat(path), traversed);
        return;
      } else if (isArray && partType === "function") {
        for (let i = 0; i < current.length; i++)
          part(current[i], i) && updatePath(current, [i].concat(path), traversed);
        return;
      } else if (isArray && partType === "object") {
        let {
          from = 0,
          to = current.length - 1,
          by = 1
        } = part;
        for (let i = from; i <= to; i += by)
          updatePath(current, [i].concat(path), traversed);
        return;
      } else if (path.length > 1) {
        updatePath(current[part], path, [part].concat(traversed));
        return;
      }
      prev = current[part], traversed = [part].concat(traversed);
    }
    let value = path[0];
    typeof value == "function" && (value = value(prev, traversed), value === prev) || part === void 0 && value == null || (value = unwrap(value), part === void 0 || isWrappable(prev) && isWrappable(value) && !Array.isArray(value) ? mergeStoreNode(prev, value) : setProperty(current, part, value));
  }
  function createStore(...[store, options]) {
    let unwrappedStore = unwrap(store || {}), isArray = Array.isArray(unwrappedStore), wrappedStore = wrap$1(unwrappedStore);
    function setStore(...args) {
      batch(() => {
        isArray && args.length === 1 ? updateArray(unwrappedStore, args[0]) : updatePath(unwrappedStore, args);
      });
    }
    return [wrappedStore, setStore];
  }

  // src/components/SettingsMenu.tsx
  var _tmpl$8 = /* @__PURE__ */ template('<p class="box-border w-full m-0 px-md pb-md text-left whitespace-normal [overflow-wrap:anywhere] [contain:inline-size] textsize-sm leading-[1.35] opacity-75">'), _tmpl$25 = /* @__PURE__ */ template('<div class="border-0 border-b ehp-color-site-border-subtle-b"><div class="flex items-stretch"><button type=button><span></span><span class="flex flex-none items-center gap-sm"><span class="textsize-sm opacity-70"></span><span></span></span></button><button type=button class="flex flex-none w-32px coarse:w-48px min-h-md coarse:min-h-88px items-center justify-center p-0 rounded-xs border-0 !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text cursor-pointer font-inherit textsize-md font-700 [-webkit-tap-highlight-color:transparent]"><span class="flex w-20px h-20px items-center justify-center rounded-full border border-[var(--color-site-border-subtle)] leading-none">?'), _tmpl$34 = /* @__PURE__ */ template('<div class="ml-md border-0 border-l border-l-[var(--color-site-border-subtle)]">'), _tmpl$43 = /* @__PURE__ */ template('<div class="ehpeek-settings-menu pointer-events-auto fixed top-24px right-24px coarse:top-8px coarse:right-8px z-overlay box-border w-320px coarse:w-[calc(100vw-16px)] max-w-[calc(100vw-48px)] coarse:max-w-480px max-h-[calc(100vh-48px)] coarse:max-h-[calc(100dvh-16px)] overflow-x-hidden overflow-y-auto p-sm coarse:p-md border ehp-color-site-border rounded-sm ehp-color-site-elevated ehp-color-site-text textsize-md leading-[1.2]"><div class="border-0 border-b ehp-color-site-border-subtle-b"><button type=button class="flex w-full min-h-md coarse:min-h-88px items-center justify-between gap-md coarse:gap-xl py-sm coarse:py-lg px-md rounded-xs border-0 !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text cursor-pointer font-inherit text-left textsize-md font-700 [-webkit-tap-highlight-color:transparent]"><span></span><span class="flex w-20px h-20px items-center justify-center leading-none"aria-hidden=true></span></button></div><div class="border-0 border-b ehp-color-site-border-subtle-b"><button type=button class="flex w-full min-h-md coarse:min-h-88px items-center justify-between gap-md coarse:gap-xl py-sm coarse:py-lg px-md rounded-xs border-0 !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text cursor-pointer font-inherit text-left textsize-md font-700 [-webkit-tap-highlight-color:transparent]"><span></span><span class="flex w-20px h-20px items-center justify-center leading-none"aria-hidden=true></span></button></div><a class="flex w-full min-h-md coarse:min-h-88px items-center overflow-hidden text-ellipsis whitespace-nowrap px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text no-underline textsize-md font-700 hover:bg-[var(--color-site-item-hover)]"href=https://github.com/yamipot/ehpeek target=_blank rel="noopener noreferrer">v</a><div class="ehpeek-settings-actions grid grid-cols-3 gap-sm mt-md pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]"><button type=button class="ehpeek-settings-apply block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108"></button><button type=button class="ehpeek-settings-default block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]"></button><button type=button class="ehpeek-settings-close block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]">');
  var SETTINGS_DOT_CLASS = "block flex-none w-10px h-10px coarse:w-18px coarse:h-18px rounded-full";
  function SwitchButton(props) {
    let [helpOpen, setHelpOpen] = createSignal(!1), helpId = `ehpeek-setting-help-${createUniqueId()}`;
    return (() => {
      var _el$ = _tmpl$25(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$3.nextSibling;
      return _el$3.$$click = (event) => {
        event.stopPropagation(), props.onChange(!props.checked);
      }, insert(_el$4, () => props.label), insert(_el$6, (() => {
        var _c$ = memo(() => !!props.checked);
        return () => _c$() ? texts_default.settings.on : texts_default.settings.off;
      })()), _el$8.$$click = (event) => {
        event.stopPropagation(), setHelpOpen((open) => !open);
      }, setAttribute(_el$8, "aria-controls", helpId), insert(_el$, createComponent(Show, {
        get when() {
          return helpOpen();
        },
        get children() {
          var _el$9 = _tmpl$8();
          return setAttribute(_el$9, "id", helpId), insert(_el$9, () => props.description), _el$9;
        }
      }), null), createRenderEffect((_p$) => {
        var _v$ = `flex min-w-0 flex-1 min-h-md coarse:min-h-88px items-center justify-between gap-md coarse:gap-xl py-sm coarse:py-lg pl-md pr-sm rounded-xs border-0 !bg-transparent hover:!bg-transparent active:!bg-transparent ehp-color-site-text font-inherit text-left textsize-md [-webkit-tap-highlight-color:transparent] ${props.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`, _v$2 = helpOpen() ? helpId : void 0, _v$3 = props.disabled, _v$4 = `${SETTINGS_DOT_CLASS} ${props.checked ? "bg-[var(--color-state-on)]" : "bg-[var(--color-state-off)]"}`, _v$5 = texts_default.settings.showHelp, _v$6 = helpOpen(), _v$7 = texts_default.settings.showHelp;
        return _v$ !== _p$.e && className(_el$3, _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$3, "aria-describedby", _p$.t = _v$2), _v$3 !== _p$.a && (_el$3.disabled = _p$.a = _v$3), _v$4 !== _p$.o && className(_el$7, _p$.o = _v$4), _v$5 !== _p$.i && setAttribute(_el$8, "aria-label", _p$.i = _v$5), _v$6 !== _p$.n && setAttribute(_el$8, "aria-expanded", _p$.n = _v$6), _v$7 !== _p$.s && setAttribute(_el$8, "title", _p$.s = _v$7), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0,
        s: void 0
      }), _el$;
    })();
  }
  function SettingsMenu(props) {
    let [draft, setDraft] = createStore({
      ...props.initState
    }), [readerOptionsOpen, setReaderOptionsOpen] = createSignal(!1), [enhanceOpen, setEnhanceOpen] = createSignal(!1), menu, close = () => {
      props.onOpenChange(!1);
    };
    return createEffect(() => {
      props.open && (setDraft({
        ...props.initState
      }), setReaderOptionsOpen(!1), setEnhanceOpen(!1));
    }), onMount(() => {
      let onPointerDown = (event) => {
        props.open && (event.target instanceof Element && menu.contains(event.target) || close());
      }, onKeyDown = (event) => {
        props.open && event.key === "Escape" && close();
      };
      document.addEventListener("pointerdown", onPointerDown), document.addEventListener("keydown", onKeyDown), onCleanup(() => {
        document.removeEventListener("pointerdown", onPointerDown), document.removeEventListener("keydown", onKeyDown);
      });
    }), createComponent(Show, {
      get when() {
        return props.open;
      },
      get children() {
        var _el$0 = _tmpl$43(), _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$14 = _el$1.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$19 = _el$14.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$19.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$23.nextSibling, _ref$ = menu;
        return typeof _ref$ == "function" ? use(_ref$, _el$0) : menu = _el$0, insert(_el$0, createComponent(SwitchButton, {
          get checked() {
            return draft.readerEnabled;
          },
          get description() {
            return texts_default.settings.readerHelp;
          },
          get label() {
            return texts_default.settings.readerLabel;
          },
          onChange: (value) => setDraft("readerEnabled", value)
        }), _el$1), insert(_el$0, createComponent(SwitchButton, {
          get checked() {
            return draft.touchUiEnabled;
          },
          get description() {
            return texts_default.settings.touchUiHelp;
          },
          get label() {
            return texts_default.settings.touchUiLabel;
          },
          onChange: (value) => setDraft("touchUiEnabled", value)
        }), _el$1), insert(_el$0, createComponent(SwitchButton, {
          get checked() {
            return draft.singlePageAppEnabled;
          },
          get description() {
            return texts_default.settings.singlePageAppHelp;
          },
          get disabled() {
            return !draft.touchUiEnabled;
          },
          get label() {
            return texts_default.settings.singlePageApp;
          },
          onChange: (value) => setDraft("singlePageAppEnabled", value)
        }), _el$1), _el$10.$$click = (event) => {
          event.stopPropagation(), setReaderOptionsOpen((open) => !open);
        }, insert(_el$11, () => texts_default.settings.readerOptions), insert(_el$12, () => readerOptionsOpen() ? "−" : "+"), insert(_el$1, createComponent(Show, {
          get when() {
            return readerOptionsOpen();
          },
          get children() {
            var _el$13 = _tmpl$34();
            return insert(_el$13, createComponent(SwitchButton, {
              get checked() {
                return draft.readerFullscreenEnabled;
              },
              get description() {
                return texts_default.settings.readerFullscreenHelp;
              },
              get label() {
                return texts_default.settings.readerFullscreenLabel;
              },
              onChange: (value) => setDraft("readerFullscreenEnabled", value)
            })), _el$13;
          }
        }), null), _el$15.$$click = (event) => {
          event.stopPropagation(), setEnhanceOpen((open) => !open);
        }, insert(_el$16, () => texts_default.settings.enhance), insert(_el$17, () => enhanceOpen() ? "−" : "+"), insert(_el$14, createComponent(Show, {
          get when() {
            return enhanceOpen();
          },
          get children() {
            var _el$18 = _tmpl$34();
            return insert(_el$18, createComponent(SwitchButton, {
              get checked() {
                return draft.enhanceSearchGridsEnabled;
              },
              get description() {
                return texts_default.settings.enhanceSearchHelp;
              },
              get label() {
                return texts_default.settings.enhanceSearchLabel;
              },
              onChange: (value) => setDraft("enhanceSearchGridsEnabled", value)
            }), null), insert(_el$18, createComponent(SwitchButton, {
              get checked() {
                return draft.enhanceThumbsGridsEnabled;
              },
              get description() {
                return texts_default.settings.enhanceThumbsHelp;
              },
              get label() {
                return texts_default.settings.enhanceThumbsLabel;
              },
              onChange: (value) => setDraft("enhanceThumbsGridsEnabled", value)
            }), null), insert(_el$18, createComponent(SwitchButton, {
              get checked() {
                return draft.myTagsEnabled;
              },
              get description() {
                return texts_default.settings.myTagsHelp;
              },
              get label() {
                return texts_default.settings.myTagsLabel;
              },
              onChange: (value) => setDraft("myTagsEnabled", value)
            }), null), insert(_el$18, createComponent(SwitchButton, {
              get checked() {
                return draft.readHistoryEnabled;
              },
              get description() {
                return texts_default.settings.readHistoryHelp;
              },
              get label() {
                return texts_default.settings.readHistoryLabel;
              },
              onChange: (value) => setDraft("readHistoryEnabled", value)
            }), null), insert(_el$18, createComponent(SwitchButton, {
              get checked() {
                return draft.searchHistoryEnabled;
              },
              get description() {
                return texts_default.settings.searchHistoryHelp;
              },
              get label() {
                return texts_default.settings.searchHistoryLabel;
              },
              onChange: (value) => setDraft("searchHistoryEnabled", value)
            }), null), _el$18;
          }
        }), null), insert(_el$19, "260718.1825", null), _el$22.$$click = (event) => {
          event.stopPropagation(), props.onApply({
            ...draft
          });
        }, insert(_el$22, () => texts_default.settings.apply), _el$23.$$click = (event) => {
          event.stopPropagation(), setDraft({
            ...props.defaultState
          });
        }, insert(_el$23, () => texts_default.settings.default), _el$24.$$click = (event) => {
          event.stopPropagation(), close();
        }, insert(_el$24, () => texts_default.settings.close), createRenderEffect((_p$) => {
          var _v$8 = readerOptionsOpen(), _v$9 = readerOptionsOpen() ? texts_default.settings.hideReaderOptions : texts_default.settings.showReaderOptions, _v$0 = enhanceOpen(), _v$1 = enhanceOpen() ? texts_default.settings.hideEnhance : texts_default.settings.showEnhance, _v$10 = texts_default.navigation.github, _v$11 = `${texts_default.navigation.github}: 260718.1825`;
          return _v$8 !== _p$.e && setAttribute(_el$10, "aria-expanded", _p$.e = _v$8), _v$9 !== _p$.t && setAttribute(_el$10, "aria-label", _p$.t = _v$9), _v$0 !== _p$.a && setAttribute(_el$15, "aria-expanded", _p$.a = _v$0), _v$1 !== _p$.o && setAttribute(_el$15, "aria-label", _p$.o = _v$1), _v$10 !== _p$.i && setAttribute(_el$19, "aria-label", _p$.i = _v$10), _v$11 !== _p$.n && setAttribute(_el$19, "title", _p$.n = _v$11), _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0,
          i: void 0,
          n: void 0
        }), _el$0;
      }
    });
  }
  delegateEvents(["click"]);

  // src/components/Widgets/BackToTop.tsx
  var _tmpl$9 = /* @__PURE__ */ template('<button type=button class="ehpeek-back-to-top fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[calc(max(16px,env(safe-area-inset-bottom,0px))_+_64px)] z-ui inline-flex w-lg h-lg items-center justify-center rounded-full border ehp-color-site-border bg-[var(--color-site-elevated)] ehp-color-site-accent shadow-[0_4px_14px_var(--color-shadow-floating)] cursor-pointer [touch-action:none] active:scale-96">'), BACK_TO_TOP_POSITION_KEY = "ehpeek:back-to-top:position";
  function BackToTop() {
    let button, drag = null, dragged = !1, [visible, setVisible] = createSignal(!1), [position, setPosition] = createSignal(null);
    return onMount(() => {
      let updateVisibility = () => {
        setVisible(window.scrollY > Math.max(320, window.innerHeight * 0.5));
      };
      updateVisibility();
      let savedPosition = GM_getValue(BACK_TO_TOP_POSITION_KEY, null);
      savedPosition && setPosition(savedPosition), window.addEventListener("scroll", updateVisibility, {
        passive: !0
      }), onCleanup(() => window.removeEventListener("scroll", updateVisibility));
    }), createComponent(Show, {
      get when() {
        return visible();
      },
      get children() {
        var _el$ = _tmpl$9();
        _el$.$$click = (event) => {
          if (dragged) {
            event.preventDefault(), dragged = !1;
            return;
          }
          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        }, _el$.$$pointerup = (event) => {
          !drag || drag.pointerId !== event.pointerId || (button.releasePointerCapture(event.pointerId), drag = null, dragged && position() && GM_setValue(BACK_TO_TOP_POSITION_KEY, position()));
        }, _el$.$$pointermove = (event) => {
          if (!drag || drag.pointerId !== event.pointerId)
            return;
          let dx = event.clientX - drag.x, dy = event.clientY - drag.y;
          dragged || (dragged = Math.hypot(dx, dy) > 4), setPosition(clampPosition({
            bottom: drag.bottom - dy,
            right: drag.right - dx
          }, button));
        }, _el$.$$pointerdown = (event) => {
          let rect = button.getBoundingClientRect();
          dragged = !1, drag = {
            bottom: window.innerHeight - rect.bottom,
            pointerId: event.pointerId,
            right: window.innerWidth - rect.right,
            x: event.clientX,
            y: event.clientY
          }, button.setPointerCapture(event.pointerId);
        };
        var _ref$ = button;
        return typeof _ref$ == "function" ? use(_ref$, _el$) : button = _el$, insert(_el$, createComponent(Icon, {
          name: "arrow-up"
        })), createRenderEffect((_p$) => {
          var _v$ = position() ? {
            bottom: `${position().bottom}px`,
            right: `${position().right}px`
          } : void 0, _v$2 = texts_default.reader.backToTop, _v$3 = texts_default.reader.backToTop;
          return _p$.e = style(_el$, _v$, _p$.e), _v$2 !== _p$.t && setAttribute(_el$, "aria-label", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$, "title", _p$.a = _v$3), _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        }), _el$;
      }
    });
  }
  function clampPosition(position, button) {
    return {
      bottom: Math.min(Math.max(0, position.bottom), Math.max(0, window.innerHeight - button.offsetHeight)),
      right: Math.min(Math.max(0, position.right), Math.max(0, window.innerWidth - button.offsetWidth))
    };
  }
  delegateEvents(["pointerdown", "pointermove", "pointerup", "click"]);

  // src/components/TouchUI/CommentsPanel.ts
  function prepareCommentsPanel() {
    prepareTouchGalleryComments();
  }

  // src/integrations/EhSyringe.ts
  var ROOT_CLASS = "ehs-injected", TRANSLATED_LANGUAGE = "zh-hans", INITIALIZED_SELECTOR = "#eh-syringe-popup-button", SEARCH_SUBMIT_SELECTOR = "#searchbox button[ehs-input][type='submit']", CLEAR_BUTTON_SELECTOR = "#searchbox button[ehs-input][type='button']", TAG_TIP_INPUT_SELECTOR = "#f_search, #newtagfield, [name='f_search']", TAG_TIP_LIST_SELECTOR = ".eh-syringe-lite-auto-complete-list", TAG_TIP_LIST_CLASS_NAME = "!max-h-[60dvh] !py-sm [&_.auto-complete-item]:box-border [&_.auto-complete-item]:min-h-lg [&_.auto-complete-item]:!py-sm [&_.auto-complete-item]:!px-lg [&_.auto-complete-item]:!text-[length:var(--font-size-lg)] [&_.auto-complete-item]:!leading-[1.25] [&_.auto-complete-text]:!text-inherit [&_.auto-complete-text]:!leading-inherit", DETECTED_KEY = "ehpeek:ehsyringe:detected";
  var initialUiReady = null, tagTipInput = null;
  function waitForInitialUi() {
    return initialUiReady ?? (initialUiReady = waitForExpectedInitialUi()), initialUiReady;
  }
  async function waitForSearchUi() {
    await waitForInitialUi(), isTranslatingUi() && await waitFor(searchUiReady);
  }
  async function waitForRouteTranslation(root) {
    if (await waitForInitialUi(), !isInjected())
      return;
    let probe = translationProbe();
    root.append(probe);
    try {
      await waitFor(
        () => probe.hasAttribute("ehs-tag"),
        450,
        {
          attributes: !0,
          childList: !0,
          subtree: !0
        },
        root
      ) && await waitForMutationQuiet(root, 48, 450);
    } finally {
      probe.remove();
    }
  }
  function mirrorTranslatedContent(source, target) {
    let update = () => {
      target.replaceChildren(...Array.from(source.childNodes, (node) => node.cloneNode(!0)));
      let language = source.getAttribute("lang");
      language ? target.setAttribute("lang", language) : target.removeAttribute("lang");
    }, observer = new MutationObserver(update);
    return update(), observer.observe(source, {
      attributes: !0,
      attributeFilter: ["lang"],
      characterData: !0,
      childList: !0,
      subtree: !0
    }), () => observer.disconnect();
  }
  function reuseTagTipInput(target) {
    return captureTagTipInput(), !tagTipInput || tagTipInput === target || tagTipInput.isConnected ? target : (copyInputAttributes(target, tagTipInput), tagTipInput.value = target.value, target.replaceWith(tagTipInput), tagTipInput);
  }
  async function waitForExpectedInitialUi() {
    if (initialUiLoaded()) {
      setDetected(!0);
      return;
    }
    if (!isInjected() && !wasDetected())
      return;
    let loaded = await waitFor(initialUiLoaded, 3e3);
    setDetected(loaded);
  }
  function waitFor(ready, timeoutMs, observe = { childList: !0, subtree: !0 }, root = document.documentElement) {
    return ready() ? Promise.resolve(!0) : new Promise((resolve) => {
      let timer = null, observer = new MutationObserver(() => {
        ready() && finish(!0);
      }), finish = (value) => {
        observer.disconnect(), timer !== null && window.clearTimeout(timer), resolve(value);
      };
      observer.observe(root, observe), timeoutMs !== void 0 && (timer = window.setTimeout(() => finish(!1), timeoutMs));
    });
  }
  function waitForMutationQuiet(root, quietMs, timeoutMs) {
    return new Promise((resolve) => {
      let finished = !1, quietTimer = window.setTimeout(finish, quietMs), timeoutTimer = window.setTimeout(finish, timeoutMs), observer = new MutationObserver(() => {
        window.clearTimeout(quietTimer), quietTimer = window.setTimeout(finish, quietMs);
      });
      function finish() {
        finished || (finished = !0, observer.disconnect(), window.clearTimeout(quietTimer), window.clearTimeout(timeoutTimer), resolve());
      }
      observer.observe(root, {
        attributes: !0,
        characterData: !0,
        childList: !0,
        subtree: !0
      });
    });
  }
  function translationProbe() {
    let probe = document.createElement("span");
    return probe.className = "gt", probe.hidden = !0, probe.lang = "en", probe.setAttribute("translate", "yes"), probe.title = "ehpeek:translation probe", probe.textContent = "ehpeek:translation probe", probe;
  }
  function watchForSuccessfulInjection() {
    if (initialUiLoaded()) {
      setDetected(!0);
      return;
    }
    let observer = new MutationObserver(() => {
      initialUiLoaded() && (observer.disconnect(), setDetected(!0));
    });
    observer.observe(document.documentElement, {
      childList: !0,
      subtree: !0
    });
  }
  function initialUiLoaded() {
    return isInjected() && !!document.querySelector(INITIALIZED_SELECTOR);
  }
  function wasDetected() {
    return GM_getValue(DETECTED_KEY, 0) === 1;
  }
  function setDetected(detected) {
    GM_setValue(DETECTED_KEY, detected ? 1 : 0);
  }
  function isInjected() {
    return document.documentElement.classList.contains(ROOT_CLASS);
  }
  function isTranslatingUi() {
    let root = document.documentElement;
    return isInjected() && root.lang.toLowerCase() === TRANSLATED_LANGUAGE;
  }
  function searchUiReady() {
    return !!(document.querySelector(SEARCH_SUBMIT_SELECTOR) && document.querySelector(CLEAR_BUTTON_SELECTOR));
  }
  function captureTagTipInput() {
    if (tagTipInput)
      return !0;
    let list = document.querySelector(TAG_TIP_LIST_SELECTOR);
    return list ? (list.classList.add(...TAG_TIP_LIST_CLASS_NAME.split(" ")), tagTipInput = document.querySelector(TAG_TIP_INPUT_SELECTOR), tagTipInput !== null) : !1;
  }
  function copyInputAttributes(source, target) {
    let injectedAttributes = Array.from(target.attributes).filter((attribute) => attribute.name === "autocomplete" || attribute.name.startsWith("ehs-")).map((attribute) => [attribute.name, attribute.value]);
    for (let attribute of Array.from(target.attributes))
      target.removeAttribute(attribute.name);
    for (let attribute of Array.from(source.attributes))
      target.setAttribute(attribute.name, attribute.value);
    for (let [name, value] of injectedAttributes)
      target.setAttribute(name, value);
  }
  function watchForTagTipInput() {
    if (captureTagTipInput())
      return;
    let observer = new MutationObserver(() => {
      captureTagTipInput() && observer.disconnect();
    });
    observer.observe(document.documentElement, {
      childList: !0,
      subtree: !0
    });
  }
  watchForSuccessfulInjection();
  watchForTagTipInput();

  // src/components/Widgets/ExternalDom.tsx
  var _tmpl$10 = /* @__PURE__ */ template("<span class=contents>");
  function DomNode(props) {
    let root;
    return createEffect(() => {
      let node = props.node;
      node && (root.replaceChildren(node), onCleanup(() => root.replaceChildren()));
    }), (() => {
      var _el$ = _tmpl$10(), _ref$ = root;
      return typeof _ref$ == "function" ? use(_ref$, _el$) : root = _el$, _el$;
    })();
  }
  function DomNodes(props) {
    let root;
    return createEffect(() => {
      root.replaceChildren(...props.nodes.map((node) => props.clone ? node.cloneNode(!0) : node)), onCleanup(() => root.replaceChildren());
    }), (() => {
      var _el$2 = _tmpl$10(), _ref$2 = root;
      return typeof _ref$2 == "function" ? use(_ref$2, _el$2) : root = _el$2, _el$2;
    })();
  }

  // src/components/TouchUI/GalleryInfoPanel.tsx
  var _tmpl$11 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-rating-dialog fixed inset-0 z-overlay flex items-center justify-center p-md bg-black/65"role=dialog aria-modal=true aria-label="Rate gallery"><div class="box-border flex w-[min(92vw,420px)] flex-col gap-lg rounded-lg border ehp-color-site-border p-lg ehp-color-site-elevated ehp-color-site-text shadow-xl"><div class="textsize-md font-700">Rate gallery</div><button type=button class="relative inline-flex self-center max-w-full overflow-hidden p-0 border-0 bg-transparent cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"><span class="flex gap-1px pointer-events-none text-[rgba(255,255,255,0.25)]"aria-hidden=true></span><span aria-hidden=true></span></button><div class="grid grid-cols-2 gap-sm pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]"><button type=button class="block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 disabled:opacity-50 disabled:cursor-default border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108">Submit</button><button type=button class="block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 disabled:opacity-50 disabled:cursor-default border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]">'), _tmpl$26 = /* @__PURE__ */ template('<section class="ehpeek-touch-gallery flex box-border w-full flex-col mb-md ehp-color-site-text font-sans"><div class="ehpeek-touch-gallery-hero relative grid min-h-[clamp(260px,42vh,340px)] pt-lg pr-[max(16px,env(safe-area-inset-right,0px))] pb-48px pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-surface ehp-color-site-text"><div><div class="ehpeek-touch-gallery-hero-side flex self-stretch min-w-0 flex-col items-start gap-8px pt-2px"><div class="ehpeek-touch-gallery-heading flex min-w-0 w-full flex-none flex-col gap-sm items-start pb-xs"><div class="ehpeek-touch-gallery-title-main line-clamp-4 flex-none overflow-hidden textsize-lg font-400 leading-[1.16] text-left break-anywhere"></div><div class="ehpeek-touch-gallery-title-sub line-clamp-3 flex-none overflow-hidden opacity-82 textsize-md leading-[1.2] text-left break-anywhere"></div></div><div class="ehpeek-touch-gallery-category-row grid grid-cols-[minmax(0,35fr)_minmax(0,65fr)] w-full flex-none items-center gap-lg mt-auto pt-md"><div class="ehpeek-touch-gallery-category box-border w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-xs border border-solid py-6px px-10px text-center textsize-md font-700 leading-[1.1] uppercase"></div></div></div></div></div><div class="ehpeek-touch-gallery-primary relative z-1 grid grid-cols-[1fr_1fr] min-h-87px mt--18px mr-[max(14px,env(safe-area-inset-right,0px))] ml-[max(14px,env(safe-area-inset-left,0px))] overflow-visible rounded-xs bg-[var(--color-site-elevated)] shadow-[0_2px_10px_var(--color-shadow-panel)]"><div class="ehpeek-touch-gallery-primary-actions flex min-w-0 border-0 border-l-8 border-solid border-l-[var(--color-site-page)]"></div></div><div class="ehpeek-touch-gallery-content flex flex-col gap-lg pt-xl pr-[max(16px,env(safe-area-inset-right,0px))] pb-lg pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-page ehp-color-site-text"><div class="ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-md gap-x-lg items-center textsize-md leading-[1.2] text-center">'), _tmpl$35 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-cover flex self-center justify-self-stretch w-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden rounded-3px">'), _tmpl$44 = /* @__PURE__ */ template('<button type=button class="ehpeek-touch-gallery-rating flex w-full min-w-0 flex-col items-center gap-4px p-0 border-0 bg-transparent ehp-color-site-text font-inherit text-center cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"aria-label="Rate gallery"><div class="ehpeek-touch-gallery-rating-stars relative inline-flex max-w-full overflow-hidden"><span class="ehpeek-touch-gallery-rating-stars-empty flex gap-1px text-[rgba(255,255,255,0.25)]"aria-hidden=true></span><span aria-hidden=true></span></div><div class="ehpeek-touch-gallery-rating-meta flex max-w-full min-w-0 items-center justify-center gap-6px text-[rgba(255,255,255,0.78)] textsize-md leading-[1.15] whitespace-nowrap"><span class="ehpeek-touch-gallery-rating-label min-w-0 overflow-hidden text-ellipsis"aria-live=polite>'), _tmpl$53 = /* @__PURE__ */ template('<span class="ehpeek-touch-gallery-rating-count flex-none pl-6px border-0 border-l border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.58)]">'), _tmpl$62 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal">'), _tmpl$72 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-tag-groups flex flex-col gap-md pt-2px">'), _tmpl$82 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-actions-menu-panel absolute top-48px right-0 z-overlay flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">'), _tmpl$92 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-actions-menu relative flex min-w-0 items-center justify-center"><button type=button class="ehpeek-touch-gallery-actions-menu-button inline-flex w-md h-md items-center justify-center border-0 bg-transparent ehp-color-site-text"aria-haspopup=menu>'), _tmpl$0 = /* @__PURE__ */ template('<section class="ehpeek-touch-gallery-tag-group grid grid-cols-[minmax(76px,20%)_minmax(0,1fr)] gap-sm items-start"><div class="ehpeek-touch-gallery-tag-group-name min-h-sm overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[var(--color-site-elevated)] py-sm px-md text-center lowercase ehp-color-site-accent textsize-md font-600"></div><div class="ehpeek-touch-gallery-tags flex flex-wrap gap-sm">'), _tmpl$1 = /* @__PURE__ */ template('<button type=button class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md text-left cursor-pointer"role=menuitem><span class="w-24px text-center ehp-color-site-accent"aria-hidden=true>↺</span><span>'), _tmpl$102 = /* @__PURE__ */ template('<button type=button class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 border-t ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md text-left cursor-pointer"role=menuitem><span>'), _tmpl$112 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-tag-menu-dialog fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65"role=dialog aria-modal=true><div class="ehpeek-touch-gallery-tag-menu-panel box-border flex w-full max-w-420px max-h-[calc(100dvh-32px)] flex-col overflow-x-hidden overflow-y-auto whitespace-nowrap border ehp-color-site-border rounded-md ehp-color-site-elevated shadow-xl"role=menu><a class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-text no-underline font-inherit textsize-md text-left"role=menuitem><span></span></a><a class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 border-t ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text no-underline font-inherit textsize-md text-left cursor-pointer"target=_blank rel="noopener noreferrer"role=menuitem><span></span></a><button type=button class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-text font-inherit textsize-md text-left cursor-pointer"role=menuitem><span class="w-24px text-center ehp-color-site-accent textsize-lg leading-none"aria-hidden=true>+</span><span>'), _tmpl$12 = /* @__PURE__ */ template('<div class="fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65"role=dialog aria-modal=true><div class="box-border flex w-full max-w-420px flex-col gap-lg rounded-md border ehp-color-site-border ehp-color-site-elevated p-lg shadow-xl"><div class="ehp-color-site-text textsize-lg font-700"></div><label class="flex flex-col gap-sm ehp-color-site-text textsize-md font-600"><span></span><select class="box-border min-h-md w-full rounded-xs border ehp-color-site-border ehp-color-site-surface ehp-color-site-text px-md font-inherit textsize-md"></select></label><label class="flex flex-col gap-sm ehp-color-site-text textsize-md font-600"><span></span><select class="box-border min-h-md w-full rounded-xs border ehp-color-site-border ehp-color-site-surface ehp-color-site-text px-md font-inherit textsize-md"><option value=marked></option><option value=watched></option><option value=hidden></option></select></label><div class="grid grid-cols-2 gap-md"><button type=button class="min-h-md rounded-xs border-0 ehp-color-site-surface ehp-color-site-text font-inherit font-700 textsize-md cursor-pointer"></button><button type=button class="flex min-h-md items-center justify-center gap-md rounded-xs border-0 bg-[var(--color-site-accent)] text-[var(--color-background)] font-inherit font-700 textsize-md cursor-pointer"><span>'), _tmpl$13 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-tag-menu relative inline-flex max-w-full"><button type=button class="ehpeek-touch-gallery-tag inline-flex max-w-full min-h-lg items-center overflow-hidden text-ellipsis whitespace-nowrap appearance-none m-0 py-0 rounded-xl border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] px-lg ehp-color-site-text font-inherit font-700 textsize-md cursor-pointer select-none transition-[border-color,background-color,color] duration-120 hover:border-[var(--color-site-border)] hover:bg-[var(--color-site-accent-hover)] hover:ehp-color-site-accent"aria-haspopup=menu>'), _tmpl$14 = /* @__PURE__ */ template('<button type=button class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md text-left cursor-pointer"role=menuitem><span class="w-24px text-center ehp-color-site-accent"aria-hidden=true>↑</span><span>'), _tmpl$15 = /* @__PURE__ */ template('<button type=button class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md text-left cursor-pointer"role=menuitem><span class="w-24px text-center ehp-color-site-accent"aria-hidden=true>↓</span><span>'), _tmpl$16 = /* @__PURE__ */ template("<option>"), _tmpl$17 = /* @__PURE__ */ template('<span class="contents [&amp;_*]:!bg-transparent [&amp;_*]:!text-inherit"translate=no>'), _tmpl$18 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-favorite-panel absolute top-[calc(100%+8px)] left-0 z-overlay flex w-[min(86vw,360px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">'), _tmpl$19 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-favorite-menu relative z-2 min-w-0"><button type=button aria-haspopup=menu><span class="block leading-[1.15]"></span><span class="ehpeek-touch-gallery-favorite-icon block mt-2px opacity-78 normal-case"aria-hidden=true>'), _tmpl$20 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-favorite-loading flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md leading-[1.2] text-left">'), _tmpl$21 = /* @__PURE__ */ template('<button type=button><span class="ehpeek-touch-gallery-favorite-option-icon flex-none ehp-color-site-text"aria-hidden=true></span><span></span><span aria-hidden=true>'), TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS = "ehpeek-touch-gallery-actions-menu-item block box-border w-full min-h-lg py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline textsize-md leading-[1.2]", RATING_STAR_INDEXES = [0, 1, 2, 3, 4];
  function GalleryInfoPanel(props) {
    let rating = props.source.rating, hasCover = props.source.cover !== null, [ratingValue, setRatingValue] = createSignal(rating?.value ?? 0), [ratingPreview, setRatingPreview] = createSignal(null), [ratingPickerOpen, setRatingPickerOpen] = createSignal(!1), [ratingSubmitted, setRatingSubmitted] = createSignal(rating?.rated ?? !1), [ratingUpdating, setRatingUpdating] = createSignal(!1), [ratingCount, setRatingCount] = createSignal(rating?.count ?? ""), [ratingValueLabel, setRatingValueLabel] = createSignal(rating?.label ?? ""), [tagGroups, setTagGroups] = createSignal(props.source.tagGroups), [newTagVisible, setNewTagVisible] = createSignal(!1), displayedRating = createMemo(() => ratingPreview() ?? ratingValue()), ratingLabel = createMemo(() => ratingPreview() ? `Rate as ${ratingPreview().toFixed(1)} stars` : ratingValueLabel());
    onMount(() => {
      let stopObservingTags = observeGalleryTagChanges(() => {
        setTagGroups(readGalleryTagGroups());
      });
      onCleanup(stopObservingTags);
    }), onCleanup(() => props.onPrimaryActionUnmount());
    let submitRating = async (value) => {
      if (!rating || ratingUpdating())
        return !1;
      let tagApi = readGalleryTagApiInfo();
      if (!tagApi)
        return window.alert(texts_default.errors.loadFailed), !1;
      setRatingUpdating(!0);
      try {
        let result = await setGalleryRating(tagApi, value);
        return setRatingValue(result.value), setRatingCount(String(result.count)), setRatingValueLabel(formatRatingLabel(rating.label, result.average)), setRatingPreview(null), setRatingSubmitted(!0), !0;
      } catch (error) {
        return setRatingPreview(null), console.error("[ehpeek]", error), window.alert(error instanceof Error ? error.message : texts_default.errors.loadFailed), !1;
      } finally {
        setRatingUpdating(!1);
      }
    }, openNewTag = () => {
      let newTag = props.source.newTag;
      newTag && (setNewTagVisible(!0), queueMicrotask(() => focusGalleryNewTag(newTag)));
    };
    return (() => {
      var _el$ = _tmpl$26(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$5.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$2.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$0.nextSibling, _el$11 = _el$10.firstChild;
      return className(_el$3, `ehpeek-touch-gallery-summary grid gap-18px items-stretch ${hasCover ? "grid-cols-[minmax(120px,38%)_minmax(0,1fr)]" : "grid-cols-1"}`), insert(_el$3, hasCover && (() => {
        var _el$21 = _tmpl$35();
        return insert(_el$21, createComponent(DomNode, {
          get node() {
            return props.source.cover;
          }
        })), _el$21;
      })(), _el$4), insert(_el$6, () => props.source.titleMain), insert(_el$7, () => props.source.titleSub), insert(_el$9, () => props.source.category), insert(_el$8, rating && (() => {
        var _el$22 = _tmpl$44(), _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, _el$26 = _el$23.nextSibling, _el$27 = _el$26.firstChild;
        return _el$22.addEventListener("blur", () => {
          setRatingPreview(null);
        }), _el$22.addEventListener("pointerleave", () => {
          setRatingPreview(null);
        }), _el$22.$$click = () => {
          setRatingPreview(null), setRatingPickerOpen(!0);
        }, _el$23.$$pointermove = (event) => {
          event.pointerType === "mouse" && setRatingPreview(ratingFromPointer(event.clientX, event.currentTarget));
        }, insert(_el$24, () => RATING_STAR_INDEXES.map(() => createComponent(Icon, {
          name: "star"
        }))), insert(_el$25, () => RATING_STAR_INDEXES.map(() => createComponent(Icon, {
          name: "star",
          filled: !0
        }))), insert(_el$27, ratingLabel), insert(_el$26, (() => {
          var _c$2 = memo(() => !!ratingCount());
          return () => _c$2() && (() => {
            var _el$28 = _tmpl$53();
            return insert(_el$28, ratingCount), _el$28;
          })();
        })(), null), createRenderEffect((_p$) => {
          var _v$6 = ratingUpdating(), _v$7 = `ehpeek-touch-gallery-rating-stars-fill absolute top-0 left-0 flex gap-1px overflow-hidden ${ratingSubmitted() ? "text-[var(--color-accent)]" : "ehp-color-site-accent"}`, _v$8 = `${displayedRating() / 5 * 100}%`;
          return _v$6 !== _p$.e && (_el$22.disabled = _p$.e = _v$6), _v$7 !== _p$.t && className(_el$25, _p$.t = _v$7), _v$8 !== _p$.a && setStyleProperty(_el$25, "width", _p$.a = _v$8), _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        }), _el$22;
      })(), null), insert(_el$0, createComponent(TouchGalleryFavoriteButton, {
        get source() {
          return props.source.favorite;
        }
      }), _el$1), use((node) => {
        props.onPrimaryActionMount(node);
      }, _el$1), insert(_el$11, () => props.source.summary.map((item) => (() => {
        var _el$29 = _tmpl$62();
        return insert(_el$29, () => item.value), _el$29;
      })()), null), insert(_el$11, createComponent(TouchGalleryActionsMenu, {
        get actions() {
          return props.source.actions;
        }
      }), null), insert(_el$10, (() => {
        var _c$ = memo(() => tagGroups().length > 0);
        return () => _c$() && (() => {
          var _el$30 = _tmpl$72();
          return insert(_el$30, () => tagGroups().map((group) => createComponent(TouchGalleryTagGroup, {
            group,
            get onNewTagOpen() {
              return props.source.newTag ? openNewTag : void 0;
            }
          }))), _el$30;
        })();
      })(), null), insert(_el$10, createComponent(Show, {
        get when() {
          return memo(() => !!newTagVisible())() ? props.source.newTag : null;
        },
        keyed: !0,
        children: (newTag) => createComponent(TouchGalleryNewTag, {
          source: newTag
        })
      }), null), insert(_el$, createComponent(Show, {
        get when() {
          return ratingPickerOpen();
        },
        get children() {
          var _el$12 = _tmpl$11(), _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling;
          return _el$12.$$click = (event) => {
            event.target === event.currentTarget && (setRatingPreview(null), setRatingPickerOpen(!1));
          }, _el$15.$$click = (event) => {
            setRatingPreview(ratingFromPointer(event.clientX, event.currentTarget));
          }, insert(_el$16, () => RATING_STAR_INDEXES.map(() => createComponent(Icon, {
            name: "star",
            size: 48
          }))), insert(_el$17, () => RATING_STAR_INDEXES.map(() => createComponent(Icon, {
            name: "star",
            size: 48,
            filled: !0
          }))), _el$19.$$click = () => {
            submitRating(displayedRating()).then((submitted) => {
              submitted && setRatingPickerOpen(!1);
            });
          }, _el$20.$$click = () => {
            setRatingPreview(null), setRatingPickerOpen(!1);
          }, insert(_el$20, () => texts_default.settings.close), createRenderEffect((_p$) => {
            var _v$ = ratingUpdating(), _v$2 = `Rate gallery: ${displayedRating().toFixed(1)} stars`, _v$3 = `absolute top-0 left-0 flex gap-1px overflow-hidden pointer-events-none ${ratingSubmitted() ? "text-[var(--color-accent)]" : "ehp-color-site-accent"}`, _v$4 = `${displayedRating() / 5 * 100}%`, _v$5 = ratingUpdating();
            return _v$ !== _p$.e && (_el$15.disabled = _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$15, "aria-label", _p$.t = _v$2), _v$3 !== _p$.a && className(_el$17, _p$.a = _v$3), _v$4 !== _p$.o && setStyleProperty(_el$17, "width", _p$.o = _v$4), _v$5 !== _p$.i && (_el$19.disabled = _p$.i = _v$5), _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0,
            i: void 0
          }), _el$12;
        }
      }), null), createRenderEffect((_$p) => style(_el$9, props.source.categoryAppearance, _$p)), _el$;
    })();
  }
  function prepareGalleryInfoPanel() {
    applyTouchGalleryPanelPageStyle();
  }
  function TouchGalleryActionsMenu(props) {
    let [open, setOpen] = createSignal(!1), root;
    return onMount(() => {
      let onClick = (event) => {
        event.target instanceof Element && root.contains(event.target) || setOpen(!1);
      };
      document.addEventListener("click", onClick), onCleanup(() => {
        document.removeEventListener("click", onClick);
      });
    }), (() => {
      var _el$31 = _tmpl$92(), _el$32 = _el$31.firstChild, _ref$ = root;
      return typeof _ref$ == "function" ? use(_ref$, _el$31) : root = _el$31, _el$32.$$click = (event) => {
        event.stopPropagation(), setOpen((value) => !value);
      }, insert(_el$32, createComponent(Icon, {
        name: "menu"
      })), insert(_el$31, createComponent(Show, {
        get when() {
          return open();
        },
        get children() {
          var _el$33 = _tmpl$82();
          return insert(_el$33, createComponent(DomNodes, {
            get nodes() {
              return props.actions;
            },
            clone: !0
          })), _el$33;
        }
      }), null), createRenderEffect((_p$) => {
        var _v$9 = open(), _v$0 = texts_default.navigation.menu, _v$1 = texts_default.navigation.menu;
        return _v$9 !== _p$.e && setAttribute(_el$32, "aria-expanded", _p$.e = _v$9), _v$0 !== _p$.t && setAttribute(_el$32, "aria-label", _p$.t = _v$0), _v$1 !== _p$.a && setAttribute(_el$32, "title", _p$.a = _v$1), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$31;
    })();
  }
  function TouchGalleryTagGroup(props) {
    return (() => {
      var _el$34 = _tmpl$0(), _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling;
      return insert(_el$35, () => props.group.namespace), insert(_el$36, () => props.group.tags.map((tag) => createComponent(TouchGalleryTag, {
        tag,
        get onNewTagOpen() {
          return props.onNewTagOpen;
        }
      }))), _el$34;
    })();
  }
  function TouchGalleryTag(props) {
    let [open, setOpen] = createSignal(!1), [favoriteDialogOpen, setFavoriteDialogOpen] = createSignal(!1), tagSets = readCachedMyTagSetOptions(), [selectedTagSet, setSelectedTagSet] = createSignal(tagSets.find((option) => option.selected)?.value ?? tagSets[0]?.value ?? "1"), [tagMode, setTagMode] = createSignal("marked"), [updating, setUpdating] = createSignal(!1), root, closeMenu = () => setOpen(!1);
    onMount(() => {
      let onClick = (event) => {
        (!(event.target instanceof Element) || !root.contains(event.target)) && closeMenu();
      }, onKeyDown = (event) => {
        event.key === "Escape" && closeMenu();
      };
      document.addEventListener("click", onClick), document.addEventListener("keydown", onKeyDown), onCleanup(() => {
        document.removeEventListener("click", onClick), document.removeEventListener("keydown", onKeyDown);
      });
    });
    let runTagAction = async (action) => {
      closeMenu();
      let tagApi = readGalleryTagApiInfo();
      if (!tagApi) {
        console.error("[ehpeek] Gallery tag vote could not start", {
          action,
          pathname: window.location.pathname,
          reason: "gallery-api-context-unavailable"
        }), window.alert("Gallery API context is unavailable. Check the console for details.");
        return;
      }
      setUpdating(!0);
      try {
        await runGalleryTagAction(tagApi, props.tag, action);
      } catch (error) {
        console.error("[ehpeek] Gallery tag vote failed", {
          action,
          galleryId: tagApi.galleryId
        }, error), window.alert(error instanceof Error ? error.message : texts_default.errors.loadFailed);
      } finally {
        setUpdating(!1);
      }
    }, updateFavoriteTag = async () => {
      closeMenu(), setUpdating(!0);
      try {
        props.tag.myTag ? await removeGalleryTagFavorite(props.tag) : await favoriteGalleryTag(props.tag, selectedTagSet(), tagMode()), window.location.reload();
      } catch (error) {
        console.error("[ehpeek]", error), window.alert(error instanceof Error ? error.message : texts_default.errors.loadFailed);
      } finally {
        setUpdating(!1);
      }
    };
    return (() => {
      var _el$37 = _tmpl$13(), _el$38 = _el$37.firstChild, _ref$2 = root;
      return typeof _ref$2 == "function" ? use(_ref$2, _el$37) : root = _el$37, _el$38.$$click = () => setOpen((open2) => !open2), insert(_el$38, createComponent(TouchGalleryTagContent, {
        get tag() {
          return props.tag;
        }
      })), insert(_el$37, createComponent(Show, {
        get when() {
          return open();
        },
        get children() {
          var _el$39 = _tmpl$112(), _el$40 = _el$39.firstChild, _el$44 = _el$40.firstChild, _el$45 = _el$44.firstChild, _el$46 = _el$44.nextSibling, _el$47 = _el$46.firstChild, _el$50 = _el$46.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling;
          return _el$39.$$click = (event) => {
            event.target === event.currentTarget && closeMenu();
          }, _el$40.$$click = closeMenu, insert(_el$40, createComponent(Show, {
            get when() {
              return props.tag.vote !== null;
            },
            get fallback() {
              return [(() => {
                var _el$69 = _tmpl$14(), _el$70 = _el$69.firstChild, _el$71 = _el$70.nextSibling;
                return _el$69.$$click = () => {
                  runTagAction("voteUp");
                }, insert(_el$71, () => texts_default.gallery.voteUp), createRenderEffect(() => _el$69.disabled = updating()), _el$69;
              })(), (() => {
                var _el$72 = _tmpl$15(), _el$73 = _el$72.firstChild, _el$74 = _el$73.nextSibling;
                return _el$72.$$click = () => {
                  runTagAction("voteDown");
                }, insert(_el$74, () => texts_default.gallery.voteDown), createRenderEffect(() => _el$72.disabled = updating()), _el$72;
              })()];
            },
            get children() {
              var _el$41 = _tmpl$1(), _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling;
              return _el$41.$$click = () => {
                runTagAction("withdrawVote");
              }, insert(_el$43, () => texts_default.gallery.withdrawVote), createRenderEffect(() => _el$41.disabled = updating()), _el$41;
            }
          }), _el$44), _el$44.$$click = closeMenu, insert(_el$44, createComponent(Icon, {
            name: "search"
          }), _el$45), insert(_el$45, () => texts_default.gallery.showTaggedGalleries), _el$46.$$click = closeMenu, insert(_el$46, createComponent(Icon, {
            name: "external-link"
          }), _el$47), insert(_el$47, () => texts_default.gallery.showTagDefinition), insert(_el$40, createComponent(Show, {
            get when() {
              return !props.tag.myTag;
            },
            get fallback() {
              return (() => {
                var _el$75 = _tmpl$102(), _el$76 = _el$75.firstChild;
                return _el$75.$$click = () => {
                  updateFavoriteTag();
                }, insert(_el$75, createComponent(Icon, {
                  name: "heart",
                  filled: !0
                }), _el$76), insert(_el$76, () => texts_default.gallery.removeFavoriteTag), createRenderEffect(() => _el$75.disabled = updating()), _el$75;
              })();
            },
            get children() {
              var _el$48 = _tmpl$102(), _el$49 = _el$48.firstChild;
              return _el$48.$$click = () => {
                closeMenu(), setFavoriteDialogOpen(!0);
              }, insert(_el$48, createComponent(Icon, {
                name: "heart"
              }), _el$49), insert(_el$49, () => texts_default.gallery.favoriteTag), createRenderEffect(() => _el$48.disabled = updating()), _el$48;
            }
          }), _el$50), _el$50.$$click = () => {
            closeMenu(), props.onNewTagOpen?.();
          }, insert(_el$52, () => texts_default.gallery.addNewTag), createRenderEffect((_p$) => {
            var _v$10 = props.tag.label, _v$11 = props.tag.href, _v$12 = props.tag.definitionHref, _v$13 = !props.onNewTagOpen;
            return _v$10 !== _p$.e && setAttribute(_el$39, "aria-label", _p$.e = _v$10), _v$11 !== _p$.t && setAttribute(_el$44, "href", _p$.t = _v$11), _v$12 !== _p$.a && setAttribute(_el$46, "href", _p$.a = _v$12), _v$13 !== _p$.o && (_el$50.disabled = _p$.o = _v$13), _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0
          }), _el$39;
        }
      }), null), insert(_el$37, createComponent(Show, {
        get when() {
          return favoriteDialogOpen();
        },
        get children() {
          var _el$53 = _tmpl$12(), _el$54 = _el$53.firstChild, _el$55 = _el$54.firstChild, _el$56 = _el$55.nextSibling, _el$57 = _el$56.firstChild, _el$58 = _el$57.nextSibling, _el$59 = _el$56.nextSibling, _el$60 = _el$59.firstChild, _el$61 = _el$60.nextSibling, _el$62 = _el$61.firstChild, _el$63 = _el$62.nextSibling, _el$64 = _el$63.nextSibling, _el$65 = _el$59.nextSibling, _el$66 = _el$65.firstChild, _el$67 = _el$66.nextSibling, _el$68 = _el$67.firstChild;
          return _el$53.$$click = (event) => {
            event.target === event.currentTarget && setFavoriteDialogOpen(!1);
          }, insert(_el$55, () => texts_default.gallery.favoriteTag), insert(_el$57, () => texts_default.gallery.tagCollection), _el$58.addEventListener("change", (event) => setSelectedTagSet(event.currentTarget.value)), insert(_el$58, () => tagSets.map((option) => (() => {
            var _el$77 = _tmpl$16();
            return insert(_el$77, () => option.label), createRenderEffect(() => _el$77.value = option.value), _el$77;
          })())), insert(_el$60, () => texts_default.gallery.tagBehavior), _el$61.addEventListener("change", (event) => setTagMode(event.currentTarget.value)), insert(_el$62, () => texts_default.gallery.markTag), insert(_el$63, () => texts_default.gallery.watchTag), insert(_el$64, () => texts_default.gallery.hideTag), _el$66.$$click = () => setFavoriteDialogOpen(!1), insert(_el$66, () => texts_default.settings.close), _el$67.$$click = () => {
            updateFavoriteTag();
          }, insert(_el$67, createComponent(Icon, {
            name: "heart"
          }), _el$68), insert(_el$68, () => texts_default.text.confirm), createRenderEffect((_p$) => {
            var _v$14 = texts_default.gallery.favoriteTag, _v$15 = updating();
            return _v$14 !== _p$.e && setAttribute(_el$53, "aria-label", _p$.e = _v$14), _v$15 !== _p$.t && (_el$67.disabled = _p$.t = _v$15), _p$;
          }, {
            e: void 0,
            t: void 0
          }), createRenderEffect(() => _el$58.value = selectedTagSet()), createRenderEffect(() => _el$61.value = tagMode()), _el$53;
        }
      }), null), createRenderEffect((_p$) => {
        var _v$16 = props.tag.appearance.backgroundColor, _v$17 = props.tag.appearance.borderColor, _v$18 = props.tag.appearance.color, _v$19 = props.tag.label, _v$20 = open();
        return _v$16 !== _p$.e && setStyleProperty(_el$38, "background-color", _p$.e = _v$16), _v$17 !== _p$.t && setStyleProperty(_el$38, "border-color", _p$.t = _v$17), _v$18 !== _p$.a && setStyleProperty(_el$38, "color", _p$.a = _v$18), _v$19 !== _p$.o && setAttribute(_el$38, "aria-label", _p$.o = _v$19), _v$20 !== _p$.i && setAttribute(_el$38, "aria-expanded", _p$.i = _v$20), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      }), _el$37;
    })();
  }
  function TouchGalleryNewTag(props) {
    return onMount(() => {
      props.source.field = reuseTagTipInput(props.source.field), prepareGalleryNewTag(props.source);
    }), createComponent(DomNode, {
      get node() {
        return props.source.container;
      }
    });
  }
  function TouchGalleryTagContent(props) {
    let host;
    return onMount(() => {
      onCleanup(mirrorTranslatedContent(props.tag.contentSource, host));
    }), (() => {
      var _el$78 = _tmpl$17(), _ref$3 = host;
      return typeof _ref$3 == "function" ? use(_ref$3, _el$78) : host = _el$78, _el$78;
    })();
  }
  function TouchGalleryFavoriteButton(props) {
    let [favorite, setFavorite] = createSignal({
      ...props.source
    }), [open, setOpen] = createSignal(!1), [loadingState, setLoadingState] = createSignal("idle"), [options, setOptions] = createSignal([]), favorited = () => favorite().favorited, root;
    onMount(() => {
      let onClick = (event) => {
        event.target instanceof Element && root.contains(event.target) || setOpen(!1);
      };
      document.addEventListener("click", onClick), onCleanup(() => {
        document.removeEventListener("click", onClick);
      });
    });
    let openMenu = async () => {
      let currentFavorite = favorite();
      if (currentFavorite.actionUrl) {
        setOpen(!0), setLoadingState("loading");
        try {
          let response = await requestPage(currentFavorite.actionUrl);
          setOptions(parseGalleryFavoriteOptions(response.document, currentFavorite.favorited)), setLoadingState("idle");
        } catch (error) {
          console.error("[ehpeek]", error), setLoadingState("failed");
        }
      }
    };
    return (() => {
      var _el$79 = _tmpl$19(), _el$80 = _el$79.firstChild, _el$81 = _el$80.firstChild, _el$82 = _el$81.nextSibling, _ref$4 = root;
      return typeof _ref$4 == "function" ? use(_ref$4, _el$79) : root = _el$79, _el$80.$$click = (event) => {
        event.stopPropagation(), open() ? setOpen(!1) : openMenu();
      }, insert(_el$81, () => favorite().label), insert(_el$82, createComponent(Icon, {
        name: "heart",
        get filled() {
          return favorited();
        }
      })), insert(_el$79, createComponent(Show, {
        get when() {
          return open();
        },
        get children() {
          var _el$83 = _tmpl$18();
          return insert(_el$83, createComponent(Show, {
            get when() {
              return loadingState() === "loading";
            },
            get children() {
              return createComponent(TouchGalleryFavoriteStatus, {
                text: "Loading..."
              });
            }
          }), null), insert(_el$83, createComponent(Show, {
            get when() {
              return loadingState() === "failed";
            },
            get children() {
              return createComponent(TouchGalleryFavoriteStatus, {
                text: "Failed"
              });
            }
          }), null), insert(_el$83, createComponent(Show, {
            get when() {
              return loadingState() === "idle";
            },
            get children() {
              return createComponent(For, {
                get each() {
                  return options();
                },
                children: (option) => createComponent(TouchGalleryFavoriteOption, {
                  get actionUrl() {
                    return favorite().actionUrl;
                  },
                  option,
                  onApplied: () => {
                    setFavorite({
                      ...favorite(),
                      color: option.color,
                      favorited: option.value !== "favdel",
                      label: option.value === "favdel" ? "Not Favorited" : option.label
                    }), setOpen(!1);
                  }
                })
              });
            }
          }), null), _el$83;
        }
      }), null), createRenderEffect((_p$) => {
        var _v$21 = `ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-text text-center uppercase [touch-action:manipulation] textsize-md font-700 normal-case ${favorited() ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`, _v$22 = favorite().color ?? void 0, _v$23 = open();
        return _v$21 !== _p$.e && className(_el$80, _p$.e = _v$21), _v$22 !== _p$.t && setStyleProperty(_el$80, "color", _p$.t = _v$22), _v$23 !== _p$.a && setAttribute(_el$80, "aria-expanded", _p$.a = _v$23), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$79;
    })();
  }
  function TouchGalleryFavoriteStatus(props) {
    return (() => {
      var _el$84 = _tmpl$20();
      return insert(_el$84, () => props.text), _el$84;
    })();
  }
  function TouchGalleryFavoriteOption(props) {
    return (() => {
      var _el$85 = _tmpl$21(), _el$86 = _el$85.firstChild, _el$87 = _el$86.nextSibling, _el$88 = _el$87.nextSibling;
      return _el$85.$$click = (event) => {
        event.stopPropagation(), updateGalleryFavorite(props.actionUrl, props.option.value).then(props.onApplied).catch((error) => {
          console.error("[ehpeek]", error);
        });
      }, insert(_el$86, createComponent(Icon, {
        name: "heart",
        get filled() {
          return props.option.value !== "favdel";
        }
      })), insert(_el$87, () => props.option.label), insert(_el$88, createComponent(Icon, {
        name: "check"
      })), createRenderEffect((_p$) => {
        var _v$24 = `ehpeek-touch-gallery-favorite-option flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md leading-[1.2] text-left ${props.option.value === "favdel" ? "ehpeek-touch-gallery-favorite-option-remove" : ""}`, _v$25 = props.option.selected, _v$26 = props.option.color ?? void 0, _v$27 = `ml-auto flex-none ehp-color-site-text ${props.option.selected ? "visible" : "invisible"}`, _v$28 = props.option.color ?? void 0;
        return _v$24 !== _p$.e && className(_el$85, _p$.e = _v$24), _v$25 !== _p$.t && setAttribute(_el$85, "aria-pressed", _p$.t = _v$25), _v$26 !== _p$.a && setStyleProperty(_el$86, "color", _p$.a = _v$26), _v$27 !== _p$.o && className(_el$88, _p$.o = _v$27), _v$28 !== _p$.i && setStyleProperty(_el$88, "color", _p$.i = _v$28), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      }), _el$85;
    })();
  }
  function formatRatingLabel(label, value) {
    let formatted = value.toFixed(2);
    return /\d+(?:\.\d+)?/.test(label) ? label.replace(/\d+(?:\.\d+)?/, formatted) : `${label} ${formatted}`.trim();
  }
  function ratingFromPointer(clientX, element) {
    let rect = element.getBoundingClientRect(), progress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.max(0.5, Math.ceil(progress * 10) / 2);
  }
  delegateEvents(["click", "pointermove"]);

  // src/components/TouchUI/ResultsPanel.ts
  function prepareResultsPanel(page) {
    return page.type === "favorites" ? prepareTouchFavoritesPage() : (page.type === "search" && prepareTouchSearchResultsPage(), null);
  }
  function resetTouchUiPage() {
    resetTouchPageLayout();
  }

  // src/components/TouchUI/FavoritesPanel.tsx
  var _tmpl$27 = /* @__PURE__ */ template('<div class="border-0 border-t border-t-[var(--color-site-border-subtle)]">'), _tmpl$28 = /* @__PURE__ */ template('<div class="box-border w-full min-w-0 overflow-hidden rounded-md border ehp-color-site-border bg-[var(--color-site-elevated)]"><button type=button class="flex box-border w-full min-h-md items-center justify-between gap-md px-md py-sm rounded-xs border-0 !bg-transparent ehp-color-site-text text-left textsize-md font-700 font-inherit cursor-pointer hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)]"><span class="flex min-w-0 items-center gap-sm overflow-hidden"><span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"> [<!>]</span></span><span class="flex h-20px w-20px flex-none items-center justify-center leading-none"aria-hidden=true>'), _tmpl$36 = /* @__PURE__ */ template('<a><span class="flex min-w-0 items-center gap-sm"><span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"> [<!>]'), _tmpl$45 = /* @__PURE__ */ template('<span class="block h-15px w-15px flex-none bg-no-repeat"aria-hidden=true>');
  function FavoritesCategorySelect(props) {
    let container, [open, setOpen] = createSignal(!1), selected = () => props.info.categories.find((category) => category.selected) ?? props.info.categories[0];
    return onMount(() => {
      let closeOnOutsidePointer = (event) => {
        event.target instanceof Node && !container.contains(event.target) && setOpen(!1);
      };
      document.addEventListener("pointerdown", closeOnOutsidePointer, !0), onCleanup(() => document.removeEventListener("pointerdown", closeOnOutsidePointer, !0));
    }), (() => {
      var _el$ = _tmpl$28(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$7 = _el$5.nextSibling, _el$6 = _el$7.nextSibling, _el$8 = _el$3.nextSibling, _ref$ = container;
      return typeof _ref$ == "function" ? use(_ref$, _el$) : container = _el$, _el$2.$$click = () => setOpen((value) => !value), insert(_el$3, () => categoryIndicator(selected()?.appearance), _el$4), insert(_el$4, () => selected()?.label, _el$5), insert(_el$4, () => selected()?.count, _el$7), insert(_el$8, () => open() ? "−" : "+"), insert(_el$, createComponent(Show, {
        get when() {
          return open();
        },
        get children() {
          var _el$9 = _tmpl$27();
          return insert(_el$9, createComponent(For, {
            get each() {
              return props.info.categories;
            },
            children: (category) => (() => {
              var _el$0 = _tmpl$36(), _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$13 = _el$11.nextSibling, _el$12 = _el$13.nextSibling;
              return insert(_el$1, () => categoryIndicator(category.appearance), _el$10), insert(_el$10, () => category.label, _el$11), insert(_el$10, () => category.count, _el$13), createRenderEffect((_p$) => {
                var _v$3 = category.href, _v$4 = `flex box-border w-full min-h-md items-center px-md py-sm border-0 border-b ehp-color-site-border-subtle-b last:border-b-0 text-left textsize-md font-inherit no-underline cursor-pointer ${category.selected ? "bg-[var(--color-site-accent-hover)] ehp-color-site-accent font-700" : "!bg-transparent ehp-color-site-text hover:!bg-[var(--color-site-item-hover)]"}`;
                return _v$3 !== _p$.e && setAttribute(_el$0, "href", _p$.e = _v$3), _v$4 !== _p$.t && className(_el$0, _p$.t = _v$4), _p$;
              }, {
                e: void 0,
                t: void 0
              }), _el$0;
            })()
          })), _el$9;
        }
      }), null), createRenderEffect((_p$) => {
        var _v$ = open(), _v$2 = texts_default.favorites.categories;
        return _v$ !== _p$.e && setAttribute(_el$2, "aria-expanded", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$2, "aria-label", _p$.t = _v$2), _p$;
      }, {
        e: void 0,
        t: void 0
      }), _el$;
    })();
  }
  function categoryIndicator(appearance) {
    return (() => {
      var _el$14 = _tmpl$45();
      return createRenderEffect((_$p) => style(_el$14, appearance ? {
        "background-image": appearance.backgroundImage,
        "background-position": appearance.backgroundPosition,
        "background-size": appearance.backgroundSize
      } : void 0, _$p)), _el$14;
    })();
  }
  delegateEvents(["click"]);

  // src/components/TouchUI/SearchPanel.tsx
  var _tmpl$29 = /* @__PURE__ */ template('<section class="ehpeek-touch-search-panel box-border flex w-[calc(100%_-_32px)] max-w-960px flex-col gap-md mx-auto mb-lg p-lg border ehp-color-site-border rounded-lg ehp-color-site-surface ehp-color-site-text shadow-[0_8px_24px_var(--color-shadow-panel)] font-sans"><div class=contents></div><div class=contents>'), _tmpl$210 = /* @__PURE__ */ template('<button type=button class="appearance-none inline-flex min-h-md items-center px-md border-0 rounded-md bg-transparent ehp-color-site-accent text-left textsize-md font-700 font-inherit leading-[1.2] no-underline cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-accent-hover)]">'), _tmpl$37 = /* @__PURE__ */ template("<button>"), _tmpl$46 = /* @__PURE__ */ template('<span class="contents [&amp;>*:not([hidden])]:col-span-full">'), TOUCH_SEARCH_OPTION_CLASS = "appearance-none inline-flex min-h-md items-center px-md border-0 rounded-md bg-transparent ehp-color-site-accent text-left textsize-md font-700 font-inherit leading-[1.2] no-underline cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-accent-hover)]", TOUCH_SEARCH_ACTION_CLASS = "appearance-none inline-flex box-border w-60px h-60px items-center justify-center p-0 rounded-md border-0 bg-transparent cursor-pointer transition-[background-color,transform] duration-120 [touch-action:manipulation] active:scale-96 active:bg-[var(--color-site-item-hover)]";
  function prepareSearchPanel(source) {
    prepareTouchSearchPanel(source, TOUCH_SEARCH_OPTION_CLASS);
  }
  function TouchSearchPanel(props) {
    let searchBoxHost, fileSearchHost;
    return onMount(() => {
      searchBoxHost.replaceChildren(props.source.searchBox), props.source.fileSearch && fileSearchHost.replaceChildren(props.source.fileSearch);
    }), (() => {
      var _el$ = _tmpl$29(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _ref$ = searchBoxHost;
      typeof _ref$ == "function" ? use(_ref$, _el$2) : searchBoxHost = _el$2;
      var _ref$2 = fileSearchHost;
      return typeof _ref$2 == "function" ? use(_ref$2, _el$3) : fileSearchHost = _el$3, insert(_el$, () => props.after, null), _el$;
    })();
  }
  function TouchSearchCategoryToggle(props) {
    let [categoriesOpen, setCategoriesOpen] = createSignal(!1);
    return createEffect(() => {
      let open = categoriesOpen();
      props.categories.classList.toggle("hidden", !open), props.categories.hidden = !open, props.categories.setAttribute("aria-hidden", String(!open));
    }), (() => {
      var _el$4 = _tmpl$210();
      return _el$4.$$click = () => {
        setCategoriesOpen((open) => !open);
      }, insert(_el$4, () => texts_default.search.categories), createRenderEffect(() => setAttribute(_el$4, "aria-expanded", categoriesOpen())), _el$4;
    })();
  }
  function TouchSearchFileToggle(props) {
    let [fileSearchOpen, setFileSearchOpen] = createSignal(!1);
    return createEffect(() => {
      props.panel.hidden = !fileSearchOpen(), props.panel.style.display = fileSearchOpen() ? "" : "none";
    }), (() => {
      var _el$5 = _tmpl$210();
      return _el$5.$$click = () => {
        setFileSearchOpen((open) => !open);
      }, insert(_el$5, () => texts_default.search.fileSearch), createRenderEffect(() => setAttribute(_el$5, "aria-expanded", fileSearchOpen())), _el$5;
    })();
  }
  function TouchSearchAdvancedToggle(props) {
    let [advancedOpen, setAdvancedOpen] = createSignal(!1);
    return createEffect(() => {
      props.panel.hidden = !advancedOpen(), props.panel.style.display = advancedOpen() ? "" : "none";
    }), (() => {
      var _el$6 = _tmpl$210();
      return _el$6.$$click = () => {
        setAdvancedOpen((open) => !open);
      }, insert(_el$6, () => texts_default.search.advancedOptions), createRenderEffect(() => setAttribute(_el$6, "aria-expanded", advancedOpen())), _el$6;
    })();
  }
  function TouchSearchAction(props) {
    let originalHost, search = props.action === "search", original = props.original;
    return onMount(() => {
      original.hidden = !0, originalHost.replaceChildren(original);
    }), [(() => {
      var _el$7 = _tmpl$37();
      return _el$7.$$click = (event) => {
        if (search) {
          event.preventDefault(), props.source.form.requestSubmit(original);
          return;
        }
        props.source.searchInput.value = "", props.source.searchInput.dispatchEvent(new Event("input", {
          bubbles: !0
        })), props.source.searchInput.focus();
      }, setAttribute(_el$7, "type", search ? "submit" : "button"), insert(_el$7, createComponent(Icon, {
        name: search ? "search" : "close",
        size: 32
      })), createRenderEffect((_p$) => {
        var _v$ = search ? `${TOUCH_SEARCH_ACTION_CLASS} z-1 ${props.source.clearButton ? "col-start-3" : "col-start-2"} row-start-1 ehp-color-site-accent` : `${TOUCH_SEARCH_ACTION_CLASS} z-1 col-start-2 row-start-1 ehp-color-site-text`, _v$2 = props.label, _v$3 = props.label;
        return _v$ !== _p$.e && className(_el$7, _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$7, "aria-label", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$7, "title", _p$.a = _v$3), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$7;
    })(), (() => {
      var _el$8 = _tmpl$46(), _ref$3 = originalHost;
      return typeof _ref$3 == "function" ? use(_ref$3, _el$8) : originalHost = _el$8, _el$8;
    })()];
  }
  delegateEvents(["click"]);

  // src/components/TouchUI/TopBar.tsx
  var _tmpl$30 = /* @__PURE__ */ template('<div class="ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+8px)] right-0 z-overlay flex w-240px coarse:w-[calc(100vw-32px)] max-w-[calc(100vw-24px)] coarse:max-w-360px flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated"><div class=contents>'), _tmpl$211 = /* @__PURE__ */ template('<div class="ehpeek-touch-top-bar-menu relative"><button type=button class="ehpeek-touch-top-bar-menu-button inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"aria-haspopup=menu>'), _tmpl$38 = /* @__PURE__ */ template('<nav class="ehpeek-touch-top-bar relative z-ui flex box-border w-full min-h-xl items-center justify-between py-lg pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] ehp-color-site-surface ehp-color-site-text font-sans"><a class="ehpeek-touch-top-bar-project inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"></a><div class="flex items-center gap-sm"><a class="ehpeek-touch-top-bar-home inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"></a><a class="ehpeek-touch-top-bar-favorites inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"></a><button type=button class="ehpeek-touch-top-bar-settings inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]">'), TOUCH_TOP_BAR_ICON_SIZE = 41;
  var TOUCH_TOP_BAR_MENU_ITEM_CLASS = "ehpeek-touch-top-bar-menu-item block box-border w-full min-h-lg coarse:min-h-88px py-md coarse:py-xl px-lg coarse:px-xl border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline textsize-md leading-[1.2]";
  function TouchTopBarMenu(props) {
    let [open, setOpen] = createSignal(!1), root, navItemsHost;
    return createEffect(() => {
      !open() || !navItemsHost || navItemsHost.replaceChildren(...props.navItems.map((item) => item.cloneNode(!0)));
    }), onMount(() => {
      let onClick = (event) => {
        event.target instanceof Element && root.contains(event.target) || setOpen(!1);
      };
      document.addEventListener("click", onClick), onCleanup(() => {
        document.removeEventListener("click", onClick);
      });
    }), (() => {
      var _el$ = _tmpl$211(), _el$2 = _el$.firstChild, _ref$ = root;
      return typeof _ref$ == "function" ? use(_ref$, _el$) : root = _el$, _el$2.$$click = (event) => {
        event.stopPropagation(), setOpen((value) => !value);
      }, insert(_el$2, createComponent(Icon, {
        name: "menu",
        size: TOUCH_TOP_BAR_ICON_SIZE
      })), insert(_el$, createComponent(Show, {
        get when() {
          return open();
        },
        get children() {
          var _el$3 = _tmpl$30(), _el$4 = _el$3.firstChild, _ref$2 = navItemsHost;
          return typeof _ref$2 == "function" ? use(_ref$2, _el$4) : navItemsHost = _el$4, _el$3;
        }
      }), null), createRenderEffect((_p$) => {
        var _v$ = open(), _v$2 = texts_default.navigation.menu, _v$3 = texts_default.navigation.menu;
        return _v$ !== _p$.e && setAttribute(_el$2, "aria-expanded", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$2, "aria-label", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$2, "title", _p$.a = _v$3), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$;
    })();
  }
  function TouchTopBar(props) {
    return (() => {
      var _el$5 = _tmpl$38(), _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling, _el$0 = _el$9.nextSibling;
      return insert(_el$6, createComponent(Icon, {
        name: "panda-peek",
        size: 58,
        strokeWidth: 1.8
      })), insert(_el$8, createComponent(Icon, {
        name: "home",
        size: TOUCH_TOP_BAR_ICON_SIZE
      })), insert(_el$9, createComponent(Icon, {
        name: "heart",
        size: TOUCH_TOP_BAR_ICON_SIZE
      })), _el$0.$$click = (event) => {
        event.stopPropagation(), props.onSettingsMenuOpen();
      }, insert(_el$0, createComponent(Icon, {
        name: "settings",
        size: TOUCH_TOP_BAR_ICON_SIZE
      })), insert(_el$7, createComponent(TouchTopBarMenu, {
        get navItems() {
          return props.info.navItems;
        }
      }), null), createRenderEffect((_p$) => {
        var _v$4 = props.info.homeHref, _v$5 = texts_default.navigation.home, _v$6 = texts_default.navigation.home, _v$7 = props.info.homeHref, _v$8 = texts_default.navigation.home, _v$9 = texts_default.navigation.home, _v$0 = props.info.favoritesHref, _v$1 = texts_default.navigation.favorites, _v$10 = texts_default.navigation.favorites, _v$11 = texts_default.settings.openSettings, _v$12 = texts_default.settings.openSettings;
        return _v$4 !== _p$.e && setAttribute(_el$6, "href", _p$.e = _v$4), _v$5 !== _p$.t && setAttribute(_el$6, "aria-label", _p$.t = _v$5), _v$6 !== _p$.a && setAttribute(_el$6, "title", _p$.a = _v$6), _v$7 !== _p$.o && setAttribute(_el$8, "href", _p$.o = _v$7), _v$8 !== _p$.i && setAttribute(_el$8, "aria-label", _p$.i = _v$8), _v$9 !== _p$.n && setAttribute(_el$8, "title", _p$.n = _v$9), _v$0 !== _p$.s && setAttribute(_el$9, "href", _p$.s = _v$0), _v$1 !== _p$.h && setAttribute(_el$9, "aria-label", _p$.h = _v$1), _v$10 !== _p$.r && setAttribute(_el$9, "title", _p$.r = _v$10), _v$11 !== _p$.d && setAttribute(_el$0, "aria-label", _p$.d = _v$11), _v$12 !== _p$.l && setAttribute(_el$0, "title", _p$.l = _v$12), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0,
        s: void 0,
        h: void 0,
        r: void 0,
        d: void 0,
        l: void 0
      }), _el$5;
    })();
  }
  delegateEvents(["click"]);

  // src/components/TouchUI/index.ts
  function prepareTouchGalleryPage() {
    prepareGalleryInfoPanel(), prepareCommentsPanel();
  }
  function prepareTouchResultsPage(page) {
    return prepareResultsPanel(page);
  }

  // src/state/index.ts
  var state = {
    app: {
      singlePage: persisted("ehpeek:single-page-app:enabled", !0)
    },
    reader: {
      enabled: persisted("ehpeek:reader:enabled", !0),
      fullscreen: persisted("ehpeek:reader:fullscreen", prefersTouchFullscreen()),
      viewMode: persisted("ehpeek:reader:view-mode", "scroll"),
      readDirection: persisted("ehpeek:reader:read-direction", "rtl"),
      rightTapAction: persisted("ehpeek:reader:right-tap-action", "previous")
    },
    gallery: {
      enhanceThumbs: persisted("ehpeek:enhance-thumbs:enabled", !0),
      myTags: persisted("ehpeek:my-tags:enabled", !0),
      readHistory: persisted("ehpeek:read-history:enabled", !0)
    },
    search: {
      enhance: persisted("ehpeek:enhance-search:enabled", !0),
      grid: localSelection("ehpeek:search-grid", "ehpeek"),
      history: persisted("ehpeek:search-history:enabled", !0)
    },
    touch: {
      enabled: persisted("ehpeek:touch-ui:enabled", !0)
    }
  };
  function prefersTouchFullscreen() {
    return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  }
  function persisted(key, defaultValue) {
    let item = {
      key,
      defaultValue,
      value: GM_getValue(key, defaultValue),
      set(value) {
        item.value = value, GM_setValue(key, value);
      },
      reload() {
        return item.value = GM_getValue(key, defaultValue), item.value;
      }
    };
    return item;
  }
  function localSelection(key, selectedValue) {
    let read = () => window.localStorage.getItem(key) === selectedValue, item = {
      key,
      defaultValue: !1,
      value: read(),
      set(value) {
        item.value = value, value ? window.localStorage.setItem(key, selectedValue) : window.localStorage.removeItem(key);
      },
      reload() {
        return item.value = read(), item.value;
      }
    };
    return item;
  }

  // ehpeek-uno-css:ehpeek:uno.css
  var ehpeek_uno_default = `/* layer: preflights */
*,::before,::after{--un-rotate:0;--un-rotate-x:0;--un-rotate-y:0;--un-rotate-z:0;--un-scale-x:1;--un-scale-y:1;--un-scale-z:1;--un-skew-x:0;--un-skew-y:0;--un-translate-x:0;--un-translate-y:0;--un-translate-z:0;--un-pan-x: ;--un-pan-y: ;--un-pinch-zoom: ;--un-scroll-snap-strictness:proximity;--un-ordinal: ;--un-slashed-zero: ;--un-numeric-figure: ;--un-numeric-spacing: ;--un-numeric-fraction: ;--un-border-spacing-x:0;--un-border-spacing-y:0;--un-ring-offset-shadow:0 0 rgb(0 0 0 / 0);--un-ring-shadow:0 0 rgb(0 0 0 / 0);--un-shadow-inset: ;--un-shadow:0 0 rgb(0 0 0 / 0);--un-ring-inset: ;--un-ring-offset-width:0px;--un-ring-offset-color:#fff;--un-ring-width:0px;--un-ring-color:rgb(147 197 253 / 0.5);--un-blur: ;--un-brightness: ;--un-contrast: ;--un-drop-shadow: ;--un-grayscale: ;--un-hue-rotate: ;--un-invert: ;--un-saturate: ;--un-sepia: ;--un-backdrop-blur: ;--un-backdrop-brightness: ;--un-backdrop-contrast: ;--un-backdrop-grayscale: ;--un-backdrop-hue-rotate: ;--un-backdrop-invert: ;--un-backdrop-opacity: ;--un-backdrop-saturate: ;--un-backdrop-sepia: ;}::backdrop{--un-rotate:0;--un-rotate-x:0;--un-rotate-y:0;--un-rotate-z:0;--un-scale-x:1;--un-scale-y:1;--un-scale-z:1;--un-skew-x:0;--un-skew-y:0;--un-translate-x:0;--un-translate-y:0;--un-translate-z:0;--un-pan-x: ;--un-pan-y: ;--un-pinch-zoom: ;--un-scroll-snap-strictness:proximity;--un-ordinal: ;--un-slashed-zero: ;--un-numeric-figure: ;--un-numeric-spacing: ;--un-numeric-fraction: ;--un-border-spacing-x:0;--un-border-spacing-y:0;--un-ring-offset-shadow:0 0 rgb(0 0 0 / 0);--un-ring-shadow:0 0 rgb(0 0 0 / 0);--un-shadow-inset: ;--un-shadow:0 0 rgb(0 0 0 / 0);--un-ring-inset: ;--un-ring-offset-width:0px;--un-ring-offset-color:#fff;--un-ring-width:0px;--un-ring-color:rgb(147 197 253 / 0.5);--un-blur: ;--un-brightness: ;--un-contrast: ;--un-drop-shadow: ;--un-grayscale: ;--un-hue-rotate: ;--un-invert: ;--un-saturate: ;--un-sepia: ;--un-backdrop-blur: ;--un-backdrop-brightness: ;--un-backdrop-contrast: ;--un-backdrop-grayscale: ;--un-backdrop-hue-rotate: ;--un-backdrop-invert: ;--un-backdrop-opacity: ;--un-backdrop-saturate: ;--un-backdrop-sepia: ;}
/* layer: shortcuts */
.scrollbar-hidden{scrollbar-width:none;-ms-overflow-style:none;}
.container{width:100%;}
.container\\!{width:100% !important;}
.z-overlay{z-index:1100;}
.z-reader{z-index:1200;}
.z-ui{z-index:1000;}
.mb-lg{margin-bottom:16px;}
.mb-md{margin-bottom:12px;}
.mb-xs{margin-bottom:4px;}
.ml-md{margin-left:12px;}
.mt-md{margin-top:12px;}
.mt-xs{margin-top:4px;}
.scrollbar-hidden::-webkit-scrollbar{display:none;}
.\\!h-lg{height:52px !important;}
.h-lg{height:52px;}
.h-md{height:40px;}
html[data-ehpeek-touch-ui="true"] .touch\\:\\!h-md{height:40px !important;}
.\\!h-sm{height:32px !important;}
.h-sm{height:32px;}
.h-xs{height:24px;}
.\\[\\&_\\.auto-complete-item\\]\\:min-h-lg .auto-complete-item,
.min-h-lg{min-height:52px;}
.min-h-md{min-height:40px;}
.min-h-sm{min-height:32px;}
.min-h-xl{min-height:80px;}
.w-lg{width:52px;}
.w-md{width:40px;}
html[data-ehpeek-touch-ui="true"] .touch\\:\\!w-md{width:40px !important;}
.\\!w-sm{width:32px !important;}
.w-sm{width:32px;}
.w-xs{width:24px;}
.gap-lg{gap:16px;}
.gap-md{gap:12px;}
.\\[\\&_\\.searchadv\\>div\\]\\:\\!gap-sm .searchadv>div{gap:8px !important;}
.\\[\\&_form\\]\\:gap-sm form,
.gap-sm{gap:8px;}
.gap-xl{gap:24px;}
.gap-xs{gap:4px;}
.gap-x-lg{column-gap:16px;}
.gap-x-md{column-gap:12px;}
.gap-y-md{row-gap:12px;}
.gap-y-sm{row-gap:8px;}
.ehp-color-site-border{border-color:var(--color-site-border);}
.ehp-color-spinner{border-color:var(--color-border);border-top-color:var(--color-accent);}
.ehp-color-site-border-subtle-b{border-bottom-color:var(--color-site-border-subtle);}
.rounded-lg{border-radius:8px;}
.rounded-md,
html[data-ehpeek-touch-ui="true"] .touch\\:rounded-md{border-radius:6px;}
.rounded-sm{border-radius:4px;}
.rounded-xl{border-radius:10px;}
.rounded-xs{border-radius:3px;}
.focus-visible\\:rounded-xs:focus-visible{border-radius:3px;}
.ehp-color-reader{background-color:var(--color-background);color:var(--color-text);}
.ehp-color-site-elevated{background-color:var(--color-site-elevated);--un-shadow:0 8px 24px var(--un-shadow-color, var(--color-shadow-elevated));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.ehp-color-site-page{background-color:var(--color-site-page);}
.ehp-color-site-surface{background-color:var(--color-site-surface);}
.p-lg{padding:16px;}
.p-md{padding:12px;}
.\\[\\&_\\.searchadv\\>div\\>div\\]\\:\\!p-sm .searchadv>div>div{padding:8px !important;}
.p-sm{padding:8px;}
.p-xl{padding:24px;}
.\\[\\&_\\.auto-complete-item\\]\\:\\!px-lg .auto-complete-item{padding-left:16px !important;padding-right:16px !important;}
.px-lg{padding-left:16px;padding-right:16px;}
.px-md{padding-left:12px;padding-right:12px;}
.px-sm{padding-left:8px;padding-right:8px;}
.py-lg{padding-top:16px;padding-bottom:16px;}
.py-md{padding-top:12px;padding-bottom:12px;}
.\\!py-sm,
.\\[\\&_\\.auto-complete-item\\]\\:\\!py-sm .auto-complete-item{padding-top:8px !important;padding-bottom:8px !important;}
.py-sm{padding-top:8px;padding-bottom:8px;}
.py-xs{padding-top:4px;padding-bottom:4px;}
.pb-lg{padding-bottom:16px;}
.pb-md{padding-bottom:12px;}
.pb-sm{padding-bottom:8px;}
.pb-xs{padding-bottom:4px;}
.\\!pl-lg{padding-left:16px !important;}
.pl-md{padding-left:12px;}
.pr-sm{padding-right:8px;}
.pt-lg{padding-top:16px;}
.\\[\\&_\\.searchadv\\]\\:\\!pt-md .searchadv{padding-top:12px !important;}
.pt-md{padding-top:12px;}
.pt-xl{padding-top:24px;}
.textsize-lg{font-size:var(--font-size-lg);}
.\\!textsize-md,
.\\[\\&_\\.searchadv\\]\\:\\!textsize-md .searchadv{font-size:var(--font-size-md) !important;}
.textsize-md{font-size:var(--font-size-md);}
.textsize-sm{font-size:var(--font-size-sm);}
.textsize-xl{font-size:var(--font-size-xl);}
.ehp-color-site-accent{color:var(--color-site-accent);}
.ehp-color-site-text{color:var(--color-site-text);}
.ehp-color-text{color:var(--color-text);}
.hover\\:ehp-color-site-accent:hover{color:var(--color-site-accent);}
@media (pointer: coarse){
.coarse\\:gap-lg{gap:16px;}
.coarse\\:gap-xl{gap:24px;}
.coarse\\:rounded-lg{border-radius:8px;}
.coarse\\:p-md{padding:12px;}
.coarse\\:px-lg{padding-left:16px;padding-right:16px;}
.coarse\\:px-xl{padding-left:24px;padding-right:24px;}
.coarse\\:py-lg{padding-top:16px;padding-bottom:16px;}
.coarse\\:py-md{padding-top:12px;padding-bottom:12px;}
.coarse\\:py-xl{padding-top:24px;padding-bottom:24px;}
}
@media (min-width: 640px){
.container{max-width:640px;}
.container\\!{max-width:640px !important;}
}
@media (min-width: 768px){
.container{max-width:768px;}
.container\\!{max-width:768px !important;}
}
@media (min-width: 1024px){
.container{max-width:1024px;}
.container\\!{max-width:1024px !important;}
}
@media (min-width: 1280px){
.container{max-width:1280px;}
.container\\!{max-width:1280px !important;}
}
@media (min-width: 1536px){
.container{max-width:1536px;}
.container\\!{max-width:1536px !important;}
}
/* layer: default */
.\\[--progress-bar-fill\\:0\\%\\]{--progress-bar-fill:0%;}
.\\[--progress-bar-track-direction\\:to_right\\]{--progress-bar-track-direction:to right;}
.\\[-webkit-appearance\\:none\\]{-webkit-appearance:none;}
.\\[-webkit-tap-highlight-color\\:transparent\\]{-webkit-tap-highlight-color:transparent;}
.\\[-webkit-user-drag\\:none\\]{-webkit-user-drag:none;}
.\\[accent-color\\:var\\(--color-text\\)\\]{accent-color:var(--color-text);}
.\\[appearance\\:none\\]{appearance:none;}
.\\[contain\\:inline-size\\]{contain:inline-size;}
.\\[direction\\:ltr\\]{direction:ltr;}
.\\[font-variant-numeric\\:tabular-nums\\]{font-variant-numeric:tabular-nums;}
.\\[overflow-wrap\\:anywhere\\],
.break-anywhere{overflow-wrap:anywhere;}
.\\[touch-action\\:manipulation\\]{touch-action:manipulation;}
.\\[touch-action\\:none\\],
.touch-none,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:touch-none{touch-action:none;}
.\\[unicode-bidi\\:plaintext\\]{unicode-bidi:plaintext;}
.pointer-events-auto{pointer-events:auto;}
.\\[\\&\\[data-open\\=false\\]\\]\\:pointer-events-none[data-open=false],
.pointer-events-none{pointer-events:none;}
.visible{visibility:visible;}
.invisible{visibility:hidden;}
.absolute{position:absolute;}
.fixed{position:fixed;}
.relative{position:relative;}
.static{position:static;}
.inset-0{inset:0;}
.bottom-\\[calc\\(12px\\+env\\(safe-area-inset-bottom\\,0px\\)\\)\\]{bottom:calc(12px + env(safe-area-inset-bottom,0px));}
.bottom-\\[calc\\(max\\(16px\\,env\\(safe-area-inset-bottom\\,0px\\)\\)_\\+_64px\\)\\]{bottom:calc(max(16px,env(safe-area-inset-bottom,0px)) + 64px);}
.left-\\[max\\(10px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{left:max(10px,env(safe-area-inset-left,0px));}
.left-\\[max\\(12px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{left:max(12px,env(safe-area-inset-left,0px));}
.left-0{left:0;}
.left-1\\/2{left:50%;}
.right-\\[max\\(12px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{right:max(12px,env(safe-area-inset-right,0px));}
.right-\\[max\\(16px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{right:max(16px,env(safe-area-inset-right,0px));}
.right-0{right:0;}
.right-10px{right:10px;}
.right-24px{right:24px;}
.right-auto{right:auto;}
.top-\\[calc\\(100\\%\\+8px\\)\\]{top:calc(100% + 8px);}
.top-\\[calc\\(10px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(10px + env(safe-area-inset-top,0px));}
.top-\\[calc\\(70px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(70px + env(safe-area-inset-top,0px));}
.top-0{top:0;}
.top-1\\/2{top:50%;}
.top-24px{top:24px;}
.top-48px{top:48px;}
.line-clamp-2{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;}
.line-clamp-3{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;}
.line-clamp-4{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;line-clamp:4;}
.isolate{isolation:isolate;}
.z-\\[1150\\]{z-index:1150;}
.z-1{z-index:1;}
.z-2{z-index:2;}
.z-3{z-index:3;}
.z-4{z-index:4;}
.grid{display:grid;}
.\\[\\&\\>\\*\\:not\\(\\[hidden\\]\\)\\]\\:col-span-full>*:not([hidden]),
.col-span-full{grid-column:1/-1;}
.col-start-2{grid-column-start:2;}
.col-start-3{grid-column-start:3;}
.row-start-1{grid-row-start:1;}
.grid-cols-\\[1fr_1fr\\]{grid-template-columns:1fr 1fr;}
.grid-cols-\\[minmax\\(0\\,1fr\\)_60px_60px\\]{grid-template-columns:minmax(0,1fr) 60px 60px;}
.grid-cols-\\[minmax\\(0\\,1fr\\)_60px\\]{grid-template-columns:minmax(0,1fr) 60px;}
.grid-cols-\\[minmax\\(0\\,35fr\\)_minmax\\(0\\,65fr\\)\\]{grid-template-columns:minmax(0,35fr) minmax(0,65fr);}
.grid-cols-\\[minmax\\(120px\\,38\\%\\)_minmax\\(0\\,1fr\\)\\]{grid-template-columns:minmax(120px,38%) minmax(0,1fr);}
.grid-cols-\\[minmax\\(76px\\,20\\%\\)_minmax\\(0\\,1fr\\)\\]{grid-template-columns:minmax(76px,20%) minmax(0,1fr);}
.grid-cols-\\[repeat\\(3\\,minmax\\(0\\,1fr\\)\\)\\],
.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr));}
.grid-cols-\\[repeat\\(auto-fit\\,minmax\\(140px\\,1fr\\)\\)\\]{grid-template-columns:repeat(auto-fit,minmax(140px,1fr));}
.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr));}
.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr));}
.\\!m-0{margin:0 !important;}
.m-0{margin:0;}
.m12{margin:3rem;}
.m15{margin:3.75rem;}
.m16\\.2{margin:4.05rem;}
.m17{margin:4.25rem;}
.m20{margin:5rem;}
.m3{margin:0.75rem;}
.m5{margin:1.25rem;}
.m7{margin:1.75rem;}
.m8{margin:2rem;}
.m9{margin:2.25rem;}
.mx-auto{margin-left:auto;margin-right:auto;}
.\\!mt-0{margin-top:0 !important;}
.mb-0{margin-bottom:0;}
.mb-10px{margin-bottom:10px;}
.ml-\\[max\\(14px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{margin-left:max(14px,env(safe-area-inset-left,0px));}
.ml-auto{margin-left:auto;}
.mr-\\[max\\(14px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{margin-right:max(14px,env(safe-area-inset-right,0px));}
.mt--18px{margin-top:-18px;}
.mt-0{margin-top:0;}
.mt-1px{margin-top:1px;}
.mt-2px{margin-top:2px;}
.mt-auto{margin-top:auto;}
.\\!box-border{box-sizing:border-box !important;}
.\\[\\&_\\.auto-complete-item\\]\\:box-border .auto-complete-item,
.\\[\\&_\\.searchadv\\]\\:box-border .searchadv,
.box-border{box-sizing:border-box;}
.block{display:block;}
.inline-block{display:inline-block;}
.contents{display:contents;}
.\\!hidden{display:none !important;}
.hidden{display:none;}
.aspect-\\[2\\/3\\]{aspect-ratio:2/3;}
.\\!h-60px{height:60px !important;}
.\\!max-h-\\[60dvh\\]{max-height:60dvh !important;}
.\\!max-w-full{max-width:100% !important;}
.\\!min-w-0{min-width:0 !important;}
.\\!w-full,
.\\[\\&_\\.searchadv\\]\\:\\!w-full .searchadv{width:100% !important;}
.h-\\[2\\.4em\\]{height:2.4em;}
.h-\\[var\\(--reader-frame-height\\)\\]{height:var(--reader-frame-height);}
.h-\\[var\\(--reader-page-height\\)\\]{height:var(--reader-page-height);}
.h-108px{height:108px;}
.h-10px{height:10px;}
.h-15px{height:15px;}
.h-20px{height:20px;}
.h-48px{height:48px;}
.h-4px{height:4px;}
.h-60px{height:60px;}
.h-64px{height:64px;}
.h-68px{height:68px;}
.h-full,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:h-full{height:100%;}
.h1{height:0.25rem;}
.max-h-\\[60dvh\\]{max-height:60dvh;}
.max-h-\\[calc\\(100dvh-32px\\)\\]{max-height:calc(100dvh - 32px);}
.max-h-\\[calc\\(100vh-48px\\)\\]{max-height:calc(100vh - 48px);}
.max-h-full{max-height:100%;}
.max-h-screen{max-height:100vh;}
.max-w-\\[calc\\(100vw-24px\\)\\]{max-width:calc(100vw - 24px);}
.max-w-\\[calc\\(100vw-48px\\)\\]{max-width:calc(100vw - 48px);}
.max-w-\\[min\\(420px\\,calc\\(100vw-24px\\)\\)\\]{max-width:min(420px,calc(100vw - 24px));}
.max-w-\\[min\\(78vw\\,320px\\)\\]{max-width:min(78vw,320px);}
.max-w-\\[min\\(86vw\\,760px\\)\\]{max-width:min(86vw,760px);}
.max-w-420px{max-width:420px;}
.max-w-960px{max-width:960px;}
.max-w-full{max-width:100%;}
.max-w-none{max-width:none;}
.max-w-screen{max-width:100vw;}
.min-h-\\[clamp\\(260px\\,42vh\\,340px\\)\\]{min-height:clamp(260px,42vh,340px);}
.min-h-87px{min-height:87px;}
.min-h-full{min-height:100%;}
.min-w-0{min-width:0;}
.min-w-285px{min-width:285px;}
.min-w-48px{min-width:48px;}
.min-w-64px{min-width:64px;}
.w-\\[calc\\(100\\%_-_32px\\)\\]{width:calc(100% - 32px);}
.w-\\[min\\(86vw\\,360px\\)\\]{width:min(86vw,360px);}
.w-\\[min\\(92vw\\,420px\\)\\]{width:min(92vw,420px);}
.w-\\[var\\(--reader-frame-width\\)\\]{width:var(--reader-frame-width);}
.w-1\\/2{width:50%;}
.w-10px{width:10px;}
.w-15px{width:15px;}
.w-20px{width:20px;}
.w-240px{width:240px;}
.w-24px{width:24px;}
.w-320px{width:320px;}
.w-32px{width:32px;}
.w-42px{width:42px;}
.w-60px{width:60px;}
.w-64px{width:64px;}
.w-68px{width:68px;}
.w-full,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:w-full{width:100%;}
.w-max{width:max-content;}
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:min-h-0{min-height:0;}
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:w-auto{width:auto;}
.\\[\\&_form\\]\\:flex form,
.flex{display:flex;}
.inline-flex{display:inline-flex;}
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:flex-\\[0_0_100\\%\\]{flex:0 0 100%;}
.flex-1{flex:1 1 0%;}
.flex-none{flex:none;}
.flex-row,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:flex-row{flex-direction:row;}
.\\[\\&_form\\]\\:flex-col form,
.flex-col{flex-direction:column;}
.\\[\\&_\\.searchadv\\>div\\]\\:\\!flex-wrap .searchadv>div{flex-wrap:wrap !important;}
.flex-wrap{flex-wrap:wrap;}
.table{display:table;}
.border-collapse{border-collapse:collapse;}
.border-separate{border-collapse:separate;}
.border-spacing-4px{--un-border-spacing-x:4px;--un-border-spacing-y:4px;border-spacing:var(--un-border-spacing-x) var(--un-border-spacing-y);}
html[data-ehpeek-touch-ui="true"] .touch\\:border-spacing-6px{--un-border-spacing-x:6px;--un-border-spacing-y:6px;border-spacing:var(--un-border-spacing-x) var(--un-border-spacing-y);}
.origin-center{transform-origin:center;}
.-translate-x-1\\/2{--un-translate-x:-50%;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.-translate-y-1\\/2{--un-translate-y:-50%;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.\\[\\&\\[data-open\\=false\\]\\]\\:translate-y-\\[calc\\(100\\%\\+16px\\)\\][data-open=false]{--un-translate-y:calc(100% + 16px);transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.active\\:scale-96:active{--un-scale-x:0.96;--un-scale-y:0.96;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.active\\:scale-98:active{--un-scale-x:0.98;--un-scale-y:0.98;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.transform{transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
@keyframes pulse{0%, 100% {opacity:1} 50% {opacity:.5}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.animate-pulse{animation:pulse 2s cubic-bezier(0.4,0,.6,1) infinite;}
.animate-spin{animation:spin 1s linear infinite;}
.cursor-default{cursor:default;}
.disabled\\:cursor-default:disabled{cursor:default;}
.cursor-pointer{cursor:pointer;}
.cursor-not-allowed{cursor:not-allowed;}
.cursor-grab{cursor:grab;}
.\\[\\&\\[data-dragging\\=true\\]\\]\\:cursor-grabbing[data-dragging=true]{cursor:grabbing;}
.active\\:cursor-grabbing:active{cursor:grabbing;}
.touch-pan-y{--un-pan-y:pan-y;touch-action:var(--un-pan-x) var(--un-pan-y) var(--un-pinch-zoom);}
.\\[\\&\\[data-dragging\\=true\\]\\]\\:select-none[data-dragging=true],
.select-none,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:select-none{-webkit-user-select:none;user-select:none;}
.resize{resize:both;}
.appearance-none{-webkit-appearance:none;appearance:none;}
.items-start{align-items:flex-start;}
.items-center,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:items-center{align-items:center;}
.items-stretch{align-items:stretch;}
.self-center{align-self:center;}
.self-stretch{align-self:stretch;}
.\\[\\&_\\.searchadv\\>div\\]\\:\\!justify-start .searchadv>div{justify-content:flex-start !important;}
.justify-start{justify-content:flex-start;}
.justify-end{justify-content:flex-end;}
.justify-center{justify-content:center;}
.justify-between{justify-content:space-between;}
.justify-self-stretch{justify-self:stretch;}
.gap-0{gap:0;}
.gap-18px{gap:18px;}
.gap-1px{gap:1px;}
.gap-4px{gap:4px;}
.gap-6px{gap:6px;}
.gap-8px{gap:8px;}
.overflow-auto{overflow:auto;}
.overflow-hidden,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:overflow-hidden{overflow:hidden;}
.overflow-visible{overflow:visible;}
.\\!overflow-x-hidden{overflow-x:hidden !important;}
.overflow-x-auto{overflow-x:auto;}
.overflow-x-hidden{overflow-x:hidden;}
.overflow-y-auto{overflow-y:auto;}
.overscroll-contain{overscroll-behavior:contain;}
.scroll-auto{scroll-behavior:auto;}
.text-ellipsis{text-overflow:ellipsis;}
.whitespace-normal{white-space:normal;}
.whitespace-nowrap{white-space:nowrap;}
.break-normal{overflow-wrap:normal;word-break:normal;}
.\\!border{border-width:1px !important;}
.\\!border-0{border-width:0px !important;}
.border{border-width:1px;}
.border-0{border-width:0px;}
.border-3{border-width:3px;}
.border-4,
.border-4px{border-width:4px;}
.border-b{border-bottom-width:1px;}
.border-l{border-left-width:1px;}
.border-l-8{border-left-width:8px;}
.border-t{border-top-width:1px;}
.last\\:border-b-0:last-child{border-bottom-width:0px;}
.\\!border-\\[var\\(--color-site-border\\)\\]{border-color:var(--color-site-border) !important;}
.\\!border-transparent{border-color:transparent !important;}
.border-\\[rgba\\(255\\,255\\,255\\,0\\.2\\)\\]{--un-border-opacity:0.2;border-color:rgba(255, 255, 255, var(--un-border-opacity));}
.border-\\[var\\(--color-border\\)\\]{border-color:var(--color-border);}
.border-\\[var\\(--color-danger-border\\)\\]{border-color:var(--color-danger-border);}
.border-\\[var\\(--color-site-accent\\)\\]{border-color:var(--color-site-accent);}
.border-\\[var\\(--color-site-border-subtle\\)\\]{border-color:var(--color-site-border-subtle);}
.border-\\[var\\(--color-site-swipe-border\\)\\]{border-color:var(--color-site-swipe-border);}
.hover\\:border-\\[var\\(--color-site-border\\)\\]:hover{border-color:var(--color-site-border);}
.\\!focus\\:border-\\[var\\(--color-site-accent\\)\\]:focus{border-color:var(--color-site-accent) !important;}
.focus\\:border-\\[var\\(--color-site-accent\\)\\]:focus{border-color:var(--color-site-accent);}
.border-l-\\[var\\(--color-site-border-subtle\\)\\]{border-left-color:var(--color-site-border-subtle);}
.border-l-\\[var\\(--color-site-page\\)\\]{border-left-color:var(--color-site-page);}
.border-t-\\[var\\(--color-site-border-subtle\\)\\]{border-top-color:var(--color-site-border-subtle);}
.rounded-3px{border-radius:3px;}
.rounded-full{border-radius:9999px;}
.border-solid{border-style:solid;}
.\\!bg-\\[color-mix\\(in_srgb\\,var\\(--color-site-page\\)_82\\%\\,black\\)\\]{background-color:color-mix(in srgb,var(--color-site-page) 82%,black) !important;}
.\\!bg-\\[var\\(--color-site-elevated\\)\\]{background-color:var(--color-site-elevated) !important;}
.\\!bg-transparent,
.\\[\\&_\\*\\]\\:\\!bg-transparent *{background-color:transparent !important;}
.bg-\\[var\\(--color-background\\)\\]{background-color:var(--color-background);}
.bg-\\[var\\(--color-badge\\)\\]{background-color:var(--color-badge);}
.bg-\\[var\\(--color-control\\)\\]{background-color:var(--color-control);}
.bg-\\[var\\(--color-danger-soft\\)\\]{background-color:var(--color-danger-soft);}
.bg-\\[var\\(--color-elevated\\)\\]{background-color:var(--color-elevated);}
.bg-\\[var\\(--color-site-accent-hover\\)\\]{background-color:var(--color-site-accent-hover);}
.bg-\\[var\\(--color-site-accent\\)\\]{background-color:var(--color-site-accent);}
.bg-\\[var\\(--color-site-border-subtle\\)\\]{background-color:var(--color-site-border-subtle);}
.bg-\\[var\\(--color-site-elevated\\)\\]{background-color:var(--color-site-elevated);}
.bg-\\[var\\(--color-site-item-hover\\)\\]{background-color:var(--color-site-item-hover);}
.bg-\\[var\\(--color-site-surface\\)\\]{background-color:var(--color-site-surface);}
.bg-\\[var\\(--color-site-swipe-background\\)\\]{background-color:var(--color-site-swipe-background);}
.bg-\\[var\\(--color-state-off\\)\\]{background-color:var(--color-state-off);}
.bg-\\[var\\(--color-state-on\\)\\]{background-color:var(--color-state-on);}
.bg-\\[var\\(--color-surface\\)\\]{background-color:var(--color-surface);}
.bg-black\\/65{background-color:rgb(0 0 0 / 0.65);}
.bg-transparent{background-color:transparent;}
.hover\\:\\!bg-\\[var\\(--color-site-item-hover\\)\\]:hover{background-color:var(--color-site-item-hover) !important;}
.hover\\:\\!bg-transparent:hover{background-color:transparent !important;}
.hover\\:bg-\\[var\\(--color-badge\\)\\]:hover{background-color:var(--color-badge);}
.hover\\:bg-\\[var\\(--color-site-accent-hover\\)\\]:hover{background-color:var(--color-site-accent-hover);}
.hover\\:bg-\\[var\\(--color-site-item-hover\\)\\]:hover{background-color:var(--color-site-item-hover);}
.\\!focus\\:bg-\\[var\\(--color-site-elevated\\)\\]:focus{background-color:var(--color-site-elevated) !important;}
.active\\:\\!bg-\\[var\\(--color-site-item-hover\\)\\]:active{background-color:var(--color-site-item-hover) !important;}
.active\\:\\!bg-transparent:active{background-color:transparent !important;}
.active\\:bg-\\[var\\(--color-site-accent-hover\\)\\]:active{background-color:var(--color-site-accent-hover);}
.active\\:bg-\\[var\\(--color-site-item-hover\\)\\]:active{background-color:var(--color-site-item-hover);}
.bg-no-repeat{background-repeat:no-repeat;}
.object-contain{object-fit:contain;}
.object-center{object-position:center;}
.\\!p-0,
.\\[\\&_form\\>div\\]\\:\\!p-0 form>div{padding:0 !important;}
.p-0,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:p-0{padding:0;}
.\\!py-0{padding-top:0 !important;padding-bottom:0 !important;}
.px{padding-left:1rem;padding-right:1rem;}
.px-\\[0\\.6em\\]{padding-left:0.6em;padding-right:0.6em;}
.px-0{padding-left:0;padding-right:0;}
.px-10px{padding-left:10px;padding-right:10px;}
.py-0{padding-top:0;padding-bottom:0;}
.py-56px{padding-top:56px;padding-bottom:56px;}
.py-6px{padding-top:6px;padding-bottom:6px;}
.\\!pr-\\[132px\\]{padding-right:132px !important;}
.\\!pr-\\[72px\\]{padding-right:72px !important;}
.pb-48px{padding-bottom:48px;}
.pb-72px{padding-bottom:72px;}
.pl-\\[max\\(12px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{padding-left:max(12px,env(safe-area-inset-left,0px));}
.pl-\\[max\\(16px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{padding-left:max(16px,env(safe-area-inset-left,0px));}
.pl-6px{padding-left:6px;}
.pr-\\[max\\(12px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{padding-right:max(12px,env(safe-area-inset-right,0px));}
.pr-\\[max\\(16px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{padding-right:max(16px,env(safe-area-inset-right,0px));}
.pt-2px{padding-top:2px;}
.text-center{text-align:center;}
.\\!text-left{text-align:left !important;}
.text-left{text-align:left;}
.align-middle{vertical-align:middle;}
.\\!text-\\[length\\:var\\(--font-size-md\\)\\]{font-size:var(--font-size-md) !important;}
.\\!text-0{font-size:0 !important;}
.\\[\\&_\\.auto-complete-item\\]\\:\\!text-\\[length\\:var\\(--font-size-lg\\)\\] .auto-complete-item{font-size:var(--font-size-lg) !important;}
.\\!text-\\[var\\(--color-site-text\\)\\]{color:var(--color-site-text) !important;}
.text-\\[clamp\\(88px\\,25vw\\,180px\\)\\]{font-size:clamp(88px,25vw,180px);}
.text-\\[rgba\\(255\\,255\\,255\\,0\\.25\\)\\]{--un-text-opacity:0.25;color:rgba(255, 255, 255, var(--un-text-opacity));}
.text-\\[rgba\\(255\\,255\\,255\\,0\\.58\\)\\]{--un-text-opacity:0.58;color:rgba(255, 255, 255, var(--un-text-opacity));}
.text-\\[rgba\\(255\\,255\\,255\\,0\\.78\\)\\]{--un-text-opacity:0.78;color:rgba(255, 255, 255, var(--un-text-opacity));}
.text-\\[var\\(--color-accent\\)\\]{color:var(--color-accent);}
.text-\\[var\\(--color-background\\)\\]{color:var(--color-background);}
.text-\\[var\\(--color-danger\\)\\]{color:var(--color-danger);}
.text-\\[var\\(--color-muted\\)\\]{color:var(--color-muted);}
.text-\\[var\\(--color-site-surface\\)\\]{color:var(--color-site-surface);}
.text-\\[var\\(--color-site-text\\)\\]{color:var(--color-site-text);}
.text-\\[var\\(--color-text\\)\\]{color:var(--color-text);}
.text-white{--un-text-opacity:1;color:rgb(255 255 255 / var(--un-text-opacity));}
.visited\\:\\!text-\\[var\\(--color-site-text\\)\\]:visited{color:var(--color-site-text) !important;}
.hover\\:\\!text-\\[var\\(--color-site-text\\)\\]:hover{color:var(--color-site-text) !important;}
.active\\:\\!text-\\[var\\(--color-site-text\\)\\]:active{color:var(--color-site-text) !important;}
.\\[\\&_\\.auto-complete-text\\]\\:\\!text-inherit .auto-complete-text,
.\\[\\&_\\*\\]\\:\\!text-inherit *{color:inherit !important;}
.font-400{font-weight:400;}
.font-600{font-weight:600;}
.font-700{font-weight:700;}
.font-850{font-weight:850;}
.\\[\\&_\\.auto-complete-item\\]\\:\\!leading-\\[1\\.25\\] .auto-complete-item{line-height:1.25 !important;}
.\\[\\&_\\.auto-complete-text\\]\\:\\!leading-inherit .auto-complete-text{line-height:inherit !important;}
.leading-\\[1\\.1\\]{line-height:1.1;}
.leading-\\[1\\.15\\]{line-height:1.15;}
.leading-\\[1\\.16\\]{line-height:1.16;}
.leading-\\[1\\.2\\]{line-height:1.2;}
.leading-\\[1\\.3\\]{line-height:1.3;}
.leading-\\[1\\.35\\]{line-height:1.35;}
.leading-\\[1\\.4\\]{line-height:1.4;}
.leading-\\[1\\],
.leading-none{line-height:1;}
.leading-1{line-height:0.25rem;}
.font-inherit{font-family:inherit;}
.font-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;}
.font-sans{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";}
.uppercase{text-transform:uppercase;}
.lowercase{text-transform:lowercase;}
.normal-case{text-transform:none;}
.no-underline{text-decoration:none;}
.hover\\:no-underline:hover{text-decoration:none;}
.active\\:no-underline:active{text-decoration:none;}
.\\[\\&\\[data-disabled\\]\\]\\:opacity-40[data-disabled],
.opacity-40{opacity:0.4;}
.\\[\\&\\[data-open\\=false\\]\\]\\:opacity-0[data-open=false]{opacity:0;}
.opacity-45{opacity:0.45;}
.opacity-70{opacity:0.7;}
.opacity-72{opacity:0.72;}
.opacity-75{opacity:0.75;}
.opacity-78{opacity:0.78;}
.opacity-82{opacity:0.82;}
.active\\:opacity-70:active{opacity:0.7;}
.disabled\\:opacity-40:disabled{opacity:0.4;}
.disabled\\:opacity-50:disabled{opacity:0.5;}
.shadow-\\[0_2px_10px_var\\(--color-shadow-panel\\)\\]{--un-shadow:0 2px 10px var(--un-shadow-color, var(--color-shadow-panel));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_2px_6px_var\\(--color-shadow-control\\)\\]{--un-shadow:0 2px 6px var(--un-shadow-color, var(--color-shadow-control));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_2px_8px_var\\(--color-shadow-panel\\)\\]{--un-shadow:0 2px 8px var(--un-shadow-color, var(--color-shadow-panel));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_4px_14px_var\\(--color-shadow-floating\\)\\]{--un-shadow:0 4px 14px var(--un-shadow-color, var(--color-shadow-floating));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_6px_20px_var\\(--color-shadow-floating\\)\\]{--un-shadow:0 6px 20px var(--un-shadow-color, var(--color-shadow-floating));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_8px_24px_var\\(--color-shadow-panel\\)\\]{--un-shadow:0 8px 24px var(--un-shadow-color, var(--color-shadow-panel));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-none{--un-shadow:0 0 var(--un-shadow-color, rgb(0 0 0 / 0));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-xl{--un-shadow:var(--un-shadow-inset) 0 20px 25px -5px var(--un-shadow-color, rgb(0 0 0 / 0.1)),var(--un-shadow-inset) 0 8px 10px -6px var(--un-shadow-color, rgb(0 0 0 / 0.1));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.focus\\:shadow-\\[0_0_0_3px_var\\(--color-site-accent-hover\\)\\]:focus{--un-shadow:0 0 0 3px var(--un-shadow-color, var(--color-site-accent-hover));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.focus-visible\\:outline-2:focus-visible{outline-width:2px;}
.focus-visible\\:outline-\\[var\\(--color-site-accent\\)\\]:focus-visible{outline-color:var(--color-site-accent);}
.focus-visible\\:outline-offset-3px:focus-visible{outline-offset:3px;}
.focus-visible\\:outline:focus-visible{outline-style:solid;}
.outline-none{outline:2px solid transparent;outline-offset:2px;}
.hover\\:brightness-108:hover{--un-brightness:brightness(1.08);filter:var(--un-blur) var(--un-brightness) var(--un-contrast) var(--un-drop-shadow) var(--un-grayscale) var(--un-hue-rotate) var(--un-invert) var(--un-saturate) var(--un-sepia);}
.backdrop-filter{-webkit-backdrop-filter:var(--un-backdrop-blur) var(--un-backdrop-brightness) var(--un-backdrop-contrast) var(--un-backdrop-grayscale) var(--un-backdrop-hue-rotate) var(--un-backdrop-invert) var(--un-backdrop-opacity) var(--un-backdrop-saturate) var(--un-backdrop-sepia);backdrop-filter:var(--un-backdrop-blur) var(--un-backdrop-brightness) var(--un-backdrop-contrast) var(--un-backdrop-grayscale) var(--un-backdrop-hue-rotate) var(--un-backdrop-invert) var(--un-backdrop-opacity) var(--un-backdrop-saturate) var(--un-backdrop-sepia);}
.transition-\\[background-color\\,transform\\]{transition-property:background-color,transform;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[border-color\\,background-color\\,color\\]{transition-property:border-color,background-color,color;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[filter\\,transform\\,box-shadow\\]{transition-property:filter,transform,box-shadow;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[opacity\\,transform\\]{transition-property:opacity,transform;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-opacity{transition-property:opacity;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.duration-120{transition-duration:120ms;}
.duration-160{transition-duration:160ms;}
.ease-in-out{transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);}
.will-change-transform{will-change:transform;}
@media (min-width: 760px){
.desktop\\:text-\\[clamp\\(72px\\,10vw\\,140px\\)\\]{font-size:clamp(72px,10vw,140px);}
}
@media (orientation: landscape){
.landscape\\:left-auto{left:auto;}
.landscape\\:right-10px{right:10px;}
.landscape\\:top-\\[calc\\(62px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(62px + env(safe-area-inset-top,0px));}
.landscape\\:max-w-\\[calc\\(100vw-20px\\)\\]{max-width:calc(100vw - 20px);}
.landscape\\:min-w-0{min-width:0;}
.landscape\\:translate-x-0{--un-translate-x:0;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.landscape\\:text-right{text-align:right;}
}
@media (orientation: landscape) and (pointer: coarse){
.coarse-landscape\\:right-8px{right:8px;}
.coarse-landscape\\:top-\\[calc\\(74px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(74px + env(safe-area-inset-top,0px));}
.coarse-landscape\\:max-w-\\[calc\\(100vw-16px\\)\\]{max-width:calc(100vw - 16px);}
}
@media (pointer: coarse){
.coarse\\:right-8px{right:8px;}
.coarse\\:top-\\[calc\\(80px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(80px + env(safe-area-inset-top,0px));}
.coarse\\:top-\\[calc\\(8px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(8px + env(safe-area-inset-top,0px));}
.coarse\\:top-8px{top:8px;}
.coarse\\:block{display:block;}
.coarse\\:h-18px{height:18px;}
.coarse\\:h-64px{height:64px;}
.coarse\\:max-h-\\[calc\\(100dvh-16px\\)\\]{max-height:calc(100dvh - 16px);}
.coarse\\:max-w-360px{max-width:360px;}
.coarse\\:max-w-480px{max-width:480px;}
.coarse\\:min-h-64px{min-height:64px;}
.coarse\\:min-h-88px{min-height:88px;}
.coarse\\:min-w-64px{min-width:64px;}
.coarse\\:w-\\[calc\\(100vw-16px\\)\\]{width:calc(100vw - 16px);}
.coarse\\:w-\\[calc\\(100vw-32px\\)\\]{width:calc(100vw - 32px);}
.coarse\\:w-18px{width:18px;}
.coarse\\:w-48px{width:48px;}
}`;

  // src/theme.css
  var theme_default = `:root {
  --font-size-xs: 10px;
  --font-size-sm: 13px;
  --font-size-md: 16px;
  --font-size-lg: 24px;
  --font-size-xl: 32px;

  --color-background: #070707;
  --color-surface: #151515;
  --color-elevated: #232323;
  --color-text: #f3f3f3;
  --color-accent: #4da3ff;
  --color-danger: #ffb2a7;
  --color-state-on: #4ec46a;
  --color-state-off: #8c8f96;
  --color-shadow: #000000;

  --color-site-favorite-0: #646464;
  --color-site-favorite-1: #ff6868;
  --color-site-favorite-2: #ffa561;
  --color-site-favorite-3: #fff56b;
  --color-site-favorite-4: #68ff8b;
  --color-site-favorite-5: #cdff84;
  --color-site-favorite-6: #8afeff;
  --color-site-favorite-7: #7268ff;
  --color-site-favorite-8: #ac57fe;
  --color-site-favorite-9: #fe50c8;

  --color-muted: color-mix(in srgb, var(--color-text) 72%, transparent);
  --color-border: color-mix(in srgb, var(--color-text) 18%, transparent);
  --color-track: color-mix(in srgb, var(--color-text) 34%, var(--color-background));
  --color-danger-soft: color-mix(in srgb, var(--color-danger) 12%, transparent);
  --color-danger-border: color-mix(in srgb, var(--color-danger) 64%, transparent);
  --color-control: color-mix(in srgb, var(--color-elevated) 88%, transparent);
  --color-badge: color-mix(in srgb, var(--color-background) 34%, transparent);
  --color-shadow-panel: color-mix(in srgb, var(--color-shadow) 32%, transparent);
  --color-shadow-elevated: color-mix(in srgb, var(--color-shadow) 38%, transparent);
  --color-shadow-control: color-mix(in srgb, var(--color-shadow) 40%, transparent);
  --color-shadow-floating: color-mix(in srgb, var(--color-shadow) 42%, transparent);

  --color-site-accent-hover: color-mix(in srgb, var(--color-site-accent) 12%, transparent);
  --color-site-border-subtle: color-mix(in srgb, var(--color-site-border) 16%, transparent);
  --color-site-item-hover: color-mix(in srgb, var(--color-site-text) 8%, transparent);
  --color-site-swipe-background: color-mix(in srgb, var(--color-site-elevated) 94%, transparent);
  --color-site-swipe-border: color-mix(in srgb, var(--color-site-border) 38%, transparent);
}

@media (pointer: coarse) {
  :root {
    --font-size-xs: 12px;
    --font-size-sm: 18px;
    --font-size-md: 26px;
    --font-size-lg: 32px;
    --font-size-xl: 42px;
  }
}

:root[data-ehpeek-site="e-hentai"] {
  --color-site-page: #e3e0d1;
  --color-site-surface: #edebdf;
  --color-site-elevated: #f3f0e0;
  --color-site-text: #5c0d11;
  --color-site-accent: #8f4701;
  --color-site-border: #5c0d12;
}

:root[data-ehpeek-site="exhentai"] {
  --color-site-page: #34353b;
  --color-site-surface: #4f535b;
  --color-site-elevated: #3f4249;
  --color-site-text: #f1f1f1;
  --color-site-accent: #f0b35a;
  --color-site-border: #8d7454;
}
`;

  // src/components/animation.ts
  var SCROLL_ANIMATION_MODE = "raf", SCROLL_ANIMATION_MS = 180, SCROLL_EASING_POWER = 3, ANIMATION_FRAME_MIN_DELTA_MS = 1, ANIMATION_FRAME_MAX_DELTA_MS = 32, SCROLL_FLING_MIN_VELOCITY = 0.35, SCROLL_FLING_STOP_VELOCITY = 0.02, SCROLL_FLING_DECAY = 45e-4, ScrollAnimator = class {
    constructor(axis) {
      this.axis = axis;
      this.frame = null;
    }
    scrollTo(scroller, target, motion = "instant", onComplete) {
      if (this.cancel(), motion !== "animated" || SCROLL_ANIMATION_MODE === "none") {
        this.setScrollPosition(scroller, target), onComplete?.();
        return;
      }
      if (SCROLL_ANIMATION_MODE === "native") {
        scroller.scrollTo(this.axis === "x" ? { left: target, behavior: "smooth" } : { top: target, behavior: "smooth" }), window.setTimeout(() => onComplete?.(), SCROLL_ANIMATION_MS);
        return;
      }
      this.scrollWithRaf(scroller, target, onComplete);
    }
    cancel() {
      this.frame !== null && (window.cancelAnimationFrame(this.frame), this.frame = null);
    }
    scrollWithRaf(scroller, target, onComplete) {
      let start = this.scrollPosition(scroller), delta = target - start, lastFrameTime = performance.now(), animationTime = 0, step = (time) => {
        let elapsed = clamp(time - lastFrameTime, ANIMATION_FRAME_MIN_DELTA_MS, ANIMATION_FRAME_MAX_DELTA_MS);
        lastFrameTime = time, animationTime += elapsed;
        let progress = clamp(animationTime / SCROLL_ANIMATION_MS, 0, 1), eased = 1 - Math.pow(1 - progress, SCROLL_EASING_POWER);
        if (this.setScrollPosition(scroller, start + delta * eased), progress >= 1) {
          this.frame = null, onComplete?.();
          return;
        }
        this.frame = window.requestAnimationFrame(step);
      };
      this.frame = window.requestAnimationFrame(step);
    }
    scrollPosition(scroller) {
      return this.axis === "x" ? scroller.scrollLeft : scroller.scrollTop;
    }
    setScrollPosition(scroller, value) {
      this.axis === "x" ? scroller.scrollLeft = value : scroller.scrollTop = value;
    }
  }, ScrollFlingAnimator = class {
    constructor() {
      this.frame = null;
      this.velocityY = 0;
      this.lastFrameTime = 0;
    }
    start(options) {
      if (this.cancel(), Math.abs(options.initialVelocityY) < SCROLL_FLING_MIN_VELOCITY)
        return;
      this.velocityY = options.initialVelocityY, this.lastFrameTime = performance.now();
      let step = (time) => {
        if (!options.canRun()) {
          this.cancel();
          return;
        }
        let elapsed = clamp(time - this.lastFrameTime, ANIMATION_FRAME_MIN_DELTA_MS, ANIMATION_FRAME_MAX_DELTA_MS);
        this.lastFrameTime = time;
        let previousScrollTop = options.scroller.scrollTop;
        if (options.setScrollTop(previousScrollTop + this.velocityY * elapsed), options.scroller.scrollTop === previousScrollTop) {
          this.cancel(), options.onStop();
          return;
        }
        if (this.velocityY *= Math.exp(-SCROLL_FLING_DECAY * elapsed), Math.abs(this.velocityY) < SCROLL_FLING_STOP_VELOCITY) {
          this.cancel(), options.onStop();
          return;
        }
        this.frame = window.requestAnimationFrame(step);
      };
      this.frame = window.requestAnimationFrame(step);
    }
    cancel() {
      this.frame !== null && (window.cancelAnimationFrame(this.frame), this.frame = null), this.velocityY = 0;
    }
  };

  // src/components/Reader/Viewport.tsx
  var _tmpl$31 = /* @__PURE__ */ template('<div class="w-full h-full overflow-auto overscroll-contain scroll-auto touch-pan-y cursor-grab scrollbar-hidden [&amp;[data-dragging=true]]:cursor-grabbing [&amp;[data-dragging=true]]:select-none [#ehpeek-reader[data-view-mode=paged]_&amp;]:overflow-hidden [#ehpeek-reader[data-view-mode=paged]_&amp;]:touch-none [#ehpeek-reader[data-view-mode=paged]_&amp;]:select-none"tabindex=-1><main class="ehpeek-reader-page-strip flex flex-col w-full min-h-full py-56px px-0 pb-72px [#ehpeek-reader[data-view-mode=paged]_&amp;]:flex-row [#ehpeek-reader[data-view-mode=paged]_&amp;]:w-auto [#ehpeek-reader[data-view-mode=paged]_&amp;]:h-full [#ehpeek-reader[data-view-mode=paged]_&amp;]:min-h-0 [#ehpeek-reader[data-view-mode=paged]_&amp;]:p-0">'), _tmpl$212 = /* @__PURE__ */ template('<section class="ehpeek-page flex w-full h-[var(--reader-page-height)] items-start justify-center pb-sm [#ehpeek-reader[data-view-mode=paged]_&amp;]:flex-[0_0_100%] [#ehpeek-reader[data-view-mode=paged]_&amp;]:w-full [#ehpeek-reader[data-view-mode=paged]_&amp;]:h-full [#ehpeek-reader[data-view-mode=paged]_&amp;]:items-center [#ehpeek-reader[data-view-mode=paged]_&amp;]:p-0"><div class="flex w-[var(--reader-frame-width)] h-[var(--reader-frame-height)] items-center justify-center overflow-hidden [#ehpeek-reader[data-view-mode=paged]_&amp;]:w-full [#ehpeek-reader[data-view-mode=paged]_&amp;]:h-full">'), _tmpl$39 = /* @__PURE__ */ template('<div class="max-w-[min(86vw,760px)] break-anywhere [direction:ltr] [unicode-bidi:plaintext]">'), _tmpl$47 = /* @__PURE__ */ template('<button type=button class="ehpeek-reader-page-reload inline-flex w-64px h-64px items-center justify-center border border-[var(--color-danger-border)] rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)] cursor-pointer font-sans textsize-lg font-700 leading-1 active:scale-96 [touch-action:manipulation]"><span aria-hidden=true>↻'), _tmpl$54 = /* @__PURE__ */ template("<div>"), _tmpl$63 = /* @__PURE__ */ template('<span class="flex w-full h-full flex-col items-center justify-center gap-xl overflow-hidden"aria-hidden=true><span class="block max-w-full flex-none m-0 p-0 text-center leading-[1] whitespace-nowrap [direction:ltr] [unicode-bidi:plaintext]"></span><span class="block w-md h-md flex-none box-border animate-spin rounded-full border-4px border-solid ehp-color-spinner">'), FALLBACK_ASPECT_RATIO = 1.42;
  function pageWindowNumbers(currentPageNum, windowSize) {
    let numbers = [];
    for (let offset = -windowSize; offset <= windowSize; offset += 1)
      numbers.push(currentPageNum + offset);
    return numbers;
  }
  function PagesViewport(props) {
    let [slots, setSlots] = createSignal([]), [revision, setRevision] = createSignal(0), horizontalAnimator = new ScrollAnimator("x"), flingAnimator = new ScrollFlingAnimator(), pageSlots2 = [], scroller, scrollerApi, dragStartPosition = null, resizeFrame = null, moveRequestToken = 0, disposed = !1, refresh = () => setRevision((value) => value + 1), slotFor = (pageNum) => pageSlots2.find((slot) => slot.pageNum === pageNum), viewportWidth = () => scrollerApi.viewportWidth(), viewportHeight = () => scrollerApi.viewportHeight(), scrollTop = () => scrollerApi.scrollTop(), visualSlotIndex = (index, slotCount) => props.mode === "paged" && props.readDirection === "rtl" ? slotCount - 1 - index : index, applySlotSize = (slot) => {
      let frameWidth = Math.max(1, viewportWidth());
      slot.frameWidth = frameWidth, slot.frameHeight = Math.ceil(frameWidth * pageSlotAspectRatio(slot));
    }, renderSlots = () => {
      for (let slot of pageSlots2)
        applySlotSize(slot);
      setSlots(pageSlots2.slice()), refresh();
    }, refreshSlot = (slot) => {
      applySlotSize(slot), refresh();
    }, pageOffset = (pageNum) => {
      let elements = slotFor(pageNum)?.elements;
      return elements ? scrollerApi.slotOffset(elements, props.mode) : null;
    }, verticalScrollBoundsForElements = (firstElements, lastElements) => {
      let bounds = {};
      if (firstElements && (bounds.min = scrollerApi.slotTop(firstElements)), lastElements) {
        let lastElementsRect = lastElements.node.getBoundingClientRect(), lastElementsTop = scrollerApi.slotTop(lastElements);
        bounds.max = lastElementsTop + lastElementsRect.height - viewportHeight();
      }
      return bounds.min === void 0 && bounds.max === void 0 ? null : (bounds.min !== void 0 && bounds.max !== void 0 && (bounds.max = Math.max(bounds.min, bounds.max)), bounds);
    }, verticalScrollBounds = () => props.mode !== "scroll" ? null : verticalScrollBoundsForElements(slotFor(1)?.elements, props.window.totalPages ? slotFor(props.window.totalPages + 1)?.elements : null), moveToTop = (nextScrollTop) => {
      scrollerApi.moveToTop(nextScrollTop, verticalScrollBounds());
    }, pageNumAtPoint = (point) => {
      let element = document.elementFromPoint(point.clientX, point.clientY), pageNode = element instanceof Element ? element.closest(".ehpeek-page") : null;
      if (!pageNode || !scroller.contains(pageNode))
        return null;
      let pageNum = Number(pageNode.dataset.ehpeekPageNum || "");
      return Number.isFinite(pageNum) ? pageNum : null;
    }, stopMotion = () => {
      moveRequestToken += 1, dragStartPosition = null, flingAnimator.cancel(), horizontalAnimator.cancel();
    }, performPageMove = (pageNum, motion, onComplete) => {
      let delta = pageOffset(pageNum);
      return delta === null ? !1 : (props.mode === "paged" ? horizontalAnimator.scrollTo(scroller, scrollerApi.scrollLeft() + delta, motion, onComplete) : (moveToTop(scrollTop() + delta), onComplete?.()), !0);
    }, moveToPage = (pageNum, motion = "instant", onComplete) => {
      let requestToken = ++moveRequestToken;
      performPageMove(pageNum, motion, onComplete) || queueMicrotask(() => {
        !disposed && requestToken === moveRequestToken && performPageMove(pageNum, motion, onComplete);
      });
    }, resizePages = () => {
      for (let slot of pageSlots2)
        applySlotSize(slot);
      refresh();
    }, gestureDragging = createPointerGestureElement(() => scroller ?? null, () => props.callbacks.pointer), syncWindow = (options) => {
      let oldSlots = new Map(pageSlots2.map((slot) => [slot.pageNum, slot])), nextSlots = [];
      for (let pageNum of pageWindowNumbers(options.currentPageNum, options.windowSize)) {
        let kind = pageSlotKind(pageNum, options.totalPages), oldSlot = oldSlots.get(pageNum), slot = oldSlot && oldSlot.kind === kind ? oldSlot : pageSlot(pageNum, kind);
        if (kind === "page") {
          let page = options.pages.get(pageNum);
          page && applyPageMetaToSlot(slot, page);
        } else
          clearNonPageSlotMeta(slot);
        nextSlots.push(slot);
      }
      let nextSet = new Set(nextSlots);
      for (let slot of pageSlots2)
        nextSet.has(slot) || (slot.token += 1);
      pageSlots2 = nextSlots, pageSlots2.forEach((slot, index) => {
        slot.index = index;
      }), renderSlots();
    }, actions = {
      focus: () => scroller.focus({
        preventScroll: !0
      }),
      isDragging: gestureDragging,
      beginDrag() {
        stopMotion(), dragStartPosition = props.mode === "paged" ? scrollerApi.scrollLeft() : scrollTop();
      },
      cancelDrag: () => {
        dragStartPosition = null;
      },
      moveDrag(delta) {
        return dragStartPosition === null ? !1 : (props.mode === "paged" ? scrollerApi.moveToLeft(dragStartPosition - delta.dx) : moveToTop(dragStartPosition - delta.dy), !0);
      },
      resetPosition: () => scrollerApi.resetPosition(),
      stopMotion,
      markPageLoading(pageNum) {
        let slot = slotFor(pageNum);
        return !slot || slot.kind !== "page" || slot.state !== "idle" ? null : (slot.state = "loading", slot.errorMessage = null, slot.token += 1, refreshSlot(slot), slot.token);
      },
      async loadPageImage(pageNum, token, slotImage) {
        let image = pageImageDom(pageNum, slotImage);
        await loadImage(image);
        let slot = slotFor(pageNum);
        return !slot || slot.token !== token || !slot.elements ? !1 : (slot.state = "ready", slot.image = image, slot.errorMessage = null, slot.width = positiveDimension(image.naturalWidth) ?? slotImage.width, slot.height = positiveDimension(image.naturalHeight) ?? slotImage.height, refreshSlot(slot), !0);
      },
      setPageError(pageNum, token, errorMessage) {
        let slot = slotFor(pageNum);
        return !slot || slot.token !== token ? !1 : (slot.state = "error", slot.image = null, slot.errorMessage = errorMessage, refresh(), !0);
      },
      resetPageError(pageNum) {
        let slot = slotFor(pageNum);
        return !slot || slot.kind !== "page" || slot.state !== "error" ? !1 : (slot.state = "idle", slot.errorMessage = null, refreshSlot(slot), !0);
      },
      moveToPage,
      moveToTop,
      scrollTop,
      viewportWidth,
      pageOffset,
      centerPageNum() {
        for (let slot of pageSlots2)
          if (slot.elements && slot.kind !== "blank" && scrollerApi.slotContainsViewportTarget(slot.elements))
            return slot.pageNum;
        return null;
      },
      isHitEndPage(point) {
        let pageNum = pageNumAtPoint(point);
        return pageNum !== null && slotFor(pageNum)?.kind === "end";
      },
      pageNumAtPoint,
      startVerticalFlingFromDragVelocity(dragVelocityY, onStop) {
        flingAnimator.start({
          scroller,
          initialVelocityY: -dragVelocityY,
          setScrollTop: moveToTop,
          canRun: () => !disposed && props.mode === "scroll",
          onStop
        });
      }
    };
    return props.actionsRef(actions), createEffect(() => syncWindow(props.window)), onMount(() => {
      let observer = new ResizeObserver(() => {
        resizeFrame === null && (resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = null, resizePages();
        }));
      });
      observer.observe(scroller), onCleanup(() => observer.disconnect());
    }), onCleanup(() => {
      disposed = !0, stopMotion(), resizeFrame !== null && (window.cancelAnimationFrame(resizeFrame), resizeFrame = null);
    }), (() => {
      var _el$ = _tmpl$31(), _el$2 = _el$.firstChild;
      return _el$.addEventListener("wheel", (event) => {
        let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        props.callbacks.onWheel(delta, event);
      }), _el$.addEventListener("scroll", () => props.callbacks.onNativeScroll()), use((element) => {
        scroller = element, scrollerApi = createPagesScroller(element);
      }, _el$), insert(_el$2, createComponent(For, {
        get each() {
          return slots();
        },
        children: (slot) => createComponent(PageSlotView, {
          slot,
          get revision() {
            return revision();
          },
          get visualIndex() {
            return visualSlotIndex(slot.index, slots().length);
          },
          onReloadPage: (pageNum) => props.callbacks.onReloadPage(pageNum)
        })
      })), _el$;
    })();
  }
  function PageSlotView(props) {
    let node, frame, content = createMemo(() => (props.revision, {
      pageNum: props.slot.pageNum,
      kind: props.slot.kind,
      state: props.slot.state,
      errorMessage: props.slot.errorMessage ?? void 0
    })), image = createMemo(() => (props.revision, props.slot.state === "ready" ? props.slot.image : null)), slotStyle = createMemo(() => (props.revision, {
      "--reader-page-height": `${props.slot.frameHeight + 8}px`,
      "--reader-frame-width": `${props.slot.frameWidth}px`,
      "--reader-frame-height": `${props.slot.frameHeight}px`,
      order: String(props.visualIndex)
    }));
    return onCleanup(() => {
      props.slot.elements?.node === node && (props.slot.elements = null);
    }), (() => {
      var _el$3 = _tmpl$212(), _el$4 = _el$3.firstChild, _ref$ = node;
      return typeof _ref$ == "function" ? use(_ref$, _el$3) : node = _el$3, use((element) => {
        frame = element, props.slot.elements = {
          node,
          frame
        };
      }, _el$4), insert(_el$4, createComponent(Show, {
        get when() {
          return image();
        },
        keyed: !0,
        get fallback() {
          return createComponent(PageSlotPlaceholder, {
            get content() {
              return content();
            },
            get text() {
              return slotPlaceholderText(content());
            },
            get onReloadPage() {
              return props.onReloadPage;
            }
          });
        },
        children: (currentImage) => currentImage
      })), createRenderEffect((_p$) => {
        var _v$ = String(props.visualIndex), _v$2 = String(props.slot.pageNum), _v$3 = slotStyle();
        return _v$ !== _p$.e && setAttribute(_el$3, "data-ehpeek-index", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$3, "data-ehpeek-page-num", _p$.t = _v$2), _p$.a = style(_el$3, _v$3, _p$.a), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$3;
    })();
  }
  function PageSlotPlaceholder(props) {
    let stop = (event) => {
      event.preventDefault(), event.stopPropagation();
    };
    return (() => {
      var _el$5 = _tmpl$54();
      return insert(_el$5, createComponent(Show, {
        get when() {
          return props.content.state === "error";
        },
        get fallback() {
          return createComponent(Show, {
            get when() {
              return props.content.state === "loading";
            },
            get fallback() {
              return props.text;
            },
            get children() {
              var _el$8 = _tmpl$63(), _el$9 = _el$8.firstChild;
              return insert(_el$9, () => props.text), _el$8;
            }
          });
        },
        get children() {
          return [(() => {
            var _el$6 = _tmpl$39();
            return insert(_el$6, () => props.text), _el$6;
          })(), (() => {
            var _el$7 = _tmpl$47();
            return _el$7.$$click = (event) => {
              stop(event), props.onReloadPage(props.content.pageNum);
            }, _el$7.$$pointerdown = stop, createRenderEffect(() => setAttribute(_el$7, "aria-label", texts_default.reader.reload)), _el$7;
          })()];
        }
      })), createRenderEffect((_p$) => {
        var _v$4 = props.content.state === "error" ? "flex w-full h-full flex-col items-center justify-center gap-lg bg-[var(--color-surface)] p-xl text-[var(--color-danger)] text-center textsize-md font-700 leading-1" : "relative flex w-full h-full items-center justify-center bg-[var(--color-surface)] text-[var(--color-muted)] leading-1 text-center " + (props.content.kind === "end" ? "p-xl [direction:ltr] textsize-xl font-700 leading-[1.3] [unicode-bidi:plaintext]" : "text-[clamp(88px,25vw,180px)] desktop:text-[clamp(72px,10vw,140px)] font-mono font-850 [font-variant-numeric:tabular-nums]"), _v$5 = props.content.state === "loading" ? "status" : void 0, _v$6 = props.content.state === "loading" ? `${texts_default.reader.loading} ${props.text}` : void 0;
        return _v$4 !== _p$.e && className(_el$5, _p$.e = _v$4), _v$5 !== _p$.t && setAttribute(_el$5, "role", _p$.t = _v$5), _v$6 !== _p$.a && setAttribute(_el$5, "aria-label", _p$.a = _v$6), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$5;
    })();
  }
  function pageImageDom(pageNum, slotImage) {
    let image = document.createElement("img");
    return image.className = "block w-[var(--reader-frame-width)] h-[var(--reader-frame-height)] object-contain select-none [-webkit-user-drag:none] [#ehpeek-reader[data-view-mode=paged]_&]:w-full [#ehpeek-reader[data-view-mode=paged]_&]:h-full", image.alt = `Page ${pageNum}`, image.decoding = "async", image.loading = "eager", image.draggable = !1, image.setAttribute("fetchpriority", slotImage.highPriority ? "high" : "low"), image.src = slotImage.imageUrl, slotImage.width && slotImage.height && (image.width = slotImage.width, image.height = slotImage.height), image;
  }
  async function loadImage(image) {
    if (!(image.complete && image.naturalWidth > 0)) {
      await new Promise((resolve, reject) => {
        image.addEventListener("load", () => resolve(), {
          once: !0
        }), image.addEventListener("error", () => reject(new Error(texts_default.errors.imageLoadFailed)), {
          once: !0
        });
      });
      try {
        await image.decode();
      } catch {
      }
    }
  }
  function createPagesScroller(element) {
    let clampedTop = (scrollTop, bounds) => bounds ? clamp(scrollTop, bounds.min ?? Number.NEGATIVE_INFINITY, bounds.max ?? Number.POSITIVE_INFINITY) : scrollTop;
    return {
      element,
      resetPosition() {
        element.scrollLeft = 0, element.scrollTop = 0;
      },
      scrollLeft() {
        return element.scrollLeft;
      },
      scrollTop() {
        return element.scrollTop;
      },
      viewportWidth() {
        return element.clientWidth || window.innerWidth || 1;
      },
      viewportHeight() {
        return element.clientHeight;
      },
      moveToLeft(scrollLeft) {
        element.scrollLeft = scrollLeft;
      },
      moveToTop(scrollTop, bounds) {
        element.scrollTop = clampedTop(scrollTop, bounds);
      },
      slotTop(elements) {
        let elementsRect = elements.node.getBoundingClientRect(), scrollerRect = element.getBoundingClientRect();
        return element.scrollTop + elementsRect.top - scrollerRect.top;
      },
      slotOffset(elements, mode) {
        let pageRect = elements.node.getBoundingClientRect(), scrollerRect = element.getBoundingClientRect();
        return mode === "paged" ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
      },
      slotContainsViewportTarget(elements) {
        let scrollerRect = element.getBoundingClientRect(), target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14), rect = elements.node.getBoundingClientRect();
        return rect.top <= target && rect.bottom > target;
      }
    };
  }
  function slotPlaceholderText(content) {
    if (content.state === "error") {
      let suffix = content.errorMessage ? `: ${content.errorMessage}` : "";
      return `${texts_default.reader.failedPrefix} ${content.pageNum}${suffix}`;
    }
    return content.kind === "end" ? texts_default.reader.end : content.kind === "blank" ? "" : String(content.pageNum);
  }
  function positiveDimension(value) {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  function pageSlotKind(pageNum, totalPages) {
    return pageNum < 1 ? "blank" : totalPages && pageNum === totalPages + 1 ? "end" : totalPages && pageNum > totalPages + 1 ? "blank" : "page";
  }
  function pageSlot(pageNum, kind) {
    return {
      pageNum,
      index: 0,
      kind,
      state: kind === "page" ? "idle" : "ready",
      aspectRatio: FALLBACK_ASPECT_RATIO,
      width: null,
      height: null,
      image: null,
      errorMessage: null,
      frameWidth: 1,
      frameHeight: Math.ceil(FALLBACK_ASPECT_RATIO),
      elements: null,
      token: 0
    };
  }
  function applyPageMetaToSlot(slot, page) {
    let aspectRatio = normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO);
    slot.aspectRatio === aspectRatio && slot.state !== "error" || (slot.aspectRatio = aspectRatio, slot.kind = "page", slot.state = "idle", slot.image = null, slot.errorMessage = null, slot.width = null, slot.height = null, slot.token += 1);
  }
  function clearNonPageSlotMeta(slot) {
    slot.kind !== "blank" && slot.kind !== "end" || (slot.state = "ready", slot.image = null, slot.errorMessage = null, slot.width = null, slot.height = null, slot.token += 1);
  }
  function pageSlotAspectRatio(slot) {
    return slot.width && slot.height && slot.width > 0 && slot.height > 0 ? slot.height / slot.width : normalizedAspectRatio(slot.aspectRatio, FALLBACK_ASPECT_RATIO);
  }
  delegateEvents(["pointerdown", "click"]);

  // src/components/Widgets/ProgressBar.css
  var ProgressBar_default = `.ehpeek-progress-bar::-webkit-slider-runnable-track {
  height: 0.4em;
  border-radius: 9999px;
  background: linear-gradient(
    var(--progress-bar-track-direction),
    var(--color-accent) 0 var(--progress-bar-fill),
    var(--color-track) var(--progress-bar-fill) 100%
  );
}

.ehpeek-progress-bar::-webkit-slider-thumb {
  width: 1.4em;
  height: 1.4em;
  margin-top: -0.5em;
  border: 2px solid var(--color-border);
  border-radius: 9999px;
  background: var(--color-text);
  box-shadow: 0 2px 10px var(--color-shadow-control);
  appearance: none;
  -webkit-appearance: none;
}

.ehpeek-progress-bar::-moz-range-track,
.ehpeek-progress-bar::-moz-range-progress {
  height: 0.4em;
  border-radius: 9999px;
}

.ehpeek-progress-bar::-moz-range-track {
  background: var(--color-track);
}

.ehpeek-progress-bar::-moz-range-progress {
  background: var(--color-accent);
}

.ehpeek-progress-bar::-moz-range-thumb {
  width: 1.4em;
  height: 1.4em;
  border: 2px solid var(--color-border);
  border-radius: 9999px;
  background: var(--color-text);
  box-shadow: 0 2px 10px var(--color-shadow-control);
}
`;

  // src/components/Widgets/ProgressBar.tsx
  var _tmpl$40 = /* @__PURE__ */ template("<input type=range>"), PROGRESS_BAR_CLASS = "ehpeek-progress-bar", PROGRESS_BAR_CLASS_NAME = [PROGRESS_BAR_CLASS, "w-full h-[2.4em] px-[0.6em] py-0 m-0", "bg-transparent", "cursor-grab active:cursor-grabbing touch-none select-none", "[-webkit-appearance:none] [appearance:none]", "[--progress-bar-fill:0%] [--progress-bar-track-direction:to_right]", "[accent-color:var(--color-text)]"].join(" ");
  registerGlobalStyle(PROGRESS_BAR_CLASS, ProgressBar_default);
  function ProgressBar(props) {
    let input;
    createEffect(() => {
      let direction = props.direction ?? "ltr";
      input.style.setProperty("--progress-bar-track-direction", direction === "rtl" ? "to left" : "to right"), input.style.setProperty("--progress-bar-fill", `${Math.min(100, Math.max(0, props.fillPercent ?? 0))}%`), !props.keepInputValue && props.value !== void 0 && (input.value = String(props.value));
    });
    let currentValue = (event) => Number(event.currentTarget.value || "");
    return (() => {
      var _el$ = _tmpl$40();
      return _el$.addEventListener("pointercancel", (event) => {
        props.onCommit?.(currentValue(event));
      }), _el$.$$pointerup = (event) => {
        props.onCommit?.(currentValue(event));
      }, _el$.addEventListener("change", (event) => {
        props.onCommit?.(currentValue(event));
      }), _el$.$$input = (event) => {
        props.onInput?.(currentValue(event));
      }, _el$.$$pointerdown = (event) => {
        props.onPointerDown?.(event);
      }, use((element) => {
        input = element, element.value = String(props.value ?? props.min);
      }, _el$), createRenderEffect((_p$) => {
        var _v$ = `${PROGRESS_BAR_CLASS_NAME}${props.className ? ` ${props.className}` : ""}`, _v$2 = String(props.min), _v$3 = String(Math.max(1, props.max ?? props.min)), _v$4 = String(props.step), _v$5 = props.direction ?? "ltr";
        return _v$ !== _p$.e && className(_el$, _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$, "min", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$, "max", _p$.a = _v$3), _v$4 !== _p$.o && setAttribute(_el$, "step", _p$.o = _v$4), _v$5 !== _p$.i && setAttribute(_el$, "dir", _p$.i = _v$5), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      }), _el$;
    })();
  }
  delegateEvents(["pointerdown", "input", "pointerup"]);

  // src/components/Reader/Toolbar.tsx
  var _tmpl$41 = /* @__PURE__ */ template('<div class="ehpeek-reader-fullscreen-status fixed z-3 flex items-center gap-sm pointer-events-none top-[calc(10px+env(safe-area-inset-top,0px))] left-[max(10px,env(safe-area-inset-left,0px))] py-xs px-md rounded-md bg-[var(--color-badge)] ehp-color-text font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap"role=status><span>'), _tmpl$213 = /* @__PURE__ */ template('<div class=contents><div class="ehpeek-reader-toolbar fixed z-3 flex justify-end pointer-events-none top-[calc(10px+env(safe-area-inset-top,0px))] right-10px coarse:top-[calc(8px+env(safe-area-inset-top,0px))] coarse:right-8px"><div><button type=button></button><button type=button></button><button type=button></button><button type=button></button><button type=button></button><button type=button></button><button type=button></button></div></div><div class="ehpeek-reader-page-number fixed z-3 pointer-events-none top-[calc(70px+env(safe-area-inset-top,0px))] left-1/2 right-auto -translate-x-1/2 coarse:top-[calc(80px+env(safe-area-inset-top,0px))] landscape:top-[calc(62px+env(safe-area-inset-top,0px))] landscape:left-auto landscape:right-10px landscape:translate-x-0 coarse-landscape:top-[calc(74px+env(safe-area-inset-top,0px))] coarse-landscape:right-8px min-w-64px landscape:min-w-0 max-w-none landscape:max-w-[calc(100vw-20px)] coarse-landscape:max-w-[calc(100vw-16px)] py-xs px-md rounded-md bg-[var(--color-badge)] ehp-color-text font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap text-center landscape:text-right"></div><div class="fixed z-2 flex items-center p-0 transition-[opacity,transform] duration-160 ease-in-out right-[max(12px,env(safe-area-inset-right,0px))] bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-[max(12px,env(safe-area-inset-left,0px))] [&amp;[data-open=false]]:opacity-0 [&amp;[data-open=false]]:translate-y-[calc(100%+16px)] [&amp;[data-open=false]]:pointer-events-none">'), _tmpl$310 = /* @__PURE__ */ template('<div class="fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65 pointer-events-auto"role=dialog aria-modal=true><div class="ehpeek-reader-download-dialog-panel w-full max-w-420px p-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] shadow-xl"><div class="flex items-center justify-between gap-md mb-lg"><div class="font-sans textsize-lg font-700"></div><button type=button></button></div><div class="grid gap-md font-sans textsize-md"><button type=button><span class=font-700></span><span class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap textsize-sm opacity-75"></span></button><button type=button><span class=font-700></span><span class="textsize-sm opacity-75">'), READER_BUTTON_CLASS = ["inline-flex min-w-48px h-48px items-center justify-center px-md py-0 rounded-md coarse:min-w-64px coarse:h-64px coarse:px-lg coarse:rounded-lg", "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer font-sans textsize-md font-700 leading-1 disabled:opacity-40 disabled:cursor-default"].join(" "), READER_ICON_SIZE = "1.4em", TIME_FORMATTER = new Intl.DateTimeFormat(void 0, {
    hour: "2-digit",
    minute: "2-digit"
  }), DOWNLOAD_OPTION_CLASS = ["flex w-full min-h-lg flex-col items-start justify-center gap-xs px-lg py-md rounded-md", "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer text-left", "hover:bg-[var(--color-badge)] disabled:opacity-40 disabled:cursor-default"].join(" ");
  function initialToolbarState() {
    return {
      controls: {
        mode: "scroll",
        readDirection: "rtl",
        rightTapAction: "previous"
      },
      downloadAvailable: !1,
      downloadDialog: null,
      fullscreenActive: !1,
      open: !1,
      progress: {
        pageNum: 1,
        maxProgressPageNum: 1
      }
    };
  }
  function Toolbar(props) {
    let controls = () => props.state.controls, progress = () => props.state.progress, open = () => props.state.open, modeButton = createMemo(() => modeButtonInfo(controls().mode)), readDirectionButton = createMemo(() => readDirectionButtonInfo(controls().readDirection)), rightTapButton = createMemo(() => rightTapButtonInfo(controls().rightTapAction)), fullscreenTime = createFullscreenTime(() => props.state.fullscreenActive);
    return (() => {
      var _el$ = _tmpl$213(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.nextSibling, _el$9 = _el$8.nextSibling, _el$0 = _el$9.nextSibling, _el$1 = _el$2.nextSibling, _el$12 = _el$1.nextSibling;
      return addEventListener(_el$2, "wheel", stopEvent), addEventListener(_el$2, "pointerdown", stopEvent, !0), addEventListener(_el$2, "click", stopEvent, !0), addEventListener(_el$4, "click", props.callbacks.onRightTapClick, !0), className(_el$4, READER_BUTTON_CLASS), insert(_el$4, () => rightTapButton().text), addEventListener(_el$5, "click", props.callbacks.onReadDirectionClick, !0), className(_el$5, READER_BUTTON_CLASS), insert(_el$5, createComponent(Icon, {
        get name() {
          return readDirectionButton().icon;
        },
        size: READER_ICON_SIZE
      })), addEventListener(_el$6, "click", props.callbacks.onModeClick, !0), className(_el$6, READER_BUTTON_CLASS), insert(_el$6, createComponent(Icon, {
        get name() {
          return modeButton().icon;
        },
        size: READER_ICON_SIZE
      })), addEventListener(_el$7, "click", props.callbacks.onDownloadClick, !0), className(_el$7, READER_BUTTON_CLASS), insert(_el$7, createComponent(Icon, {
        name: "download",
        size: READER_ICON_SIZE
      })), addEventListener(_el$8, "click", props.callbacks.onOpenOriginalPageClick, !0), className(_el$8, READER_BUTTON_CLASS), insert(_el$8, createComponent(Icon, {
        name: "external-link",
        size: READER_ICON_SIZE
      })), addEventListener(_el$9, "click", props.callbacks.onFullscreenClick, !0), className(_el$9, READER_BUTTON_CLASS), insert(_el$9, createComponent(Icon, {
        get name() {
          return props.state.fullscreenActive ? "fullscreen-exit" : "fullscreen";
        },
        size: READER_ICON_SIZE
      })), addEventListener(_el$0, "click", props.callbacks.onCloseClick, !0), className(_el$0, READER_BUTTON_CLASS), insert(_el$0, createComponent(Icon, {
        name: "close",
        size: READER_ICON_SIZE
      })), insert(_el$1, () => pageNumberText(progress().pageNum, progress().totalPages)), insert(_el$, createComponent(Show, {
        get when() {
          return props.state.fullscreenActive;
        },
        get children() {
          var _el$10 = _tmpl$41(), _el$11 = _el$10.firstChild;
          return insert(_el$11, fullscreenTime), _el$10;
        }
      }), _el$12), addEventListener(_el$12, "wheel", stopEvent), addEventListener(_el$12, "pointerdown", stopEvent, !0), addEventListener(_el$12, "click", stopEvent, !0), insert(_el$12, createComponent(ProgressBar, {
        className: "ehpeek-reader-progress textsize-lg",
        get direction() {
          return controls().readDirection === "rtl" ? "rtl" : "ltr";
        },
        get fillPercent() {
          return progressFillPercent(progress());
        },
        get keepInputValue() {
          return progress().keepInputValue;
        },
        get max() {
          return Math.max(1, progress().maxProgressPageNum);
        },
        min: 1,
        step: 1,
        get value() {
          return progress().pageNum;
        },
        get onPointerDown() {
          return props.callbacks.onProgressPointerDown;
        },
        get onInput() {
          return props.callbacks.onProgressInput;
        },
        get onCommit() {
          return props.callbacks.onProgressCommit;
        }
      })), insert(_el$, createComponent(Show, {
        get when() {
          return props.state.downloadDialog;
        },
        keyed: !0,
        children: (downloadDialog) => (() => {
          var _el$13 = _tmpl$310(), _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$19.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling;
          return addEventListener(_el$13, "wheel", stopEvent), addEventListener(_el$13, "pointerdown", stopEvent, !0), _el$13.$$click = (event) => {
            event.stopPropagation(), event.target === event.currentTarget && props.callbacks.onDownloadDialogClose();
          }, insert(_el$16, () => `${texts_default.reader.download} · ${downloadDialog.pageNum}`), addEventListener(_el$17, "click", props.callbacks.onDownloadDialogClose, !0), className(_el$17, READER_BUTTON_CLASS), insert(_el$17, createComponent(Icon, {
            name: "close",
            size: READER_ICON_SIZE
          })), addEventListener(_el$19, "click", props.callbacks.onDownloadCurrentClick, !0), className(_el$19, DOWNLOAD_OPTION_CLASS), insert(_el$20, () => texts_default.reader.downloadDisplayedImage), insert(_el$21, () => downloadDialog.currentFileName), addEventListener(_el$22, "click", props.callbacks.onDownloadOriginalClick, !0), className(_el$22, DOWNLOAD_OPTION_CLASS), insert(_el$23, () => texts_default.reader.downloadOriginalImage), insert(_el$24, (() => {
            var _c$ = memo(() => !!downloadDialog.originalImageUrl);
            return () => _c$() ? texts_default.reader.originalImageSource : texts_default.reader.originalImageUnavailable;
          })()), createRenderEffect((_p$) => {
            var _v$10 = texts_default.reader.download, _v$11 = texts_default.reader.close, _v$12 = texts_default.reader.close, _v$13 = !downloadDialog.originalImageUrl;
            return _v$10 !== _p$.e && setAttribute(_el$13, "aria-label", _p$.e = _v$10), _v$11 !== _p$.t && setAttribute(_el$17, "title", _p$.t = _v$11), _v$12 !== _p$.a && setAttribute(_el$17, "aria-label", _p$.a = _v$12), _v$13 !== _p$.o && (_el$22.disabled = _p$.o = _v$13), _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0
          }), _el$13;
        })()
      }), null), createRenderEffect((_p$) => {
        var _v$ = `ehpeek-reader-toolbar-buttons flex flex-row gap-md coarse:gap-lg pointer-events-auto${open() ? "" : " !hidden"}`, _v$2 = rightTapButton().title, _v$3 = readDirectionButton().title, _v$4 = modeButton().title, _v$5 = !props.state.downloadAvailable, _v$6 = texts_default.reader.download, _v$7 = texts_default.reader.openOriginalPage, _v$8 = props.state.fullscreenActive ? texts_default.reader.exitFullscreen : texts_default.reader.enterFullscreen, _v$9 = texts_default.reader.close, _v$0 = controls().mode === "scroll" && !open() && !props.state.fullscreenActive, _v$1 = String(open());
        return _v$ !== _p$.e && className(_el$3, _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$4, "title", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$5, "title", _p$.a = _v$3), _v$4 !== _p$.o && setAttribute(_el$6, "title", _p$.o = _v$4), _v$5 !== _p$.i && (_el$7.disabled = _p$.i = _v$5), _v$6 !== _p$.n && setAttribute(_el$7, "title", _p$.n = _v$6), _v$7 !== _p$.s && setAttribute(_el$8, "title", _p$.s = _v$7), _v$8 !== _p$.h && setAttribute(_el$9, "title", _p$.h = _v$8), _v$9 !== _p$.r && setAttribute(_el$0, "title", _p$.r = _v$9), _v$0 !== _p$.d && (_el$1.hidden = _p$.d = _v$0), _v$1 !== _p$.l && setAttribute(_el$12, "data-open", _p$.l = _v$1), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0,
        s: void 0,
        h: void 0,
        r: void 0,
        d: void 0,
        l: void 0
      }), _el$;
    })();
  }
  function createFullscreenTime(enabled) {
    let [time, setTime] = createSignal(TIME_FORMATTER.format(/* @__PURE__ */ new Date()));
    return createEffect(() => {
      if (!enabled())
        return;
      let updateTime = () => setTime(TIME_FORMATTER.format(/* @__PURE__ */ new Date()));
      updateTime();
      let interval = null, timeout = window.setTimeout(() => {
        updateTime(), interval = window.setInterval(updateTime, 6e4);
      }, 6e4 - Date.now() % 6e4);
      onCleanup(() => {
        window.clearTimeout(timeout), interval !== null && window.clearInterval(interval);
      });
    }), time;
  }
  function progressFillPercent(progress) {
    let max = Math.max(1, progress.maxProgressPageNum), value = Math.min(max, Math.max(1, progress.pageNum));
    return max > 1 ? (value - 1) / (max - 1) * 100 : 100;
  }
  function pageNumberText(pageNum, totalPages) {
    return totalPages && pageNum === totalPages + 1 ? texts_default.reader.endPage : totalPages ? `${pageNum} / ${totalPages}` : String(pageNum);
  }
  function modeButtonInfo(mode) {
    let paged = mode === "paged";
    return {
      icon: paged ? "arrows-horizontal" : "arrows-vertical",
      title: paged ? texts_default.reader.scrollMode : texts_default.reader.pagedMode
    };
  }
  function readDirectionButtonInfo(direction) {
    let rtl = direction === "rtl";
    return {
      icon: rtl ? "arrow-left" : "arrow-right",
      title: rtl ? texts_default.reader.readLeftToRight : texts_default.reader.readRightToLeft
    };
  }
  function rightTapButtonInfo(action) {
    let previous = action === "previous";
    return {
      text: previous ? "R-" : "R+",
      title: previous ? texts_default.reader.rightTapNext : texts_default.reader.rightTapPrevious
    };
  }
  delegateEvents(["click", "pointerdown"]);

  // src/components/Reader/ZoomOverlay.tsx
  var _tmpl$48 = /* @__PURE__ */ template('<div class="fixed inset-0 z-4 flex items-center justify-center overflow-hidden ehp-color-reader pointer-events-none"><img class="block max-w-screen max-h-screen object-contain origin-center select-none will-change-transform [-webkit-user-drag:none]">'), MIN_SCALE = 1, MAX_SCALE = 5, CLOSE_SCALE = 1.02;
  function ZoomOverlay(props) {
    let [transform, setTransform] = createSignal("translate3d(0px, 0px, 0) scale(1)"), element, scale = 1, requestedScale = 1, offsetX = 0, offsetY = 0, pinchStartScale = 1, pinchStartOffsetX = 0, pinchStartOffsetY = 0, pinchStartCenterX = 0, pinchStartCenterY = 0, dragStartOffsetX = 0, dragStartOffsetY = 0, renderTransform = () => {
      setTransform(`translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`);
    }, startPinch = (pinch) => {
      pinchStartScale = scale, pinchStartOffsetX = offsetX, pinchStartOffsetY = offsetY, pinchStartCenterX = pinch.centerX, pinchStartCenterY = pinch.centerY;
    }, actions = {
      reset(pinch) {
        scale = 1, requestedScale = 1, offsetX = 0, offsetY = 0, startPinch(pinch), renderTransform();
      },
      startPinch,
      movePinch(pinch) {
        if (!props.image)
          return;
        requestedScale = pinchStartScale * pinch.scale, scale = clamp(requestedScale, MIN_SCALE, MAX_SCALE);
        let rect = element.getBoundingClientRect(), viewportCenterX = rect.left + rect.width / 2, viewportCenterY = rect.top + rect.height / 2, ratio = scale / pinchStartScale;
        offsetX = pinch.centerX - viewportCenterX - (pinchStartCenterX - viewportCenterX - pinchStartOffsetX) * ratio, offsetY = pinch.centerY - viewportCenterY - (pinchStartCenterY - viewportCenterY - pinchStartOffsetY) * ratio, renderTransform();
      },
      endPinch() {
        if (requestedScale <= CLOSE_SCALE) {
          props.onClose();
          return;
        }
        renderTransform();
      },
      startDrag() {
        dragStartOffsetX = offsetX, dragStartOffsetY = offsetY;
      },
      moveDrag(move) {
        props.image && (offsetX = dragStartOffsetX + move.dx, offsetY = dragStartOffsetY + move.dy, renderTransform());
      }
    };
    return props.actionsRef(actions), (() => {
      var _el$ = _tmpl$48(), _el$2 = _el$.firstChild, _ref$ = element;
      return typeof _ref$ == "function" ? use(_ref$, _el$) : element = _el$, createRenderEffect((_p$) => {
        var _v$ = !props.image, _v$2 = props.image ? "" : "none", _v$3 = props.image?.imageUrl, _v$4 = props.image ? `Page ${props.image.pageNum}` : "", _v$5 = props.image?.width ?? void 0, _v$6 = props.image?.height ?? void 0, _v$7 = transform();
        return _v$ !== _p$.e && (_el$.hidden = _p$.e = _v$), _v$2 !== _p$.t && setStyleProperty(_el$, "display", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$2, "src", _p$.a = _v$3), _v$4 !== _p$.o && setAttribute(_el$2, "alt", _p$.o = _v$4), _v$5 !== _p$.i && setAttribute(_el$2, "width", _p$.i = _v$5), _v$6 !== _p$.n && setAttribute(_el$2, "height", _p$.n = _v$6), _v$7 !== _p$.s && setStyleProperty(_el$2, "transform", _p$.s = _v$7), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0,
        s: void 0
      }), _el$;
    })();
  }

  // src/components/Reader/index.css
  var Reader_default = `#ehpeek-reader,
#ehpeek-reader * {
  box-sizing: border-box;
}

[data-ehpeek-reader-container="true"]:fullscreen {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-background);
}

[data-ehpeek-reader-container="true"]:fullscreen .ehpeek-reader-toolbar-buttons {
  transform: scale(var(--ehpeek-reader-fullscreen-ui-scale, 1));
  transform-origin: top right;
}

[data-ehpeek-reader-container="true"]:fullscreen .ehpeek-reader-download-dialog-panel,
[data-ehpeek-reader-container="true"]:fullscreen .ehpeek-reader-page-reload {
  transform: scale(var(--ehpeek-reader-fullscreen-ui-scale, 1));
  transform-origin: center;
}

[data-ehpeek-reader-container="true"]:fullscreen .ehpeek-reader-progress {
  font-size: var(--ehpeek-reader-fullscreen-progress-size, var(--font-size-lg));
}

[data-ehpeek-reader-container="true"]:fullscreen .ehpeek-reader-fullscreen-status {
  top: calc(10px + env(safe-area-inset-top, 0px));
  right: max(10px, env(safe-area-inset-right, 0px));
  left: auto;
}

[data-ehpeek-reader-container="true"]:fullscreen .ehpeek-reader-page-number {
  top: calc(10px + env(safe-area-inset-top, 0px));
  right: auto;
  left: max(10px, env(safe-area-inset-left, 0px));
  min-width: 0;
  transform: none;
  text-align: left;
}

[data-ehpeek-reader-container="true"]:fullscreen .ehpeek-reader-toolbar {
  top: calc(42px + env(safe-area-inset-top, 0px));
}

[data-ehpeek-reader-container="true"]:fullscreen
  #ehpeek-reader[data-view-mode="scroll"]
  .ehpeek-reader-page-strip {
  padding-top: 0;
}
`;

  // src/components/Reader/index.tsx
  var _tmpl$49 = /* @__PURE__ */ template('<div id=ehpeek-reader class="fixed inset-0 z-reader ehp-color-reader font-sans textsize-sm leading-[1.4]"><header class=contents>'), VIEWER_ID = "ehpeek-reader", STYLE_ID = "ehpeek-reader-style", DEFAULT_WINDOW_SIZE = 10, DEFAULT_NEAR_CONCURRENT_LOADS = 3, DEFAULT_FAR_CONCURRENT_LOADS = 6, NEAR_LOAD_AHEAD = 3, PAGED_SWIPE_THRESHOLD = 24, PAGED_WHEEL_THRESHOLD = 8, PROGRESS_IDLE_COMMIT_MS = 1e3, DOUBLE_TAP_MS = 340, DOUBLE_TAP_DISTANCE = 36, TAP_CANCEL_DISTANCE = 8, FALLBACK_ASPECT_RATIO2 = 1.42, FULLSCREEN_UI_SCALE_PROPERTY = "--ehpeek-reader-fullscreen-ui-scale", FULLSCREEN_PROGRESS_SIZE_PROPERTY = "--ehpeek-reader-fullscreen-progress-size";
  async function enterReaderFullscreen(target) {
    let scaleBefore = window.visualViewport?.scale ?? 1;
    await target.requestFullscreen(), await new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
    let scaleAfter = window.visualViewport?.scale ?? 1, uiScale = clamp(scaleBefore / Math.max(scaleAfter, 0.01), 0.25, 1), progressSize = Number.parseFloat(getComputedStyle(target).getPropertyValue("--font-size-lg")) || 24;
    target.style.setProperty(FULLSCREEN_UI_SCALE_PROPERTY, String(uiScale)), target.style.setProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY, `${progressSize * uiScale}px`);
  }
  function clearReaderFullscreenScale(target) {
    target.style.removeProperty(FULLSCREEN_UI_SCALE_PROPERTY), target.style.removeProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY);
  }
  var TwoTierImageQueue = class {
    constructor(loadTarget, markLoading, onLoaded, onError, nearConcurrentLoads, farConcurrentLoads) {
      __publicField(this, "nearQueue", /* @__PURE__ */ new Map());
      __publicField(this, "farQueue", /* @__PURE__ */ new Map());
      __publicField(this, "activeNearLoads", 0);
      __publicField(this, "activeTotalLoads", 0);
      __publicField(this, "timer", null);
      __publicField(this, "disposed", !1);
      this.loadTarget = loadTarget, this.markLoading = markLoading, this.onLoaded = onLoaded, this.onError = onError, this.nearConcurrentLoads = nearConcurrentLoads, this.farConcurrentLoads = farConcurrentLoads;
    }
    dispose() {
      this.disposed = !0, this.nearQueue.clear(), this.farQueue.clear(), this.timer !== null && (window.clearTimeout(this.timer), this.timer = null);
    }
    sync(targets, currentPageNum, direction, windowNumbers, preloadWindowSize) {
      for (let queue of [this.nearQueue, this.farQueue])
        for (let pageNum of queue.keys())
          windowNumbers.has(pageNum) || queue.delete(pageNum);
      this.enqueue(targets.find((target) => target.pageNum === currentPageNum), "near");
      for (let offset = 1; offset <= preloadWindowSize; offset += 1) {
        let pageNum = currentPageNum + offset * direction, target = targets.find((candidate) => candidate.pageNum === pageNum);
        target && this.enqueue(target, offset <= NEAR_LOAD_AHEAD ? "near" : "far");
      }
      this.schedule();
    }
    enqueue(target, tier) {
      if (!target)
        return;
      let pageNum = target.pageNum;
      if (tier === "near") {
        this.farQueue.delete(pageNum), this.nearQueue.set(pageNum, target);
        return;
      }
      this.nearQueue.has(pageNum) || this.farQueue.set(pageNum, target);
    }
    schedule() {
      this.timer !== null || this.disposed || (this.timer = window.setTimeout(() => {
        this.timer = null, this.process();
      }, 0));
    }
    process() {
      if (!this.disposed)
        for (; this.activeTotalLoads < this.currentConcurrency(); ) {
          let tier = this.nearQueue.size > 0 ? "near" : this.activeNearLoads > 0 ? null : "far";
          if (tier === null)
            return;
          let queue = tier === "near" ? this.nearQueue : this.farQueue, target = queue.values().next().value;
          if (!target)
            return;
          queue.delete(target.pageNum), this.start(target, tier);
        }
    }
    currentConcurrency() {
      return this.nearQueue.size > 0 || this.activeNearLoads > 0 ? Math.min(this.nearConcurrentLoads, this.farConcurrentLoads) : this.farConcurrentLoads;
    }
    start(target, tier) {
      let token = this.markLoading(target.pageNum);
      token !== null && (this.activeTotalLoads += 1, tier === "near" && (this.activeNearLoads += 1), this.loadTarget(target).then((loaded) => {
        this.disposed || this.onLoaded(target, loaded, token);
      }).catch((error) => {
        this.disposed || this.onError(target, error, token);
      }).finally(() => {
        this.activeTotalLoads -= 1, tier === "near" && (this.activeNearLoads -= 1), this.process();
      }));
    }
  };
  function pagesPointerGestureCallbacks(callbacks) {
    let shouldStartDrag = (event) => event instanceof PointerEvent ? (event.pointerType, event.button, event.buttons, targetSummary(event.target), event.pointerType === "mouse" && event.button !== 0 ? (event.button, event.buttons, !1) : callbacks.shouldStartDrag(event)) : !1, shouldObserveTap = (event) => event instanceof PointerEvent && event.pointerType !== "mouse" && !callbacks.shouldStartDrag(event), onDragEnd = (info, event) => {
      callbacks.onDragEnd(info, event);
    };
    return {
      shouldCaptureDrag: shouldStartDrag,
      onStart: callbacks.onDragStart,
      onMove: callbacks.onDragMove,
      onEnd: onDragEnd,
      onTap: callbacks.onTap,
      dragStartThreshold: TAP_CANCEL_DISTANCE,
      tapMoveThreshold: TAP_CANCEL_DISTANCE,
      shouldObserveTap,
      onPinchStart: callbacks.onPinchStart,
      onPinchMove: callbacks.onPinchMove,
      onPinchEnd: callbacks.onPinchEnd
    };
  }
  function removePreviousReaderRoot() {
    let previous = document.getElementById(VIEWER_ID), previousContainer = previous?.parentElement;
    if (previousContainer?.dataset.ehpeekReaderContainer === "true") {
      previousContainer.remove();
      return;
    }
    previous?.remove();
  }
  function handlePagesKeydown(event, callbacks) {
    if (!shouldIgnoreKeyboardEvent(event)) {
      if (event.key === "Escape") {
        callbacks.onKeyboardClose() && event.preventDefault();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault(), callbacks.onKeyboardArrow("left");
        return;
      }
      event.key === "ArrowRight" && (event.preventDefault(), callbacks.onKeyboardArrow("right"));
    }
  }
  function initialViewportWindow(options) {
    return {
      currentPageNum: initialPageNumber(options),
      windowSize: options.renderWindowSize ?? DEFAULT_WINDOW_SIZE,
      totalPages: options.totalPages && options.totalPages > 0 ? options.totalPages : void 0,
      pages: /* @__PURE__ */ new Map()
    };
  }
  function initialPageNumber(options) {
    let totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : Number.MAX_SAFE_INTEGER;
    return clamp(Math.round(options.initialPageNum), 1, totalPages);
  }
  function FullscreenReader(props) {
    let [toolbarState, setToolbarState] = createStore(initialToolbarState()), [viewportWindow, setViewportWindow] = createSignal(initialViewportWindow(props.options)), [zoomImage, setZoomImage] = createSignal(null), [rootState, setRootState] = createStore({
      readDirection: state.reader.readDirection.value,
      toolbarOpen: !1,
      viewMode: state.reader.viewMode.value
    }), viewportActions, zoomOverlayActions, readerSession, closeDownloadDialog = () => setToolbarState({
      downloadDialog: null
    }), toolbarCallbacks = {
      onReadDirectionClick: () => readerSession.toggleReadDirection(),
      onRightTapClick: () => readerSession.toggleRightTapAction(),
      onModeClick: () => readerSession.setMode(state.reader.viewMode.value === "paged" ? "scroll" : "paged"),
      onCloseClick: () => readerSession.close(),
      onDownloadClick: () => {
        let downloadDialog = readerSession.downloadDialog();
        downloadDialog && setToolbarState({
          downloadDialog
        });
      },
      onDownloadCurrentClick: () => {
        let downloadDialog = toolbarState.downloadDialog;
        downloadDialog && readerSession.downloadDisplayedImage(downloadDialog) && closeDownloadDialog();
      },
      onDownloadDialogClose: closeDownloadDialog,
      onDownloadOriginalClick: () => {
        let downloadDialog = toolbarState.downloadDialog;
        downloadDialog && readerSession.downloadOriginalImage(downloadDialog) && closeDownloadDialog();
      },
      onFullscreenClick: () => {
        readerSession.toggleFullscreen();
      },
      onOpenOriginalPageClick: () => readerSession.openOriginalPage(),
      onProgressPointerDown: (event) => readerSession.handleProgressPointerDown(event),
      onProgressInput: (pageNum) => readerSession.handleProgressInput(pageNum),
      onProgressCommit: (pageNum) => readerSession.handleProgressCommit(pageNum)
    }, gestureCallbacks = {
      onTap: (info, event) => readerSession.handleTap(info, event),
      onKeyboardClose: () => toolbarState.downloadDialog ? (closeDownloadDialog(), !0) : readerSession.handleKeyboardClose(),
      onKeyboardArrow: (direction) => readerSession.handleKeyboardArrow(direction),
      onWheel: (delta, event) => readerSession.handleWheel(delta, event),
      shouldStartDrag: (event) => readerSession.shouldStartDrag(event),
      onDragStart: (info, event) => readerSession.handleDragStart(info, event),
      onDragMove: (info, event) => readerSession.handleDragMove(info, event),
      onDragEnd: (info, event) => readerSession.handleDragEnd(info, event),
      onPinchStart: (info) => readerSession.handlePinchStart(info),
      onPinchMove: (info) => zoomOverlayActions.movePinch({
        centerX: info.clientX,
        centerY: info.clientY,
        scale: info.scale
      }),
      onPinchEnd: () => zoomOverlayActions.endPinch(),
      onNativeScroll: () => readerSession.handleNativeScroll()
    }, viewportCallbacks = {
      onNativeScroll: gestureCallbacks.onNativeScroll,
      onReloadPage: (pageNum) => readerSession.reloadPage(pageNum),
      onWheel: gestureCallbacks.onWheel,
      pointer: pagesPointerGestureCallbacks(gestureCallbacks)
    }, sessionCallbacks = {
      isZoomActive: () => zoomImage() !== null,
      onControlsChange: (controls) => {
        setRootState({
          readDirection: controls.readDirection,
          viewMode: controls.mode
        }), setToolbarState({
          controls
        });
      },
      onFullscreenChange: (active) => setToolbarState({
        fullscreenActive: active
      }),
      onPageChange: (progress, downloadAvailable) => {
        setToolbarState({
          downloadAvailable,
          downloadDialog: toolbarState.downloadDialog?.pageNum === progress.pageNum ? toolbarState.downloadDialog : null,
          progress
        });
      },
      onProgressChange: (progress) => setToolbarState({
        progress
      }),
      onToolbarToggle: () => {
        let open = !toolbarState.open;
        setToolbarState({
          open
        }), setRootState({
          toolbarOpen: open
        });
      },
      onViewportWindowChange: (window2) => setViewportWindow(window2),
      onZoomClose: () => setZoomImage(null),
      onZoomOpen: (image, pinch) => {
        setZoomImage(image), zoomOverlayActions.reset(pinch);
      }
    };
    return onMount(() => {
      let previousDocumentOverflow = document.documentElement.style.overflow, previousBodyOverflow = document.body.style.overflow;
      readerSession = new ReaderSession(props.options, {
        callbacks: sessionCallbacks,
        close: props.onClosed
      }, viewportActions, zoomOverlayActions), registerGlobalStyle(STYLE_ID, Reader_default), document.documentElement.style.overflow = "hidden", document.body.style.overflow = "hidden", props.actionsRef({
        close: () => readerSession.close()
      });
      let onKeydown = (event) => {
        handlePagesKeydown(event, gestureCallbacks);
      };
      document.addEventListener("keydown", onKeydown, !0), readerSession.open(), onCleanup(() => {
        props.onActionsDispose(), readerSession.dispose(), document.removeEventListener("keydown", onKeydown, !0), document.documentElement.style.overflow = previousDocumentOverflow, document.body.style.overflow = previousBodyOverflow;
      });
    }), (() => {
      var _el$ = _tmpl$49(), _el$2 = _el$.firstChild;
      return insert(_el$2, createComponent(Toolbar, {
        callbacks: toolbarCallbacks,
        state: toolbarState
      })), insert(_el$, createComponent(PagesViewport, {
        actionsRef: (actions) => {
          viewportActions = actions;
        },
        callbacks: viewportCallbacks,
        get mode() {
          return rootState.viewMode;
        },
        get readDirection() {
          return rootState.readDirection;
        },
        get window() {
          return viewportWindow();
        }
      }), null), insert(_el$, createComponent(ZoomOverlay, {
        actionsRef: (actions) => {
          zoomOverlayActions = actions;
        },
        get image() {
          return zoomImage();
        },
        onClose: () => setZoomImage(null)
      }), null), createRenderEffect((_p$) => {
        var _v$ = rootState.readDirection, _v$2 = String(rootState.toolbarOpen), _v$3 = rootState.viewMode;
        return _v$ !== _p$.e && setAttribute(_el$, "data-read-direction", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$, "data-toolbar-open", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$, "data-view-mode", _p$.a = _v$3), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$;
    })();
  }
  var ReaderSession = class {
    constructor(options, bindings, viewport, zoomOverlay) {
      __publicField(this, "pages", /* @__PURE__ */ new Map());
      __publicField(this, "loadedImages", /* @__PURE__ */ new Map());
      __publicField(this, "direction", 1);
      __publicField(this, "scrollFrame", null);
      __publicField(this, "progressNavigationTimer", null);
      __publicField(this, "tapTimer", null);
      __publicField(this, "pendingTap", null);
      __publicField(this, "pendingProgressNavigationPageNum", null);
      __publicField(this, "progressNavigating", !1);
      __publicField(this, "pagedTargetPageNumber", null);
      __publicField(this, "syncToken", 0);
      __publicField(this, "historyEntry", !1);
      __publicField(this, "closing", !1);
      __publicField(this, "closed", !1);
      __publicField(this, "keepReaderAfterFullscreenExit", !1);
      __publicField(this, "onPopState", () => {
        this.historyEntry && (this.historyEntry = !1, this.finishClose(), this.onExit?.());
      });
      __publicField(this, "onImageLoaded", (target, loaded, token) => {
        pageWindowNumbers(this.currentPageNum, this.renderWindowSize).includes(target.pageNum) && this.installImage(target, loaded, token);
      });
      __publicField(this, "onImageError", (target, error, token) => {
        let message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
        this.viewport.setPageError(target.pageNum, token, message);
      });
      __publicField(this, "handleProgressPointerDown", (event) => {
        this.progressNavigating = !0, this.cancelProgressNavigation(), event.stopPropagation();
      });
      __publicField(this, "handleProgressInput", (pageNum) => {
        if (!Number.isFinite(pageNum) || pageNum <= 0)
          return;
        this.progressNavigating = !0;
        let target = clamp(Math.round(pageNum), 1, this.maxProgressPageNum());
        this.pendingProgressNavigationPageNum = target, this.navigateProgressPage(target), this.cancelProgressNavigation(), this.progressNavigationTimer = window.setTimeout(() => this.handleProgressCommit(this.pendingProgressNavigationPageNum ?? this.currentPageNum), PROGRESS_IDLE_COMMIT_MS);
      });
      __publicField(this, "handleProgressCommit", (value) => {
        if (!this.progressNavigating && this.pendingProgressNavigationPageNum === null)
          return;
        let pageNum = this.pendingProgressNavigationPageNum ?? value;
        this.progressNavigating = !1, this.pendingProgressNavigationPageNum = null, this.cancelProgressNavigation(), Number.isFinite(pageNum) && pageNum > 0 && this.setCurrentPageNumber(pageNum, !0);
      });
      __publicField(this, "onFullscreenChange", () => {
        let fullscreenActive = document.fullscreenElement === this.fullscreenTarget, fullscreenExited = this.fullscreenWasActive && !fullscreenActive, keepReaderOpen = this.keepReaderAfterFullscreenExit;
        this.fullscreenWasActive = fullscreenActive, this.keepReaderAfterFullscreenExit = !1, fullscreenActive || clearReaderFullscreenScale(this.fullscreenTarget), this.callbacks.onFullscreenChange(fullscreenActive), fullscreenExited && this.finishFullscreenExit(keepReaderOpen);
      });
      this.fullscreenTarget = options.fullscreenTarget, this.fullscreenWasActive = document.fullscreenElement === this.fullscreenTarget, this.galleryId = options.galleryId, this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : void 0, this.renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE, this.currentPageNum = initialPageNumber(options), this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE, this.provider = options.provider, this.onExit = options.onExit, this.onActivePageChange = options.onActivePageChange, this.onOpenOriginalPage = options.onOpenOriginalPage, this.onBeforeEnterFullscreen = options.onBeforeEnterFullscreen, this.restorePageViewport = options.restorePageViewport, this.callbacks = bindings.callbacks, this.closeComponent = bindings.close, this.viewport = viewport, this.zoomOverlay = zoomOverlay, this.imageQueue = new TwoTierImageQueue((target) => this.provider.loadPage(target.page), (pageNum) => this.viewport.markPageLoading(pageNum), this.onImageLoaded, this.onImageError, options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS, options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS);
    }
    open() {
      this.viewport.focus(), this.onExit && (window.history.pushState({
        ehpeekReader: !0
      }, "", window.location.href), this.historyEntry = !0, window.addEventListener("popstate", this.onPopState)), document.addEventListener("fullscreenchange", this.onFullscreenChange), this.syncInitialUi(), this.syncAfterPageChange({
        scrollIntoView: !0
      });
    }
    dispose() {
      this.cleanup();
    }
    close() {
      if (!(this.closed || this.closing)) {
        if (this.historyEntry) {
          this.closing = !0, window.history.back();
          return;
        }
        this.finishClose();
      }
    }
    syncInitialUi() {
      this.syncFullscreenState(), this.syncReaderControls(), this.updatePageNumber();
    }
    finishClose() {
      this.cleanup() && this.closeComponent();
    }
    cleanup() {
      return this.closed ? !1 : (this.closed = !0, this.cancelProgressNavigation(), this.cancelPendingTap(), this.imageQueue.dispose(), window.removeEventListener("popstate", this.onPopState), document.removeEventListener("fullscreenchange", this.onFullscreenChange), document.fullscreenElement === this.fullscreenTarget && document.exitFullscreen().then(() => this.restorePageViewport?.()).catch((error) => {
        console.warn("[ehpeek] Failed to exit fullscreen", error);
      }), clearReaderFullscreenScale(this.fullscreenTarget), this.scrollFrame !== null && (window.cancelAnimationFrame(this.scrollFrame), this.scrollFrame = null), this.viewport.stopMotion(), !0);
    }
    setCurrentPageNumber(pageNumber, scrollIntoView, scrollMotion = "instant") {
      this.pagedTargetPageNumber = null;
      let target = clamp(Math.round(pageNumber), 1, this.maxProgressPageNum());
      target !== this.currentPageNum && (this.direction = target > this.currentPageNum ? 1 : -1, this.currentPageNum = target), this.syncAfterPageChange({
        scrollIntoView,
        scrollMotion
      });
    }
    syncAfterPageChange(options) {
      let token = ++this.syncToken, missing = pageWindowNumbers(this.currentPageNum, this.renderWindowSize).filter((number) => this.isRealPageNum(number) && !this.pages.has(number));
      this.syncViewportWindow(), this.maintainLoadQueue(), this.notifyActivePageChange(), options.scrollIntoView && this.scrollToCurrentPage(options.scrollMotion), missing.length > 0 && this.loadMissingPages(missing, token);
    }
    rebuildForCurrentMode() {
      this.viewport.stopMotion(), this.viewport.resetPosition(), this.syncAfterPageChange({
        scrollIntoView: !0
      });
    }
    async loadMissingPages(pageNums, token) {
      let incoming;
      try {
        incoming = await this.provider.getPages(pageNums);
      } catch (error) {
        console.error("[ehpeek]", error);
        return;
      }
      this.closed || token !== this.syncToken || (this.addPages(incoming), this.syncViewportWindow(), this.maintainLoadQueue(), this.notifyActivePageChange());
    }
    addPages(pages) {
      for (let [index, page] of pages.entries()) {
        let pageNum = pageNumForPage(page, index);
        pageNum > 0 && this.pages.set(pageNum, {
          ...page,
          aspectRatio: normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO2),
          pageNum
        });
      }
    }
    syncViewportWindow() {
      this.callbacks.onViewportWindowChange({
        currentPageNum: this.currentPageNum,
        windowSize: this.renderWindowSize,
        totalPages: this.totalPages,
        pages: this.pageMetaForViewport()
      }), this.updatePageNumber();
    }
    maintainLoadQueue() {
      let targets = pageWindowNumbers(this.currentPageNum, this.renderWindowSize).map((pageNum) => this.loadTargetFor(pageNum)).filter((target) => !!target), windowSet = new Set(targets.map((target) => target.pageNum));
      this.imageQueue.sync(targets, this.currentPageNum, this.direction, windowSet, this.preloadWindowSize);
    }
    pageMetaForViewport() {
      return new Map(Array.from(this.pages, ([pageNum, page]) => [pageNum, {
        aspectRatio: page.aspectRatio
      }]));
    }
    loadTargetFor(pageNum) {
      let page = this.pages.get(pageNum);
      return page ? {
        pageNum,
        page
      } : null;
    }
    maxProgressPageNum() {
      return this.totalPages ? this.totalPages + 1 : Number.MAX_SAFE_INTEGER;
    }
    isRealPageNum(pageNum) {
      return pageNum >= 1 && (!this.totalPages || pageNum <= this.totalPages);
    }
    turnPageBy(delta) {
      if (state.reader.viewMode.value === "paged") {
        this.animatePagedStep(delta);
        return;
      }
      this.setCurrentPageNumber(this.currentPageNum + delta, !0);
    }
    animatePagedStep(delta) {
      let base = this.pagedTargetPageNumber ?? this.currentPageNum, target = clamp(Math.round(base + delta), 1, this.maxProgressPageNum());
      if (target === base) {
        this.scrollToCurrentPage("animated");
        return;
      }
      if (this.viewport.pageOffset(target) === null) {
        this.pagedTargetPageNumber = null, this.setCurrentPageNumber(target, !0, "animated");
        return;
      }
      this.direction = target > base ? 1 : -1, this.pagedTargetPageNumber = target, this.viewport.moveToPage(target, "animated", () => {
        this.pagedTargetPageNumber === target && (this.pagedTargetPageNumber = null, this.setCurrentPageNumber(target, !0));
      });
    }
    scrollToCurrentPage(motion = "instant") {
      this.viewport.moveToPage(this.currentPageNum, motion);
    }
    reloadPage(pageNum) {
      this.viewport.resetPageError(pageNum) && this.maintainLoadQueue();
    }
    async installImage(target, loaded, token) {
      let imageUrl = loaded.imageUrl, width = positiveNumber(loaded.width), height = positiveNumber(loaded.height), slotImage = {
        imageUrl,
        highPriority: target.pageNum === this.currentPageNum,
        width,
        height
      };
      try {
        await this.viewport.loadPageImage(target.pageNum, token, slotImage);
      } catch (error) {
        let message = error instanceof Error ? error.message : texts_default.errors.imageLoadFailed;
        this.viewport.setPageError(target.pageNum, token, message);
        return;
      }
      this.closed || (this.loadedImages.set(target.pageNum, {
        pageNum: target.pageNum,
        imageUrl,
        originalImageUrl: loaded.originalImageUrl ?? null,
        width,
        height
      }), target.pageNum === this.currentPageNum && this.updatePageNumber());
    }
    updatePageNumber() {
      this.callbacks.onPageChange({
        pageNum: this.currentPageNum,
        totalPages: this.totalPages,
        maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
        keepInputValue: this.progressNavigating
      }, this.loadedImages.has(this.currentPageNum));
    }
    notifyActivePageChange() {
      let page = this.pages.get(this.currentPageNum);
      page && this.onActivePageChange?.(page);
    }
    handleKeyboardArrow(direction) {
      this.callbacks.isZoomActive() || this.turnPageBy(direction === "left" ? this.leftTapDelta() : this.rightTapDelta());
    }
    handleWheel(delta, event) {
      if (this.callbacks.isZoomActive()) {
        event.preventDefault();
        return;
      }
      state.reader.viewMode.value === "paged" && (event.preventDefault(), !this.viewport.isDragging() && Math.abs(delta) >= PAGED_WHEEL_THRESHOLD && this.turnPageBy(delta > 0 ? 1 : -1));
    }
    shouldStartDrag(event) {
      return this.callbacks.isZoomActive() ? !0 : state.reader.viewMode.value === "paged" || event.pointerType === "mouse";
    }
    handleDragStart(_info, _event) {
      if (this.callbacks.isZoomActive()) {
        this.zoomOverlay.startDrag();
        return;
      }
      this.viewport.beginDrag();
    }
    handleDragMove(info, event) {
      if (this.callbacks.isZoomActive()) {
        this.zoomOverlay.moveDrag(info);
        return;
      }
      let before = this.viewport.scrollTop();
      this.viewport.moveDrag({
        dx: info.dx,
        dy: info.dy
      }) && ((Math.abs(info.dx) >= TAP_CANCEL_DISTANCE || Math.abs(info.dy) >= TAP_CANCEL_DISTANCE) && this.cancelPendingTap(), pointerTypeForEvent(event), info.clientY, void 0);
    }
    handleDragEnd(info, event) {
      if (!this.callbacks.isZoomActive()) {
        if (pointerTypeForEvent(event), this.viewport.scrollTop(), info.dx, info.dy, this.viewport.cancelDrag(), state.reader.viewMode.value !== "paged") {
          this.viewport.moveToTop(this.viewport.scrollTop()), this.viewport.startVerticalFlingFromDragVelocity(info.velocityY, () => this.updateCurrentFromScroll()), this.updateCurrentFromScroll();
          return;
        }
        info.dx >= PAGED_SWIPE_THRESHOLD ? this.turnPageBy(this.rightDragDelta()) : info.dx <= -PAGED_SWIPE_THRESHOLD ? this.turnPageBy(this.leftDragDelta()) : this.scrollToCurrentPage("animated");
      }
    }
    handleNativeScroll() {
      if (this.callbacks.isZoomActive() || this.viewport.isDragging() || state.reader.viewMode.value === "paged")
        return;
      let previousScrollTop = this.viewport.scrollTop();
      this.viewport.moveToTop(previousScrollTop), this.viewport.scrollTop() === previousScrollTop && this.scrollFrame === null && (this.scrollFrame = window.requestAnimationFrame(() => {
        this.scrollFrame = null, this.updateCurrentFromScroll();
      }));
    }
    updateCurrentFromScroll() {
      let next = this.viewport.centerPageNum();
      next !== null && next !== this.currentPageNum && (this.direction = next > this.currentPageNum ? 1 : -1, this.currentPageNum = next, this.syncAfterPageChange({
        scrollIntoView: !1
      }));
    }
    handleTap(info, event) {
      this.viewport.cancelDrag(), !this.consumeDoubleTap(info, event) && this.queueSingleTap(info, event);
    }
    runSingleTap(info, event) {
      if (this.callbacks.isZoomActive()) {
        event.preventDefault();
        return;
      }
      if (this.handleViewportTap(info))
        return;
      if (state.reader.viewMode.value === "scroll") {
        this.toggleToolbar();
        return;
      }
      let width = this.viewport.viewportWidth(), zone = info.clientX / width;
      zone >= 1 / 3 && zone <= 2 / 3 ? this.toggleToolbar() : this.turnPageBy(zone < 1 / 3 ? this.leftTapDelta() : this.rightTapDelta());
    }
    handleViewportTap(point) {
      return this.viewport.isHitEndPage(point) ? (this.close(), !0) : !1;
    }
    handleKeyboardClose() {
      return this.callbacks.isZoomActive() ? (this.callbacks.onZoomClose(), !0) : document.fullscreenElement === this.fullscreenTarget ? !1 : (this.close(), !0);
    }
    handlePinchStart(info) {
      if (this.cancelPendingTap(), this.viewport.stopMotion(), this.viewport.cancelDrag(), this.callbacks.isZoomActive())
        return this.zoomOverlay.startPinch({
          centerX: info.clientX,
          centerY: info.clientY
        }), !0;
      let image = this.imageAtPoint(info);
      return image ? (this.callbacks.onZoomOpen(image, {
        centerX: info.clientX,
        centerY: info.clientY
      }), !0) : !1;
    }
    toggleZoomAtPoint(point) {
      if (this.callbacks.isZoomActive())
        return this.callbacks.onZoomClose(), !0;
      let image = this.imageAtPoint(point);
      return image ? (this.viewport.stopMotion(), this.viewport.cancelDrag(), this.callbacks.onZoomOpen(image, {
        centerX: point.clientX,
        centerY: point.clientY
      }), this.zoomOverlay.movePinch({
        centerX: point.clientX,
        centerY: point.clientY,
        scale: 2
      }), this.zoomOverlay.endPinch(), !0) : !1;
    }
    imageAtPoint(point) {
      let pageNum = this.viewport.pageNumAtPoint(point);
      return pageNum === null ? null : this.loadedImages.get(pageNum) ?? null;
    }
    consumeDoubleTap(info, event) {
      let now = event.timeStamp || performance.now(), pending = this.pendingTap, nativeDoubleClick = (event instanceof MouseEvent ? event.detail : 0) >= 2, nearPendingTap = pending ? now - pending.time <= DOUBLE_TAP_MS && Math.hypot(info.clientX - pending.info.clientX, info.clientY - pending.info.clientY) <= DOUBLE_TAP_DISTANCE : !1;
      return !nativeDoubleClick && !nearPendingTap ? !1 : (this.cancelPendingTap(), this.toggleZoomAtPoint(info) ? (event.preventDefault(), !0) : !1);
    }
    queueSingleTap(info, event) {
      this.cancelPendingTap(), this.pendingTap = {
        info,
        event,
        time: event.timeStamp || performance.now()
      }, this.tapTimer = window.setTimeout(() => {
        let pending = this.pendingTap;
        this.pendingTap = null, this.tapTimer = null, pending && this.runSingleTap(pending.info, pending.event);
      }, DOUBLE_TAP_MS);
    }
    cancelPendingTap() {
      this.tapTimer !== null && (window.clearTimeout(this.tapTimer), this.tapTimer = null), this.pendingTap = null;
    }
    navigateProgressPage(pageNum) {
      let target = clamp(Math.round(pageNum), 1, this.maxProgressPageNum());
      target !== this.currentPageNum && (this.direction = target > this.currentPageNum ? 1 : -1, this.currentPageNum = target), ++this.syncToken, this.syncViewportWindow(), this.scrollToCurrentPage(), this.callbacks.onProgressChange({
        pageNum: target,
        totalPages: this.totalPages,
        maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
        keepInputValue: !0
      });
    }
    cancelProgressNavigation() {
      this.progressNavigationTimer !== null && (window.clearTimeout(this.progressNavigationTimer), this.progressNavigationTimer = null);
    }
    downloadDialog() {
      let image = this.loadedImages.get(this.currentPageNum);
      return !image || !this.isRealPageNum(this.currentPageNum) ? null : {
        currentFileName: displayedImageFileName(this.galleryId, this.currentPageNum, image.imageUrl),
        currentImageUrl: image.imageUrl,
        originalImageUrl: image.originalImageUrl,
        pageNum: this.currentPageNum
      };
    }
    downloadDisplayedImage(download) {
      return startImageDownload(download.currentImageUrl, download.currentFileName);
    }
    downloadOriginalImage(download) {
      return !!(download.originalImageUrl && startImageDownload(download.originalImageUrl));
    }
    openOriginalPage() {
      let page = this.pages.get(this.currentPageNum);
      !page || !this.isRealPageNum(this.currentPageNum) || !this.onOpenOriginalPage || this.onOpenOriginalPage(page);
    }
    async toggleFullscreen() {
      if (document.fullscreenElement === this.fullscreenTarget) {
        this.keepReaderAfterFullscreenExit = !0;
        try {
          await document.exitFullscreen();
        } catch (error) {
          this.keepReaderAfterFullscreenExit = !1, console.warn("[ehpeek] Failed to exit fullscreen", error);
        }
        return;
      }
      if (!(document.fullscreenElement || !document.fullscreenEnabled || typeof this.fullscreenTarget.requestFullscreen != "function"))
        try {
          this.onBeforeEnterFullscreen?.(), await enterReaderFullscreen(this.fullscreenTarget);
        } catch (error) {
          await this.restorePageViewport?.(), console.warn("[ehpeek] Fullscreen request failed", error);
        }
    }
    async finishFullscreenExit(keepReaderOpen) {
      try {
        await this.restorePageViewport?.();
      } catch (error) {
        console.warn("[ehpeek] Failed to restore page viewport", error);
      }
      keepReaderOpen || this.close();
    }
    syncFullscreenState() {
      this.callbacks.onFullscreenChange(document.fullscreenElement === this.fullscreenTarget);
    }
    setMode(mode) {
      mode !== state.reader.viewMode.value && (state.reader.viewMode.set(mode), this.syncReaderControls(), this.rebuildForCurrentMode());
    }
    toggleReadDirection() {
      let readDirection = state.reader.readDirection.value === "rtl" ? "ltr" : "rtl";
      state.reader.readDirection.set(readDirection), this.syncReaderControls(), this.syncViewportWindow(), this.scrollToCurrentPage();
    }
    toggleRightTapAction() {
      let rightTapAction = state.reader.rightTapAction.value === "previous" ? "next" : "previous";
      state.reader.rightTapAction.set(rightTapAction), this.syncReaderControls();
    }
    syncReaderControls() {
      this.callbacks.onControlsChange({
        mode: state.reader.viewMode.value,
        readDirection: state.reader.readDirection.value,
        rightTapAction: state.reader.rightTapAction.value
      });
    }
    toggleToolbar() {
      this.callbacks.onToolbarToggle();
    }
    rightTapDelta() {
      return state.reader.rightTapAction.value === "previous" ? -1 : 1;
    }
    leftTapDelta() {
      return -this.rightTapDelta();
    }
    rightDragDelta() {
      return state.reader.readDirection.value === "rtl" ? 1 : -1;
    }
    leftDragDelta() {
      return -this.rightDragDelta();
    }
  };
  function displayedImageFileName(galleryId, pageNum, imageUrl) {
    return `${galleryId}-p${String(pageNum).padStart(2, "0")}.${imageFileExtension(imageUrl)}`;
  }
  function imageFileExtension(imageUrl) {
    try {
      let extension = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop() ?? "").match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
      if (extension && ["avif", "bmp", "gif", "jpeg", "jpg", "png", "webp"].includes(extension))
        return extension;
    } catch {
      return "jpg";
    }
    return "jpg";
  }
  function startImageDownload(url, name) {
    try {
      return GM_download({
        url,
        ...name ? {
          name
        } : {},
        onerror: (error) => {
          console.error("[ehpeek]", error), window.alert(texts_default.errors.downloadFailed);
        }
      }), !0;
    } catch (error) {
      return console.error("[ehpeek]", error), window.alert(texts_default.errors.downloadFailed), !1;
    }
  }
  function pageNumForPage(page, index) {
    let pageNum = page?.pageNum;
    return typeof pageNum == "number" && Number.isFinite(pageNum) && pageNum > 0 ? pageNum : index + 1;
  }
  function shouldIgnoreKeyboardEvent(event) {
    if (event.isComposing)
      return !0;
    let eventTarget = event.target;
    return eventTarget instanceof Element ? !!eventTarget.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']") : !1;
  }
  function pointerTypeForEvent(event) {
    return "pointerType" in event ? event.pointerType : "mouse";
  }

  // src/App/render.tsx
  var mountedRoots = /* @__PURE__ */ new WeakMap();
  function renderInto(host, view) {
    mountedRoots.get(host)?.(), host.replaceChildren(), mountedRoots.set(host, render(view, host));
  }
  function unmountFrom(host) {
    mountedRoots.get(host)?.(), mountedRoots.delete(host), host.replaceChildren();
  }

  // src/App/Reader.tsx
  var PREVIEW_CACHE_LIMIT = 10, activeReaderClose;
  function onReaderDocumentClick(event, callbacks) {
    if (!state.reader.enabled.value)
      return;
    let link = findClickedImageLink2(event.target);
    link && (event.preventDefault(), event.stopPropagation(), openReaderFromUserAction(link.href, callbacks));
  }
  function openReaderFromUserAction(startPageUrl, callbacks, preferredPageNum) {
    let fullscreenLaunch = requestConfiguredFullscreen();
    openReader(startPageUrl, callbacks, preferredPageNum, fullscreenLaunch).catch(async (error) => {
      if (fullscreenLaunch) {
        let fullscreenEntered = await fullscreenLaunch.result;
        document.fullscreenElement === fullscreenLaunch.host && await document.exitFullscreen().catch((fullscreenError) => {
          console.warn("[ehpeek] Failed to exit fullscreen", fullscreenError);
        }), fullscreenEntered && fullscreenLaunch.viewport && await restorePageViewport(fullscreenLaunch.viewport), fullscreenLaunch.host.remove();
      }
      reportReaderOpenError(error);
    });
  }
  async function openReaderFromHash(callbacks) {
    let peekPage = peekPageFromHash();
    if (peekPage === null)
      return;
    let pages = collectGalleryPages2(), page = pages.find((item) => item.pageNum === peekPage) ?? pages[0];
    page && await openReader(page.url, callbacks).catch(reportReaderOpenError);
  }
  async function openOriginalReader(pageNum) {
    let provider = new GalleryPageProvider(computePreviewPageSize(), maxPreviewPageIndex());
    provider.cachePages(collectGalleryPages2());
    let page = (await provider.getPages([pageNum]))[0];
    if (!page || page.pageNum !== pageNum)
      throw new Error(texts_default.errors.imageNotFound);
    window.location.assign(page.url);
  }
  async function openReader(startPageUrl, callbacks, preferredPageNum, fullscreenLaunch) {
    if (!state.reader.enabled.value)
      return;
    let pageType2 = extractPageType();
    if (pageType2.type !== "gallery")
      return;
    let currentPreviewIndex = previewPageIndex(), currentPages = collectGalleryPages2(), pageSize = computePreviewPageSize(), maxPreviewIndex = maxPreviewPageIndex(), totalPages = readShowingRange()?.total, provider = new GalleryPageProvider(pageSize, maxPreviewIndex);
    provider.cachePages(currentPages);
    let startPageNum = preferredPageNum ?? peekPageFromHash() ?? galleryPageNumber(startPageUrl);
    if (!startPageNum)
      throw new Error(texts_default.errors.imageNotFound);
    let historySession = callbacks.readHistoryEnabled() ? new ReadHistorySession({
      galleryId: pageType2.galleryId,
      token: pageType2.token,
      galleryUrl: previewUrlForIndex(currentPreviewIndex),
      totalPages
    }) : null;
    if (!state.reader.enabled.value) {
      historySession?.dispose();
      return;
    }
    let automaticFullscreen = fullscreenLaunch ? await fullscreenLaunch.result : void 0;
    if (automaticFullscreen && document.fullscreenElement !== fullscreenLaunch?.host) {
      historySession?.dispose(), fullscreenLaunch?.viewport && await restorePageViewport(fullscreenLaunch.viewport), fullscreenLaunch?.host.remove();
      return;
    }
    let lastPageNum = startPageNum, fullscreenViewport = automaticFullscreen ? fullscreenLaunch?.viewport ?? null : null, restorePageViewport2 = async () => {
      let snapshot = fullscreenViewport;
      fullscreenViewport = null, snapshot && await restorePageViewport(snapshot);
    };
    openFullscreenReader({
      galleryId: pageType2.galleryId,
      initialPageNum: startPageNum,
      provider,
      totalPages,
      onBeforeEnterFullscreen: () => {
        fullscreenViewport = preparePageViewportForFullscreen();
      },
      restorePageViewport: restorePageViewport2,
      onActivePageChange: (page) => {
        page.pageNum && (lastPageNum = page.pageNum, callbacks.enhanceThumbsGridsEnabled() && callbacks.onPageBarChange(provider.previewIndexForPage(page.pageNum), maxPreviewIndex)), historySession?.update(page.pageNum, totalPages), updatePeekLocation(page.pageNum, pageSize, maxPreviewIndex);
      },
      onExit: () => {
        historySession?.dispose(), callbacks.onReaderClosed();
        let exitIndex = provider.previewIndexForPage(lastPageNum), galleryUrl = previewUrlForIndex(exitIndex);
        if (callbacks.enhanceThumbsGridsEnabled()) {
          callbacks.onPageBarChange(exitIndex, maxPreviewIndex), navigateGalleryPreview(galleryUrl).catch(() => {
            window.location.replace(galleryUrl);
          });
          return;
        }
        exitIndex === currentPreviewIndex ? window.history.replaceState(window.history.state, "", galleryUrl) : window.location.replace(galleryUrl);
      },
      onOpenOriginalPage: (page) => {
        historySession?.dispose(), window.location.assign(page.url);
      }
    }, fullscreenLaunch?.host);
  }
  function openFullscreenReader(options, existingHost) {
    activeReaderClose?.(), removePreviousReaderRoot();
    let host = existingHost ?? createReaderHost(), closeReader = onClosed, close = () => closeReader();
    function onClosed() {
      unmountFrom(host), host.remove(), activeReaderClose === close && (activeReaderClose = void 0);
    }
    host.isConnected || document.body.append(host), activeReaderClose = close, renderInto(host, () => createComponent(FullscreenReader, {
      get options() {
        return {
          ...options,
          fullscreenTarget: host
        };
      },
      actionsRef: (actions) => {
        closeReader = actions.close;
      },
      onActionsDispose: () => {
        closeReader = onClosed;
      },
      onClosed
    }));
  }
  function requestConfiguredFullscreen() {
    if (!state.reader.enabled.value || !state.reader.fullscreen.value || document.fullscreenElement)
      return;
    let host = createReaderHost();
    if (document.body.append(host), !document.fullscreenEnabled || typeof host.requestFullscreen != "function")
      return {
        host,
        result: Promise.resolve(!1),
        viewport: null
      };
    let viewport = preparePageViewportForFullscreen();
    return {
      host,
      viewport,
      result: enterReaderFullscreen(host).then(() => !0, async (error) => (await restorePageViewport(viewport), console.warn("[ehpeek] Fullscreen request failed", error), !1))
    };
  }
  function createReaderHost() {
    let host = document.createElement("div");
    return host.dataset.ehpeekReaderContainer = "true", host;
  }
  function reportReaderOpenError(error) {
    let message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
    console.error("[ehpeek]", error), window.alert(message);
  }
  var GalleryPageProvider = class {
    constructor(pageSize, maxPreviewIndex) {
      __publicField(this, "pages", /* @__PURE__ */ new Map());
      __publicField(this, "previewLoads", /* @__PURE__ */ new Map());
      this.pageSize = pageSize, this.maxPreviewIndex = maxPreviewIndex;
    }
    cachePages(pages) {
      for (let page of pages)
        page.pageNum && page.pageNum > 0 && this.pages.set(page.pageNum, page);
    }
    previewIndexForPage(pageNum) {
      return previewPageIndexForGalleryPage(pageNum, this.pageSize, this.maxPreviewIndex);
    }
    async getPages(pageNums) {
      let requested = Array.from(new Set(pageNums.filter((pageNum) => pageNum > 0))), previewIndexes = Array.from(new Set(requested.filter((pageNum) => !this.pages.has(pageNum)).map((pageNum) => this.previewIndexForPage(pageNum)))).filter((value) => value >= 0 && (this.maxPreviewIndex === null || value <= this.maxPreviewIndex));
      return await Promise.all(previewIndexes.map((index) => this.loadPreviewPage(index))), requested.flatMap((pageNum) => this.pages.get(pageNum) ?? []);
    }
    loadPage(page) {
      return loadEhImagePage(page);
    }
    loadPreviewPage(index) {
      let boundedIndex = this.maxPreviewIndex === null ? index : Math.min(index, this.maxPreviewIndex);
      if (boundedIndex < 0)
        return Promise.resolve([]);
      let cached = this.previewLoads.get(boundedIndex);
      if (cached)
        return this.previewLoads.delete(boundedIndex), this.previewLoads.set(boundedIndex, cached), cached;
      let load = pullPreviewPage(boundedIndex).then((pages) => (this.cachePages(pages), pages), (error) => {
        throw this.previewLoads.delete(boundedIndex), error;
      });
      for (this.previewLoads.set(boundedIndex, load); this.previewLoads.size > PREVIEW_CACHE_LIMIT; ) {
        let oldest = this.previewLoads.keys().next().value;
        if (oldest === void 0)
          break;
        this.previewLoads.delete(oldest);
      }
      return load;
    }
  };

  // src/App/SinglePage.tsx
  var _tmpl$50 = /* @__PURE__ */ template('<div class="fixed top-0 left-0 z-overlay h-4px w-full overflow-hidden bg-[var(--color-site-border-subtle)]"role=progressbar><div class="h-full w-1/2 animate-pulse bg-[var(--color-site-accent)]">'), _tmpl$214 = /* @__PURE__ */ template('<div class="ehpeek-single-page-app contents"data-ehpeek-single-page-app=true><div class="ehpeek-single-page-route contents"></div><div class=hidden aria-hidden=true inert>'), _tmpl$311 = /* @__PURE__ */ template('<aside class="fixed right-md bottom-md z-overlay flex max-w-[min(420px,calc(100vw-24px))] flex-col gap-md rounded-md border ehp-color-site-border p-lg ehp-color-site-elevated ehp-color-site-text font-sans"role=alert><div class="textsize-md font-700"></div><div class="flex flex-wrap justify-end gap-sm"><button type=button class="min-h-md rounded-md border ehp-color-site-border bg-transparent px-md ehp-color-site-text textsize-md font-inherit"></button><a data-ehpeek-single-page-bypass class="inline-flex min-h-md items-center rounded-md border border-[var(--color-site-accent)] bg-[var(--color-site-accent)] px-md text-[var(--color-background)] no-underline textsize-md font-700">'), HISTORY_STATE_KEY = "ehpeekSinglePageApp";
  function SinglePage(props) {
    let [loading, setLoading] = createSignal(!1), [failedUrl, setFailedUrl] = createSignal(null), routeHost, stagingHost, navigationController = null, navigationSequence = 0, scrollFrame = null, updateHistoryScroll = () => {
      let current = historyState();
      window.history.replaceState({
        ...current,
        [HISTORY_STATE_KEY]: {
          scrollX: window.scrollX,
          scrollY: window.scrollY
        }
      }, "", window.location.href);
    }, scheduleHistoryScrollUpdate = () => {
      scrollFrame === null && (scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null, updateHistoryScroll();
      }));
    }, navigate = async (request, mode, popState) => {
      let sequence = ++navigationSequence;
      navigationController?.abort();
      let controller = new AbortController();
      navigationController = controller, setFailedUrl(null), setLoading(!0), routeHost.inert = !0, routeHost.setAttribute("aria-busy", "true");
      try {
        let response = await requestPage(request.url, {
          method: request.method,
          body: request.body,
          signal: controller.signal,
          timeoutMs: null
        }), responseUrl = response.url, page = singlePageRoute(responseUrl);
        if (!page)
          throw new Error(`Unsupported Single Page App route: ${responseUrl}`);
        let doc = response.document;
        if (stagingHost.replaceChildren(...importSinglePageContent(doc, responseUrl)), await waitForRouteTranslation(stagingHost), sequence !== navigationSequence || controller.signal.aborted)
          return;
        props.onPageDeactivate(), mode === "push" && (updateHistoryScroll(), window.history.pushState({
          ...historyState(),
          [HISTORY_STATE_KEY]: {
            scrollX: 0,
            scrollY: 0
          }
        }, "", responseUrl)), routeHost.replaceChildren(...Array.from(stagingHost.childNodes)), document.title = doc.title || document.title, await props.onPageActivate(page);
        let targetScroll = mode === "pop" ? appHistoryState(popState) : null;
        window.requestAnimationFrame(() => {
          window.scrollTo(targetScroll?.scrollX ?? 0, targetScroll?.scrollY ?? 0);
        });
      } catch (error) {
        if (controller.signal.aborted)
          return;
        console.error("[ehpeek] Single Page App navigation failed", error), setFailedUrl(request.url);
      } finally {
        sequence === navigationSequence && (navigationController = null, stagingHost.replaceChildren(), routeHost.inert = !1, routeHost.removeAttribute("aria-busy"), setLoading(!1));
      }
    };
    return onMount(() => {
      let previousScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual", routeHost.replaceChildren(...props.initialNodes), updateHistoryScroll(), props.onPageActivate(props.initialPage);
      let onClick = (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
          return;
        let link = singlePageNavigationLink(event.target);
        if (!link || !routeHost.contains(link) || link.target && link.target !== "_self" || link.hasAttribute("download"))
          return;
        let url = new URL(link.href, window.location.href);
        url.origin !== window.location.origin || !singlePageRoute(url.href) || (event.preventDefault(), event.stopImmediatePropagation(), navigate({
          method: "GET",
          url: url.href
        }, "push"));
      }, onSubmit = (event) => {
        let form = singlePageSearchForm(event.target);
        if (!form || !routeHost.contains(form))
          return;
        let request = navigationRequestForForm(form, event.submitter);
        !request || !singlePageRoute(request.url) || (event.preventDefault(), navigate(request, "push"));
      }, onPopState = (event) => {
        if (!singlePageRoute(window.location.href)) {
          window.location.assign(window.location.href);
          return;
        }
        navigate({
          method: "GET",
          url: window.location.href
        }, "pop", event.state);
      };
      document.addEventListener("click", onClick), document.addEventListener("submit", onSubmit, !0), window.addEventListener("popstate", onPopState), window.addEventListener("scroll", scheduleHistoryScrollUpdate, {
        passive: !0
      }), onCleanup(() => {
        navigationController?.abort(), props.onPageDeactivate(), window.history.scrollRestoration = previousScrollRestoration, document.removeEventListener("click", onClick), document.removeEventListener("submit", onSubmit, !0), window.removeEventListener("popstate", onPopState), window.removeEventListener("scroll", scheduleHistoryScrollUpdate), scrollFrame !== null && window.cancelAnimationFrame(scrollFrame);
      });
    }), (() => {
      var _el$ = _tmpl$214(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _ref$ = routeHost;
      typeof _ref$ == "function" ? use(_ref$, _el$2) : routeHost = _el$2;
      var _ref$2 = stagingHost;
      return typeof _ref$2 == "function" ? use(_ref$2, _el$3) : stagingHost = _el$3, insert(_el$, createComponent(Show, {
        get when() {
          return loading();
        },
        get children() {
          var _el$4 = _tmpl$50();
          return createRenderEffect(() => setAttribute(_el$4, "aria-label", texts_default.reader.loading)), _el$4;
        }
      }), null), insert(_el$, createComponent(Show, {
        get when() {
          return failedUrl();
        },
        keyed: !0,
        children: (url) => (() => {
          var _el$5 = _tmpl$311(), _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling;
          return insert(_el$6, () => texts_default.singlePageApp.loadFailed), _el$8.$$click = () => setFailedUrl(null), insert(_el$8, () => texts_default.singlePageApp.dismiss), setAttribute(_el$9, "href", url), insert(_el$9, () => texts_default.singlePageApp.openOriginal), _el$5;
        })()
      }), null), _el$;
    })();
  }
  function navigationRequestForForm(form, submitter) {
    let method = form.method.toUpperCase();
    if (method !== "GET" && method !== "POST")
      return null;
    let data = new FormData(form, submitter), url = new URL(form.action || window.location.href, window.location.href);
    return method === "GET" ? (url.search = "", url.hash = "", data.forEach((value, key) => {
      typeof value == "string" && url.searchParams.append(key, value);
    }), {
      method,
      url: url.href
    }) : {
      body: data,
      method,
      url: url.href
    };
  }
  function historyState() {
    let value = window.history.state;
    return value && typeof value == "object" ? value : {};
  }
  function appHistoryState(value) {
    if (!value || typeof value != "object")
      return null;
    let state2 = value[HISTORY_STATE_KEY];
    if (!state2 || typeof state2 != "object")
      return null;
    let scrollX = Number(state2.scrollX), scrollY = Number(state2.scrollY);
    return Number.isFinite(scrollX) && Number.isFinite(scrollY) ? {
      scrollX,
      scrollY
    } : null;
  }
  delegateEvents(["click"]);

  // src/App/index.tsx
  var _tmpl$51 = /* @__PURE__ */ template("<a href=#>"), THEME_STYLE_ID = "ehpeek-theme-style", UNO_STYLE_ID = "ehpeek-uno-style";
  if (ehpeek_uno_default && !document.getElementById(UNO_STYLE_ID)) {
    let style2 = document.createElement("style");
    style2.id = UNO_STYLE_ID, style2.textContent = ehpeek_uno_default, document.head.append(style2);
  }
  if (theme_default && !document.getElementById(THEME_STYLE_ID)) {
    let style2 = document.createElement("style");
    style2.id = THEME_STYLE_ID, style2.textContent = theme_default, document.head.append(style2);
  }
  function settingsMenuState() {
    return {
      singlePageAppEnabled: state.app.singlePage.value,
      readerEnabled: state.reader.enabled.value,
      readerFullscreenEnabled: state.reader.fullscreen.value,
      enhanceThumbsGridsEnabled: state.gallery.enhanceThumbs.value,
      enhanceSearchGridsEnabled: state.search.enhance.value,
      myTagsEnabled: state.gallery.myTags.value,
      readHistoryEnabled: state.gallery.readHistory.value,
      searchHistoryEnabled: state.search.history.value,
      touchUiEnabled: state.touch.enabled.value
    };
  }
  function defaultSettingsMenuState() {
    return {
      singlePageAppEnabled: state.app.singlePage.defaultValue,
      readerEnabled: state.reader.enabled.defaultValue,
      readerFullscreenEnabled: state.reader.fullscreen.defaultValue,
      enhanceThumbsGridsEnabled: state.gallery.enhanceThumbs.defaultValue,
      enhanceSearchGridsEnabled: state.search.enhance.defaultValue,
      myTagsEnabled: state.gallery.myTags.defaultValue,
      readHistoryEnabled: state.gallery.readHistory.defaultValue,
      searchHistoryEnabled: state.search.history.defaultValue,
      touchUiEnabled: state.touch.enabled.defaultValue
    };
  }
  function applySettingsMenuState(next) {
    state.app.singlePage.set(next.singlePageAppEnabled), state.reader.enabled.set(next.readerEnabled), state.reader.fullscreen.set(next.readerFullscreenEnabled), state.gallery.enhanceThumbs.set(next.enhanceThumbsGridsEnabled), state.search.enhance.set(next.enhanceSearchGridsEnabled), state.gallery.myTags.set(next.myTagsEnabled), state.gallery.readHistory.set(next.readHistoryEnabled), state.search.history.set(next.searchHistoryEnabled), state.touch.enabled.set(next.touchUiEnabled), window.location.reload();
  }
  function readButtonState() {
    if (!settingsState.readHistoryEnabled || pageType.type !== "gallery")
      return null;
    let record = loadReadHistory(pageType.galleryId, pageType.token), pageNum = record?.pageNum && record.pageNum > 0 ? record.pageNum : 1, totalPages = record?.totalPages ?? readShowingRange()?.total, detail = record && totalPages ? `${pageNum}/${totalPages}` : totalPages ? `${totalPages} ${texts_default.reader.pages}` : String(pageNum);
    return {
      info: {
        label: record ? texts_default.reader.continueReading : texts_default.reader.startReading,
        detail
      },
      onClick: () => {
        let page = collectGalleryPages2()[0];
        page && (state.reader.enabled.value ? openReaderFromUserAction(page.url, readerCallbacks, pageNum) : openOriginalReader(pageNum).catch(reportReaderOpenError));
      }
    };
  }
  var pageType = extractPageType(), settingsState = settingsMenuState();
  applySiteTheme();
  settingsState.touchUiEnabled && (document.documentElement.dataset.ehpeekTouchUi = "true");
  var [settingsMenuOpen, setSettingsMenuOpenSignal] = createSignal(!1), readerCallbacks = {
    enhanceThumbsGridsEnabled: () => settingsState.enhanceThumbsGridsEnabled,
    readHistoryEnabled: () => settingsState.readHistoryEnabled,
    onPageBarChange: replaceGalleryPageBar2,
    onReaderClosed: installReadButton
  }, settingsMenuHost = document.createElement("div");
  settingsMenuHost.className = "fixed inset-0 z-[1150] pointer-events-none";
  settingsMenuHost.dataset.ehpeekPersistent = "true";
  document.body.append(settingsMenuHost);
  var galleryReadButtonMount, touchGalleryReadButtonMount, originalReadHistorySession, touchFavoritesCategorySelect = null, stopMyTagsEnhance, pageGeneration = 0, pageRoots = /* @__PURE__ */ new Set(), pageOwnedHosts = /* @__PURE__ */ new Set();
  function installEhPeekSearchGrid() {
    state.search.grid.value && prepareEhPeekSearchGrid();
  }
  function installSearchGridModeSelect() {
    prepareSearchGridModeSelect(state.search.grid.value, () => {
      state.search.grid.set(!0), window.location.assign(new URL("/?inline_set=dm_e", window.location.href).href);
    }, (value) => {
      state.search.grid.set(!1), window.location.assign(new URL(`/?inline_set=dm_${value}`, window.location.href).href);
    });
  }
  function renderPageInto(host, view, owned = !1) {
    pageRoots.add(host), owned && pageOwnedHosts.add(host), renderInto(host, view);
  }
  function deactivatePage() {
    pageGeneration += 1, originalReadHistorySession?.dispose(), originalReadHistorySession = void 0, stopMyTagsEnhance?.(), stopMyTagsEnhance = void 0, settingsState.touchUiEnabled && resetTouchUiPage();
    for (let root of pageRoots)
      unmountFrom(root);
    for (let host of pageOwnedHosts)
      host.remove();
    pageRoots = /* @__PURE__ */ new Set(), pageOwnedHosts = /* @__PURE__ */ new Set(), galleryReadButtonMount = void 0, touchGalleryReadButtonMount = void 0, touchFavoritesCategorySelect = null;
  }
  function installSettingsMenu() {
    renderInto(settingsMenuHost, () => createComponent(SettingsMenu, {
      get open() {
        return settingsMenuOpen();
      },
      get defaultState() {
        return defaultSettingsMenuState();
      },
      initState: settingsState,
      onApply: (next) => {
        settingsState = next, applySettingsMenuState(next);
      },
      onOpenChange: setSettingsMenuOpenSignal
    }));
  }
  function replaceGalleryPageBar2(currentIndex, maxIndex) {
    let mounts = replaceGalleryPageBarMounts(SCROLL_PAGE_BAR_TOP_CLASS, SCROLL_PAGE_BAR_BOTTOM_CLASS);
    for (let mount of mounts)
      mount.descriptionElement && mount.descriptionText && renderPageInto(mount.descriptionElement, () => createComponent(GalleryPageDescription, {
        get text() {
          return mount.descriptionText;
        }
      }), !0), renderPageInto(mount.element, () => createComponent(ScrollPageBar, {
        currentIndex,
        get element() {
          return mount.element;
        },
        maxIndex,
        get top() {
          return mount.top;
        },
        urlForIndex: previewUrlForIndex
      }), !0);
  }
  function installReadButton() {
    let readButton = readButtonState();
    if (settingsState.touchUiEnabled && pageType.type === "gallery") {
      touchGalleryReadButtonMount && renderPageInto(touchGalleryReadButtonMount, () => readButton ? createComponent(ReadButton, {
        get info() {
          return readButton.info;
        },
        get onClick() {
          return readButton.onClick;
        },
        variant: "touchGallery"
      }) : []);
      return;
    }
    !settingsState.touchUiEnabled && pageType.type === "gallery" && (galleryReadButtonMount ?? (galleryReadButtonMount = galleryContinueReadingButtonMountTarget()), pageOwnedHosts.add(galleryReadButtonMount)), galleryReadButtonMount && renderPageInto(galleryReadButtonMount, () => readButton ? createComponent(ReadButton, {
      get info() {
        return readButton.info;
      },
      get onClick() {
        return readButton.onClick;
      },
      variant: "gallery"
    }) : []);
  }
  typeof GM_registerMenuCommand == "function" && GM_registerMenuCommand(texts_default.settings.openSettings, () => {
    setSettingsMenuOpenSignal(!0);
  });
  installSettingsMenu();
  function installDesktopSettingsLink() {
    let target = settingsMenuMountTarget();
    target && renderPageInto(target, () => (() => {
      var _el$ = _tmpl$51();
      return _el$.$$click = (event) => {
        event.preventDefault(), event.stopPropagation(), setSettingsMenuOpenSignal(!0);
      }, insert(_el$, () => texts_default.settings.menuLabel), _el$;
    })(), !0);
  }
  function installTouchTopBar() {
    if (document.querySelector(".ehpeek-touch-top-bar"))
      return;
    let info = readTouchTopBarInfo(TOUCH_TOP_BAR_MENU_ITEM_CLASS);
    if (info.available) {
      let mount = document.createElement("div");
      insertTouchTopBar(mount) || document.body.prepend(mount), renderPageInto(mount, () => createComponent(TouchTopBar, {
        info,
        onSettingsMenuOpen: () => {
          setSettingsMenuOpenSignal(!0);
        }
      }), !0);
    }
  }
  function installBackToTop() {
    let host = document.createElement("div");
    host.className = "ehpeek-back-to-top-host", document.body.append(host), renderPageInto(host, () => createComponent(BackToTop, {}), !0);
  }
  function installGalleryInfoPanel() {
    if (document.querySelector(".ehpeek-touch-gallery"))
      return;
    let touchGalleryInfo = readGalleryInfo(TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS);
    if (touchGalleryInfo.available) {
      prepareTouchGalleryPage();
      let mount = document.createElement("div");
      insertTouchGalleryPanel(mount) || document.body.prepend(mount), renderPageInto(mount, () => createComponent(GalleryInfoPanel, {
        source: touchGalleryInfo,
        onPrimaryActionMount: (mount2) => {
          touchGalleryReadButtonMount && touchGalleryReadButtonMount !== mount2 && unmountFrom(touchGalleryReadButtonMount), touchGalleryReadButtonMount = mount2, installReadButton();
        },
        onPrimaryActionUnmount: () => {
          touchGalleryReadButtonMount && (unmountFrom(touchGalleryReadButtonMount), touchGalleryReadButtonMount = void 0);
        }
      }), !0);
    }
  }
  function installTouchSearchPanel() {
    if (document.querySelector(".ehpeek-touch-search-panel"))
      return;
    let touchSearchInfo = readTouchSearchPanelInfo();
    if (!touchSearchInfo)
      return;
    let mount = document.createElement("div");
    if (insertTouchSearchPanel(mount)) {
      if (prepareSearchPanel(touchSearchInfo), renderPageInto(mount, () => createComponent(TouchSearchPanel, {
        source: touchSearchInfo,
        get after() {
          return touchFavoritesCategorySelect ? createComponent(FavoritesCategorySelect, {
            info: touchFavoritesCategorySelect
          }) : void 0;
        }
      }), !0), touchSearchInfo.categories && touchSearchInfo.categoryToggleMount) {
        let categories = touchSearchInfo.categories;
        renderPageInto(touchSearchInfo.categoryToggleMount, () => createComponent(TouchSearchCategoryToggle, {
          categories
        }), !0);
      }
      if (touchSearchInfo.advancedPanel && touchSearchInfo.advancedToggleMount) {
        let advancedPanel = touchSearchInfo.advancedPanel;
        renderPageInto(touchSearchInfo.advancedToggleMount, () => createComponent(TouchSearchAdvancedToggle, {
          panel: advancedPanel
        }), !0);
      }
      if (touchSearchInfo.fileSearch && touchSearchInfo.fileSearchToggleMount) {
        let fileSearch = touchSearchInfo.fileSearch;
        renderPageInto(touchSearchInfo.fileSearchToggleMount, () => createComponent(TouchSearchFileToggle, {
          panel: fileSearch
        }), !0);
      }
      if (renderPageInto(touchSearchInfo.searchActionMount, () => createComponent(TouchSearchAction, {
        action: "search",
        get label() {
          return touchSearchInfo.searchLabel;
        },
        get original() {
          return touchSearchInfo.searchSubmit;
        },
        source: touchSearchInfo
      }), !0), touchSearchInfo.clearActionMount && touchSearchInfo.clearButton && touchSearchInfo.clearLabel) {
        let clearButton = touchSearchInfo.clearButton, clearLabel = touchSearchInfo.clearLabel;
        renderPageInto(touchSearchInfo.clearActionMount, () => createComponent(TouchSearchAction, {
          action: "clear",
          label: clearLabel,
          original: clearButton,
          source: touchSearchInfo
        }), !0);
      }
    }
  }
  async function activatePage(nextPage) {
    pageType = nextPage;
    let resultsPage = pageType.type === "search" || pageType.type === "favorites", generation = ++pageGeneration;
    if (settingsState.myTagsEnabled && (stopMyTagsEnhance = await applyMyTagsEnhance(pageType.type === "gallery")), generation === pageGeneration) {
      if (resultsPage) {
        let searchSource = readSearchHistorySource();
        searchSource && reuseTagTipInput(searchSource.searchInput);
      }
      if (trackOriginalReadHistory(), resultsPage && installSearchGridModeSelect(), settingsState.touchUiEnabled ? touchFavoritesCategorySelect = prepareTouchResultsPage(pageType) : installDesktopSettingsLink(), installReadButton(), pageType.type === "gallery") {
        let host = document.createElement("div");
        document.body.append(host), renderPageInto(host, () => createComponent(EnhanceThumbsGrids, {
          get enabled() {
            return settingsState.enhanceThumbsGridsEnabled;
          },
          onError: reportReaderOpenError,
          replaceGalleryPageBar: replaceGalleryPageBar2
        }), !0);
      }
      if (resultsPage && settingsState.enhanceSearchGridsEnabled) {
        let resultList = searchResultList();
        if (resultList && searchPageNavigation()) {
          let host = document.createElement("div");
          document.body.append(host), renderPageInto(host, () => createComponent(EnhanceSearchGrids, {
            resultList,
            onPageChange: () => {
              settingsState.touchUiEnabled && prepareTouchResultsPage(extractPageType()), installEhPeekSearchGrid();
            }
          }), !0);
        }
      }
      if (resultsPage && settingsState.searchHistoryEnabled) {
        let source = readSearchHistorySource();
        if (source) {
          let host = document.createElement("div");
          document.body.append(host), renderPageInto(host, () => createComponent(SearchHistory, {
            source
          }), !0);
        }
      }
      if (resultsPage && !settingsState.touchUiEnabled && installEhPeekSearchGrid(), pageType.type === "gallery" && state.reader.enabled.value && pageType.peekPage !== null && openReaderFromHash(readerCallbacks), !!settingsState.touchUiEnabled && (settingsState.singlePageAppEnabled || await waitForInitialUi(), generation === pageGeneration)) {
        if (installTouchTopBar(), (pageType.type === "gallery" || resultsPage) && installBackToTop(), pageType.type === "gallery")
          installGalleryInfoPanel();
        else if (resultsPage) {
          if (!settingsState.singlePageAppEnabled && pageType.type === "search" && await waitForSearchUi(), generation !== pageGeneration)
            return;
          installSearchGridModeSelect(), installEhPeekSearchGrid(), installTouchSearchPanel();
        }
      }
    }
  }
  function trackOriginalReadHistory() {
    if (originalReadHistorySession?.dispose(), originalReadHistorySession = void 0, !settingsState.readHistoryEnabled || pageType.type !== "image")
      return;
    let gallery = imageGalleryPage();
    if (!gallery || gallery.galleryId !== pageType.galleryId)
      return;
    let previous = loadReadHistory(gallery.galleryId, gallery.token);
    originalReadHistorySession = new ReadHistorySession({
      galleryId: gallery.galleryId,
      token: gallery.token,
      galleryUrl: gallery.url,
      totalPages: previous?.totalPages
    }), originalReadHistorySession.update(pageType.pageNum, previous?.totalPages);
  }
  document.addEventListener("click", (event) => onReaderDocumentClick(event, readerCallbacks), !0);
  var singlePageInitialRoute = settingsState.touchUiEnabled && settingsState.singlePageAppEnabled ? singlePageRoute(window.location.href) : null;
  singlePageInitialRoute ? startSinglePageApp(singlePageInitialRoute) : activatePage(pageType);
  async function startSinglePageApp(initialPage) {
    captureGalleryApiSession(), await waitForInitialUi(), prepareSinglePageContent(document.body, window.location.href);
    let initialNodes = singlePageContentNodes(), host = document.createElement("div");
    host.className = "isolate", host.dataset.ehpeekPersistent = "true", document.body.append(host), renderInto(host, () => createComponent(SinglePage, {
      initialNodes,
      initialPage,
      onPageActivate: activatePage,
      onPageDeactivate: deactivatePage
    }));
  }
  delegateEvents(["click"]);
})();

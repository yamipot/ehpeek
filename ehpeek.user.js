// ==UserScript==
// @name         EhPeek
// @version      260722.1717
// @description  A touch-optimized E-H/ExH viewer
// @icon         https://raw.githubusercontent.com/yamipot/ehpeek/master/icon.svg
// @icon64       https://raw.githubusercontent.com/yamipot/ehpeek/master/icon.svg
// @license      MIT
// @namespace    https://github.com/yamipot/ehpeek
// @homepage     https://github.com/yamipot/ehpeek
// @supportURL   https://github.com/yamipot/ehpeek/issues
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
// @run-at       document-start
// @updateURL    https://github.com/yamipot/ehpeek/raw/build-master/ehpeek.user.js
// @downloadURL  https://github.com/yamipot/ehpeek/raw/build-master/ehpeek.user.js
// ==/UserScript==

"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: !0 });
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key != "symbol" ? key + "" : key, value), __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj)), __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value), __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);

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
  var IS_DEV = !1, equalFn = (a, b) => a === b, $PROXY = /* @__PURE__ */ Symbol("solid-proxy"), SUPPORTS_PROXY = typeof Proxy == "function", $TRACK = /* @__PURE__ */ Symbol("solid-track");
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
  function getOwner() {
    return Owner;
  }
  function runWithOwner(o, fn) {
    let prev = Owner, prevListener = Listener;
    Owner = o, Listener = null;
    try {
      return runUpdates(fn, !0);
    } catch (err) {
      handleError(err);
    } finally {
      Owner = prev, Listener = prevListener;
    }
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
  function trueFn() {
    return !0;
  }
  var propTraps = {
    get(_, property, receiver) {
      return property === $PROXY ? receiver : _.get(property);
    },
    has(_, property) {
      return property === $PROXY ? !0 : _.has(property);
    },
    set: trueFn,
    deleteProperty: trueFn,
    getOwnPropertyDescriptor(_, property) {
      return {
        configurable: !0,
        enumerable: !0,
        get() {
          return _.get(property);
        },
        set: trueFn,
        deleteProperty: trueFn
      };
    },
    ownKeys(_) {
      return _.keys();
    }
  };
  function splitProps(props, ...keys) {
    let len = keys.length;
    if (SUPPORTS_PROXY && $PROXY in props) {
      let blocked = len > 1 ? keys.flat() : keys[0], res = keys.map((k) => new Proxy({
        get(property) {
          return k.includes(property) ? props[property] : void 0;
        },
        has(property) {
          return k.includes(property) && property in props;
        },
        keys() {
          return k.filter((property) => property in props);
        }
      }, propTraps));
      return res.push(new Proxy({
        get(property) {
          return blocked.includes(property) ? void 0 : props[property];
        },
        has(property) {
          return blocked.includes(property) ? !1 : property in props;
        },
        keys() {
          return Object.keys(props).filter((k) => !blocked.includes(k));
        }
      }, propTraps)), res;
    }
    let objects = [];
    for (let i = 0; i <= len; i++)
      objects[i] = {};
    for (let propName of Object.getOwnPropertyNames(props)) {
      let keyIndex = len;
      for (let i = 0; i < keys.length; i++)
        if (keys[i].includes(propName)) {
          keyIndex = i;
          break;
        }
      let desc = Object.getOwnPropertyDescriptor(props, propName);
      !desc.get && !desc.set && desc.enumerable && desc.writable && desc.configurable ? objects[keyIndex][propName] = desc.value : Object.defineProperty(objects[keyIndex], propName, desc);
    }
    return objects;
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
  ]), ChildProperties = /* @__PURE__ */ new Set(["innerHTML", "textContent", "innerText", "children"]), Aliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
    className: "class",
    htmlFor: "for"
  }), PropAliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
    class: "className",
    novalidate: {
      $: "noValidate",
      FORM: 1
    },
    formnovalidate: {
      $: "formNoValidate",
      BUTTON: 1,
      INPUT: 1
    },
    ismap: {
      $: "isMap",
      IMG: 1
    },
    nomodule: {
      $: "noModule",
      SCRIPT: 1
    },
    playsinline: {
      $: "playsInline",
      VIDEO: 1
    },
    readonly: {
      $: "readOnly",
      INPUT: 1,
      TEXTAREA: 1
    },
    adauctionheaders: {
      $: "adAuctionHeaders",
      IFRAME: 1
    },
    allowfullscreen: {
      $: "allowFullscreen",
      IFRAME: 1
    },
    browsingtopics: {
      $: "browsingTopics",
      IMG: 1
    },
    defaultchecked: {
      $: "defaultChecked",
      INPUT: 1
    },
    defaultmuted: {
      $: "defaultMuted",
      AUDIO: 1,
      VIDEO: 1
    },
    defaultselected: {
      $: "defaultSelected",
      OPTION: 1
    },
    disablepictureinpicture: {
      $: "disablePictureInPicture",
      VIDEO: 1
    },
    disableremoteplayback: {
      $: "disableRemotePlayback",
      AUDIO: 1,
      VIDEO: 1
    },
    preservespitch: {
      $: "preservesPitch",
      AUDIO: 1,
      VIDEO: 1
    },
    shadowrootclonable: {
      $: "shadowRootClonable",
      TEMPLATE: 1
    },
    shadowrootdelegatesfocus: {
      $: "shadowRootDelegatesFocus",
      TEMPLATE: 1
    },
    shadowrootserializable: {
      $: "shadowRootSerializable",
      TEMPLATE: 1
    },
    sharedstoragewritable: {
      $: "sharedStorageWritable",
      IFRAME: 1,
      IMG: 1
    }
  });
  function getPropAlias(prop, tagName) {
    let a = PropAliases[prop];
    return typeof a == "object" ? a[tagName] ? a.$ : void 0 : a;
  }
  var DelegatedEvents = /* @__PURE__ */ new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]), SVGElements = /* @__PURE__ */ new Set([
    "altGlyph",
    "altGlyphDef",
    "altGlyphItem",
    "animate",
    "animateColor",
    "animateMotion",
    "animateTransform",
    "circle",
    "clipPath",
    "color-profile",
    "cursor",
    "defs",
    "desc",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feDropShadow",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence",
    "filter",
    "font",
    "font-face",
    "font-face-format",
    "font-face-name",
    "font-face-src",
    "font-face-uri",
    "foreignObject",
    "g",
    "glyph",
    "glyphRef",
    "hkern",
    "image",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "missing-glyph",
    "mpath",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "set",
    "stop",
    "svg",
    "switch",
    "symbol",
    "text",
    "textPath",
    "tref",
    "tspan",
    "use",
    "view",
    "vkern"
  ]), SVGNamespace = {
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace"
  };
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
  function setAttributeNS(node, namespace, name, value) {
    isHydrating(node) || (value == null ? node.removeAttributeNS(namespace, name) : node.setAttributeNS(namespace, name, value));
  }
  function setBoolAttribute(node, name, value) {
    isHydrating(node) || (value ? node.setAttribute(name, "") : node.removeAttribute(name));
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
  function classList(node, value, prev = {}) {
    let classKeys = Object.keys(value || {}), prevKeys = Object.keys(prev), i, len;
    for (i = 0, len = prevKeys.length; i < len; i++) {
      let key = prevKeys[i];
      !key || key === "undefined" || value[key] || (toggleClassKey(node, key, !1), delete prev[key]);
    }
    for (i = 0, len = classKeys.length; i < len; i++) {
      let key = classKeys[i], classValue = !!value[key];
      !key || key === "undefined" || prev[key] === classValue || !classValue || (toggleClassKey(node, key, !0), prev[key] = classValue);
    }
    return prev;
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
  function spread(node, props = {}, isSVG, skipChildren) {
    let prevProps = {};
    return skipChildren || createRenderEffect(() => prevProps.children = insertExpression(node, props.children, prevProps.children)), createRenderEffect(() => typeof props.ref == "function" && use(props.ref, node)), createRenderEffect(() => assign(node, props, isSVG, !0, prevProps, !0)), prevProps;
  }
  function use(fn, element, arg) {
    return untrack(() => fn(element, arg));
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== void 0 && !initial && (initial = []), typeof accessor != "function") return insertExpression(parent, accessor, initial, marker);
    createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
  }
  function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = !1) {
    props || (props = {});
    for (let prop in prevProps)
      if (!(prop in props)) {
        if (prop === "children") continue;
        prevProps[prop] = assignProp(node, prop, null, prevProps[prop], isSVG, skipRef, props);
      }
    for (let prop in props) {
      if (prop === "children") {
        skipChildren || insertExpression(node, props.children);
        continue;
      }
      let value = props[prop];
      prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef, props);
    }
  }
  function getNextElement(template2) {
    let node, key;
    return !isHydrating() || !(node = sharedConfig.registry.get(key = getHydrationKey())) ? template2() : (sharedConfig.completed && sharedConfig.completed.add(node), sharedConfig.registry.delete(key), node);
  }
  function isHydrating(node) {
    return !!sharedConfig.context && !sharedConfig.done && (!node || node.isConnected);
  }
  function toPropertyName(name) {
    return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
  }
  function toggleClassKey(node, key, value) {
    let classNames = key.trim().split(/\s+/);
    for (let i = 0, nameLen = classNames.length; i < nameLen; i++) node.classList.toggle(classNames[i], value);
  }
  function assignProp(node, prop, value, prev, isSVG, skipRef, props) {
    let isCE, isProp, isChildProp, propAlias, forceProp;
    if (prop === "style") return style(node, value, prev);
    if (prop === "classList") return classList(node, value, prev);
    if (value === prev) return prev;
    if (prop === "ref")
      skipRef || value(node);
    else if (prop.slice(0, 3) === "on:") {
      let e = prop.slice(3);
      prev && node.removeEventListener(e, prev, typeof prev != "function" && prev), value && node.addEventListener(e, value, typeof value != "function" && value);
    } else if (prop.slice(0, 10) === "oncapture:") {
      let e = prop.slice(10);
      prev && node.removeEventListener(e, prev, !0), value && node.addEventListener(e, value, !0);
    } else if (prop.slice(0, 2) === "on") {
      let name = prop.slice(2).toLowerCase(), delegate = DelegatedEvents.has(name);
      if (!delegate && prev) {
        let h = Array.isArray(prev) ? prev[0] : prev;
        node.removeEventListener(name, h);
      }
      (delegate || value) && (addEventListener(node, name, value, delegate), delegate && delegateEvents([name]));
    } else if (prop.slice(0, 5) === "attr:")
      setAttribute(node, prop.slice(5), value);
    else if (prop.slice(0, 5) === "bool:")
      setBoolAttribute(node, prop.slice(5), value);
    else if ((forceProp = prop.slice(0, 5) === "prop:") || (isChildProp = ChildProperties.has(prop)) || !isSVG && ((propAlias = getPropAlias(prop, node.tagName)) || (isProp = Properties.has(prop))) || (isCE = node.nodeName.includes("-") || "is" in props)) {
      if (forceProp)
        prop = prop.slice(5), isProp = !0;
      else if (isHydrating(node)) return value;
      prop === "class" || prop === "className" ? className(node, value) : isCE && !isProp && !isChildProp ? node[toPropertyName(prop)] = value : node[propAlias || prop] = value;
    } else {
      let ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
      ns ? setAttributeNS(node, ns, prop, value) : setAttribute(node, Aliases[prop] || prop, value);
    }
    return value;
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
  function getHydrationKey() {
    return sharedConfig.getNextContextId();
  }
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  function createElement(tagName, isSVG = !1, is = void 0) {
    return isSVG ? document.createElementNS(SVG_NAMESPACE, tagName) : document.createElement(tagName, {
      is
    });
  }
  function Portal(props) {
    let {
      useShadow
    } = props, marker = document.createTextNode(""), mount = () => props.mount || document.body, owner = getOwner(), content, hydrating = !!sharedConfig.context;
    return createEffect(() => {
      hydrating && (getOwner().user = hydrating = !1), content || (content = runWithOwner(owner, () => createMemo(() => props.children)));
      let el = mount();
      if (el instanceof HTMLHeadElement) {
        let [clean, setClean] = createSignal(!1), cleanup = () => setClean(!0);
        createRoot((dispose2) => insert(el, () => clean() ? dispose2() : content(), null)), onCleanup(cleanup);
      } else {
        let container = createElement(props.isSVG ? "g" : "div", props.isSVG), renderRoot = useShadow && container.attachShadow ? container.attachShadow({
          mode: "open"
        }) : container;
        Object.defineProperty(container, "_$host", {
          get() {
            return marker.parentNode;
          },
          configurable: !0
        }), insert(renderRoot, content), el.appendChild(container), props.ref && props.ref(container), onCleanup(() => el.contains(container) && el.removeChild(container));
      }
    }, void 0, {
      render: !hydrating
    }), marker;
  }
  function createDynamic(component, props) {
    let cached = createMemo(component);
    return createMemo(() => {
      let component2 = cached();
      switch (typeof component2) {
        case "function":
          return untrack(() => component2(props));
        case "string":
          let isSvg = SVGElements.has(component2), el = sharedConfig.context ? getNextElement() : createElement(component2, isSvg, untrack(() => props.is));
          return spread(el, props, isSvg), el;
      }
    });
  }
  function Dynamic(props) {
    let [, others] = splitProps(props, ["component"]);
    return createDynamic(() => props.component, others);
  }

  // src/eh/url.ts
  var EXHENTAI_HOST = "exhentai.org", EXHENTAI_ONION_HOST = "exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion";
  function ehSiteTheme(url = window.location.href) {
    let hostname = new URL(url, window.location.href).hostname;
    return hostname === EXHENTAI_HOST || hostname.endsWith(`.${EXHENTAI_HOST}`) || hostname === EXHENTAI_ONION_HOST || hostname.endsWith(`.${EXHENTAI_ONION_HOST}`) ? "exhentai" : "e-hentai";
  }
  function galleryIdentityFromUrl(url = window.location.href) {
    try {
      let match = new URL(url, window.location.href).pathname.match(/^\/g\/(\d+)\/([^/]+)/i), galleryId = Number(match?.[1]), token = match?.[2];
      return token && Number.isSafeInteger(galleryId) && galleryId > 0 ? { galleryId, token } : null;
    } catch {
      return null;
    }
  }
  function urlPath(url) {
    try {
      return new URL(url, window.location.href).pathname.toLowerCase();
    } catch {
      return "";
    }
  }
  function galleryTagNameFromUrl(url) {
    let encodedName = urlPath(url).match(/^\/tag\/(.+?)\/?$/i)?.[1];
    try {
      return encodedName ? decodeURIComponent(encodedName.replace(/\+/g, " ")) : null;
    } catch {
      return null;
    }
  }
  function isFullImageUrl(url) {
    return urlPath(url).includes("/fullimg");
  }
  function extractPageType(url = window.location.href) {
    try {
      let parsed = new URL(url, window.location.href), hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
      if (parsed.pathname === "/popular" && hash.has("ehpeek_history")) {
        let requestedPage = Number(hash.get("page") ?? "0");
        return {
          type: "readHistory",
          url: parsed.href,
          pageIndex: Number.isSafeInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0
        };
      }
      let galleryMatch = parsed.pathname.match(/^\/g\/(\d+)\/([^/]+)\/?$/i);
      if (galleryMatch) {
        let galleryId = Number(galleryMatch[1]), token = galleryMatch[2];
        if (token && Number.isFinite(galleryId) && galleryId > 0)
          return {
            type: "gallery",
            url: parsed.href,
            galleryId,
            token,
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
      } : /^\/mytags\/?$/.test(parsed.pathname) ? {
        type: "myTags",
        url: parsed.href
      } : parsed.pathname === "/uconfig.php" ? {
        type: "settings",
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
  function readHistoryUrl(pageIndex = 0) {
    let url = new URL("/popular", window.location.href);
    return url.hash = pageIndex > 0 ? `ehpeek_history&page=${pageIndex}` : "ehpeek_history", url.href;
  }
  function galleryPageNumber(url) {
    let page2 = extractPageType(url);
    return page2.type === "image" ? page2.pageNum : void 0;
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
    return Math.min(previewIndex, maxPreviewIndex);
  }
  function peekPageFromHash(hash = window.location.hash) {
    let params = new URLSearchParams(hash.replace(/^#/, "")), page2 = Number(params.get("peek_page") || "");
    return Number.isFinite(page2) && page2 > 0 ? page2 : null;
  }
  function clearPeekLocation() {
    let url = new URL(window.location.href), params = new URLSearchParams(url.hash.replace(/^#/, ""));
    params.has("peek_page") && (params.delete("peek_page"), url.hash = params.toString(), window.history.replaceState(window.history.state, "", url.href));
  }
  function updatePeekLocation(pageNumber, pageSize, maxPreviewIndex) {
    if (!pageNumber || pageNumber <= 0)
      return;
    let url = new URL(window.location.href), params = new URLSearchParams(window.location.hash.replace(/^#/, "")), nextValue = String(pageNumber), nextPreviewIndex = previewPageIndexForGalleryPage(pageNumber, pageSize, maxPreviewIndex), changed = !1;
    nextPreviewIndex === 0 ? url.searchParams.has("p") && (url.searchParams.delete("p"), changed = !0) : url.searchParams.get("p") !== String(nextPreviewIndex) && (url.searchParams.set("p", String(nextPreviewIndex)), changed = !0), params.get("peek_page") !== nextValue && (params.set("peek_page", nextValue), changed = !0), changed && (url.hash = params.toString(), window.history.replaceState(window.history.state, "", url.href));
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

  // src/eh/dom/core.ts
  var EHPEEK_ANCHOR_ATTRIBUTE = "data-ehpeek-anchor", EH_SYRINGE_IGNORE_SELECTOR = ".eh-syringe-ignore", LONG_PRESS_DELAY_MS = 600, LONG_PRESS_MOVE_TOLERANCE_PX = 10, mountedNodes = /* @__PURE__ */ new WeakMap();
  var managedBody = null, emptyDomApply = {}, emptyDomChilds = {};
  function defineDomNode() {
    return (selector, options = {}) => {
      let childs = options.childs ?? emptyDomChilds;
      return Object.assign({
        apply: options.apply ?? emptyDomApply,
        childs,
        kind: "node",
        selector
      }, childs);
    };
  }
  var query = defineDomNode(), anchor = defineDomNode(), area = defineDomNode(), button = defineDomNode(), cell = defineDomNode(), control = defineDomNode(), form = defineDomNode(), image = defineDomNode(), input = defineDomNode(), option = defineDomNode(), row = defineDomNode(), script = defineDomNode(), select = defineDomNode(), table = defineDomNode();
  function cls(name, options = {}) {
    return query(`.${name}`, options);
  }
  function id(name, options = {}) {
    return query(`#${name}`, options);
  }
  function tag(name, options = {}) {
    return defineDomNode()(name, options);
  }
  function domSelector(source) {
    return typeof source == "string" ? source : source.selector;
  }
  function originalPageNode(node) {
    return node.closest(EH_SYRINGE_IGNORE_SELECTOR) === null;
  }
  function anyDomNode() {
    return !0;
  }
  function createAnchor(name) {
    let selector = `[${EHPEEK_ANCHOR_ATTRIBUTE}="${CSS.escape(name)}"]`;
    if (document.querySelector(selector))
      return null;
    let anchor2 = document.createElement("div");
    return anchor2.setAttribute(EHPEEK_ANCHOR_ATTRIBUTE, name), DomNode.from(anchor2).inplace();
  }
  function createManagedElement(tagName, apply = emptyDomApply) {
    return ManagedDomNode.from(document.createElement(tagName), apply);
  }
  function documentBody() {
    return managedBody ?? (managedBody = DomNode.from(document.body).inplace()), managedBody;
  }
  var _node, _DomNode = class _DomNode {
    constructor(node) {
      __privateAdd(this, _node);
      __privateSet(this, _node, node);
    }
    static from(node) {
      return new _DomNode(node);
    }
    use(description) {
      return bindDom(description, () => [this]).bound;
    }
    one(source, filter = originalPageNode) {
      return Array.from(
        __privateGet(this, _node).querySelectorAll(domSelector(source)),
        _DomNode.from
      ).find(filter) ?? null;
    }
    all(source, filter = originalPageNode) {
      return Array.from(__privateGet(this, _node).querySelectorAll(domSelector(source))).map(_DomNode.from).filter(filter);
    }
    parent() {
      let parent = __privateGet(this, _node).parentElement;
      return parent ? _DomNode.from(parent) : null;
    }
    children() {
      return Array.from(__privateGet(this, _node).children, (child) => _DomNode.from(child));
    }
    closest(source) {
      let element = __privateGet(this, _node).closest(domSelector(source));
      return element ? _DomNode.from(element) : null;
    }
    matches(source) {
      return __privateGet(this, _node).matches(domSelector(source));
    }
    previous() {
      let previous = __privateGet(this, _node).previousElementSibling;
      return previous instanceof HTMLElement ? _DomNode.from(previous) : null;
    }
    form() {
      return __privateGet(this, _node).form ? _DomNode.from(__privateGet(this, _node).form) : null;
    }
    childElementCount() {
      return __privateGet(this, _node).childElementCount;
    }
    text() {
      return __privateGet(this, _node).textContent?.trim() ?? "";
    }
    attribute(name) {
      return __privateGet(this, _node).getAttribute(name);
    }
    hasAttribute(name) {
      return __privateGet(this, _node).hasAttribute(name);
    }
    attributeNames() {
      return __privateGet(this, _node).getAttributeNames();
    }
    hasClass(className2) {
      return __privateGet(this, _node).classList.contains(className2);
    }
    computedStyle() {
      return window.getComputedStyle(__privateGet(this, _node));
    }
    imageSize() {
      return {
        height: __privateGet(this, _node).naturalHeight || __privateGet(this, _node).height || Number(__privateGet(this, _node).getAttribute("height") || ""),
        width: __privateGet(this, _node).naturalWidth || __privateGet(this, _node).width || Number(__privateGet(this, _node).getAttribute("width") || "")
      };
    }
    inputValue() {
      return __privateGet(this, _node).value;
    }
    checked() {
      return __privateGet(this, _node).checked;
    }
    selected() {
      return __privateGet(this, _node).selected;
    }
    sameNode(other) {
      return __privateGet(this, _node) === __privateGet(other, _node);
    }
    observe(source, acquire, onManaged, options = { childList: !0, subtree: !0 }) {
      let seen = [], cleanups = [], scan = () => {
        for (let node of this.all(domSelector(source))) {
          if (seen.some((candidate) => candidate.sameNode(node)))
            continue;
          seen.push(node);
          let managed = acquire(node);
          if (!managed)
            continue;
          let cleanup = onManaged(managed);
          cleanup && cleanups.push(cleanup);
        }
      }, observer = new MutationObserver(scan);
      return scan(), observer.observe(__privateGet(this, _node), options), () => {
        observer.disconnect(), cleanups.forEach((cleanup) => cleanup());
      };
    }
    inplace(apply = emptyDomApply) {
      return ManagedDomNode.from(__privateGet(this, _node), apply);
    }
    move(apply = emptyDomApply) {
      let managed = this.inplace(apply);
      return managed.remove(), managed;
    }
    clone(applyOrDeep = emptyDomApply, deep = !0) {
      let apply = typeof applyOrDeep == "boolean" ? emptyDomApply : applyOrDeep, cloneDeep = typeof applyOrDeep == "boolean" ? applyOrDeep : deep;
      return ManagedDomNode.from(
        __privateGet(this, _node).cloneNode(cloneDeep),
        apply
      );
    }
  };
  _node = new WeakMap();
  var DomNode = _DomNode;
  function bindDom(description, scopes) {
    let children = [], invalidateChildren = () => {
      for (let child of children)
        child.invalidate();
    }, definition = isDomDefinition(description) ? description : null, nodeController = definition ? bindDomNode(definition, scopes, invalidateChildren) : null, bound = nodeController?.bound ?? {}, childScopes = definition ? () => nodeController?.bound.all() ?? [] : scopes, childs = definition?.childs ?? description;
    for (let [name, child] of Object.entries(childs)) {
      if (name in bound)
        throw new Error(`Original DOM child name is reserved: ${name}`);
      let childController = bindDom(child, childScopes);
      children.push(childController), Object.assign(bound, { [name]: childController.bound });
    }
    return {
      bound,
      invalidate: nodeController?.invalidate ?? invalidateChildren
    };
  }
  function isDomDefinition(description) {
    return "kind" in description && description.kind === "node";
  }
  function bindDomNode(description, scopes, invalidateChildren) {
    let cached, queryNodes = () => scopes().flatMap((scope) => scope.all(description.selector)), resolve = () => (cached ?? (cached = queryNodes()), cached);
    return {
      bound: {
        all: () => [...resolve()],
        clone: () => resolve()[0]?.clone(description.apply) ?? null,
        cloneAll: () => resolve().map((node) => node.clone(description.apply)),
        inplace: () => resolve()[0]?.inplace(description.apply) ?? null,
        inplaceAll: () => resolve().map((node) => node.inplace(description.apply)),
        move: () => resolve()[0]?.move(description.apply) ?? null,
        moveAll: () => resolve().map((node) => node.move(description.apply)),
        one: () => resolve()[0] ?? null,
        requery: () => (cached = queryNodes(), invalidateChildren(), [...cached])
      },
      invalidate: () => {
        cached = void 0, invalidateChildren();
      }
    };
  }
  var _apply, _node2, _ManagedDomNode = class _ManagedDomNode {
    constructor(element, apply) {
      __privateAdd(this, _apply);
      __privateAdd(this, _node2);
      __privateSet(this, _apply, apply), __privateSet(this, _node2, element), this.Component = () => __privateGet(this, _node2);
    }
    static from(element, apply = emptyDomApply) {
      return new _ManagedDomNode(element, apply);
    }
    apply(...names) {
      let classes = names.map((name) => {
        let className2 = __privateGet(this, _apply)[name];
        if (!className2)
          throw new Error(`Unknown original DOM application: ${name}`);
        return className2;
      });
      return __privateGet(this, _node2).classList.add(...classes), this;
    }
    all(source) {
      let apply = typeof source == "string" ? emptyDomApply : source.apply;
      return Array.from(
        __privateGet(this, _node2).querySelectorAll(domSelector(source)),
        (node) => _ManagedDomNode.from(node, apply)
      );
    }
    rect() {
      return __privateGet(this, _node2).getBoundingClientRect();
    }
    readAttribute(name) {
      return __privateGet(this, _node2).getAttribute(name);
    }
    setAttributes(values) {
      for (let [name, value] of Object.entries(values))
        __privateGet(this, _node2).setAttribute(name, value);
      return this;
    }
    removeAttributes(...names) {
      for (let name of names)
        __privateGet(this, _node2).removeAttribute(name);
      return this;
    }
    addClasses(...names) {
      return __privateGet(this, _node2).classList.add(...names), this;
    }
    removeClasses(...names) {
      return __privateGet(this, _node2).classList.remove(...names), this;
    }
    replaceClasses(value) {
      return __privateGet(this, _node2).className = value, this;
    }
    styles(values, priority = "") {
      for (let [property, value] of Object.entries(values))
        __privateGet(this, _node2).style.setProperty(property, value, priority);
      return this;
    }
    removeStyles(...properties) {
      for (let property of properties)
        __privateGet(this, _node2).style.removeProperty(property);
      return this;
    }
    removeAllStyles() {
      return __privateGet(this, _node2).removeAttribute("style"), this;
    }
    attribute(name, value) {
      return __privateGet(this, _node2).setAttribute(name, value), this;
    }
    click() {
      __privateGet(this, _node2).click();
    }
    mount(view) {
      mountedNodes.get(__privateGet(this, _node2))?.(), __privateGet(this, _node2).replaceChildren(), mountedNodes.set(__privateGet(this, _node2), render(view, __privateGet(this, _node2)));
    }
    remove() {
      mountedNodes.get(__privateGet(this, _node2))?.(), mountedNodes.delete(__privateGet(this, _node2)), __privateGet(this, _node2).remove();
    }
    replaceWith(replacement) {
      __privateGet(this, _node2).replaceWith(
        replacement instanceof _ManagedDomNode ? __privateGet(replacement, _node2) : replacement
      );
    }
    before(sibling) {
      __privateGet(this, _node2).before(sibling instanceof _ManagedDomNode ? __privateGet(sibling, _node2) : sibling);
    }
    after(sibling) {
      __privateGet(this, _node2).after(sibling instanceof _ManagedDomNode ? __privateGet(sibling, _node2) : sibling);
    }
    append(...children) {
      return __privateGet(this, _node2).append(...children.map((child) => __privateGet(child, _node2))), this;
    }
    prepend(child) {
      __privateGet(this, _node2).prepend(child instanceof _ManagedDomNode ? __privateGet(child, _node2) : child);
    }
    setTextUnlessInput(text) {
      __privateGet(this, _node2) instanceof HTMLInputElement || (__privateGet(this, _node2).textContent = text);
    }
    setHidden(hidden) {
      return __privateGet(this, _node2).hidden = hidden, this;
    }
    replaceChildren(...children) {
      __privateGet(this, _node2).replaceChildren(...children.map((child) => child instanceof _ManagedDomNode ? __privateGet(child, _node2) : child));
    }
    listen(type, listener, options) {
      return __privateGet(this, _node2).addEventListener(type, listener, options), () => __privateGet(this, _node2).removeEventListener(type, listener, options);
    }
    listenLongPress(listener, shouldStart = () => !0) {
      let timer = null, press = null, suppressClick = !1, suppressClickTimer = null, cancel = () => {
        timer !== null && (window.clearTimeout(timer), timer = null), press = null;
      }, onPointerDown = (event) => {
        !event.isPrimary || event.button !== 0 || !shouldStart(event) || (cancel(), press = { event, x: event.clientX, y: event.clientY }, timer = window.setTimeout(() => {
          let completed = press;
          cancel(), completed && (suppressClick = !0, listener(completed.event), suppressClickTimer = window.setTimeout(() => {
            suppressClick = !1, suppressClickTimer = null;
          }, 1e3));
        }, LONG_PRESS_DELAY_MS));
      }, onPointerMove = (event) => {
        press?.event.pointerId === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > LONG_PRESS_MOVE_TOLERANCE_PX && cancel();
      }, onPointerEnd = (event) => {
        press?.event.pointerId === event.pointerId && cancel();
      }, onContextMenu = (event) => {
        (press || suppressClick) && event.preventDefault();
      }, onClick = (event) => {
        suppressClick && (suppressClick = !1, event.preventDefault(), event.stopImmediatePropagation());
      }, cleanups = [
        this.listen("pointerdown", onPointerDown),
        this.listen("pointermove", onPointerMove),
        this.listen("pointerup", onPointerEnd),
        this.listen("pointercancel", onPointerEnd),
        this.listen("contextmenu", onContextMenu),
        this.listen("click", onClick, !0)
      ];
      return () => {
        cancel(), suppressClickTimer !== null && window.clearTimeout(suppressClickTimer), cleanups.forEach((cleanup) => cleanup());
      };
    }
    observe(onChange, options = { childList: !0, subtree: !0 }) {
      let observer = new MutationObserver(onChange);
      return observer.observe(__privateGet(this, _node2), options), () => observer.disconnect();
    }
    focus() {
      __privateGet(this, _node2).focus();
    }
    scrollIntoView(options) {
      __privateGet(this, _node2).scrollIntoView(options);
    }
    isNode(node) {
      return __privateGet(this, _node2) === node;
    }
    contains(node) {
      return __privateGet(this, _node2).contains(node);
    }
    matches(source) {
      return __privateGet(this, _node2).matches(domSelector(source));
    }
    copyAttributesTo(target) {
      for (let attribute of Array.from(__privateGet(this, _node2).attributes))
        __privateGet(target, _node2).setAttribute(attribute.name, attribute.value);
    }
    setInputValue(value) {
      __privateGet(this, _node2).value = value;
    }
    inputValue() {
      return __privateGet(this, _node2).value;
    }
    setSelected(selected) {
      __privateGet(this, _node2).selected = selected;
    }
    dispatchInput() {
      __privateGet(this, _node2).dispatchEvent(new Event("input", { bubbles: !0 }));
    }
    mirrorContentTo(target) {
      let update = () => {
        target.replaceChildren(
          ...Array.from(__privateGet(this, _node2).childNodes, (node) => node.cloneNode(!0))
        );
        let language = __privateGet(this, _node2).getAttribute("lang");
        language ? target.setAttribute("lang", language) : target.removeAttribute("lang");
      };
      return update(), this.observe(update, {
        attributes: !0,
        attributeFilter: ["lang"],
        characterData: !0,
        childList: !0,
        subtree: !0
      });
    }
  };
  _apply = new WeakMap(), _node2 = new WeakMap();
  var ManagedDomNode = _ManagedDomNode;

  // src/eh/dom/domClass.ts
  var sharedApply = {
    coverlessSearchGrid: "ehpeek-expand-coverless-search-grid",
    constrainResultsToViewport: "ehpeek-constrain-results-to-viewport",
    galleryTagMenuItem: "ehpeek-layout-gallery-tag-menu-item",
    hideOriginalSearchAction: "ehpeek-hide-original-search-action",
    searchGrid: "ehpeek-layout-search-grid",
    stackSearchGridTags: "ehpeek-stack-search-grid-tags"
  }, page = {
    html: tag("html", {
      apply: {
        constrainResults: sharedApply.constrainResultsToViewport
      }
    }),
    body: tag("body", {
      apply: {
        constrainFavoritesNavigation: "ehpeek-constrain-favorites-navigation",
        constrainResults: sharedApply.constrainResultsToViewport,
        hidePreviewPageBars: "ehpeek-hide-original-preview-page-bars"
      }
    })
  }, common = {
    descendants: query("*"),
    galleryLink: anchor('a[href*="/g/"]'),
    image: image("img"),
    interactive: query(
      "a[href], button, input, select, textarea, label, [onclick]"
    ),
    links: anchor("a[href]"),
    scripts: script("script")
  }, ehSyringe = {
    root: cls("ehs-injected")
  }, myTags = {
    tags: id("usertags_outer", {
      childs: {
        items: query(":scope > [id^='usertag_']", {
          childs: {
            color: input("input[id^='tagcolor_']"),
            preview: query("[id^='tagpreview_'][title]")
          }
        })
      }
    }),
    options: option("#tagset_outer select option"),
    defaultColor: input("#tagcolor"),
    enabled: input("#tagset_enable"),
    favoriteOptions: input("input[name='favcat']"),
    favoriteOptionRow: query("div[style*='height']")
  }, gallery = {
    actions: id("gd5", {
      apply: {
        expand: "ehpeek-expand-gallery-actions"
      },
      childs: {
        items: query("a, button, input[type='button'], input[type='submit']", {
          apply: {
            layout: "ehpeek-layout-gallery-action"
          }
        })
      }
    }),
    comments: id("cdiv", {
      apply: {
        touchScore: "ehpeek-enable-touch-comment-score"
      },
      childs: {
        score: cls("c5"),
        scoreComment: cls("c1", {
          childs: {
            details: query(".c7[id^='cvotes_']")
          }
        })
      }
    }),
    imagePage: {
      image: image("img#img"),
      links: anchor("a[href]")
    },
    info: {
      category: id("gdc", {
        childs: {
          appearance: query("[class*='ct']")
        }
      }),
      cover: id("gd1", {
        childs: {
          image: image("img", {
            apply: {
              fit: "ehpeek-fit-gallery-cover"
            }
          }),
          descendants: query("*")
        }
      }),
      details: id("gdd", {
        childs: {
          rows: row("tr", {
            childs: {
              cells: cell("td, th")
            }
          })
        }
      }),
      favorite: id("fav", {
        childs: {
          link: id("favoritelink"),
          titled: query("[title]")
        }
      }),
      hostFallback: id("gleft"),
      original: id("gmid"),
      rating: {
        actions: area('map[name="rating"] area'),
        count: id("rating_count"),
        image: id("rating_image"),
        label: id("rating_label"),
        rated: query(".irb, .irg, .irr")
      },
      tagMenu: id("tagmenu_act", {
        apply: {
          layout: "ehpeek-layout-gallery-tag-menu"
        },
        childs: {
          actions: anchor("a")
        }
      }),
      newTag: id("tagmenu_new", {
        apply: {
          layout: "ehpeek-layout-new-tag-form"
        },
        childs: {
          button: control("#newtagbutton"),
          field: input("#newtagfield"),
          form: form("form")
        }
      }),
      titleMain: id("gn"),
      titleSub: id("gj"),
      uploader: query("#gdn a, #gdn")
    },
    preview: {
      description: cls("gpc"),
      imageLinks: anchor(
        "#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']"
      ),
      imageLinkHost: query("#gdt, .gdtm, .gdtl"),
      pageBarBottom: cls("ptb"),
      pageBarTop: cls("ptt"),
      thumbs: id("gdt", {
        apply: {
          suppressTapHighlight: "ehpeek-suppress-thumbnail-tap-highlight",
          swipe: "ehpeek-enable-preview-swipe-input"
        },
        childs: {
          images: image("img"),
          links: anchor("a[href]")
        }
      })
    },
    tagContainer: query("div.gt, div.gtl, div.gtw", {
      apply: {
        myTag: "ehpeek-color-my-tag"
      }
    }),
    tags: id("taglist", {
      childs: {
        links: anchor("a"),
        rows: row("tr", {
          childs: {
            namespace: query(".tc, td:first-child"),
            links: anchor("a")
          }
        })
      }
    })
  }, search = {
    controls: query("#toppane, .searchtext, .searchwarn, .searchnav, .ptt, .ptb"),
    displayMode: select("select[onchange*='inline_set=dm_']", {
      childs: {
        options: option("option")
      }
    }),
    favorites: {
      categories: query(".ido > .nosel", {
        apply: {
          hide: "ehpeek-hide-original-favorites-categories"
        },
        childs: {
          items: query(":scope > .fp, :scope > .fps", {
            childs: {
              indicator: cls("i")
            }
          })
        }
      }),
      input: input("input[name='f_search']"),
      selectedCategory: cls("fps")
    },
    input: input("#f_search, input[name='f_search']", {
      apply: {
        expand: "ehpeek-expand-search-input"
      }
    }),
    navigation: cls("searchnav", {
      childs: {
        first: anchor("a[id$='first'][href]"),
        previous: anchor("a[id$='prev'][href]"),
        next: anchor("a[id$='next'][href]"),
        last: anchor("a[id$='last'][href]"),
        links: anchor("a[href]")
      }
    }),
    navigationLink: anchor(
      ".searchnav a[id$='first'][href], .searchnav a[id$='prev'][href], .searchnav a[id$='next'][href], .searchnav a[id$='last'][href]"
    ),
    panel: {
      box: id("searchbox", {
        apply: {
          reset: "ehpeek-reset-search-box-layout"
        },
        childs: {
          advanced: id("advdiv", {
            apply: {
              expand: "ehpeek-expand-search-advanced-options"
            }
          }),
          categories: table("form > table", {
            apply: {
              layout: "ehpeek-layout-search-categories"
            }
          }),
          form: form("form", {
            apply: {
              stack: "ehpeek-stack-search-form"
            }
          })
        }
      }),
      clear: control("input[name='f_clear'], button[name='f_clear']", {
        apply: {
          hide: sharedApply.hideOriginalSearchAction
        }
      }),
      clearFallback: control("input[type='button'], button[type='button']", {
        apply: {
          hide: sharedApply.hideOriginalSearchAction
        }
      }),
      fileSearch: id("fsdiv", {
        apply: {
          expand: "ehpeek-expand-file-search"
        }
      }),
      optionLinks: anchor("a"),
      submit: control("input[name='f_apply'], button[name='f_apply']", {
        apply: {
          hide: sharedApply.hideOriginalSearchAction
        }
      }),
      submitFallback: control("input[type='submit'], button[type='submit']", {
        apply: {
          hide: sharedApply.hideOriginalSearchAction
        }
      })
    },
    rangeBar: id("rangebar"),
    removeHistory: control("[data-ehpeek-remove-history]"),
    results: cls("itg", {
      apply: {
        compactFavorites: "ehpeek-compact-all-favorites-results",
        containFavorites: "ehpeek-contain-favorites-results",
        containSearch: "ehpeek-contain-search-results",
        grid: sharedApply.searchGrid,
        swipe: "ehpeek-enable-search-swipe-input"
      },
      childs: {
        body: query(":scope > tbody"),
        rows: row("tbody > tr", {
          apply: {
            coverless: sharedApply.coverlessSearchGrid
          },
          childs: {
            cover: query(":scope > .gl1e"),
            content: query(":scope > .gl2e", {
              childs: {
                detail: cls("gl4e", {
                  childs: {
                    tags: query(":scope > *", {
                      apply: {
                        stack: sharedApply.stackSearchGridTags
                      }
                    }),
                    title: query(":scope > .glink", {
                      apply: {
                        history: "ehpeek-prefix-read-history-label"
                      }
                    })
                  }
                }),
                metadata: cls("gl3e")
              }
            })
          }
        }),
        galleryLinks: anchor('a[href*="/g/"]'),
        links: anchor("a[href]"),
        titles: cls("glink", {
          apply: {
            history: "ehpeek-prefix-read-history-label"
          }
        })
      }
    }),
    resultText: cls("searchtext"),
    submit: control("input[name='f_apply'], button[name='f_apply']"),
    submitFallback: control("input[type='submit'], button[type='submit']")
  }, settings = {
    titleDefault: input("#tl_r"),
    titleJapanese: input("#tl_j")
  }, topBar = {
    galleryTitle: query("#gd2, h1"),
    navigation: id("nb", {
      childs: {
        links: anchor("a[href]", {
          apply: {
            layout: "ehpeek-layout-top-bar-menu-item"
          }
        })
      }
    })
  }, domClass = {
    common,
    ehSyringe,
    gallery,
    myTags,
    page,
    search,
    settings,
    topBar
  };

  // src/eh/dom/ehSyringe.ts
  var ehSyringe_exports = {};
  __export(ehSyringe_exports, {
    initialize: () => initialize
  });

  // src/state/index.ts
  var touchUiDefault = window.matchMedia("(pointer: coarse)").matches, state = {
    app: {
      ehSyringeDetected: persisted("ehpeek:ehsyringe:detected", !1),
      openGalleryInNewTab: persisted("ehpeek:open-gallery-in-new-tab", !1)
    },
    reader: {
      enabled: persisted("ehpeek:reader:enabled", !0),
      fullscreen: persisted("ehpeek:reader:fullscreen", prefersTouchFullscreen()),
      navigationMode: persisted("ehpeek:reader:navigation-mode", "scroll"),
      scrollDirection: persisted("ehpeek:reader:scroll-direction", "ttb"),
      pagedDirection: persisted("ehpeek:reader:paged-direction", "rtl"),
      pageLayout: persisted("ehpeek:reader:page-layout", "single"),
      rightTapAction: persisted("ehpeek:reader:right-tap-action", "previous"),
      scrollTtbScale: persisted("ehpeek:reader:scroll-ttb-scale", null),
      scrollHorizontalScale: persisted("ehpeek:reader:scroll-horizontal-scale", null)
    },
    gallery: {
      enhanceThumbs: persisted("ehpeek:enhance-thumbs:enabled", !0),
      myTags: persisted("ehpeek:my-tags:enabled", !0),
      myTagAppearances: localJson("ehpeek:my-tags", [], isMyTagAppearance),
      myTagSets: localJson("ehpeek:my-tag-sets", [], isMyTagSetOption),
      readHistory: persisted("ehpeek:read-history:enabled", !0),
      includeUnreadHistory: persisted("ehpeek:read-history:include-unread", !0),
      readHistoryCount: persisted("ehpeek:history-count", 0),
      titlePreference: localEnum(
        "ehpeek:gallery-title-preference",
        "main",
        ["main", "sub"]
      )
    },
    search: {
      enhance: persisted("ehpeek:enhance-search:enabled", !0),
      grid: localSelection("ehpeek:search-grid", "ehpeek"),
      history: persisted("ehpeek:search-history:enabled", !0),
      searchHistory: persisted("ehpeek:search:history", [])
    },
    touch: {
      enabled: persisted("ehpeek:touch-ui:enabled", touchUiDefault)
    }
  };
  function loadSearchHistory() {
    let history = state.search.searchHistory.reload();
    return Array.isArray(history) ? history.filter((item) => typeof item == "string") : [];
  }
  function addSearchHistory(value) {
    let normalized = value.trim();
    if (!normalized)
      return loadSearchHistory();
    let history = [normalized, ...loadSearchHistory().filter((item) => item !== normalized)];
    return state.search.searchHistory.set(history), history;
  }
  function removeSearchHistory(value) {
    let history = loadSearchHistory().filter((item) => item !== value);
    return state.search.searchHistory.set(history), history;
  }
  function prefersTouchFullscreen() {
    return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  }
  function persisted(key, defaultValue) {
    let item = {
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
  function normalizeReaderScrollSizeScale(scale) {
    return Number.isFinite(scale) ? Math.min(100, Math.max(1e-3, scale)) : 1;
  }
  function localSelection(key, selectedValue) {
    let read = () => window.localStorage.getItem(key) === selectedValue, item = {
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
  function localEnum(key, defaultValue, values) {
    let read = () => {
      let value = window.localStorage.getItem(key);
      return values.includes(value) ? value : defaultValue;
    }, item = {
      defaultValue,
      value: read(),
      set(value) {
        item.value = value, window.localStorage.setItem(key, value);
      },
      reload() {
        return item.value = read(), item.value;
      }
    };
    return item;
  }
  function localJson(key, defaultValue, valid) {
    let read = () => {
      try {
        let value = JSON.parse(window.localStorage.getItem(key) ?? "null");
        return Array.isArray(value) ? value.filter(valid) : defaultValue;
      } catch {
        return defaultValue;
      }
    }, item = {
      defaultValue,
      value: read(),
      set(value) {
        item.value = value, window.localStorage.setItem(key, JSON.stringify(value));
      },
      reload() {
        return item.value = read(), item.value;
      },
      clear() {
        item.value = defaultValue, window.localStorage.removeItem(key);
      },
      stored() {
        return window.localStorage.getItem(key) !== null;
      }
    };
    return item;
  }
  function isMyTagAppearance(value) {
    if (!value || typeof value != "object" || Array.isArray(value))
      return !1;
    let item = value;
    return typeof item.name == "string" && typeof item.backgroundColor == "string" && typeof item.color == "string" && typeof item.id == "string" && typeof item.tagSet == "string";
  }
  function isMyTagSetOption(value) {
    if (!value || typeof value != "object" || Array.isArray(value))
      return !1;
    let item = value;
    return typeof item.label == "string" && typeof item.selected == "boolean" && typeof item.value == "string";
  }

  // src/eh/dom/ehSyringe.ts
  var INJECTION_TIMEOUT_MS = 3e3;
  function initialize() {
    detect();
  }
  async function detect() {
    document.readyState === "loading" && await new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: !0 });
    });
    let detected = isInjected();
    return !detected && state.app.ehSyringeDetected.value && (await new Promise((resolve) => {
      window.setTimeout(resolve, INJECTION_TIMEOUT_MS);
    }), detected = isInjected()), state.app.ehSyringeDetected.value !== detected && state.app.ehSyringeDetected.set(detected), detected;
  }
  function isInjected() {
    return DomNode.from(document.documentElement).matches(domClass.ehSyringe.root);
  }

  // src/texts.json
  var texts_default = {
    description: "A touch-optimized E-H/ExH viewer",
    button: {
      apply: "Apply",
      clearHistory: "Clear All History",
      close: "Close",
      confirm: "Confirm",
      default: "Default",
      removeHistory: "Delete History"
    },
    help: {
      title: "Help",
      content: {
        Reader: [
          "**Tap** the center to show or hide the toolbar.",
          "**Swipe or scroll** in the reading direction; tap either side or use the **Arrow keys** to turn pages.",
          "**Pinch** to zoom the image. Or **double-tap** to enter zoom mode and use the **mouse wheel** to adjust the scale."
        ],
        Browse: [
          "When **Enhance > Search Grids** is enabled, **swipe** horizontally to change search result pages."
        ],
        Gallery: [
          "When **Enhance > Thumbs Grids** is enabled, **swipe** horizontally to change preview pages.",
          "The Page Bar in Gallery can be **dragged** to adjust the range."
        ]
      }
    },
    reader: {
      readingOptions: "Reading options",
      adjustScrollViewport: "Adjust Scroll viewport size",
      resizeScrollViewport: "Resize Scroll viewport",
      fit: "Fit",
      applyGlobally: "Set Default",
      pagedMode: "Paged mode",
      singlePageMode: "Single-page layout",
      doublePageMode: "Double-page layout",
      scrollMode: "Scroll mode",
      rightTapPrevious: `Right side action:
Previous page`,
      rightTapNext: `Right side action:
Next page`,
      directionRtl: `Reading direction:
 Right to left`,
      directionLtr: `Reading direction:
 Left to right`,
      directionTtb: `Reading direction:
 Top to bottom`,
      download: "Download",
      downloadDisplayedImage: "Displayed image",
      downloadOriginalImage: "Original image",
      originalImageSource: "Original source provided by E-Hentai",
      originalImageUnavailable: "Original image unavailable",
      startReading: "Read",
      continueReading: "Continue",
      loading: "Loading...",
      pages: "Pages",
      endPage: "End",
      end: "End of gallery. Tap to exit.",
      failedPrefix: "Failed",
      reloadPage: "Reload page"
    },
    favorites: {
      all: "All"
    },
    history: {
      clearConfirm: "Clear all reading history?",
      empty: "No reading history",
      limit: "(max {limit})",
      visitedLabel: "[VISITED]",
      range: "{start}-{end} in {total} histories",
      readingLabel: "[READING]",
      removeConfirm: "Remove this gallery from Read History?",
      unread: "Unread"
    },
    gallery: {
      favoriteTag: "Add My Tag",
      removeFavoriteTag: "Remove My Tag",
      tagCollection: "Collection",
      tagBehavior: "Behavior",
      markTag: "Mark",
      watchTag: "Watch",
      hideTag: "Hide"
    },
    settings: {
      openSettings: "Settings",
      menuLabel: "Ehpeek",
      on: "On",
      off: "Off",
      discardChanges: "Discard unsaved settings changes?",
      general: "General",
      options: "Options",
      about: "About",
      readerLabel: "Reader",
      readerHelp: "Opens gallery images in Ehpeek's reader",
      readerFullscreenLabel: "Reader in Fullscreen",
      readerFullscreenHelp: "Enters fullscreen when the Reader opens",
      readerOptions: "Options",
      openGalleryInNewTabLabel: "Gallery in New Tab",
      openGalleryInNewTabHelp: "Opens Gallery links in a new browser tab",
      enhance: "Enhance",
      enhanceSearchLabel: "Search Grids",
      enhanceSearchHelp: "Adds swipe navigation to search pages",
      enhanceThumbsLabel: "Thumbs Grids",
      enhanceThumbsHelp: "Adds swipe navigation and scrollable pages bar for gallery preview",
      myTagsLabel: "My Tag in Gallery",
      myTagsHelp: "Highlights your saved tags with colors in gallery",
      readHistoryLabel: "Read History",
      readHistoryHelp: "Remembers reading progress",
      includeUnreadHistoryLabel: "Include Unread History",
      includeUnreadHistoryHelp: "Adds opened galleries to Read History before reading starts",
      searchHistoryLabel: "Search History",
      searchHistoryHelp: "Remembers previous searches",
      touchUiLabel: "Touch UI",
      touchUiHelp: "Uses touch-friendly navigation UI."
    },
    search: {
      advancedOptions: "Advanced Options",
      categories: "Categories",
      fileSearch: "File Search"
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
  function registerGlobalStyle(id2, css) {
    if (!css || document.getElementById(id2))
      return;
    let style2 = document.createElement("style");
    style2.id = id2, style2.textContent = css, (document.head ?? document.documentElement).append(style2);
  }

  // src/eh/dom/gallery.ts
  function extractMyTagsPageData(root = document, tagSet) {
    let source = DomNode.from(root).use(domClass.myTags), tags = source.tags.one();
    if (!tags)
      throw new Error("The My Tags page could not be read.");
    let options = source.options.all().map((option2) => ({
      label: option2.text() || option2.inputValue(),
      selected: option2.selected(),
      value: option2.inputValue()
    })), activeTagSet = tagSet ?? options.find((option2) => option2.selected)?.value ?? "1", defaultColor = source.defaultColor.one()?.inputValue().trim() ?? "", output = [];
    for (let item of tags.all(domClass.myTags.tags.items)) {
      let preview = item.one(domClass.myTags.tags.items.preview), name = normalizeTagName(preview?.attribute("title") ?? "");
      if (!preview || !name)
        continue;
      let itemColor = item.one(domClass.myTags.tags.items.color)?.inputValue() ?? "", backgroundColor = normalizeTagColor(itemColor) || normalizeTagColor(defaultColor), id2 = item.attribute("id")?.match(/^usertag_(\d+)$/)?.[1] ?? "";
      id2 && output.push({
        name,
        backgroundColor,
        color: readableTagColor(backgroundColor),
        id: id2,
        tagSet: activeTagSet
      });
    }
    return {
      appearances: output,
      enabled: source.enabled.one()?.checked() ?? !0,
      options
    };
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
  function mutateGalleryMyTags(appearances) {
    let byName = new Map(appearances.map((appearance) => [appearance.name, appearance])), source = DomNode.from(document).use(domClass.gallery), apply = () => {
      for (let tag2 of source.tags.links.requery()) {
        let name = galleryTagNameFromUrl(tag2.attribute("href") ?? ""), appearance = name ? byName.get(normalizeTagName(name)) : void 0;
        if (!appearance?.backgroundColor)
          continue;
        let container = tag2.closest(domClass.gallery.tagContainer);
        container && (container.inplace(domClass.gallery.tagContainer.apply).styles({
          "--ehpeek-my-tag-background": appearance.backgroundColor,
          "--ehpeek-my-tag-color": appearance.color
        }).apply("myTag"), tag2.inplace().setAttributes({
          "data-ehpeek-my-tag-id": appearance.id,
          "data-ehpeek-my-tag-set": appearance.tagSet
        }));
      }
    };
    return apply(), source.tags.inplace()?.observe(apply) ?? (() => {
    });
  }
  function manageGalleryContinueReadingButtonMount() {
    let managedHost = createManagedElement("div").replaceClasses("box-border w-full px-sm pt-sm pb-sm"), viewerOptions = DomNode.from(document).use(domClass.gallery).actions.inplace();
    return viewerOptions ? (viewerOptions.apply("expand").append(managedHost), managedHost) : (documentBody().append(managedHost), managedHost);
  }
  function manageGalleryPreview(root = document, baseUrl = window.location.href) {
    let source = DomNode.from(root).use(domClass.gallery.preview), currentUrl = new URL(baseUrl, window.location.href).href, currentIndex = previewPageIndex(currentUrl), pageDescriptionSource = source.description.one(), rangeText = pageDescriptionSource?.text() ?? "", rangeValues = rangeText.match(/([\d,]+)\s*-\s*([\d,]+)\D+([\d,]+)/)?.slice(1).map((value) => Number(value.replace(/,/g, ""))) ?? [], startImage = rangeValues[0], endImage = rangeValues[1], totalImages = rangeValues[2];
    if (startImage === void 0 || endImage === void 0 || totalImages === void 0 || !Number.isSafeInteger(startImage) || !Number.isSafeInteger(endImage) || !Number.isSafeInteger(totalImages) || startImage <= 0 || endImage <= 0 || totalImages <= 0 || endImage < startImage || totalImages < endImage)
      throw new Error("Cannot read the gallery preview image range.");
    let currentPageSize = endImage - startImage + 1, inferredFullPageSize = endImage === totalImages && currentIndex > 0 ? (totalImages - currentPageSize) / currentIndex : currentPageSize;
    if (!Number.isInteger(inferredFullPageSize) || inferredFullPageSize <= 0)
      throw new Error("Cannot determine the gallery preview page size.");
    let pageSize = inferredFullPageSize, maxIndex = Math.max(currentIndex, Math.ceil(totalImages / pageSize) - 1), seen = /* @__PURE__ */ new Set(), pages = source.imageLinks.all().flatMap((link) => {
      let url = normalizeUrl(link.attribute("href") || "", currentUrl), imagePage = extractPageType(url);
      if (imagePage.type !== "image" || seen.has(url))
        return [];
      seen.add(url);
      let size = link.one(domClass.common.image)?.imageSize();
      return [{
        aspectRatio: size && size.width > 0 && size.height > 0 ? size.height / size.width : 1.42,
        pageNum: imagePage.pageNum,
        url
      }];
    }).sort((left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER)), data = {
      currentIndex,
      currentUrl,
      descriptionText: rangeText,
      endImage,
      maxIndex,
      pageSize,
      pages,
      startImage,
      totalImages
    }, thumbsSource = source.thumbs.one(), pageBarTopSource = source.pageBarTop.one(), pageBarBottomSource = source.pageBarBottom.one(), createPageBarMount = (position) => createManagedElement("div").replaceClasses(
      `w-max max-w-full mx-auto overflow-x-auto touch-pan-y [-webkit-overflow-scrolling:touch] [&[data-dragging=true]]:select-none ${position === "top" ? "mt-2px mb-0" : "mt-0 mb-10px"}`
    ), elems = {
      mount: root === document && thumbsSource ? createManagedElement("div").replaceClasses("contents") : null,
      originalPageBarBottom: pageBarBottomSource?.inplace() ?? null,
      originalPageBarTop: pageBarTopSource?.inplace() ?? null,
      originalPageDescription: pageDescriptionSource?.inplace() ?? null,
      pageBarBottom: pageBarBottomSource ? createPageBarMount("bottom") : null,
      pageBarDescription: pageDescriptionSource && pageBarTopSource ? createManagedElement("div") : null,
      pageBarTop: pageBarTopSource ? createPageBarMount("top") : null,
      thumbImages: source.thumbs.images.inplaceAll(),
      thumbItems: thumbsSource?.children().map(
        (item) => root === document ? item.inplace() : item.move()
      ) ?? [],
      thumbs: root === document ? source.thumbs.inplace() : null
    };
    return elems.mount && elems.thumbs && elems.thumbs.before(elems.mount), { data, elems, handle: {
      /** Opens thumbnail image links in EhPeek Reader instead of original navigation. */
      interceptPreviewImageOpen(onOpen) {
        elems.thumbs?.apply("suppressTapHighlight");
        let handleClick = (event) => {
          let link = event.target instanceof Element ? DomNode.from(event.target).closest(domClass.common.links) : null, href = link?.attribute("href") ?? "";
          !link || extractPageType(href).type !== "image" || !link.one(domClass.common.image) && !link.closest(domClass.gallery.preview.imageLinkHost) || (event.preventDefault(), event.stopPropagation(), onOpen(normalizeUrl(href, currentUrl)));
        };
        return elems.thumbs?.listen("click", handleClick) ?? (() => {
        });
      },
      /** Makes thumbnail dragging available to the horizontal preview-page gesture. */
      ensurePreviewSwipeInput() {
        elems.thumbs?.apply("swipe");
        for (let image2 of elems.thumbImages)
          image2.setAttributes({ draggable: "false" });
      },
      /** Installs a fetched preview page into the currently visible thumbnail host. */
      replacePreviewThumbs(items) {
        elems.thumbs?.replaceChildren(...items);
      },
      /** Marks preview loading while retaining the currently visible thumbnails. */
      updatePreviewLoading(loading) {
        elems.thumbs?.attribute("aria-busy", String(loading));
      },
      /** Replaces both original page bars with mounts owned by EhPeek pagination. */
      installPreviewPageBars() {
        DomNode.from(document).use(domClass.page).body.inplace()?.apply("hidePreviewPageBars"), elems.originalPageBarTop && elems.pageBarTop && elems.originalPageBarTop.after(elems.pageBarTop), elems.originalPageBarBottom && elems.pageBarBottom && elems.originalPageBarBottom.after(elems.pageBarBottom), elems.originalPageDescription && elems.pageBarDescription && elems.pageBarTop && elems.pageBarTop.before(elems.pageBarDescription);
      },
      /** Brings the requested EhPeek page bar into view after preview navigation. */
      scrollPreviewPageBarIntoView(position) {
        (position === "top" ? elems.pageBarTop : elems.pageBarBottom)?.scrollIntoView({
          behavior: "smooth",
          block: position === "top" ? "start" : "end"
        });
      }
    } };
  }
  async function loadGalleryPreviewPage(previewIndex, pageUrl) {
    let url = previewUrlForIndex(previewIndex, pageUrl), response = await requestPage(url);
    return manageGalleryPreview(response.document, response.url);
  }
  function extractImageGalleryPage(root = document) {
    for (let link of DomNode.from(root).use(domClass.common).links.all()) {
      let page2 = extractPageType(normalizeUrl(link.attribute("href") || ""));
      if (page2.type === "gallery")
        return page2;
    }
    return null;
  }
  async function loadEhImagePage(page2) {
    let response = await requestPage(page2.url), imagePage = DomNode.from(response.document).use(domClass.gallery.imagePage), image2 = imagePage.image.one(), imageUrl = normalizeUrl(
      image2?.attribute("src") || image2?.attribute("data-src") || "",
      page2.url
    );
    if (!imageUrl)
      throw new Error(texts_default.errors.imageNotFound);
    let numberAttribute = (name) => {
      let value = Number(image2?.attribute(name));
      return Number.isFinite(value) && value > 0 ? value : null;
    };
    return {
      height: numberAttribute("height"),
      imageUrl,
      originalImageUrl: imagePage.links.all().map((link) => normalizeUrl(link.attribute("href") || "", page2.url)).find(isFullImageUrl) ?? null,
      width: numberAttribute("width")
    };
  }

  // src/eh/dom/galleryInfo.ts
  function extractGalleryHistoryInfo() {
    let page2 = DomNode.from(document), source = page2.use(domClass.gallery.info), category = source.category.one(), categoryClass = (category?.one(domClass.gallery.info.category.appearance)?.attribute("class") ?? category?.attribute("class") ?? "").split(/\s+/).find((className2) => /^ct[1-9a]$/.test(className2)), rows = source.details.rows.all().map((detailRow) => detailRow.all(domClass.gallery.info.details.rows.cells).slice(1).map((detailCell) => detailCell.text()).filter(Boolean).join(" ")), ratingMatch = (page2.all(domClass.common.scripts).map((pageScript) => pageScript.text()).find((script2) => script2.includes("display_rating")) ?? "").match(/\bdisplay_rating\s*=\s*(-?\d+(?:\.\d+)?)/), rating = Number(ratingMatch?.[1]), cover = source.cover.one(), coverUrl = source.cover.image.one()?.attribute("src") ?? "";
    if (!coverUrl && cover)
      for (let node of [cover, ...cover.all(domClass.common.descendants)]) {
        let match = node.computedStyle().backgroundImage.match(/url\(["']?(.+?)["']?\)/);
        if (match?.[1]) {
          coverUrl = match[1];
          break;
        }
      }
    return {
      category: category?.text() || void 0,
      categoryClass,
      coverUrl: coverUrl || void 0,
      language: rows[3] || void 0,
      posted: rows[0] || void 0,
      rating: ratingMatch && Number.isFinite(rating) ? rating : void 0,
      title: source.titleMain.one()?.text() || void 0,
      titleSub: source.titleSub.one()?.text() || void 0,
      uploader: source.uploader.one()?.text() || void 0
    };
  }
  function manageGalleryInfo(preview) {
    let mount = createAnchor("gallery-info");
    if (!mount)
      return null;
    let page2 = DomNode.from(document), gallery2 = page2.use(domClass.gallery), source = gallery2.info, original = source.original.one(), host = original?.parent() ?? source.hostFallback.one()?.parent() ?? null;
    if (!original || !host)
      return null;
    let readMeta = () => {
      let rows = source.details.rows.all().map((detailRow) => {
        let cells = detailRow.all(domClass.gallery.info.details.rows.cells);
        return {
          label: cells[0]?.text() ?? "",
          value: cells.slice(1).map((cell2) => cell2.text()).filter(Boolean).join(" ")
        };
      });
      return {
        favorited: rows[6]?.value ? [rows[6].label, rows[6].value].filter(Boolean).join(" ") : void 0,
        fileSize: rows[4]?.value,
        language: rows[3]?.value,
        parent: rows[1]?.value,
        posted: rows[0]?.value
      };
    }, readCategory = (node) => {
      let style2 = node?.computedStyle();
      return {
        "background-color": style2?.backgroundColor ?? "",
        "background-image": style2?.backgroundImage ?? "",
        "border-color": style2?.borderColor ?? "",
        color: style2?.color ?? ""
      };
    }, readCoverUrl = (cover2, source2) => {
      let direct = source2?.attribute("src") ?? "";
      if (direct)
        return direct;
      for (let node of cover2 ? [cover2, ...cover2.all(domClass.common.descendants)] : []) {
        let match = node.computedStyle().backgroundImage.match(/url\(["']?(.+?)["']?\)/);
        if (match?.[1])
          return match[1];
      }
      return "";
    }, readFavorite = (element, scripts2) => {
      let displayed = element?.one(domClass.gallery.info.favorite.link)?.text() || element?.one(domClass.gallery.info.favorite.titled)?.attribute("title")?.trim() || "", slot = displayed.match(/(?:^|\D)([0-9])(?:\D|$)/)?.[1], favorited = slot !== void 0 || /^favorited$/i.test(displayed), match = (scripts2.find(
        (item) => item.includes("popbase") && item.includes("addfav")
      ) ?? "").match(
        /popbase\s*=\s*base_url\s*\+\s*"gallerypopups\.php\?gid=(\d+)&t=([^"]+)&act="/
      );
      return {
        actionUrl: match ? `/gallerypopups.php?gid=${match[1]}&t=${match[2]}&act=addfav` : "",
        color: slot === void 0 ? null : `var(--color-site-favorite-${slot})`,
        favorited,
        label: favorited ? displayed : "Not Favorited"
      };
    }, readRating = (count, image2, labelNode, scripts2) => {
      let label = labelNode?.text() ?? "", match = (scripts2.find((item) => item.includes("display_rating")) ?? "").match(/\bdisplay_rating\s*=\s*(-?\d+(?:\.\d+)?)/), scriptValue = Number(match?.[1]), value = match && Number.isFinite(scriptValue) ? scriptValue : null;
      return label && value !== null ? {
        count: count?.text() ?? "",
        label,
        rated: image2?.matches(domClass.gallery.info.rating.rated) ?? !1,
        value
      } : null;
    }, readActions = () => gallery2.actions.items.all().filter((node) => {
      let href = node.attribute("href")?.trim() ?? "";
      return node.hasAttribute("onclick") || !!(href && href !== "#" && !/^javascript:/i.test(href));
    }).slice(0, 6), readTag = (tag2) => {
      let label = tag2.text() || tag2.attribute("ehs-tag")?.trim() || tag2.attribute("title")?.trim() || "", href = tag2.attribute("href") ?? "", name = galleryTagNameFromUrl(href);
      if (!label || !name || !href)
        return null;
      let container = tag2.closest(domClass.gallery.tagContainer) ?? tag2, tagStyle = tag2.computedStyle(), containerStyle = container.computedStyle(), myTagId = tag2.attribute("data-ehpeek-my-tag-id"), myTagSet = tag2.attribute("data-ehpeek-my-tag-set");
      return {
        data: {
          appearance: {
            backgroundColor: containerStyle.backgroundColor,
            borderColor: containerStyle.borderColor,
            color: tagStyle.color
          },
          label,
          myTag: myTagId && myTagSet ? { id: myTagId, tagSet: myTagSet } : null,
          name,
          url: href
        },
        source: tag2
      };
    }, readTagGroups = () => {
      let rows = gallery2.tags.rows.all();
      return rows.length > 0 ? rows.map((row2) => ({
        namespace: row2.one(domClass.gallery.tags.rows.namespace)?.text().replace(/:$/, "") || "tag",
        tags: row2.all(domClass.gallery.tags.rows.links).map(readTag).filter((tag2) => tag2 !== null).slice(0, 30)
      })).filter((group) => group.tags.length > 0) : [{
        namespace: "tag",
        tags: gallery2.tags.links.all().map(readTag).filter((tag2) => tag2 !== null).slice(0, 60)
      }].filter((group) => group.tags.length > 0);
    }, favoriteColor = (value) => {
      let slot = value.match(/^(?:fav)?([0-9])$/i)?.[1] ?? value.match(/^favorites?\s+([0-9])$/i)?.[1];
      return slot === void 0 ? null : `var(--color-site-favorite-${slot})`;
    }, readFavoriteOptions = (doc, favorited) => DomNode.from(doc).use(domClass.myTags).favoriteOptions.all().map((favoriteInput) => {
      let row2 = favoriteInput.closest(domClass.myTags.favoriteOptionRow), value = favoriteInput.inputValue();
      return {
        color: favoriteColor(value),
        label: row2?.text().replace(/\s+/g, " ") || value,
        selected: favorited && favoriteInput.checked(),
        value
      };
    }), manageTagGroups = () => readTagGroups().map((group) => ({
      namespace: group.namespace,
      tags: group.tags.map(({ data: tag2, source: source2 }) => ({
        ...tag2,
        contentSource: source2.inplace()
      }))
    })), meta = readMeta(), category = source.category.one(), categoryStyle = source.category.appearance.one() ?? category, cover = source.cover.one(), coverSource = source.cover.image.one(), favorite = source.favorite.one(), ratingCount = source.rating.count.one(), ratingImage = source.rating.image.one(), ratingLabel = source.rating.label.one(), ratingActions = source.rating.actions.all(), newTagButton = source.newTag.button.one(), newTagField = source.newTag.field.one(), newTagForm = source.newTag.form.one(), scripts = page2.all(domClass.common.scripts).map((pageScript) => pageScript.text()), actionSources = readActions(), tagContentSources = [], tagGroups = readTagGroups().map((group) => ({
      namespace: group.namespace,
      tags: group.tags.map(({ data: tag2, source: source2 }) => {
        let contentSourceIndex = tagContentSources.push(source2) - 1;
        return { ...tag2, contentSourceIndex };
      })
    })), data = {
      category: category?.text() ?? "",
      categoryAppearance: readCategory(categoryStyle),
      favorite: readFavorite(favorite, scripts),
      rating: readRating(ratingCount, ratingImage, ratingLabel, scripts),
      summary: [
        meta.language,
        preview?.totalImages ? `${preview.totalImages} ${texts_default.reader.pages.toLowerCase()}` : void 0,
        meta.fileSize,
        meta.favorited,
        meta.posted ?? meta.parent
      ].filter((value) => !!value).slice(0, 6).map((value) => ({ value })),
      tagGroups,
      titleMain: source.titleMain.one()?.text() ?? "",
      titleSub: source.titleSub.one()?.text() ?? ""
    }, coverUrl = readCoverUrl(cover, coverSource), managedCover = coverUrl ? source.cover.image.clone()?.replaceClasses("").apply("fit") ?? createManagedElement("img", { fit: "ehpeek-fit-gallery-cover" }).apply("fit") : null;
    managedCover?.removeAttributes("id", "style", "width", "height").setAttributes({ alt: "", decoding: "async", loading: "eager", src: coverUrl });
    let managedNewTag = newTagButton && newTagField && newTagForm ? source.newTag.move()?.apply("layout") ?? null : null, hostApply = { hide: "ehpeek-hide-original-gallery-info" };
    managedNewTag?.setHidden(!1).removeStyles("display");
    let elems = {
      actionItems: actionSources.map((item) => item.move(domClass.gallery.actions.items.apply).apply("layout")),
      cover: managedCover,
      host: host.inplace(hostApply).apply("hide"),
      mount,
      newTag: managedNewTag,
      ratingActions: ratingActions.map((action) => action.inplace()),
      tagContents: tagContentSources.map((source2) => source2.inplace()),
      tagList: gallery2.tags.inplace(),
      tagMenuAction: source.tagMenu.inplace()
    }, selectedTagSource = null, activateTagMenu = (source2) => {
      let stopNavigation = source2.listen("click", (event) => {
        event.preventDefault();
      }, { once: !0 });
      source2.click(), stopNavigation();
    };
    return { data, elems, handle: {
      /** Normalizes the original cover for GalleryInfoPanel's responsive layout. */
      /** Hides original GalleryInfo children and installs the component mount. */
      installGalleryInfoPanel() {
        elems.host.prepend(elems.mount);
      },
      /** Loads the original favorite dialog choices for EhPeek's favorite modal. */
      async loadGalleryFavoriteOptions(actionUrl, favorited) {
        let response = await requestPage(actionUrl);
        return readFavoriteOptions(response.document, favorited);
      },
      /** Submits a tag to the chosen My Tags collection and validates the response. */
      async submitFavoriteTag(tag2, tagSet, mode) {
        let response = await addMyTag(tag2.name, tagSet, mode);
        return extractMyTagsPageData(response.document, tagSet);
      },
      /** Keeps component tag groups synchronized with original-page tag updates. */
      observeGalleryTagGroups(onChange) {
        return elems.tagList?.observe(() => {
          gallery2.tags.rows.requery(), gallery2.tags.links.requery(), onChange(manageTagGroups());
        }) ?? (() => {
        });
      },
      /** Activates E-H's original rating area and lets its page script submit the vote. */
      submitGalleryRating(value) {
        let rating = Math.round(value * 2);
        if (rating < 1 || rating > 10)
          throw new RangeError("Gallery rating must be between 0.5 and 5 stars.");
        let action = elems.ratingActions[rating - 1];
        if (!action)
          throw new Error("Gallery rating action is unavailable.");
        action.click();
      },
      /** Removes the selected tag from its stored My Tags collection. */
      async removeFavoriteTag(tag2) {
        if (!tag2.myTag)
          throw new Error("The tag is not in My Tags.");
        let response = await deleteMyTag(tag2.myTag.id, tag2.myTag.tagSet);
        return extractMyTagsPageData(response.document, tag2.myTag.tagSet);
      },
      /** Opens E-H's original tag actions and only adapts their presentation. */
      openGalleryTagMenu(tag2) {
        if (!elems.tagMenuAction)
          throw new Error("Gallery tag actions are unavailable.");
        activateTagMenu(tag2.contentSource), elems.newTag?.setHidden(!1).removeStyles("display");
        let actions = elems.tagMenuAction.all(domClass.gallery.info.tagMenu.actions);
        if (actions.length === 0)
          throw activateTagMenu(tag2.contentSource), elems.newTag?.setHidden(!1).removeStyles("display"), new Error("Gallery tag actions could not be opened.");
        selectedTagSource = tag2.contentSource, elems.tagMenuAction.apply("layout"), actions.find((action) => action.readAttribute("onclick")?.includes("toggle_tagmenu"))?.remove();
      },
      /** Closes E-H's selected tag without replacing its action DOM. */
      closeGalleryTagMenu() {
        selectedTagSource && activateTagMenu(selectedTagSource), elems.newTag?.setHidden(!1).removeStyles("display"), selectedTagSource = null;
      },
      /** Updates the Gallery favorite state through the original site endpoint. */
      updateGalleryFavorite
    } };
  }
  function mutateGalleryCommentsTouch() {
    let source = DomNode.from(document).use(domClass.gallery.comments);
    source.inplace()?.apply("touchScore");
    let items = source.score.all().filter((trigger) => trigger.attribute("data-ehpeek-touch-comment-score") !== "true").map((trigger) => ({
      trigger,
      details: trigger.closest(domClass.gallery.comments.scoreComment)?.one(domClass.gallery.comments.scoreComment.details) ?? null
    })).filter((item) => item.details !== null).map(({ trigger, details }) => ({
      details: details.inplace(),
      detailsId: details.attribute("id") ?? "",
      expanded: !1,
      trigger: trigger.inplace()
    })), setExpanded = (item, expanded) => {
      item.expanded = expanded, item.trigger.attribute("aria-expanded", String(expanded)), item.details.attribute("aria-hidden", String(!expanded));
    };
    for (let item of items) {
      item.trigger.removeAttributes("onmouseover", "onmouseout", "onclick").setAttributes({
        "data-ehpeek-touch-comment-score": "true",
        role: "button",
        tabindex: "0",
        "aria-controls": item.detailsId
      }), setExpanded(item, !1);
      let toggle = (event) => {
        event.preventDefault(), event.stopImmediatePropagation();
        let shouldExpand = !item.expanded;
        for (let candidate of items)
          setExpanded(candidate, candidate === item && shouldExpand);
      };
      item.trigger.listen("click", toggle), item.trigger.listen("keydown", (event) => {
        (event.key === "Enter" || event.key === " ") && toggle(event);
      });
    }
  }

  // src/eh/dom/search.ts
  function createReadHistoryGridRow(item, titlePreference) {
    let info = item.info, metadataItems = [], appendMetadata = (value) => {
      if (!value)
        return;
      let element = createManagedElement("div");
      element.setTextUnlessInput(value), metadataItems.push(element);
    };
    if (info?.category && info.categoryClass) {
      let category = createManagedElement("div").replaceClasses(`cn ${info.categoryClass}`);
      category.setTextUnlessInput(info.category), metadataItems.push(category);
    }
    if (appendMetadata(info?.posted), info?.rating !== void 0) {
      let rounded = Math.round(info.rating * 2) / 2, rating = createManagedElement("div").replaceClasses("ir").styles({
        "background-position": `${-16 * (5 - Math.ceil(rounded))}px ${Number.isInteger(rounded) ? -1 : -21}px`,
        opacity: "1"
      });
      metadataItems.push(rating);
    }
    appendMetadata(info?.uploader);
    let progress = item.currentPage > 0 ? item.totalPages ? `${item.currentPage}/${item.totalPages}` : String(item.currentPage) : texts_default.history.unread, updatedAt = new Date(item.updatedAt), pad = (value) => String(value).padStart(2, "0"), historyStatus = createManagedElement("div").replaceClasses("textsize-sm font-600 leading-[1.3]");
    historyStatus.setTextUnlessInput(
      `${progress} · ${updatedAt.getFullYear()}-${pad(updatedAt.getMonth() + 1)}-${pad(updatedAt.getDate())} ${pad(updatedAt.getHours())}:${pad(updatedAt.getMinutes())}`
    );
    let removeButton = createManagedElement("button").setAttributes({ type: "button", "data-ehpeek-remove-history": "true" }).replaceClasses(
      "relative z-2 self-end min-h-lg py-xs px-md mr-sm mb-sm rounded-md border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] ehp-color-site-text font-inherit textsize-md font-700 text-center cursor-pointer [touch-action:manipulation] hover:bg-[var(--color-site-item-hover)]"
    );
    removeButton.setTextUnlessInput(texts_default.button.removeHistory);
    let historyActions = createManagedElement("div").replaceClasses("flex flex-col items-start gap-xs").append(historyStatus, removeButton), titleText = titlePreference === "sub" ? info?.titleSub || info?.title : info?.title || info?.titleSub, galleryHref = new URL(
      `/g/${item.galleryId}/${item.token}/`,
      window.location.href
    ).href, row2 = createManagedElement("tr"), thumbnailCell = createManagedElement("td").replaceClasses("gl1e"), thumbnail = createManagedElement("div"), image2 = info?.coverUrl ? createManagedElement("img").setAttributes({
      alt: titleText ?? "",
      loading: "lazy",
      src: info.coverUrl
    }) : null;
    image2 ? thumbnail.append(
      createManagedElement("a").attribute("href", galleryHref).append(image2)
    ) : thumbnailCell.setHidden(!0), thumbnailCell.append(thumbnail);
    let contentCell = createManagedElement("td").replaceClasses("gl2e"), galleryLink = createManagedElement("a").attribute("href", galleryHref), detail = createManagedElement("div").replaceClasses("gl4e"), title = createManagedElement("div").replaceClasses("glink");
    title.setTextUnlessInput(titleText ?? ""), title.setHidden(!titleText);
    let metadata = createManagedElement("div").replaceClasses("gl3e");
    return metadata.append(...metadataItems), galleryLink.append(detail.append(title, historyStatus)), contentCell.append(createManagedElement("div").append(metadata, galleryLink)), row2.append(thumbnailCell, contentCell), {
      detail,
      galleryHref,
      galleryLink,
      metadata,
      row: row2,
      tags: [historyActions],
      title,
      titleText: titleText ?? "",
      withoutCover: !image2
    };
  }
  function manageReadHistoryPage(items, titlePreference) {
    let page2 = DomNode.from(document), resultList = page2.use(domClass.search).results.one(), navigationTopMount = createAnchor("read-history-navigation-top"), navigationBottomMount = createAnchor("read-history-navigation-bottom");
    if (!resultList || !navigationTopMount || !navigationBottomMount)
      return null;
    let grids = manageReadHistoryGrids({
      items,
      source: resultList,
      titlePreference
    });
    grids.elems.resultList.before(navigationTopMount), grids.elems.resultList.after(navigationBottomMount);
    for (let control2 of page2.all(domClass.search.controls, anyDomNode))
      control2.inplace().remove();
    let handle = {
      /** Replaces the visible History rows without navigating away from the current document. */
      updateReadHistoryItems: grids.handle.updateItems,
      /** Reports explicit and long-press removal requests without exposing History rows. */
      listenForReadHistoryRemoval: grids.handle.listenForItemRemoval,
      /** Keeps navigation anchored to the corresponding edge after an in-page page change. */
      scrollReadHistoryPage(position) {
        (position === "bottom" ? navigationBottomMount : navigationTopMount).scrollIntoView({
          behavior: "smooth",
          block: position === "bottom" ? "end" : "start"
        });
      }
    };
    return {
      elems: {
        navigationBottomMount,
        navigationTopMount,
        resultList: grids.elems.resultList
      },
      handle
    };
  }
  function manageSearchResults() {
    let source = DomNode.from(document).use(domClass.search), resultSource = source.results.one();
    if (!resultSource)
      return null;
    let data = {
      nextUrl: source.navigation.next.one()?.attribute("href") ?? null,
      previousUrl: source.navigation.previous.one()?.attribute("href") ?? null
    }, elems = {
      resultList: resultSource.inplace(domClass.search.results.apply),
      searchInput: source.input.inplace()
    };
    return { data, elems, handle: {
      /** Routes the original pagination controls through the active page owner. */
      interceptSearchNavigation(onNavigate) {
        let handleClick = (event) => {
          let url = (event.target instanceof Element ? DomNode.from(event.target).closest(domClass.search.navigationLink) : null)?.attribute("href") ?? null;
          url && (event.preventDefault(), event.stopPropagation(), onNavigate(url));
        };
        return document.addEventListener("click", handleClick, !0), () => document.removeEventListener("click", handleClick, !0);
      },
      /** Replaces the current result page for enhanced swipe navigation. */
      async loadSearchPage(url) {
        let response = await requestPage(url);
        if (!replaceSearchPageContent(response.document))
          throw new Error(texts_default.errors.searchPageContentNotFound);
        window.history.pushState(window.history.state, "", url);
      },
      /** Returns enhanced Search navigation to its input, or the page top when absent. */
      scrollSearchPageToInput() {
        elems.searchInput ? elems.searchInput.scrollIntoView({ block: "start", behavior: "auto" }) : window.scrollTo({ top: 0, behavior: "auto" });
      },
      /** Exposes result loading state without removing the current result list. */
      updateSearchLoading(busy) {
        busy ? elems.resultList.setAttributes({ "aria-busy": "true" }) : elems.resultList.removeAttributes("aria-busy");
      },
      /** Prevents result content from stealing a horizontal swipe gesture. */
      ensureSearchSwipeInput() {
        elems.resultList.apply("swipe");
      },
      /** Applies the user setting to gallery links already owned by the result list. */
      ensureGalleryLinksOpenInNewTab() {
        for (let link of elems.resultList.all(domClass.search.results.links))
          extractPageType(link.readAttribute("href") ?? "").type === "gallery" && link.setAttributes({ target: "_blank", rel: "noopener noreferrer" });
      }
    } };
  }
  function manageSearchTextInput() {
    let inputSource = DomNode.from(document).use(domClass.search).input.one(), formSource = inputSource?.form() ?? null, submitSource = formSource?.one(domClass.search.submit) ?? inputSource?.parent()?.one(domClass.search.submitFallback) ?? null;
    if (!inputSource || !submitSource)
      return null;
    let elems = {
      form: formSource?.inplace() ?? null,
      input: inputSource.inplace(),
      submit: submitSource.inplace()
    };
    return { data: { value: elems.input.inputValue() }, elems, handle: {
      /** Connects the original input to EhPeek's history and suggestion overlay. */
      listenSearchHistoryOverlay(callbacks, overlay) {
        let update = () => callbacks.onInput(
          elems.input.inputValue(),
          document.activeElement === elems.input.Component()
        ), submitValue = () => callbacks.onSubmit(elems.input.inputValue()), outsidePointer = (event) => {
          let target = event.target;
          target instanceof Node && (elems.input.isNode(target) || overlay()?.contains(target)) || callbacks.onOutsidePointer();
        }, disconnect = [
          elems.input.listen("input", update),
          elems.input.listen("focus", callbacks.onFocus),
          elems.input.listen("pointerdown", callbacks.onFocus),
          elems.input.listen("keydown", callbacks.onKeyDown),
          elems.submit.listen("click", submitValue),
          ...elems.form ? [elems.form.listen("submit", submitValue)] : []
        ];
        return document.addEventListener("pointerdown", outsidePointer, !0), document.addEventListener("scroll", callbacks.onPositionChange, !0), window.addEventListener("resize", callbacks.onPositionChange), () => {
          disconnect.forEach((cleanup) => cleanup()), document.removeEventListener("pointerdown", outsidePointer, !0), document.removeEventListener("scroll", callbacks.onPositionChange, !0), window.removeEventListener("resize", callbacks.onPositionChange);
        };
      },
      /** Locates the overlay directly below the original search input. */
      readSearchOverlayPosition() {
        let rect = elems.input.rect();
        return { left: rect.left, top: rect.bottom, width: rect.width };
      },
      /** Commits a history or suggestion choice through the original input events. */
      applySearchSelection(value) {
        elems.input.setInputValue(value), elems.input.dispatchInput(), elems.input.focus(), elems.input.Component().setSelectionRange(value.length, value.length);
      }
    } };
  }
  function manageReadHistoryGrids(options) {
    let resultList = createManagedElement("table").replaceClasses("itg"), body = createManagedElement("tbody"), visibleRows = [];
    resultList.append(body).addClasses(
      "overscroll-x-contain",
      "touch-pan-y",
      "[&[data-dragging=true]]:select-none"
    ), options.source.inplace().replaceWith(resultList);
    let updateItems = (items) => {
      visibleRows = items.map((item) => ({
        item,
        row: createReadHistoryGridRow(item, options.titlePreference)
      })), body.replaceChildren(...visibleRows.map(({ row: row2 }) => row2.row)), manageEhPeekGrid(resultList, visibleRows.map(({ row: row2 }) => row2));
    };
    return updateItems(options.items), {
      elems: { resultList },
      handle: {
        updateItems,
        listenForItemRemoval(callback) {
          let itemForTarget = (target) => target instanceof Node ? visibleRows.find(({ row: row2 }) => row2.row.contains(target))?.item ?? null : null, stopLongPress = resultList.listenLongPress((event) => {
            let item = itemForTarget(event.target);
            item && callback(item);
          }, (event) => itemForTarget(event.target) !== null), stopButton = resultList.listen("click", (event) => {
            let item = (event.target instanceof Element ? DomNode.from(event.target).closest(domClass.search.removeHistory) : null) ? itemForTarget(event.target) : null;
            item && (event.preventDefault(), event.stopPropagation(), callback(item));
          });
          return () => {
            stopLongPress(), stopButton();
          };
        }
      }
    };
  }
  function manageSearchGrids() {
    let source = DomNode.from(document).use(domClass.search), resultList = source.results.one();
    if (!resultList)
      return;
    let rows = source.results.rows.all().map(manageSearchGridRow).filter((row2) => row2 !== null);
    manageEhPeekGrid(
      resultList.inplace(),
      rows
    );
    function manageSearchGridRow(row2) {
      let thumbnailCell = row2.one(domClass.search.results.rows.cover), contentCell = row2.one(domClass.search.results.rows.content), detail = contentCell?.one(domClass.search.results.rows.content.detail), metadata = contentCell?.one(domClass.search.results.rows.content.metadata);
      if (!thumbnailCell || !contentCell || !detail || !metadata)
        return null;
      let title = detail.one(domClass.search.results.rows.content.detail.title), parent = detail.parent(), galleryLink = parent?.matches(domClass.common.links) ? parent : null, tags = detail.children().filter((element) => !title?.sameNode(element));
      return {
        detail: detail.inplace(),
        galleryHref: galleryLink?.attribute("href") ?? null,
        galleryLink: galleryLink?.inplace() ?? null,
        metadata: metadata.inplace(),
        row: row2.inplace(),
        tags: tags.map((item) => item.inplace()),
        title: title?.inplace() ?? null,
        titleText: title?.text() ?? "",
        withoutCover: !1
      };
    }
  }
  function manageEhPeekGrid(resultList, rows) {
    resultList.addClasses(sharedApply.searchGrid);
    for (let row2 of rows)
      row2.row.addClasses(...row2.withoutCover ? [sharedApply.coverlessSearchGrid] : []), manageEhPeekGridContent(row2);
    function manageEhPeekGridContent(source) {
      let { detail, galleryLink, metadata, row: row2, tags, title } = source;
      if (galleryLink && title && source.galleryHref) {
        let titleLink = createManagedElement("a").attribute("href", source.galleryHref).replaceClasses("block min-w-0 ehp-color-site-text no-underline");
        titleLink.append(title), galleryLink.before(detail), galleryLink.remove(), detail.replaceChildren(titleLink, metadata, ...tags), ensureEhPeekGridRowNavigation(
          row2,
          titleLink,
          source.galleryHref,
          source.titleText
        );
      } else title && title.after(metadata);
      for (let tag2 of tags)
        tag2.addClasses(sharedApply.stackSearchGridTags);
    }
    function ensureEhPeekGridRowNavigation(row2, galleryLink, galleryHref, title) {
      let overlay = createManagedElement("a", {
        cover: "ehpeek-cover-search-grid-row"
      }).attribute("href", galleryHref).attribute("aria-label", title || "Open gallery").replaceClasses("hidden coarse:block absolute inset-0 z-1").apply("cover");
      row2.append(overlay).listen("click", (event) => {
        (event.target instanceof Element ? DomNode.from(event.target) : null)?.closest(domClass.common.interactive) || galleryLink.click();
      });
    }
  }
  function mutateSearchReadHistoryAppearance(readPageForGallery) {
    let resultList = DomNode.from(document).use(domClass.search).results.one();
    if (!resultList)
      return;
    let items = (resultList.one(domClass.search.results.body) ?? resultList).children();
    for (let item of items) {
      let galleryLinks = item.all(domClass.search.results.galleryLinks), galleryLink = galleryLinks.find((link) => !!link.text()) ?? galleryLinks[0];
      if (!galleryLink)
        continue;
      let identity = galleryIdentityFromUrl(galleryLink.attribute("href") ?? "");
      if (!identity)
        continue;
      let pageNum = readPageForGallery(identity.galleryId, identity.token);
      if (pageNum === null)
        continue;
      (item.one(domClass.search.results.titles) ?? galleryLink).inplace(domClass.search.results.titles.apply).setAttributes({
        "data-ehpeek-history-label": pageNum > 0 ? texts_default.history.readingLabel : texts_default.history.visitedLabel
      }).apply("history"), item.inplace().setAttributes({
        "data-ehpeek-read-history": pageNum > 0 ? "reading" : "visited"
      });
    }
  }
  function mutateSearchGridModeSelect(selected, onEhPeekSelect, onOriginalSelect) {
    let selects = DomNode.from(document).use(domClass.search).displayMode.all();
    for (let source of selects) {
      let select2 = source.inplace(), option2 = source.all(domClass.search.displayMode.options).find((item) => item.inputValue() === "ehpeek")?.inplace() ?? null;
      option2 || (option2 = createManagedElement("option").attribute("value", "ehpeek"), option2.setTextUnlessInput("EhPeek"), select2.append(option2)), option2.setSelected(selected), source.attribute("data-ehpeek-grid-mode") !== "true" && (select2.attribute("data-ehpeek-grid-mode", "true"), select2.listen("change", (event) => {
        if (select2.inputValue() !== "ehpeek") {
          onOriginalSelect();
          return;
        }
        event.preventDefault(), event.stopImmediatePropagation(), onEhPeekSelect();
      }, !0));
    }
  }
  function replaceSearchPageContent(doc) {
    let currentList = DomNode.from(document).use(domClass.search).results.one(), incomingList = DomNode.from(doc).use(domClass.search).results.one();
    if (!currentList || !incomingList || !refreshSearchRangeBar(doc))
      return !1;
    replaceSearchResultText(doc), replaceSearchNavigationBars(doc);
    let current = currentList.inplace(), importedList = incomingList.clone();
    return current.replaceWith(importedList), !0;
  }
  function refreshSearchRangeBar(doc) {
    let current = DomNode.from(document).use(domClass.search).rangeBar.one(), incomingPage = DomNode.from(doc), incoming = incomingPage.use(domClass.search).rangeBar.one();
    if (!current && !incoming)
      return !0;
    if (!current || !incoming)
      return !1;
    let script2 = incomingPage.all(domClass.common.scripts).map((item) => item.text()).find((item) => item.includes("build_rangebar()")), rangeUrl = script2?.match(/\brangeurl\s*=\s*["']([^"']*)["']/)?.[1], rangeMin = Number(script2?.match(/\brangemin\s*=\s*(-?\d+)/)?.[1]), rangeMax = Number(script2?.match(/\brangemax\s*=\s*(-?\d+)/)?.[1]), rangeSpan = Number(script2?.match(/\brangespan\s*=\s*(-?\d+)/)?.[1]);
    if (rangeUrl === void 0 || !Number.isFinite(rangeMin) || !Number.isFinite(rangeMax) || !Number.isFinite(rangeSpan))
      return !1;
    let items = [];
    if (rangeSpan > 0)
      for (let index = 0; index < 99; index += rangeSpan) {
        let marker = createManagedElement("div");
        if ((index === 98 && rangeMin === 99 || index >= rangeMin && index <= rangeMax) && marker.attribute("data-inrange", "1"), !rangeUrl) {
          items.push(marker);
          continue;
        }
        let href = index === 0 ? rangeUrl : `${rangeUrl}${rangeUrl.includes("?") ? "&" : "?"}range=${index}`;
        items.push(createManagedElement("a").attribute("href", href).append(marker));
      }
    return current.inplace().replaceChildren(...items), !0;
  }
  function replaceSearchNavigationBars(doc) {
    let currentBars = DomNode.from(document).use(domClass.search).navigation.all(), incomingBars = DomNode.from(doc).use(domClass.search).navigation.all(), count = Math.min(currentBars.length, incomingBars.length);
    for (let index = 0; index < count; index += 1) {
      let currentSource = currentBars[index], incomingSource = incomingBars[index];
      if (!currentSource || !incomingSource)
        continue;
      let current = currentSource.inplace(), incoming = incomingSource.clone();
      current.replaceWith(incoming);
    }
  }
  function replaceSearchResultText(doc) {
    let current = DomNode.from(document).use(domClass.search).resultText.one(), incoming = DomNode.from(doc).use(domClass.search).resultText.one();
    if (!current || !incoming)
      return;
    let currentElement = current.inplace(), incomingElement = incoming.clone();
    currentElement.replaceWith(incomingElement);
  }
  function favoritesPageTouch() {
    let page2 = DomNode.from(document), pageSource = page2.use(domClass.page), source = page2.use(domClass.search);
    pageSource.html.inplace()?.apply("constrainResults"), pageSource.body.inplace()?.apply(
      "constrainResults",
      "constrainFavoritesNavigation"
    );
    let categories = source.favorites.categories.one(), categorySelect = categories ? manageFavoritesCategories(categories) : null, searchHostApply = { expand: "ehpeek-expand-favorites-search" };
    source.favorites.input.one()?.form()?.parent()?.inplace(searchHostApply).apply("expand");
    let resultSource = source.results.one();
    if (!resultSource)
      return categorySelect;
    let allSelected = categorySelect?.info.categories[0]?.selected === !0, resultList = resultSource.inplace(domClass.search.results.apply).apply("containFavorites");
    return allSelected && resultList.apply("compactFavorites"), categorySelect;
  }
  function manageFavoritesCategories(container) {
    let nodes = container.all(domClass.search.favorites.categories.items);
    if (nodes.length === 0)
      return null;
    let parsed = nodes.map((node) => {
      let children = node.children(), countText = children[0]?.text() ?? "0", label = children[children.length - 1]?.text() || node.text(), count = Number(countText.replace(/,/g, "")), indicatorStyle = node.one(domClass.search.favorites.categories.items.indicator)?.computedStyle() ?? null;
      return {
        appearance: indicatorStyle ? {
          backgroundImage: indicatorStyle.backgroundImage,
          backgroundPosition: indicatorStyle.backgroundPosition,
          backgroundSize: indicatorStyle.backgroundSize
        } : null,
        count: Number.isFinite(count) ? count : 0,
        label,
        selected: node.matches(domClass.search.favorites.selectedCategory),
        source: node
      };
    }), all = parsed.find((category) => category.source.childElementCount() === 0), favorites = parsed.filter((category) => category !== all), total = favorites.reduce((sum, category) => sum + category.count, 0);
    container.inplace(domClass.search.favorites.categories.apply).apply("hide");
    let categories = [
      ...all ? [{ ...all, count: total, label: texts_default.favorites.all }] : [],
      ...favorites
    ];
    return {
      info: {
        categories: categories.map(({ appearance, count, label, selected }) => ({
          appearance,
          count,
          label,
          selected
        }))
      },
      items: categories.map(({ source }) => source.inplace())
    };
  }
  function searchResultsPageTouch() {
    let page2 = DomNode.from(document), pageSource = page2.use(domClass.page), source = page2.use(domClass.search);
    pageSource.html.inplace()?.apply("constrainResults"), pageSource.body.inplace()?.apply("constrainResults");
    let resultSource = source.results.one();
    resultSource && resultSource.inplace(domClass.search.results.apply).apply("containSearch");
  }
  function manageTouchResultsPage(page2) {
    let apply = () => page2.type === "favorites" ? favoritesPageTouch() : ((page2.type === "search" || page2.type === "readHistory") && searchResultsPageTouch(), null), favoritesCategory = apply(), data = { favoritesCategory: favoritesCategory?.info ?? null }, elems = {
      favoriteCategoryItems: favoritesCategory?.items ?? []
    };
    return { data, elems, handle: {
      /** Activates E-H's original Favorites collection control. */
      activateFavoriteCategory(index) {
        elems.favoriteCategoryItems[index]?.click();
      },
      /** Reapplies TouchUI layout after the result list is replaced in place. */
      updateTouchResultsLayout() {
        let updated = apply();
        updated && elems.favoriteCategoryItems.splice(
          0,
          elems.favoriteCategoryItems.length,
          ...updated.items
        );
      }
    } };
  }

  // src/eh/dom/searchPanel.ts
  function manageSearchPanel() {
    let search2 = DomNode.from(document).use(domClass.search), source = search2.panel, searchInput = search2.input.one(), form2 = searchInput?.form() ?? null, standardSearchBox = source.box.one(), categories = source.box.categories.one(), advancedPanel = source.box.advanced.one(), optionLinks = advancedPanel?.previous() ?? null, fileSearch = source.fileSearch.one(), searchSubmit = form2?.one(domClass.search.submit) ?? searchInput?.parent()?.one(domClass.search.submitFallback) ?? null, clearButton = form2?.one(domClass.search.panel.clear) ?? searchInput?.parent()?.one(domClass.search.panel.clearFallback) ?? null;
    if (!searchInput || !form2 || !searchSubmit)
      return null;
    let mount = createAnchor("search-panel"), categoryToggleMount = categories && optionLinks ? createAnchor("search-category-toggle") : null, searchActionMount = createAnchor("search-action"), clearActionMount = clearButton ? createAnchor("search-clear-action") : null;
    if (!mount || !searchActionMount || clearButton && !clearActionMount)
      return null;
    let optionLinkItems = optionLinks?.all(domClass.search.panel.optionLinks) ?? [], advancedToggle = advancedPanel ? optionLinkItems[0] ?? null : null, fileSearchToggle = fileSearch ? optionLinkItems[advancedToggle ? 1 : 0] ?? null : null, advancedToggleMount = advancedToggle ? createAnchor("search-advanced-toggle") : null, fileSearchToggleMount = fileSearchToggle ? createAnchor("search-file-toggle") : null, searchControls = createManagedElement("div", {
      overlay: "ehpeek-overlay-search-actions"
    }).apply("overlay"), optionLinksApply = { wrap: "ehpeek-wrap-search-options" }, elems = {
      advancedPanel: source.box.advanced.inplace()?.apply("expand") ?? null,
      advancedToggle: advancedToggle?.inplace() ?? null,
      advancedToggleMount,
      categories: source.box.categories.inplace()?.apply("layout") ?? null,
      categoryToggleMount,
      clearActionMount,
      clearButton: clearButton?.inplace(domClass.search.panel.clear.apply).apply("hide") ?? null,
      fileSearch: source.fileSearch.inplace()?.apply("expand") ?? null,
      fileSearchToggle: fileSearchToggle?.inplace() ?? null,
      fileSearchToggleMount,
      form: form2.inplace(domClass.search.panel.box.form.apply),
      mount,
      optionLinks: optionLinks?.inplace(optionLinksApply).apply("wrap") ?? null,
      searchActionMount,
      searchBox: source.box.inplace()?.apply("reset") ?? searchControls,
      searchControls,
      searchInput: searchInput.inplace(domClass.search.input.apply).apply("expand"),
      searchSubmit: searchSubmit.inplace(domClass.search.panel.submit.apply).apply("hide")
    };
    (standardSearchBox ? elems.searchBox : elems.form).before(elems.mount), standardSearchBox && elems.searchBox.remove(), elems.searchInput.replaceWith(elems.searchControls), elems.searchControls.append(elems.searchInput), elems.searchSubmit.remove(), elems.clearButton && elems.clearActionMount && (elems.clearButton.remove(), elems.searchControls.append(elems.clearActionMount)), elems.searchControls.append(elems.searchActionMount), elems.categories && elems.optionLinks && elems.categoryToggleMount && (elems.optionLinks.after(elems.categories), elems.optionLinks.prepend(elems.categoryToggleMount)), elems.optionLinks && elems.advancedToggle && elems.advancedToggleMount && (elems.advancedToggle.after(elems.advancedToggleMount), elems.advancedToggle.remove()), elems.optionLinks && elems.fileSearchToggle && elems.fileSearchToggleMount && (elems.fileSearchToggle.after(elems.fileSearchToggleMount), elems.fileSearchToggle.remove()), elems.fileSearch?.remove();
    let formInsideSearchBox = source.box.form.one()?.sameNode(form2) ?? !1, formId = form2.attribute("id") || "ehpeek-search-form", data = {
      clearLabel: clearButton ? actionLabel(clearButton) : null,
      hasClear: elems.clearButton !== null && elems.clearActionMount !== null,
      searchLabel: actionLabel(searchSubmit)
    };
    elems.searchActionMount.addClasses("contents"), elems.clearActionMount?.addClasses("contents"), elems.form.apply("stack"), elems.searchControls.setAttributes({ "data-ehpeek-has-clear": String(data.hasClear) }), elems.categories?.setAttributes({ "aria-hidden": "true" });
    let handle = {
      /** Controls the original category table from EhPeek's category toggle. */
      updateCategoryVisibility(open) {
        elems.categories?.setAttributes({ "aria-hidden": String(!open) });
      },
      /** Activates E-H's original Search submit control. */
      activateSearch() {
        elems.searchSubmit.click();
      },
      /** Clears only the Search text without invoking E-H's page-navigation reset. */
      clearSearchText() {
        elems.searchInput.setInputValue(""), elems.searchInput.dispatchInput(), elems.searchInput.focus();
      },
      toggleAdvancedOptions() {
        elems.advancedToggle?.click();
      },
      toggleFileSearch() {
        elems.fileSearchToggle?.click();
      }
    };
    return formInsideSearchBox || (elems.form.setAttributes({ id: formId }), elems.searchInput.setAttributes({ form: formId }), elems.searchSubmit.setAttributes({ form: formId }), elems.clearButton?.setAttributes({ form: formId })), { data, elems, handle };
  }
  function actionLabel(element) {
    return element.attribute("value") ?? element.text();
  }

  // src/eh/dom/settings.ts
  function extractGalleryTitlePreference() {
    let source = DomNode.from(document).use(domClass.settings), japaneseTitle = source.titleJapanese.one(), defaultTitle = source.titleDefault.one();
    return japaneseTitle?.checked() ? "sub" : defaultTitle?.checked() ? "main" : null;
  }

  // src/eh/dom/topBar.ts
  function manageSettingsMenuMount() {
    let page2 = DomNode.from(document), source = page2.use(domClass.topBar), thumbnailContainer = page2.use(domClass.gallery).preview.thumbs.one(), titleContainer = source.galleryTitle.one(), topNav = source.navigation.one(), anchor2 = thumbnailContainer ?? titleContainer;
    if (topNav) {
      let item2 = createManagedElement("div");
      return topNav.inplace().append(item2), item2;
    }
    if (!anchor2?.parent())
      return null;
    let item = createManagedElement("div").replaceClasses("text-right"), managedAnchor = anchor2.inplace();
    return thumbnailContainer ? managedAnchor.before(item) : managedAnchor.after(item), item;
  }
  function manageTopBar() {
    let mount = createAnchor("top-bar");
    if (!mount)
      return null;
    let source = DomNode.from(document).use(domClass.topBar), original = source.navigation.one(), links = source.navigation.links.all();
    if (!original || links.length === 0)
      return null;
    let data = {
      favoritesHref: new URL("/favorites.php", window.location.href).href,
      homeHref: links[0]?.attribute("href") ?? "/"
    }, elems = {
      mount,
      navItems: source.navigation.links.moveAll().map((link) => link.apply("layout"))
    };
    return original.inplace().replaceWith(elems.mount), {
      data,
      elems
    };
  }

  // src/components/Widgets/Icon.tsx
  var _tmpl$ = /* @__PURE__ */ template('<svg class="ehpeek-icon block flex-none"viewBox="0 0 24 24"stroke-linecap=round stroke-linejoin=round aria-hidden=true>'), _tmpl$2 = /* @__PURE__ */ template("<svg><path fill=currentColor stroke=none></svg>", !1, !0, !1), _tmpl$3 = /* @__PURE__ */ template("<svg><path></svg>", !1, !0, !1);
  function Icon(props) {
    let definition = createMemo(() => ICON_DEFINITIONS[props.name]), filled = createMemo(() => definition().solid || definition().fillable && props.filled);
    return (() => {
      var _el$ = _tmpl$();
      return insert(_el$, createComponent(For, {
        get each() {
          return definition().filledPaths;
        },
        children: (path) => (() => {
          var _el$2 = _tmpl$2();
          return setAttribute(_el$2, "d", path), _el$2;
        })()
      }), null), insert(_el$, createComponent(For, {
        get each() {
          return definition().paths;
        },
        children: (path) => (() => {
          var _el$3 = _tmpl$3();
          return setAttribute(_el$3, "d", path), _el$3;
        })()
      }), null), createRenderEffect((_p$) => {
        var _v$ = props.size ?? 24, _v$2 = props.size ?? 24, _v$3 = filled() ? "currentColor" : "none", _v$4 = filled() ? "none" : "currentColor", _v$5 = props.strokeWidth ?? 2, _v$6 = props.name;
        return _v$ !== _p$.e && setAttribute(_el$, "width", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$, "height", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$, "fill", _p$.a = _v$3), _v$4 !== _p$.o && setAttribute(_el$, "stroke", _p$.o = _v$4), _v$5 !== _p$.i && setAttribute(_el$, "stroke-width", _p$.i = _v$5), _v$6 !== _p$.n && setAttribute(_el$, "data-icon-name", _p$.n = _v$6), _p$;
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
  var ICON_DEFINITIONS = {
    "arrow-left": {
      paths: ["M19 12H5", "m12 19-7-7 7-7"]
    },
    "arrow-right": {
      paths: ["M5 12h14", "m12 5 7 7-7 7"]
    },
    "arrow-down": {
      paths: ["M12 5v14", "m5 12 7 7 7-7"]
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
    "book-open": {
      paths: ["M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"]
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
    history: {
      paths: ["M3 12a9 9 0 1 0 3-6.7", "M3 4v5h5", "M12 7v5l3 2"]
    },
    home: {
      paths: ["m3 10.5 9-7.5 9 7.5", "M5.5 9v11h13V9", "M9.5 20v-6h5v6"]
    },
    menu: {
      paths: ["M12 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"],
      solid: !0
    },
    page: {
      paths: ["M5 3h14v18H5z"]
    },
    "panda-peek": {
      filledPaths: ["M7.2 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z", "M16.8 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z", "M7.6 9.8c.5-1.2 1.6-1.8 2.6-1.3s1.3 1.8.8 3-1.6 1.8-2.6 1.3-1.3-1.8-.8-3Z", "M13.8 8.5c1-.5 2.1.1 2.6 1.3s.2 2.5-.8 3-2.1-.1-2.6-1.3-.2-2.5.8-3Z", "M10.9 13.6c0-.6.5-.9 1.1-.9s1.1.3 1.1.9-.5 1-1.1 1-1.1-.4-1.1-1Z", "M5.2 13.7a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z", "M18.8 14.1a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z"],
      paths: ["M5 17c-.8-6.4 2.1-10.8 7-10.8s7.8 4.4 7 10.8", "M12 14.6v.7c0 .7-.6 1.2-1.3 1.2m1.3-1.2c0 .7.6 1.2 1.3 1.2", "M2 17h20"]
    },
    pages: {
      paths: ["M3 5h8v14H3z", "M13 5h8v14h-8z"]
    },
    refresh: {
      paths: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"]
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
    },
    viewport: {
      paths: ["M8 4H4v4", "M16 4h4v4", "M20 16v4h-4", "M8 20H4v-4", "M8 12h8"]
    }
  };

  // src/components/WelcomeIcon.tsx
  var _tmpl$4 = /* @__PURE__ */ template('<div role=status aria-live=polite><span class="inline-flex items-center justify-center gap-md ehp-color-site-text"><span class="inline-block box-border w-sm h-sm animate-spin rounded-full border-4 border-solid ehp-color-spinner"aria-hidden=true></span><span>');
  function WelcomeIcon(props) {
    let label = () => props.label ?? texts_default.reader.loading, placementClass = () => props.embedded ? "relative w-full border-0 bg-transparent px-lg py-md" : "fixed left-1/2 top-1/2 z-[1200] -translate-x-1/2 -translate-y-1/2 rounded-lg border ehp-color-site-border bg-[var(--color-loading)] px-xl py-lg shadow-[0_6px_20px_var(--color-shadow-floating)]";
    return (() => {
      var _el$ = _tmpl$4(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling;
      return insert(_el$, (() => {
        var _c$ = memo(() => props.showIcon !== !1);
        return () => _c$() ? createComponent(Icon, {
          name: "panda-peek",
          size: 80,
          strokeWidth: 1.6
        }) : null;
      })(), _el$2), insert(_el$4, label), createRenderEffect((_p$) => {
        var _v$ = `${placementClass()} flex select-none flex-col items-center gap-lg ehp-color-site-accent pointer-events-none`, _v$2 = label();
        return _v$ !== _p$.e && className(_el$, _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$, "aria-label", _p$.t = _v$2), _p$;
      }, {
        e: void 0,
        t: void 0
      }), _el$;
    })();
  }

  // src/components/Widgets/Loading.tsx
  function LoadingOverlay(props) {
    return createComponent(Show, {
      get when() {
        return props.visible;
      },
      get children() {
        return createComponent(WelcomeIcon, {
          get label() {
            return props.label;
          }
        });
      }
    });
  }

  // src/components/PointerGesture.tsx
  var DEFAULT_TAP_MOVE_THRESHOLD_PX = 8, DEFAULT_DRAG_START_THRESHOLD_PX = 8, DEFAULT_DRAG_INTENT_RATIO = 1, MOUSE_POINTER_ID = -1, PointerGesture = class {
    constructor(target, callbacks) {
      __publicField(this, "pinchPointers", /* @__PURE__ */ new Map());
      __publicField(this, "drag", null);
      __publicField(this, "suppressClick", !1);
      __publicField(this, "suppressClickPoint", null);
      __publicField(this, "suppressClickTimer", null);
      __publicField(this, "pinch", null);
      __publicField(this, "onDragStart", (event) => {
        this.drag?.canDrag && event.preventDefault();
      });
      __publicField(this, "onClick", (event) => {
        let point = this.suppressClickPoint, targetInside = event.target instanceof Node && this.target.contains(event.target), nearReleasePoint = point !== null && Math.hypot(event.clientX - point.clientX, event.clientY - point.clientY) <= 24;
        !this.suppressClick || !targetInside && !nearReleasePoint || (this.clearClickSuppression(), event.preventDefault(), event.stopImmediatePropagation());
      });
      __publicField(this, "onContextMenu", () => {
        this.drag?.active || (this.cancel(), this.clearPinch());
      });
      __publicField(this, "onPointerDown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0 || this.trackPinchPointerDown(event) || this.pinch || this.drag)
          return;
        let callbacks = this.callbacks(), canDrag = callbacks.shouldCaptureDrag?.(event) ?? !0;
        (canDrag || (callbacks.shouldObserveTap?.(event) ?? !1)) && (this.start(event.pointerId, event.pointerType, event.clientX, event.clientY, event, canDrag), event.pointerType === "mouse" && this.addMouseListeners());
      });
      __publicField(this, "onMouseDown", (event) => {
        event.button !== 0 || typeof PointerEvent < "u" || this.drag || !(this.callbacks().shouldCaptureDrag?.(event) ?? !0) || (this.start(MOUSE_POINTER_ID, "mouse", event.clientX, event.clientY, event, !0), this.addMouseListeners());
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
        snapshot && (this.callbacks().onPinchMove?.({
          ...snapshot,
          scale: snapshot.distance / this.pinch.startDistance
        }, event), event.preventDefault());
      });
      __publicField(this, "onPinchPointerEnd", (event) => {
        this.pinchPointers.has(event.pointerId) && (this.pinchPointers.delete(event.pointerId), !(!this.pinch || this.pinchPointers.size >= 2) && (this.callbacks().onPinchEnd?.(), this.clearPinch(), event.preventDefault()));
      });
      this.target = target, this.callbacks = callbacks, this.setDragging(!1), target.addEventListener("pointerdown", this.onPointerDown), target.addEventListener("mousedown", this.onMouseDown), target.addEventListener("dragstart", this.onDragStart), target.addEventListener("contextmenu", this.onContextMenu);
    }
    dispose() {
      this.drag && this.releaseCapture(this.drag), this.drag = null, this.setDragging(!1), this.clearPinch(), this.removePointerListeners(), this.removeMouseListeners(), this.target.removeEventListener("pointerdown", this.onPointerDown), this.target.removeEventListener("mousedown", this.onMouseDown), this.target.removeEventListener("dragstart", this.onDragStart), this.target.removeEventListener("contextmenu", this.onContextMenu), this.clearClickSuppression();
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
        velocityX: 0,
        velocityY: 0
      };
      let captureTarget = event.target;
      canDrag && "pointerId" in event && typeof captureTarget?.setPointerCapture == "function" && (captureTarget.setPointerCapture(pointerId), this.drag.captureTarget = captureTarget), this.addPointerListeners();
    }
    move(clientX, clientY, event) {
      let drag = this.drag;
      if (!drag)
        return;
      let dx = clientX - drag.startClientX, dy = clientY - drag.startClientY, tapMoveThreshold = this.tapMoveThreshold();
      if ((Math.abs(dx) >= tapMoveThreshold || Math.abs(dy) >= tapMoveThreshold) && (drag.tapCancelled = !0), !drag.canDrag) {
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
      drag.velocityX = (clientX - drag.lastClientX) / elapsed, drag.velocityY = (clientY - drag.lastClientY) / elapsed, drag.lastClientX = clientX, drag.lastClientY = clientY, drag.lastMoveTime = event.timeStamp, this.callbacks().onMove?.({
        pointerId: drag.pointerId,
        clientX,
        clientY,
        dx: clientX - drag.startClientX,
        dy: clientY - drag.startClientY,
        velocityX: drag.velocityX,
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
        velocityX: drag.velocityX,
        velocityY: drag.velocityY
      }, tapMoveThreshold = this.tapMoveThreshold(), isTap = !drag.tapCancelled && Math.abs(info.dx) < tapMoveThreshold && Math.abs(info.dy) < tapMoveThreshold;
      if (!cancelled && !drag.active && isTap && this.callbacks().onTap?.({
        ...info,
        startTarget: drag.startTarget
      }, event), drag.active) {
        if (cancelled) {
          this.callbacks().onEnd?.({
            ...info,
            dx: 0,
            dy: 0,
            velocityX: 0,
            velocityY: 0
          }, event);
          return;
        }
        this.suppressNextClick(info.clientX, info.clientY), this.callbacks().onEnd?.(info, event);
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
      let callbacks = this.callbacks();
      if (!callbacks.onPinchStart || event.pointerType === "mouse" || (this.pinchPointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY
      }), this.pinch || this.pinchPointers.size !== 2))
        return !1;
      let snapshot = this.pinchSnapshot();
      return snapshot ? callbacks.onPinchStart(snapshot, event) ? (this.cancel(), this.pinch = {
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
      let points = Array.from(this.pinchPointers.values()), first = points[0], second = points[1];
      if (!first || !second)
        return null;
      let dx = second.clientX - first.clientX, dy = second.clientY - first.clientY;
      return {
        clientX: (first.clientX + second.clientX) / 2,
        clientY: (first.clientY + second.clientY) / 2,
        distance: Math.hypot(dx, dy)
      };
    }
    tapMoveThreshold() {
      return this.callbacks().tapMoveThreshold ?? DEFAULT_TAP_MOVE_THRESHOLD_PX;
    }
    dragStartThreshold() {
      return this.callbacks().dragStartThreshold ?? DEFAULT_DRAG_START_THRESHOLD_PX;
    }
    dragIntentRatio() {
      return this.callbacks().dragIntentRatio ?? DEFAULT_DRAG_INTENT_RATIO;
    }
    dragAxis() {
      return this.callbacks().dragAxis ?? "any";
    }
    dragIntent(dx, dy) {
      let absX = Math.abs(dx), absY = Math.abs(dy), threshold = this.dragStartThreshold(), ratio = this.dragIntentRatio();
      return this.dragAxis() === "x" ? absY >= threshold && absY > absX ? "cancel" : absX >= threshold && absX >= absY * ratio ? "start" : "pending" : this.dragAxis() === "y" ? absX >= threshold && absX > absY ? "cancel" : absY >= threshold && absY >= absX * ratio ? "start" : "pending" : Math.hypot(dx, dy) >= threshold ? "start" : "pending";
    }
    activateDrag(drag, event) {
      drag.active = !0, this.setDragging(!0), drag.pointerType === "mouse" && window.getSelection()?.removeAllRanges(), this.callbacks().onStart?.({
        pointerId: drag.pointerId,
        clientX: drag.startClientX,
        clientY: drag.startClientY
      }, event), event.preventDefault();
    }
    updateLastMove(drag, clientX, clientY, event) {
      let elapsed = Math.max(1, event.timeStamp - drag.lastMoveTime);
      drag.velocityX = (clientX - drag.lastClientX) / elapsed, drag.velocityY = (clientY - drag.lastClientY) / elapsed, drag.lastClientX = clientX, drag.lastClientY = clientY, drag.lastMoveTime = event.timeStamp;
    }
    suppressNextClick(clientX, clientY) {
      this.suppressClick = !0, this.suppressClickPoint = {
        clientX,
        clientY
      }, window.addEventListener("click", this.onClick, !0), this.suppressClickTimer !== null && window.clearTimeout(this.suppressClickTimer), this.suppressClickTimer = window.setTimeout(() => {
        this.clearClickSuppression();
      }, 400);
    }
    clearClickSuppression() {
      this.suppressClick = !1, this.suppressClickPoint = null, window.removeEventListener("click", this.onClick, !0), this.suppressClickTimer !== null && (window.clearTimeout(this.suppressClickTimer), this.suppressClickTimer = null);
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
      element && (gesture = new PointerGesture(element, callbacks), onCleanup(() => {
        gesture?.dispose(), gesture = null;
      }));
    }), () => gesture?.isDragging() ?? !1;
  }

  // src/components/Widgets/SwipeIndicator.tsx
  var _tmpl$5 = /* @__PURE__ */ template('<div class="ehpeek-swipe-indicator fixed top-1/2 z-overlay flex w-42px h-108px items-center justify-center border border-[var(--color-site-swipe-border)] rounded-full bg-[var(--color-site-swipe-background)] text-[var(--color-site-text)] shadow-[0_6px_20px_var(--color-shadow-floating)] pointer-events-none select-none transition-opacity duration-120 ease-in-out"style=backdrop-filter:blur(8px)>'), HIDE_PROGRESS = 1e-3;
  function SwipeIndicator(props) {
    let progress = createMemo(() => Math.min(1, Math.max(0, props.state.progress))), hidden = createMemo(() => progress() <= HIDE_PROGRESS), pull = createMemo(() => Math.round(48 * progress())), offset = createMemo(() => props.state.direction === "left" ? 42 - pull() : pull() - 42), iconName = createMemo(() => props.state.blocked ? "close" : props.state.direction === "left" ? "chevron-left" : "chevron-right");
    return (() => {
      var _el$ = _tmpl$5();
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

  // src/components/Enhance/PageSwipe.tsx
  var SWIPE_MIN_DISTANCE = 96, SWIPE_INTENT_DISTANCE = 28, HORIZONTAL_INTENT_RATIO = 2.2, SWIPE_MAX_VERTICAL_RATIO = 0.38;
  function PageSwipe(props) {
    let [indicator, setIndicator] = createSignal({
      blocked: !1,
      direction: "left",
      progress: 0
    }), directionFor = (dx) => dx < 0 ? "next" : "previous", reset2 = () => setIndicator((current) => ({
      ...current,
      blocked: !1,
      progress: 0
    }));
    return createPointerGestureElement(() => props.target(), () => ({
      onStart: reset2,
      onMove: (info) => {
        let direction = directionFor(info.dx);
        setIndicator({
          blocked: !props.canNavigate(direction),
          direction: direction === "next" ? "left" : "right",
          progress: Math.min(1, Math.max(0, (Math.abs(info.dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE)))
        });
      },
      onEnd: (info, event) => {
        navigate(info, event), reset2();
      },
      dragAxis: "x",
      dragIntentRatio: HORIZONTAL_INTENT_RATIO,
      dragStartThreshold: SWIPE_INTENT_DISTANCE
    })), createComponent(SwipeIndicator, {
      get state() {
        return indicator();
      }
    });
    function navigate(info, event) {
      let absX = Math.abs(info.dx), absY = Math.abs(info.dy), direction = directionFor(info.dx);
      absX < SWIPE_MIN_DISTANCE || absY > absX * SWIPE_MAX_VERTICAL_RATIO || !props.canNavigate(direction) || (event.preventDefault(), props.onNavigate(direction));
    }
  }

  // src/components/Enhance/EnhanceSearchGrids.tsx
  function EnhanceSearchGrids(props) {
    let [gestureTarget, setGestureTarget] = createSignal(null), [loading, setLoading] = createSignal(!1), source = untrack(() => props.source), navigationLoading = !1, swipeUrl = (direction) => direction === "next" ? source.data.nextUrl : source.data.previousUrl, navigate = async (url) => {
      if (!navigationLoading) {
        navigationLoading = !0, setLoading(!0), source.handle.updateSearchLoading(!0);
        try {
          await source.handle.loadSearchPage(url);
          let nextSource = manageSearchResults();
          if (!nextSource)
            throw new Error(texts_default.errors.searchPageContentNotFound);
          source = nextSource, props.onPageChange(source), source.handle.ensureSearchSwipeInput(), setGestureTarget(source.elems.resultList.Component()), source.handle.scrollSearchPageToInput();
        } catch (error) {
          console.error("[ehpeek]", error);
        } finally {
          navigationLoading = !1, setLoading(!1), source.handle.updateSearchLoading(!1);
        }
      }
    }, onNavigation = (url) => {
      navigate(url);
    };
    return onMount(() => {
      source.handle.ensureSearchSwipeInput(), setGestureTarget(source.elems.resultList.Component()), onCleanup(source.handle.interceptSearchNavigation(onNavigation));
    }), [createComponent(PageSwipe, {
      canNavigate: (direction) => !!swipeUrl(direction),
      onNavigate: (direction) => {
        let url = swipeUrl(direction);
        url && navigate(url);
      },
      target: gestureTarget
    }), createComponent(LoadingOverlay, {
      get label() {
        return texts_default.reader.loading;
      },
      get visible() {
        return loading();
      }
    })];
  }

  // src/components/Enhance/ScrollPageBar.tsx
  var _tmpl$6 = /* @__PURE__ */ template('<div class="w-full mb-xs text-center textsize-sm">'), _tmpl$22 = /* @__PURE__ */ template('<a class="flex !w-sm !h-sm coarse:!w-md coarse:!h-md items-center justify-center box-border !p-0 rounded-sm coarse:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline !border-transparent !bg-transparent !text-[var(--color-site-text)] visited:!text-[var(--color-site-text)] hover:!bg-[var(--color-site-item-hover)] hover:!text-[var(--color-site-text)] active:!text-[var(--color-site-text)]">'), _tmpl$32 = /* @__PURE__ */ template('<td class="!w-sm !h-sm coarse:!w-md coarse:!h-md !p-0 rounded-sm coarse:rounded-md cursor-pointer text-center align-middle select-none">'), _tmpl$42 = /* @__PURE__ */ template("<span>"), _tmpl$52 = /* @__PURE__ */ template('<td class="!w-sm !h-sm coarse:!w-md coarse:!h-md !p-0 rounded-sm coarse:rounded-md cursor-pointer text-center align-middle select-none cursor-default"><span class="flex !w-sm !h-sm coarse:!w-md coarse:!h-md items-center justify-center box-border !p-0 rounded-sm coarse:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline !border-transparent !bg-transparent !text-[var(--color-site-text)] visited:!text-[var(--color-site-text)] hover:!bg-[var(--color-site-item-hover)] hover:!text-[var(--color-site-text)] active:!text-[var(--color-site-text)] invisible">'), _tmpl$62 = /* @__PURE__ */ template('<div><table class="border-separate border-spacing-4px coarse:border-spacing-6px"><tbody><tr>'), _tmpl$7 = /* @__PURE__ */ template('<span class="flex !w-sm !h-sm coarse:!w-md coarse:!h-md items-center justify-center box-border !p-0 rounded-sm coarse:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline !border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)]"aria-current=page>'), DRAG_PIXEL_STEP = 18;
  var PAGE_BAR_LINK_CLASS = "flex !w-sm !h-sm coarse:!w-md coarse:!h-md items-center justify-center box-border !p-0 rounded-sm coarse:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline";
  var PAGE_BAR_CURRENT_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)]", PAGE_BAR_DISABLED_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)] opacity-40 cursor-default";
  function GalleryPageDescription(props) {
    return (() => {
      var _el$ = _tmpl$6();
      return insert(_el$, () => props.text), _el$;
    })();
  }
  function ScrollPageBar(props) {
    let maxIndex = createMemo(() => Math.max(0, props.maxIndex)), currentIndex = createMemo(() => clamp(props.currentIndex, 0, maxIndex())), [visibleCenterIndex, setVisibleCenterIndex] = createSignal(untrack(currentIndex)), gestureHost, dragStartVisibleCenterIndex = untrack(visibleCenterIndex), draggable = () => maxIndex() + 1 > 7, slots = createMemo(() => pageSlots(visibleCenterIndex(), maxIndex())), firstSlotIndex = createMemo(() => slots()[0] ?? currentIndex()), lastSlotIndex = createMemo(() => slots()[slots().length - 1] ?? currentIndex()), currentBeforeWindow = () => currentIndex() < firstSlotIndex(), currentAfterWindow = () => currentIndex() > lastSlotIndex(), scrollTargetForIndex = (pageIndex) => pageIndex === currentIndex() - 1 || pageIndex === maxIndex() ? "bottom" : "top";
    createEffect(() => {
      setVisibleCenterIndex(currentIndex());
    });
    let linkCell = (text, pageIndex, itemState = () => "link") => {
      let resolvedText = () => typeof text == "function" ? text() : text, resolvedPageIndex = () => typeof pageIndex == "function" ? pageIndex() : pageIndex;
      return (() => {
        var _el$2 = _tmpl$32();
        return insert(_el$2, createComponent(Show, {
          get when() {
            return itemState() === "link";
          },
          get fallback() {
            return (() => {
              var _el$4 = _tmpl$42();
              return insert(_el$4, resolvedText), createRenderEffect((_p$) => {
                var _v$ = `${PAGE_BAR_LINK_CLASS} ${itemState() === "current" ? PAGE_BAR_CURRENT_COLOR_CLASS : PAGE_BAR_DISABLED_COLOR_CLASS}`, _v$2 = itemState() === "current" ? "page" : void 0, _v$3 = itemState() === "disabled" ? "true" : void 0;
                return _v$ !== _p$.e && className(_el$4, _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$4, "aria-current", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$4, "aria-disabled", _p$.a = _v$3), _p$;
              }, {
                e: void 0,
                t: void 0,
                a: void 0
              }), _el$4;
            })();
          },
          get children() {
            var _el$3 = _tmpl$22();
            return _el$3.$$click = (event) => {
              event.preventDefault(), event.stopPropagation(), props.onNavigate(resolvedPageIndex(), scrollTargetForIndex(resolvedPageIndex()));
            }, setAttribute(_el$3, "draggable", !1), insert(_el$3, resolvedText), createRenderEffect(() => setAttribute(_el$3, "href", props.urlForIndex(resolvedPageIndex()))), _el$3;
          }
        })), _el$2;
      })();
    }, emptyCell = () => (() => {
      var _el$5 = _tmpl$52(), _el$6 = _el$5.firstChild;
      return _el$5;
    })();
    return createPointerGestureElement(() => gestureHost, () => ({
      shouldCaptureDrag: draggable,
      dragAxis: "x",
      onStart: () => {
        dragStartVisibleCenterIndex = visibleCenterIndex();
      },
      onMove: (info) => {
        if (Math.abs(info.dx) < Math.abs(info.dy))
          return;
        let nextIndex = clamp(dragStartVisibleCenterIndex - acceleratedPageOffset(info.dx), 0, maxIndex());
        nextIndex !== visibleCenterIndex() && setVisibleCenterIndex(nextIndex);
      }
    })), (() => {
      var _el$7 = _tmpl$62(), _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _ref$ = gestureHost;
      return typeof _ref$ == "function" ? use(_ref$, _el$7) : gestureHost = _el$7, insert(_el$0, () => linkCell("<<", 0, () => currentIndex() === 0 ? "disabled" : "link"), null), insert(_el$0, createComponent(Show, {
        get when() {
          return currentBeforeWindow();
        },
        get fallback() {
          return emptyCell();
        },
        get children() {
          return linkCell(() => String(currentIndex() + 1), currentIndex, () => "current");
        }
      }), null), insert(_el$0, () => linkCell("<", () => Math.max(0, currentIndex() - 1), () => currentIndex() === 0 ? "disabled" : "link"), null), insert(_el$0, createComponent(For, {
        get each() {
          return slots();
        },
        children: (pageIndex) => {
          let itemState = createMemo(() => pageIndex === currentIndex() ? "current" : "link");
          return pageIndex !== null ? (() => {
            var _el$1 = _tmpl$32();
            return insert(_el$1, createComponent(Show, {
              get when() {
                return itemState() === "link";
              },
              get fallback() {
                return (() => {
                  var _el$11 = _tmpl$7();
                  return insert(_el$11, pageIndex + 1), _el$11;
                })();
              },
              get children() {
                var _el$10 = _tmpl$22();
                return _el$10.$$click = (event) => {
                  event.preventDefault(), event.stopPropagation(), props.onNavigate(pageIndex, scrollTargetForIndex(pageIndex));
                }, setAttribute(_el$10, "draggable", !1), insert(_el$10, pageIndex + 1), createRenderEffect(() => setAttribute(_el$10, "href", props.urlForIndex(pageIndex))), _el$10;
              }
            })), _el$1;
          })() : emptyCell();
        }
      }), null), insert(_el$0, () => linkCell(">", () => Math.min(maxIndex(), currentIndex() + 1), () => currentIndex() === maxIndex() ? "disabled" : "link"), null), insert(_el$0, createComponent(Show, {
        get when() {
          return currentAfterWindow();
        },
        get fallback() {
          return emptyCell();
        },
        get children() {
          return linkCell(() => String(currentIndex() + 1), currentIndex, () => "current");
        }
      }), null), insert(_el$0, () => linkCell(">>", maxIndex, () => currentIndex() === maxIndex() ? "disabled" : "link"), null), _el$7;
    })();
  }
  function pageSlots(visibleCenterIndex, maxIndex) {
    if (maxIndex + 1 <= 7)
      return range(0, maxIndex);
    let visibleStartIndex = clamp(visibleCenterIndex - 3, -1, maxIndex - 5);
    return range(visibleStartIndex, visibleStartIndex + 6).map((pageIndex) => pageIndex >= 0 && pageIndex <= maxIndex ? pageIndex : null);
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
  delegateEvents(["click"]);

  // src/components/Enhance/EnhanceThumbsGrids.tsx
  var SWIPE_MIN_DISTANCE2 = 96, SWIPE_INTENT_DISTANCE2 = 28, HORIZONTAL_INTENT_RATIO2 = 2.2, SWIPE_MAX_VERTICAL_RATIO2 = 0.38;
  function ThumbsGrids(props) {
    let pageBarSource = untrack(() => props.previewCache.current()), [pageBarCurrentIndex, setPageBarCurrentIndex] = createSignal(pageBarSource.data.currentIndex), [swipeIndicatorState, setSwipeIndicatorState] = createSignal({
      blocked: !1,
      direction: "left",
      progress: 0
    }), pageBarMaxIndex = () => props.previewCache.current().data.maxIndex, requestPreviewPage = (previewIndex, scrollToPageBar) => {
      let current = props.previewCache.current(), onLoadError = props.onLoadError;
      pageBarSource.handle.scrollPreviewPageBarIntoView(scrollToPageBar), previewIndex !== current.data.currentIndex && (setPageBarCurrentIndex(previewIndex), props.previewCache.select(previewIndex).then((next) => {
        untrack(() => props.previewCache.current()) === next && pageBarSource.handle.scrollPreviewPageBarIntoView(scrollToPageBar);
      }, (error) => {
        let cacheIndex = untrack(() => props.previewCache.current().data.currentIndex);
        setPageBarCurrentIndex((currentIndex) => currentIndex === previewIndex ? cacheIndex : currentIndex), onLoadError(error);
      }));
    }, swipeIndexForDelta = (dx) => {
      let current = props.previewCache.current().data, nextIndex = dx < 0 ? current.currentIndex + 1 : current.currentIndex - 1;
      return nextIndex < 0 || nextIndex > current.maxIndex ? null : nextIndex;
    }, hideSwipeIndicator = () => {
      setSwipeIndicatorState((current) => ({
        ...current,
        blocked: !1,
        progress: 0
      }));
    }, updateSwipeIndicator = (info) => {
      setSwipeIndicatorState({
        blocked: swipeIndexForDelta(info.dx) === null,
        direction: info.dx < 0 ? "left" : "right",
        progress: Math.min(1, Math.max(0, (Math.abs(info.dx) - SWIPE_INTENT_DISTANCE2) / (SWIPE_MIN_DISTANCE2 - SWIPE_INTENT_DISTANCE2)))
      });
    }, navigateBySwipe = (info, event) => {
      let absX = Math.abs(info.dx), absY = Math.abs(info.dy);
      if (absX < SWIPE_MIN_DISTANCE2 || absY > absX * SWIPE_MAX_VERTICAL_RATIO2)
        return;
      let previewIndex = swipeIndexForDelta(info.dx);
      previewIndex !== null && (event.preventDefault(), requestPreviewPage(previewIndex, info.dx < 0 ? "top" : "bottom"));
    }, actions = {
      gotoPreview: setPageBarCurrentIndex
    };
    createEffect(() => {
      props.actionsRef(actions);
    }), createEffect((previous) => {
      let current = props.previewCache.current();
      return setPageBarCurrentIndex(current.data.currentIndex), current.handle.ensurePreviewSwipeInput(), current !== previous && pageBarSource.handle.replacePreviewThumbs(current.elems.thumbItems), current;
    }, pageBarSource), createEffect(() => {
      pageBarSource.handle.updatePreviewLoading(props.previewCache.loading());
    }), onCleanup(() => {
      pageBarSource.handle.updatePreviewLoading(!1);
    }), createPointerGestureElement(() => pageBarSource.elems.thumbs?.Component() ?? null, () => ({
      onStart: hideSwipeIndicator,
      onMove: updateSwipeIndicator,
      onEnd: (info, event) => {
        navigateBySwipe(info, event), hideSwipeIndicator();
      },
      dragAxis: "x",
      dragIntentRatio: HORIZONTAL_INTENT_RATIO2,
      dragStartThreshold: SWIPE_INTENT_DISTANCE2
    })), pageBarSource.handle.installPreviewPageBars(), pageBarSource.elems.pageBarDescription?.mount(() => createComponent(GalleryPageDescription, {
      get text() {
        return props.previewCache.current().data.descriptionText;
      }
    }));
    for (let element of [pageBarSource.elems.pageBarTop, pageBarSource.elems.pageBarBottom])
      element && element.mount(() => createComponent(ScrollPageBar, {
        get currentIndex() {
          return pageBarCurrentIndex();
        },
        get maxIndex() {
          return pageBarMaxIndex();
        },
        onNavigate: requestPreviewPage,
        urlForIndex: (index) => previewUrlForIndex(index, props.previewCache.current().data.currentUrl)
      }));
    return onCleanup(() => {
      pageBarSource.elems.pageBarDescription?.remove(), pageBarSource.elems.pageBarTop?.remove(), pageBarSource.elems.pageBarBottom?.remove();
    }), [createComponent(LoadingOverlay, {
      get label() {
        return texts_default.reader.loading;
      },
      get visible() {
        return props.previewCache.loading();
      }
    }), createComponent(SwipeIndicator, {
      get state() {
        return swipeIndicatorState();
      }
    })];
  }

  // src/state/readHistory.ts
  var HISTORY_KEY_PREFIX = "ehpeek:history:", HISTORY_QUEUE_KEY_PREFIX = "ehpeek:hist_q:", READ_HISTORY_LIMIT = 3e3, HISTORY_COMPACT_THRESHOLD = 4e3, SAVE_DELAY_MS = 1e4, ReadHistorySession = class {
    constructor(baseRecord) {
      this.baseRecord = baseRecord;
      this.pending = null;
      this.lastSaved = null;
      this.timer = null;
      this.flush = () => {
        this.timer !== null && (window.clearTimeout(this.timer), this.timer = null), this.pending && (this.sameProgress(this.pending, this.lastSaved) || (saveReadHistory(this.pending), this.lastSaved = this.pending), this.pending = null);
      };
      this.onVisibilityChange = () => {
        document.visibilityState === "hidden" && this.flush();
      };
      window.addEventListener("pagehide", this.flush), document.addEventListener("visibilitychange", this.onVisibilityChange);
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
  function loadReadHistoryRecords() {
    return GM_listValues().filter((key) => key.startsWith(HISTORY_QUEUE_KEY_PREFIX)).sort((left, right) => right.localeCompare(left)).map((key) => {
      let reference = GM_getValue(key, null);
      if (!reference)
        return null;
      let record = GM_getValue(
        `${HISTORY_KEY_PREFIX}${reference}`,
        null
      );
      return record?.queueOrder === queueOrderFromKey(key) ? record : null;
    }).filter((record) => record !== null);
  }
  function clearReadHistory() {
    for (let key of GM_listValues())
      (key.startsWith(HISTORY_KEY_PREFIX) || key.startsWith(HISTORY_QUEUE_KEY_PREFIX)) && GM_deleteValue(key);
    state.gallery.readHistoryCount.set(0);
  }
  function removeReadHistory(galleryId, token) {
    let key = historyKey(galleryId, token), record = GM_getValue(key, null);
    record && (GM_deleteValue(key), GM_deleteValue(queueKey(record.queueOrder)), state.gallery.readHistoryCount.set(
      Math.max(0, state.gallery.readHistoryCount.reload() - 1)
    ));
  }
  function updateReadHistoryGalleryInfo(galleryId, token, gallery2) {
    let record = loadReadHistory(galleryId, token);
    if (!record)
      return null;
    let updated = {
      ...record,
      gallery: mergeGalleryInfo(record.gallery, gallery2)
    };
    return GM_setValue(historyKey(galleryId, token), updated), updated;
  }
  function recordGalleryVisit(galleryId, token, totalPages, gallery2) {
    let existing = loadReadHistory(galleryId, token), record = existing ? {
      ...existing,
      gallery: mergeGalleryInfo(existing.gallery, gallery2),
      totalPages,
      updatedAt: Date.now()
    } : {
      gallery: gallery2,
      galleryId,
      pageNum: -1,
      token,
      totalPages,
      updatedAt: Date.now()
    };
    return saveReadHistory(record), record;
  }
  function saveReadHistory(record) {
    let key = historyKey(record.galleryId, record.token), previous = GM_getValue(key, null), exists = previous !== null, queueOrder = createQueueOrder();
    if (GM_setValue(key, {
      ...record,
      gallery: mergeGalleryInfo(previous?.gallery, record.gallery),
      queueOrder
    }), GM_setValue(queueKey(queueOrder), historyReference(record.galleryId, record.token)), !exists) {
      let count = state.gallery.readHistoryCount.reload() + 1;
      state.gallery.readHistoryCount.set(count), count >= HISTORY_COMPACT_THRESHOLD && pruneReadHistory();
    }
  }
  function mergeGalleryInfo(previous, current) {
    let merged = {
      category: current?.category ?? previous?.category,
      categoryClass: current?.categoryClass ?? previous?.categoryClass,
      coverUrl: current?.coverUrl ?? previous?.coverUrl,
      language: current?.language ?? previous?.language,
      posted: current?.posted ?? previous?.posted,
      rating: current?.rating ?? (typeof previous?.rating == "number" ? previous.rating : void 0),
      title: current?.title ?? previous?.title,
      titleSub: current?.titleSub ?? previous?.titleSub,
      uploader: current?.uploader ?? previous?.uploader
    }, entries = Object.entries(merged).filter((entry) => entry[1] !== void 0);
    return entries.length > 0 ? Object.fromEntries(entries) : void 0;
  }
  function historyKey(galleryId, token) {
    return `${HISTORY_KEY_PREFIX}${historyReference(galleryId, token)}`;
  }
  function pruneReadHistory() {
    let keys = GM_listValues(), queueKeys = keys.filter((key) => key.startsWith(HISTORY_QUEUE_KEY_PREFIX)), records = keys.filter((key) => key.startsWith(HISTORY_KEY_PREFIX)).map((key) => ({ key, record: GM_getValue(key, null) })).filter(
      (entry) => entry.record !== null
    ).sort((left, right) => right.record.updatedAt - left.record.updatedAt), retained = records.slice(0, READ_HISTORY_LIMIT);
    for (let entry of records.slice(retained.length))
      GM_deleteValue(entry.key);
    retained.reverse().forEach((entry, index) => {
      let queueOrder = compactQueueOrder(index), record = { ...entry.record, queueOrder };
      GM_setValue(entry.key, record), GM_setValue(
        queueKey(queueOrder),
        historyReference(record.galleryId, record.token)
      );
    });
    for (let key of queueKeys) {
      let reference = GM_getValue(key, null), record = reference ? GM_getValue(`${HISTORY_KEY_PREFIX}${reference}`, null) : null;
      (!record || queueKey(record.queueOrder) !== key) && GM_deleteValue(key);
    }
    state.gallery.readHistoryCount.set(retained.length);
  }
  function historyReference(galleryId, token) {
    return `${galleryId}:${token}`;
  }
  function queueKey(order) {
    return `${HISTORY_QUEUE_KEY_PREFIX}${order}`;
  }
  function queueOrderFromKey(key) {
    return key.slice(HISTORY_QUEUE_KEY_PREFIX.length);
  }
  function createQueueOrder() {
    let [randomValue = 0] = crypto.getRandomValues(new Uint32Array(1)), random = randomValue.toString(36).padStart(7, "0");
    return `${Date.now().toString().padStart(13, "0")}-${random}`;
  }
  function compactQueueOrder(index) {
    return index.toString().padStart(20, "0");
  }

  // src/components/Enhance/ReadHistory.tsx
  var _tmpl$8 = /* @__PURE__ */ template('<nav class="flex flex-col items-center gap-sm border-0 border-y border-solid ehp-color-site-border-subtle-b p-md">'), _tmpl$23 = /* @__PURE__ */ template('<div class="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-sm"><span></span><span class="text-center textsize-md font-600 ehp-color-site-text"><span class=block>'), _tmpl$33 = /* @__PURE__ */ template('<button type=button class="min-h-xs justify-self-end px-sm coarse:min-h-sm coarse:px-md rounded-sm border-0 bg-transparent ehp-color-site-text textsize-md font-600 cursor-pointer [touch-action:manipulation] hover:bg-[var(--color-site-item-hover)]">'), _tmpl$43 = /* @__PURE__ */ template("<div>"), _tmpl$53 = /* @__PURE__ */ template('<div class="p-xl text-center textsize-md ehp-color-site-text opacity-72">'), _tmpl$63 = /* @__PURE__ */ template("<button type=button><span>");
  function ReadHistoryPage(props) {
    let [items, setItems] = createSignal(untrack(() => props.items)), pageCount = createMemo(() => Math.max(1, Math.ceil(items().length / props.pageSize))), [pageIndex, setPageIndex] = createSignal(Math.min(props.initialPageIndex, untrack(pageCount) - 1)), pageItems = createMemo(() => {
      let start = pageIndex() * props.pageSize;
      return items().slice(start, start + props.pageSize);
    }), visibleRange = createMemo(() => {
      if (items().length === 0)
        return "0 / 0";
      let start = pageIndex() * props.pageSize + 1, end = Math.min(start + props.pageSize - 1, items().length);
      return texts_default.history.range.replace("{start}", String(start)).replace("{end}", String(end)).replace("{total}", String(items().length));
    }), navigate = (nextPageIndex, scrollToPageBar = "top", updateUrl = !0) => {
      let nextIndex = Math.max(0, Math.min(nextPageIndex, pageCount() - 1));
      nextIndex !== pageIndex() && (setPageIndex(nextIndex), updateUrl && window.history.pushState(window.history.state, "", readHistoryUrl(nextIndex)), props.source.handle.scrollReadHistoryPage(scrollToPageBar));
    }, clearHistory = () => {
      window.confirm(texts_default.history.clearConfirm) && (clearReadHistory(), setItems([]), setPageIndex(0), window.history.replaceState(window.history.state, "", readHistoryUrl()));
    }, removeHistoryItem = (item) => {
      if (!window.confirm(texts_default.history.removeConfirm))
        return;
      removeReadHistory(item.galleryId, item.token);
      let nextItems = items().filter((candidate) => candidate.galleryId !== item.galleryId || candidate.token !== item.token), nextPageCount = Math.max(1, Math.ceil(nextItems.length / props.pageSize)), nextPageIndex = Math.min(pageIndex(), nextPageCount - 1);
      setItems(nextItems), setPageIndex(nextPageIndex), window.history.replaceState(window.history.state, "", readHistoryUrl(nextPageIndex));
    };
    createEffect(() => {
      props.source.handle.updateReadHistoryItems(pageItems());
    }), onMount(() => {
      let syncFromHistory = () => {
        let page2 = extractPageType();
        page2.type === "readHistory" && navigate(page2.pageIndex, "top", !1);
      };
      window.addEventListener("popstate", syncFromHistory);
      let stopRemoval = props.source.handle.listenForReadHistoryRemoval(removeHistoryItem);
      onCleanup(() => {
        stopRemoval(), window.removeEventListener("popstate", syncFromHistory);
      });
    });
    let navigation = (showHeader) => (() => {
      var _el$ = _tmpl$8();
      return insert(_el$, showHeader && (() => {
        var _el$2 = _tmpl$23(), _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.firstChild;
        return insert(_el$4, visibleRange, _el$5), insert(_el$5, () => texts_default.history.limit.replace("{limit}", String(READ_HISTORY_LIMIT))), insert(_el$2, (() => {
          var _c$2 = memo(() => items().length > 0);
          return () => _c$2() && (() => {
            var _el$6 = _tmpl$33();
            return _el$6.$$click = clearHistory, insert(_el$6, () => texts_default.button.clearHistory), _el$6;
          })();
        })(), null), _el$2;
      })(), null), insert(_el$, (() => {
        var _c$ = memo(() => pageCount() > 1);
        return () => _c$() && createComponent(ScrollPageBar, {
          get currentIndex() {
            return pageIndex();
          },
          get maxIndex() {
            return pageCount() - 1;
          },
          onNavigate: navigate,
          urlForIndex: readHistoryUrl
        });
      })(), null), _el$;
    })();
    return (() => {
      var _el$7 = _tmpl$43();
      return insert(_el$7, createComponent(PageSwipe, {
        canNavigate: (direction) => direction === "next" ? pageIndex() + 1 < pageCount() : pageIndex() > 0,
        onNavigate: (direction) => navigate(direction === "next" ? pageIndex() + 1 : pageIndex() - 1),
        target: () => props.source.elems.resultList.Component()
      }), null), insert(_el$7, (() => {
        var _c$3 = memo(() => items().length === 0);
        return () => _c$3() && (() => {
          var _el$8 = _tmpl$53();
          return insert(_el$8, () => texts_default.history.empty), _el$8;
        })();
      })(), null), insert(_el$7, (() => {
        var _c$4 = memo(() => items().length > 0);
        return () => _c$4() && navigation(!0);
      })(), null), insert(_el$7, (() => {
        var _c$5 = memo(() => pageCount() > 1);
        return () => _c$5() && createComponent(Portal, {
          get mount() {
            return props.source.elems.navigationBottomMount.Component();
          },
          get children() {
            return navigation(!1);
          }
        });
      })(), null), _el$7;
    })();
  }
  function ReadButton(props) {
    let buttonClassName = () => props.variant === "touchGallery" ? "ehpeek-continue-reading ehpeek-touch-gallery-primary-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-md font-700" : "ehpeek-continue-reading flex box-border w-full max-w-full min-h-sm items-center gap-sm py-sm px-xs border-0 bg-transparent text-[var(--color-site-accent)] hover:bg-[var(--color-site-accent-hover)] shadow-none cursor-pointer text-left font-sans textsize-sm font-700 leading-[1.2]", detailClassName = () => props.variant === "touchGallery" ? "ehpeek-continue-reading-page block mt-2px ehp-color-site-accent textsize-md font-600 opacity-78 normal-case" : "ehpeek-continue-reading-page inline-block ml-auto opacity-72 textsize-xs font-600 whitespace-nowrap";
    return (() => {
      var _el$9 = _tmpl$63(), _el$0 = _el$9.firstChild;
      return _el$9.$$click = (event) => {
        event.preventDefault(), event.stopPropagation(), props.onClick();
      }, insert(_el$9, (() => {
        var _c$6 = memo(() => !!props.hasHistory);
        return () => _c$6() ? texts_default.reader.continueReading : texts_default.reader.startReading;
      })(), _el$0), insert(_el$0, (() => {
        var _c$7 = memo(() => !!props.totalPages);
        return () => _c$7() ? `${props.currentPage}/${props.totalPages}` : String(props.currentPage);
      })()), createRenderEffect((_p$) => {
        var _v$ = buttonClassName(), _v$2 = detailClassName();
        return _v$ !== _p$.e && className(_el$9, _p$.e = _v$), _v$2 !== _p$.t && className(_el$0, _p$.t = _v$2), _p$;
      }, {
        e: void 0,
        t: void 0
      }), _el$9;
    })();
  }
  delegateEvents(["click"]);

  // src/components/Enhance/SearchHistory.tsx
  var _tmpl$9 = /* @__PURE__ */ template('<section class="ehpeek-search-history fixed z-ui flex box-border max-h-[60dvh] flex-col overflow-hidden overflow-y-auto overscroll-contain rounded-md border ehp-color-site-border ehp-color-site-elevated ehp-color-site-text font-sans"role=list>'), _tmpl$24 = /* @__PURE__ */ template('<div class="flex min-w-0 flex-none items-stretch border-0 border-b ehp-color-site-border-subtle-b last:border-b-0"role=listitem><button type=button></button><button type=button class="appearance-none inline-flex w-60px min-h-lg flex-none items-center justify-center border-0 border-l ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text textsize-xl font-inherit leading-1 cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]">×');
  function SearchHistory(props) {
    let dropdown, [searchValue, setSearchValue] = createSignal(untrack(() => props.source.data.value)), [history, setHistory] = createSignal(loadSearchHistory()), [open, setOpen] = createSignal(!1), [activeIndex, setActiveIndex] = createSignal(-1), [position, setPosition] = createSignal(null), itemButtons = [], visiblePosition = () => open() && !searchValue().trim() && history().length > 0 ? position() : null, selectHistory = (item) => {
      props.source.handle.applySearchSelection(item), setOpen(!1);
    };
    return onMount(() => {
      let updatePosition = () => {
        setPosition(props.source.handle.readSearchOverlayPosition());
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
        if (visiblePosition())
          if (event.key === "ArrowDown" || event.key === "ArrowUp")
            event.preventDefault(), moveSelection(event.key === "ArrowDown" ? 1 : -1);
          else if (event.key === "Enter" && activeIndex() >= 0) {
            event.preventDefault();
            let item = history()[activeIndex()];
            item !== void 0 && selectHistory(item);
          } else event.key === "Escape" && (event.preventDefault(), setOpen(!1));
      }, updateSearchValue = (value, focused) => {
        setSearchValue(value), !value.trim() && focused && showHistory();
      }, recordSearch = (sourceValue) => {
        let value = sourceValue.trim();
        value && setHistory(addSearchHistory(value));
      }, disconnect = props.source.handle.listenSearchHistoryOverlay({
        onFocus: showHistory,
        onInput: updateSearchValue,
        onKeyDown: onInputKeyDown,
        onOutsidePointer: () => setOpen(!1),
        onPositionChange: updatePosition,
        onSubmit: recordSearch
      }, () => dropdown ?? null);
      updateSearchValue(props.source.data.value, !1), onCleanup(disconnect);
    }), createComponent(Show, {
      get when() {
        return visiblePosition();
      },
      keyed: !0,
      children: (currentPosition) => (() => {
        var _el$ = _tmpl$9(), _ref$ = dropdown;
        return typeof _ref$ == "function" ? use(_ref$, _el$) : dropdown = _el$, insert(_el$, createComponent(For, {
          get each() {
            return history();
          },
          children: (item, index) => (() => {
            var _el$2 = _tmpl$24(), _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling;
            return _el$3.$$click = () => selectHistory(item), _el$3.addEventListener("pointerenter", () => setActiveIndex(index())), use((button2) => {
              itemButtons[index()] = button2;
            }, _el$3), setAttribute(_el$3, "title", item), insert(_el$3, item), _el$4.$$click = () => {
              setHistory(removeSearchHistory(item));
            }, createRenderEffect(() => className(_el$3, `appearance-none block min-w-0 min-h-lg flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-lg border-0 ehp-color-site-text text-left textsize-lg font-inherit cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)] ${activeIndex() === index() ? "bg-[var(--color-site-item-hover)]" : "bg-transparent"}`)), _el$2;
          })()
        })), createRenderEffect((_p$) => {
          var _v$ = `${currentPosition.left}px`, _v$2 = `${currentPosition.top}px`, _v$3 = `${currentPosition.width}px`;
          return _v$ !== _p$.e && setStyleProperty(_el$, "left", _p$.e = _v$), _v$2 !== _p$.t && setStyleProperty(_el$, "top", _p$.t = _v$2), _v$3 !== _p$.a && setStyleProperty(_el$, "width", _p$.a = _v$3), _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        }), _el$;
      })()
    });
  }
  delegateEvents(["click"]);

  // src/components/Enhance/MyTags.ts
  async function loadMyTagsPage(tagSet) {
    let url = new URL("/mytags", window.location.origin);
    tagSet && url.searchParams.set("tagset", tagSet);
    let response = await requestPage(url.href);
    return extractMyTagsPageData(response.document, tagSet);
  }
  function loadMyTagAppearances() {
    return state.gallery.myTagAppearances.stored() ? state.gallery.myTagAppearances.reload() : null;
  }
  async function refreshMyTags(initialPage) {
    try {
      let initialData = initialPage ?? await loadMyTagsPage(), options = initialData.options;
      state.gallery.myTagSets.set(options);
      let appearances = (options.length > 0 ? await Promise.all(options.map(async (option2) => option2.selected ? initialData : loadMyTagsPage(option2.value))) : [initialData]).flatMap((page2) => page2.enabled ? page2.appearances : []), unique = Array.from(new Map(appearances.map((appearance) => [appearance.name, appearance])).values());
      return state.gallery.myTagAppearances.set(unique), unique;
    } catch (error) {
      return console.error("[ehpeek] Could not load My Tags", error), null;
    }
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

  // src/components/InteractionHelp.tsx
  var _tmpl$10 = /* @__PURE__ */ template('<div class="fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65 pointer-events-auto"role=dialog aria-modal=true><div><div class="flex items-center justify-between gap-md mb-lg"><h2 class="m-0 font-sans textsize-lg font-700"></h2><button type=button>×</button></div><div class="grid gap-lg text-left font-sans textsize-md leading-[1.45]">'), _tmpl$25 = /* @__PURE__ */ template('<section><h3 class="m-0 mb-sm textsize-md font-700"></h3><ul class="m-0 pl-xl">'), _tmpl$34 = /* @__PURE__ */ template('<li class="mb-xs last:mb-0">'), _tmpl$44 = /* @__PURE__ */ template("<strong>"), SECTIONS = Object.entries(texts_default.help.content);
  function InteractionHelp(props) {
    let reader = untrack(() => props.variant === "reader");
    return onMount(() => {
      let closeOnEscape = (event) => {
        event.key === "Escape" && (event.preventDefault(), event.stopImmediatePropagation(), props.onClose());
      };
      window.addEventListener("keydown", closeOnEscape, !0), onCleanup(() => window.removeEventListener("keydown", closeOnEscape, !0));
    }), (() => {
      var _el$ = _tmpl$10(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$3.nextSibling;
      return _el$.addEventListener("wheel", (event) => event.stopPropagation()), _el$.$$pointerdown = (event) => event.stopPropagation(), _el$.$$click = (event) => {
        event.stopPropagation(), event.target === event.currentTarget && props.onClose();
      }, className(_el$2, `box-border w-full max-w-520px max-h-[min(720px,calc(100dvh-32px))] overflow-y-auto overscroll-contain p-xl coarse:p-lg rounded-lg border shadow-xl ${reader ? "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]" : "ehp-color-site-border ehp-color-site-elevated ehp-color-site-text"}`), insert(_el$4, () => texts_default.help.title), _el$5.$$click = () => props.onClose(), className(_el$5, `inline-flex w-40px h-40px flex-none items-center justify-center p-0 rounded-md border bg-transparent font-inherit textsize-xl cursor-pointer ${reader ? "border-[var(--color-border)] text-[var(--color-text)]" : "ehp-color-site-border ehp-color-site-text"}`), insert(_el$6, createComponent(For, {
        each: SECTIONS,
        children: ([title, items]) => (() => {
          var _el$7 = _tmpl$25(), _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling;
          return insert(_el$8, title), insert(_el$9, createComponent(For, {
            each: items,
            children: (item) => (() => {
              var _el$0 = _tmpl$34();
              return insert(_el$0, createComponent(HelpText, {
                text: item
              })), _el$0;
            })()
          })), _el$7;
        })()
      })), createRenderEffect((_p$) => {
        var _v$ = texts_default.help.title, _v$2 = texts_default.button.close, _v$3 = texts_default.button.close;
        return _v$ !== _p$.e && setAttribute(_el$, "aria-label", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$5, "aria-label", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$5, "title", _p$.a = _v$3), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$;
    })();
  }
  function HelpText(props) {
    return createComponent(For, {
      get each() {
        return props.text.split(/(\*\*[^*]+\*\*)/g);
      },
      children: (part) => part.startsWith("**") && part.endsWith("**") ? (() => {
        var _el$1 = _tmpl$44();
        return insert(_el$1, () => part.slice(2, -2)), _el$1;
      })() : part
    });
  }
  delegateEvents(["click", "pointerdown"]);

  // src/components/SettingsMenu.tsx
  var _tmpl$11 = /* @__PURE__ */ template('<p class="box-border w-full m-0 px-md pb-md text-left whitespace-normal [overflow-wrap:anywhere] [contain:inline-size] textsize-sm leading-[1.35] opacity-75">'), _tmpl$26 = /* @__PURE__ */ template('<div class="border-0 border-b ehp-color-site-border-subtle-b"><div class="flex items-stretch"><button type=button class="flex min-w-0 flex-1 min-h-md coarse:min-h-88px items-center justify-between gap-md coarse:gap-xl py-sm coarse:py-lg pl-md pr-sm rounded-xs border-0 !bg-transparent hover:!bg-transparent active:!bg-transparent ehp-color-site-text font-inherit text-left textsize-md cursor-pointer [-webkit-tap-highlight-color:transparent]"><span></span><span class="flex flex-none items-center gap-sm"><span class="textsize-sm opacity-70"></span><span></span></span></button><button type=button class="flex flex-none w-32px coarse:w-48px min-h-md coarse:min-h-88px items-center justify-center p-0 rounded-xs border-0 !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text cursor-pointer font-inherit textsize-md font-700 [-webkit-tap-highlight-color:transparent]"><span class="flex w-20px h-20px items-center justify-center rounded-full border border-[var(--color-site-border-subtle)] leading-none">?'), _tmpl$35 = /* @__PURE__ */ template('<div class="absolute top-full right-0 z-2 mt-xs w-160px coarse:w-180px overflow-hidden rounded-md border ehp-color-site-border ehp-color-site-elevated shadow-xl"role=menu>'), _tmpl$45 = /* @__PURE__ */ template('<button type=button class="flex w-full min-h-md coarse:min-h-64px items-center gap-md px-md border-0 border-b ehp-color-site-border-subtle-b !bg-transparent hover:!bg-[var(--color-site-item-hover)] ehp-color-site-text font-inherit text-left textsize-md cursor-pointer"><span>'), _tmpl$54 = /* @__PURE__ */ template('<div class="flex w-full min-h-md coarse:min-h-64px items-center px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text textsize-md font-700">Ehpeek'), _tmpl$64 = /* @__PURE__ */ template('<a class="flex w-full min-h-md coarse:min-h-88px items-center overflow-hidden text-ellipsis whitespace-nowrap px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text no-underline textsize-md font-700 hover:bg-[var(--color-site-item-hover)]"href=https://github.com/yamipot/ehpeek target=_blank rel="noopener noreferrer">v'), _tmpl$72 = /* @__PURE__ */ template('<div class="ehpeek-settings-menu pointer-events-auto fixed top-24px right-24px coarse:top-8px coarse:right-8px z-overlay box-border flex w-320px coarse:w-[calc(100vw-16px)] max-w-[calc(100vw-48px)] coarse:max-w-480px max-h-[calc(100vh-48px)] coarse:max-h-[calc(100dvh-16px)] flex-col overflow-hidden p-sm coarse:p-md border ehp-color-site-border rounded-sm ehp-color-site-elevated ehp-color-site-text textsize-md leading-[1.2]"><div class="relative flex flex-none justify-end mb-sm"><button type=button class="flex w-160px coarse:w-180px min-h-md coarse:min-h-64px items-center justify-between gap-md px-md rounded-md border ehp-color-site-border !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text font-inherit text-left textsize-md font-700 cursor-pointer [-webkit-tap-highlight-color:transparent]"aria-haspopup=menu><span></span><span aria-hidden=true></span></button></div><div class="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain"></div><a class="flex w-full min-h-md coarse:min-h-88px items-center overflow-hidden text-ellipsis whitespace-nowrap px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text no-underline textsize-md hover:bg-[var(--color-site-item-hover)]"></a><div class="ehpeek-settings-actions grid grid-cols-3 flex-none gap-sm mt-md pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]"><button type=button class="ehpeek-settings-apply block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108"></button><button type=button class="ehpeek-settings-default block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]"></button><button type=button class="ehpeek-settings-close block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]">'), _tmpl$82 = /* @__PURE__ */ template("<button type=button role=menuitemradio>"), SETTINGS_SECTIONS = [["general", texts_default.settings.general], ["enhance", texts_default.settings.enhance], ["options", texts_default.settings.options], ["about", texts_default.settings.about]];
  var SETTINGS_DOT_CLASS = "block flex-none w-10px h-10px coarse:w-18px coarse:h-18px rounded-full";
  function SwitchButton(props) {
    let [helpOpen, setHelpOpen] = createSignal(!1);
    return (() => {
      var _el$ = _tmpl$26(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$3.nextSibling;
      return _el$3.$$click = (event) => {
        event.stopPropagation(), props.onChange(!props.checked);
      }, insert(_el$4, () => props.label), insert(_el$6, (() => {
        var _c$ = memo(() => !!props.checked);
        return () => _c$() ? texts_default.settings.on : texts_default.settings.off;
      })()), _el$8.$$click = (event) => {
        event.stopPropagation(), setHelpOpen((open) => !open);
      }, insert(_el$, createComponent(Show, {
        get when() {
          return helpOpen();
        },
        get children() {
          var _el$9 = _tmpl$11();
          return insert(_el$9, () => props.description), _el$9;
        }
      }), null), createRenderEffect(() => className(_el$7, `${SETTINGS_DOT_CLASS} ${props.checked ? "bg-[var(--color-state-on)]" : "bg-[var(--color-state-off)]"}`)), _el$;
    })();
  }
  function SettingsMenu(props) {
    let [draft, setDraft] = createStore(untrack(() => ({
      ...props.initState
    }))), [activeTab, setActiveTab] = createSignal("general"), [categoryOpen, setCategoryOpen] = createSignal(!1), [helpOpen, setHelpOpen] = createSignal(!1), [changed, setChanged] = createSignal(!1), menu, close = () => changed() && !window.confirm(texts_default.settings.discardChanges) ? !1 : (props.onOpenChange(!1), !0), updateDraft = (key, value) => {
      setChanged(!0), setDraft(key, value);
    };
    return createEffect(() => {
      props.open && (setDraft({
        ...props.initState
      }), setActiveTab("general"), setCategoryOpen(!1), setHelpOpen(!1), setChanged(!1));
    }), onMount(() => {
      let onPointerDown = (event) => {
        props.open && (event.target instanceof Element && menu.contains(event.target) || close() || (event.preventDefault(), event.stopImmediatePropagation()));
      }, onKeyDown = (event) => {
        if (props.open && event.key === "Escape") {
          if (categoryOpen()) {
            setCategoryOpen(!1), event.preventDefault(), event.stopImmediatePropagation();
            return;
          }
          close() || (event.preventDefault(), event.stopImmediatePropagation());
        }
      };
      document.addEventListener("pointerdown", onPointerDown), document.addEventListener("keydown", onKeyDown), onCleanup(() => {
        document.removeEventListener("pointerdown", onPointerDown), document.removeEventListener("keydown", onKeyDown);
      });
    }), createComponent(Show, {
      get when() {
        return props.open;
      },
      get children() {
        var _el$0 = _tmpl$72(), _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$14 = _el$1.nextSibling, _el$20 = _el$14.nextSibling, _el$21 = _el$20.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$23.nextSibling, _ref$ = menu;
        return typeof _ref$ == "function" ? use(_ref$, _el$0) : menu = _el$0, _el$10.$$click = () => setCategoryOpen((open) => !open), insert(_el$11, () => SETTINGS_SECTIONS.find(([tab]) => tab === activeTab())?.[1]), insert(_el$12, () => categoryOpen() ? "▴" : "▾"), insert(_el$1, createComponent(Show, {
          get when() {
            return categoryOpen();
          },
          get children() {
            var _el$13 = _tmpl$35();
            return insert(_el$13, createComponent(For, {
              each: SETTINGS_SECTIONS,
              children: ([tab, label]) => (() => {
                var _el$25 = _tmpl$82();
                return _el$25.$$click = () => {
                  setActiveTab(tab), setCategoryOpen(!1);
                }, insert(_el$25, label), createRenderEffect((_p$) => {
                  var _v$3 = `flex w-full min-h-md coarse:min-h-64px items-center px-md border-0 border-b last:border-b-0 ehp-color-site-border-subtle-b ehp-color-site-text font-inherit text-left textsize-md cursor-pointer [-webkit-tap-highlight-color:transparent] ${activeTab() === tab ? "bg-[var(--color-site-item-hover)] font-700" : "!bg-transparent hover:!bg-[var(--color-site-item-hover)]"}`, _v$4 = activeTab() === tab;
                  return _v$3 !== _p$.e && className(_el$25, _p$.e = _v$3), _v$4 !== _p$.t && setAttribute(_el$25, "aria-checked", _p$.t = _v$4), _p$;
                }, {
                  e: void 0,
                  t: void 0
                }), _el$25;
              })()
            })), _el$13;
          }
        }), null), insert(_el$14, createComponent(Show, {
          get when() {
            return activeTab() === "general";
          },
          get children() {
            return [createComponent(SwitchButton, {
              get checked() {
                return draft.readerEnabled;
              },
              get description() {
                return texts_default.settings.readerHelp;
              },
              get label() {
                return texts_default.settings.readerLabel;
              },
              onChange: (value) => updateDraft("readerEnabled", value)
            }), createComponent(SwitchButton, {
              get checked() {
                return draft.touchUiEnabled;
              },
              get description() {
                return texts_default.settings.touchUiHelp;
              },
              get label() {
                return texts_default.settings.touchUiLabel;
              },
              onChange: (value) => updateDraft("touchUiEnabled", value)
            }), (() => {
              var _el$15 = _tmpl$45(), _el$16 = _el$15.firstChild;
              return _el$15.$$click = () => setHelpOpen(!0), insert(_el$16, () => texts_default.help.title), _el$15;
            })()];
          }
        }), null), insert(_el$14, createComponent(Show, {
          get when() {
            return activeTab() === "enhance";
          },
          get children() {
            return [createComponent(SwitchButton, {
              get checked() {
                return draft.enhanceSearchGridsEnabled;
              },
              get description() {
                return texts_default.settings.enhanceSearchHelp;
              },
              get label() {
                return texts_default.settings.enhanceSearchLabel;
              },
              onChange: (value) => updateDraft("enhanceSearchGridsEnabled", value)
            }), createComponent(SwitchButton, {
              get checked() {
                return draft.enhanceThumbsGridsEnabled;
              },
              get description() {
                return texts_default.settings.enhanceThumbsHelp;
              },
              get label() {
                return texts_default.settings.enhanceThumbsLabel;
              },
              onChange: (value) => updateDraft("enhanceThumbsGridsEnabled", value)
            }), createComponent(SwitchButton, {
              get checked() {
                return draft.myTagsEnabled;
              },
              get description() {
                return texts_default.settings.myTagsHelp;
              },
              get label() {
                return texts_default.settings.myTagsLabel;
              },
              onChange: (value) => updateDraft("myTagsEnabled", value)
            }), createComponent(SwitchButton, {
              get checked() {
                return draft.readHistoryEnabled;
              },
              get description() {
                return texts_default.settings.readHistoryHelp;
              },
              get label() {
                return texts_default.settings.readHistoryLabel;
              },
              onChange: (value) => updateDraft("readHistoryEnabled", value)
            }), createComponent(SwitchButton, {
              get checked() {
                return draft.searchHistoryEnabled;
              },
              get description() {
                return texts_default.settings.searchHistoryHelp;
              },
              get label() {
                return texts_default.settings.searchHistoryLabel;
              },
              onChange: (value) => updateDraft("searchHistoryEnabled", value)
            })];
          }
        }), null), insert(_el$14, createComponent(Show, {
          get when() {
            return activeTab() === "options";
          },
          get children() {
            return [createComponent(SwitchButton, {
              get checked() {
                return draft.readerFullscreenEnabled;
              },
              get description() {
                return texts_default.settings.readerFullscreenHelp;
              },
              get label() {
                return texts_default.settings.readerFullscreenLabel;
              },
              onChange: (value) => updateDraft("readerFullscreenEnabled", value)
            }), createComponent(SwitchButton, {
              get checked() {
                return draft.openGalleryInNewTab;
              },
              get description() {
                return texts_default.settings.openGalleryInNewTabHelp;
              },
              get label() {
                return texts_default.settings.openGalleryInNewTabLabel;
              },
              onChange: (value) => updateDraft("openGalleryInNewTab", value)
            }), createComponent(SwitchButton, {
              get checked() {
                return draft.includeUnreadHistoryEnabled;
              },
              get description() {
                return texts_default.settings.includeUnreadHistoryHelp;
              },
              get label() {
                return texts_default.settings.includeUnreadHistoryLabel;
              },
              onChange: (value) => updateDraft("includeUnreadHistoryEnabled", value)
            })];
          }
        }), null), insert(_el$14, createComponent(Show, {
          get when() {
            return activeTab() === "about";
          },
          get children() {
            return [_tmpl$54(), (() => {
              var _el$18 = _tmpl$64(), _el$19 = _el$18.firstChild;
              return insert(_el$18, "260722.1717", null), _el$18;
            })()];
          }
        }), null), insert(_el$20, () => texts_default.settings.readHistoryLabel), _el$22.$$click = (event) => {
          event.stopPropagation(), props.onApply({
            ...draft
          });
        }, insert(_el$22, () => texts_default.button.apply), _el$23.$$click = (event) => {
          event.stopPropagation(), setChanged(!0), setDraft({
            ...props.defaultState
          });
        }, insert(_el$23, () => texts_default.button.default), _el$24.$$click = (event) => {
          event.stopPropagation(), close();
        }, insert(_el$24, () => texts_default.button.close), insert(_el$0, createComponent(Show, {
          get when() {
            return helpOpen();
          },
          get children() {
            return createComponent(InteractionHelp, {
              variant: "site",
              onClose: () => setHelpOpen(!1)
            });
          }
        }), null), createRenderEffect((_p$) => {
          var _v$ = categoryOpen(), _v$2 = props.historyHref;
          return _v$ !== _p$.e && setAttribute(_el$10, "aria-expanded", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$20, "href", _p$.t = _v$2), _p$;
        }, {
          e: void 0,
          t: void 0
        }), _el$0;
      }
    });
  }
  delegateEvents(["click"]);

  // src/components/Widgets/BackToTop.tsx
  var _tmpl$12 = /* @__PURE__ */ template('<button type=button class="ehpeek-back-to-top fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[calc(max(16px,env(safe-area-inset-bottom,0px))_+_64px)] z-ui inline-flex w-lg h-lg items-center justify-center rounded-full border-0 bg-[var(--color-site-elevated)] ehp-color-site-accent shadow-[0_4px_14px_var(--color-shadow-floating)] cursor-pointer [touch-action:none] active:scale-96">'), BACK_TO_TOP_POSITION_KEY = "ehpeek:back-to-top:position";
  function BackToTop() {
    let button2, drag = null, dragged = !1, [visible, setVisible] = createSignal(!1), [position, setPosition] = createSignal(null), positionStyle = () => {
      let current = position();
      return current ? {
        bottom: `${current.bottom}px`,
        right: `${current.right}px`
      } : void 0;
    };
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
        var _el$ = _tmpl$12();
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
          if (!drag || drag.pointerId !== event.pointerId)
            return;
          button2.releasePointerCapture(event.pointerId), drag = null;
          let current = position();
          dragged && current && GM_setValue(BACK_TO_TOP_POSITION_KEY, current);
        }, _el$.$$pointermove = (event) => {
          if (!drag || drag.pointerId !== event.pointerId)
            return;
          let dx = event.clientX - drag.x, dy = event.clientY - drag.y;
          dragged || (dragged = Math.hypot(dx, dy) > 4), setPosition(clampPosition({
            bottom: drag.bottom - dy,
            right: drag.right - dx
          }, button2));
        }, _el$.$$pointerdown = (event) => {
          let rect = button2.getBoundingClientRect();
          dragged = !1, drag = {
            bottom: window.innerHeight - rect.bottom,
            pointerId: event.pointerId,
            right: window.innerWidth - rect.right,
            x: event.clientX,
            y: event.clientY
          }, button2.setPointerCapture(event.pointerId);
        };
        var _ref$ = button2;
        return typeof _ref$ == "function" ? use(_ref$, _el$) : button2 = _el$, insert(_el$, createComponent(Icon, {
          name: "arrow-up"
        })), createRenderEffect((_$p) => style(_el$, positionStyle(), _$p)), _el$;
      }
    });
  }
  function clampPosition(position, button2) {
    return {
      bottom: Math.min(Math.max(0, position.bottom), Math.max(0, window.innerHeight - button2.offsetHeight)),
      right: Math.min(Math.max(0, position.right), Math.max(0, window.innerWidth - button2.offsetWidth))
    };
  }
  delegateEvents(["pointerdown", "pointermove", "pointerup", "click"]);

  // src/components/Widgets/ExternalDom.tsx
  function DomNode2(props) {
    let Component = createMemo(() => props.node?.Component);
    return createComponent(Show, {
      get when() {
        return Component();
      },
      children: (Current) => createComponent(Dynamic, {
        get component() {
          return Current();
        }
      })
    });
  }
  function DomNodes(props) {
    return createComponent(For, {
      get each() {
        return props.nodes;
      },
      children: (node) => {
        let Component = node.Component;
        return createComponent(Component, {});
      }
    });
  }

  // src/components/TouchUI/GalleryInfoPanel.tsx
  var _tmpl$13 = /* @__PURE__ */ template("<div>"), _tmpl$27 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-rating-dialog fixed inset-0 z-overlay flex items-center justify-center p-md bg-black/65"role=dialog aria-modal=true aria-label="Rate gallery"><div class="box-border flex w-[min(92vw,420px)] flex-col gap-lg rounded-lg border ehp-color-site-border p-lg ehp-color-site-elevated ehp-color-site-text shadow-xl"><div class="textsize-md font-700">Rate gallery</div><button type=button class="relative inline-flex self-center max-w-full overflow-hidden p-0 border-0 bg-transparent cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"><span class="flex gap-1px pointer-events-none text-[var(--color-muted)] opacity-40"aria-hidden=true></span><span aria-hidden=true></span></button><div class="grid grid-cols-2 gap-sm pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]"><button type=button class="flex w-full min-h-md coarse:min-h-64px items-center justify-center py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 disabled:opacity-50 disabled:cursor-default border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108">Submit</button><button type=button class="flex w-full min-h-md coarse:min-h-64px items-center justify-center py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 disabled:opacity-50 disabled:cursor-default border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]">'), _tmpl$36 = /* @__PURE__ */ template('<section class="ehpeek-touch-gallery flex box-border w-full flex-col mb-md ehp-color-site-text font-sans"><div class="ehpeek-touch-gallery-hero relative grid min-h-[clamp(260px,42vh,340px)] pt-lg pr-[max(16px,env(safe-area-inset-right,0px))] pb-48px pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-surface ehp-color-site-text"><div><div class="ehpeek-touch-gallery-hero-side flex self-stretch min-w-0 flex-col items-start gap-8px pt-2px"><div class="ehpeek-touch-gallery-heading flex min-w-0 w-full flex-none flex-col gap-sm items-start pb-xs"><div class="ehpeek-touch-gallery-title-main line-clamp-4 flex-none overflow-hidden textsize-lg font-400 leading-[1.16] text-left break-anywhere"></div><div class="ehpeek-touch-gallery-title-sub line-clamp-3 flex-none overflow-hidden opacity-82 textsize-md leading-[1.2] text-left break-anywhere"></div></div><div class="ehpeek-touch-gallery-category box-border flex-none self-start whitespace-nowrap rounded-xs border border-solid py-6px px-10px text-center textsize-md font-700 leading-[1.1] uppercase"></div></div></div></div><div class="ehpeek-touch-gallery-primary relative z-1 grid grid-cols-[1fr_1fr] min-h-87px mt--18px mr-[max(14px,env(safe-area-inset-right,0px))] ml-[max(14px,env(safe-area-inset-left,0px))] overflow-visible rounded-xs bg-[var(--color-site-elevated)] shadow-[0_2px_10px_var(--color-shadow-panel)]"><div class="ehpeek-touch-gallery-primary-actions flex min-w-0 border-0 border-l-8 border-solid border-l-[var(--color-site-page)]"></div></div><div class="ehpeek-touch-gallery-content flex flex-col gap-lg pt-xl pr-[max(16px,env(safe-area-inset-right,0px))] pb-lg pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-page ehp-color-site-text"><div class="ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-md gap-x-lg items-center textsize-md leading-[1.2] text-center">'), _tmpl$46 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-cover flex self-center justify-self-stretch w-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden rounded-3px">'), _tmpl$55 = /* @__PURE__ */ template('<button type=button class="ehpeek-touch-gallery-rating flex w-[65%] max-w-full flex-none self-end flex-col items-end gap-4px mt-auto p-0 border-0 bg-transparent ehp-color-site-text font-inherit text-right cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"aria-label="Rate gallery"><div class="ehpeek-touch-gallery-rating-stars relative inline-flex"><span class="ehpeek-touch-gallery-rating-stars-empty flex gap-1px text-[var(--color-muted)] opacity-40"aria-hidden=true></span><span aria-hidden=true></span></div><div class="ehpeek-touch-gallery-rating-meta flex items-center justify-end gap-6px text-[var(--color-muted)] textsize-md leading-[1.15] whitespace-nowrap"><span class=ehpeek-touch-gallery-rating-label aria-live=polite>'), _tmpl$65 = /* @__PURE__ */ template('<span class="ehpeek-touch-gallery-rating-count flex-none pl-6px border-0 border-l border-[var(--color-site-border-subtle)] opacity-75">'), _tmpl$73 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal">'), _tmpl$83 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-tag-groups flex flex-col pt-2px"><button type=button><span>Tagging</span><span aria-hidden=true></span></button><div class="grid min-w-0 w-full grid-cols-[max-content_minmax(0,1fr)] items-start gap-x-sm gap-y-md">'), _tmpl$92 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-actions-menu-panel absolute top-48px right-0 z-overlay flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">'), _tmpl$0 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-actions-menu relative flex min-w-0 items-center justify-center"><button type=button class="ehpeek-touch-gallery-actions-menu-button inline-flex w-md h-md items-center justify-center border-0 bg-transparent ehp-color-site-text"aria-haspopup=menu>'), _tmpl$1 = /* @__PURE__ */ template('<section class="ehpeek-touch-gallery-tag-group contents"><div class="ehpeek-touch-gallery-tag-group-name min-h-sm whitespace-nowrap rounded-xl bg-[var(--color-site-elevated)] py-sm px-md text-center lowercase ehp-color-site-accent textsize-md font-600"></div><div class="ehpeek-touch-gallery-tags flex flex-wrap gap-sm">'), _tmpl$102 = /* @__PURE__ */ template('<a class="ehpeek-touch-gallery-tag inline-flex flex-none max-w-full min-h-lg items-center overflow-hidden text-ellipsis whitespace-nowrap appearance-none m-0 py-0 rounded-xl border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] px-lg ehp-color-site-text font-inherit font-700 textsize-md cursor-pointer select-text no-underline transition-[border-color,background-color,color] duration-120 hover:border-[var(--color-site-border)] hover:bg-[var(--color-site-accent-hover)] hover:ehp-color-site-accent">'), _tmpl$112 = /* @__PURE__ */ template('<div role=dialog aria-modal=true><div class="ehpeek-touch-gallery-tag-menu-panel box-border flex w-full max-w-420px max-h-[calc(100dvh-32px)] flex-col overflow-x-hidden overflow-y-auto overscroll-contain whitespace-nowrap border ehp-color-site-border rounded-md ehp-color-site-elevated shadow-xl"role=menu>'), _tmpl$122 = /* @__PURE__ */ template('<div class="absolute top-full left-0 right-0 z-2 mt-xs max-h-240px overflow-y-auto overscroll-contain rounded-md border ehp-color-site-border ehp-color-site-elevated shadow-xl"role=listbox>'), _tmpl$132 = /* @__PURE__ */ template('<div class="flex flex-col gap-sm ehp-color-site-text textsize-md font-600"><span></span><div class=relative><button type=button class="flex box-border w-full min-h-md coarse:min-h-64px items-center justify-between gap-md rounded-md border ehp-color-site-border !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text px-md font-inherit text-left textsize-md cursor-pointer"aria-haspopup=listbox><span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"></span><span class=flex-none aria-hidden=true>'), _tmpl$14 = /* @__PURE__ */ template('<div class="flex flex-col gap-sm ehp-color-site-text textsize-md font-600"><span></span><div class="overflow-hidden rounded-md border ehp-color-site-border"role=radiogroup>'), _tmpl$15 = /* @__PURE__ */ template('<div class="grid grid-cols-2 gap-md"><button type=button class="flex w-full min-h-md coarse:min-h-64px items-center justify-center py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 disabled:opacity-50 disabled:cursor-default border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]"></button><button type=button class="flex w-full min-h-md coarse:min-h-64px items-center justify-center py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 disabled:opacity-50 disabled:cursor-default gap-md border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108"><span>'), _tmpl$16 = /* @__PURE__ */ template('<div class="fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65"role=dialog aria-modal=true><div class="box-border flex w-full max-w-420px max-h-[calc(100dvh-32px)] flex-col gap-lg overflow-y-auto overscroll-contain rounded-md border ehp-color-site-border ehp-color-site-elevated p-lg shadow-xl"><div class="ehp-color-site-text textsize-lg font-700">'), _tmpl$17 = /* @__PURE__ */ template("<button type=button role=menuitem><span>"), _tmpl$18 = /* @__PURE__ */ template("<button type=button role=option><span>"), _tmpl$19 = /* @__PURE__ */ template("<button type=button role=radio><span>"), _tmpl$20 = /* @__PURE__ */ template('<span class="contents [&amp;_*]:!bg-transparent [&amp;_*]:!text-inherit"translate=no>'), _tmpl$21 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-favorite-panel absolute top-[calc(100%+8px)] left-0 z-overlay flex w-[min(86vw,360px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">'), _tmpl$222 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-favorite-menu relative z-2 min-w-0"><button type=button aria-haspopup=menu><span class="block leading-[1.15]"></span><span class="ehpeek-touch-gallery-favorite-icon block mt-2px opacity-78 normal-case"aria-hidden=true>'), _tmpl$232 = /* @__PURE__ */ template('<div class="ehpeek-touch-gallery-favorite-loading flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md leading-[1.2] text-left">'), _tmpl$242 = /* @__PURE__ */ template('<button type=button><span class="ehpeek-touch-gallery-favorite-option-icon flex-none ehp-color-site-text"aria-hidden=true></span><span></span><span aria-hidden=true>'), RATING_STAR_INDEXES = [0, 1, 2, 3, 4];
  function GalleryInfoPanel(props) {
    let source = untrack(() => props.source), rating = source.data.rating, hasCover = source.elems.cover !== null, [ratingValue, setRatingValue] = createSignal(rating?.value ?? 0), [ratingPreview, setRatingPreview] = createSignal(null), [ratingPickerOpen, setRatingPickerOpen] = createSignal(!1), [ratingSubmitted, setRatingSubmitted] = createSignal(rating?.rated ?? !1), [ratingCount] = createSignal(rating?.count ?? ""), [ratingValueLabel] = createSignal(rating?.label ?? ""), initialTagGroups = source.data.tagGroups.map((group) => ({
      ...group,
      tags: group.tags.flatMap(({
        contentSourceIndex,
        ...tag2
      }) => {
        let contentSource = source.elems.tagContents[contentSourceIndex];
        return contentSource ? [{
          ...tag2,
          contentSource
        }] : [];
      })
    })), [tagGroups, setTagGroups] = createSignal(initialTagGroups), [selectedTag, setSelectedTag] = createSignal(null), [tagging, setTagging] = createSignal(!1), hasNewTag = () => source.elems.newTag !== null, displayedRating = createMemo(() => ratingPreview() ?? ratingValue()), ratingLabel = createMemo(() => {
      let preview = ratingPreview();
      return preview !== null ? `Rate as ${preview.toFixed(1)} stars` : ratingValueLabel();
    });
    onMount(() => {
      let stopObservingTags = source.handle.observeGalleryTagGroups(setTagGroups);
      onCleanup(stopObservingTags);
    });
    let submitRating = (value) => {
      if (!rating)
        return !1;
      try {
        return source.handle.submitGalleryRating(value), setRatingValue(value), setRatingPreview(null), setRatingSubmitted(!0), !0;
      } catch (error) {
        return setRatingPreview(null), console.error("[ehpeek]", error), window.alert(error instanceof Error ? error.message : texts_default.errors.loadFailed), !1;
      }
    }, openTagMenu = (tag2) => {
      try {
        source.handle.openGalleryTagMenu(tag2), setSelectedTag(tag2);
      } catch (error) {
        console.error("[ehpeek] Gallery tag actions failed", error), window.alert(error instanceof Error ? error.message : texts_default.errors.loadFailed);
      }
    }, closeTagMenu = () => {
      selectedTag() && (source.handle.closeGalleryTagMenu(), setSelectedTag(null));
    }, updateTag = (updatedTag) => {
      setTagGroups((groups) => groups.map((group) => ({
        ...group,
        tags: group.tags.map((tag2) => tag2.url === updatedTag.url ? updatedTag : tag2)
      }))), setSelectedTag((tag2) => tag2?.url === updatedTag.url ? updatedTag : tag2);
    };
    return (() => {
      var _el$ = _tmpl$36(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$5.nextSibling, _el$9 = _el$2.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$9.nextSibling, _el$10 = _el$1.firstChild;
      return className(_el$3, `ehpeek-touch-gallery-summary grid gap-18px items-stretch ${hasCover ? "grid-cols-[minmax(120px,38%)_minmax(0,1fr)]" : "grid-cols-1"}`), insert(_el$3, hasCover && (() => {
        var _el$21 = _tmpl$46();
        return insert(_el$21, createComponent(DomNode2, {
          get node() {
            return source.elems.cover;
          }
        })), _el$21;
      })(), _el$4), insert(_el$6, () => source.data.titleMain), insert(_el$7, () => source.data.titleSub), insert(_el$8, () => source.data.category), insert(_el$4, rating && (() => {
        var _el$22 = _tmpl$55(), _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, _el$26 = _el$23.nextSibling, _el$27 = _el$26.firstChild;
        return _el$22.addEventListener("blur", () => {
          setRatingPreview(null);
        }), _el$22.addEventListener("pointerleave", () => {
          setRatingPreview(null);
        }), _el$22.$$click = () => {
          setRatingPreview(null), setRatingPickerOpen(!0);
        }, _el$23.$$pointermove = (event) => {
          event.pointerType === "mouse" && setRatingPreview(ratingFromPointer(event.clientX, event.currentTarget));
        }, insert(_el$24, createComponent(For, {
          each: RATING_STAR_INDEXES,
          children: () => createComponent(Icon, {
            name: "star"
          })
        })), insert(_el$25, createComponent(For, {
          each: RATING_STAR_INDEXES,
          children: () => createComponent(Icon, {
            name: "star",
            filled: !0
          })
        })), insert(_el$27, ratingLabel), insert(_el$26, (() => {
          var _c$2 = memo(() => !!ratingCount());
          return () => _c$2() && (() => {
            var _el$28 = _tmpl$65();
            return insert(_el$28, ratingCount), _el$28;
          })();
        })(), null), createRenderEffect((_p$) => {
          var _v$4 = `ehpeek-touch-gallery-rating-stars-fill absolute top-0 left-0 flex gap-1px overflow-hidden ${ratingSubmitted() ? "text-[var(--color-rating-submitted)]" : "ehp-color-site-accent"}`, _v$5 = `${displayedRating() / 5 * 100}%`;
          return _v$4 !== _p$.e && className(_el$25, _p$.e = _v$4), _v$5 !== _p$.t && setStyleProperty(_el$25, "width", _p$.t = _v$5), _p$;
        }, {
          e: void 0,
          t: void 0
        }), _el$22;
      })(), null), _el$9.addEventListener("dragstart", (event) => event.preventDefault()), insert(_el$9, createComponent(TouchGalleryFavoriteButton, {
        source
      }), _el$0), insert(_el$0, () => props.primaryAction), insert(_el$10, createComponent(For, {
        get each() {
          return source.data.summary;
        },
        children: (item) => (() => {
          var _el$29 = _tmpl$73();
          return insert(_el$29, () => item.value), _el$29;
        })()
      }), null), insert(_el$10, createComponent(TouchGalleryActionsMenu, {
        get items() {
          return source.elems.actionItems;
        }
      }), null), insert(_el$1, (() => {
        var _c$ = memo(() => tagGroups().length > 0);
        return () => _c$() && (() => {
          var _el$30 = _tmpl$83(), _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$31.nextSibling;
          return _el$30.addEventListener("dragstart", (event) => event.preventDefault()), _el$31.$$click = () => {
            setTagging((enabled) => !enabled);
          }, insert(_el$34, createComponent(For, {
            get each() {
              return tagGroups();
            },
            children: (group) => createComponent(TouchGalleryTagGroup, {
              group,
              get tagging() {
                return tagging();
              },
              onTagOpen: openTagMenu
            })
          })), createRenderEffect((_p$) => {
            var _v$6 = `inline-flex self-end min-h-sm items-center justify-center gap-md mb-sm rounded-xl border-0 px-lg font-inherit font-700 textsize-sm cursor-pointer transition-[background-color,color] duration-120 ${tagging() ? "bg-[var(--color-site-accent-hover)] ehp-color-site-accent" : "bg-[var(--color-site-surface)] ehp-color-site-text"}`, _v$7 = tagging(), _v$8 = `block flex-none w-10px h-10px coarse:w-18px coarse:h-18px rounded-full ${tagging() ? "bg-[var(--color-state-on)]" : "bg-[var(--color-state-off)]"}`;
            return _v$6 !== _p$.e && className(_el$31, _p$.e = _v$6), _v$7 !== _p$.t && setAttribute(_el$31, "aria-pressed", _p$.t = _v$7), _v$8 !== _p$.a && className(_el$33, _p$.a = _v$8), _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          }), _el$30;
        })();
      })(), null), insert(_el$1, createComponent(Show, {
        get when() {
          return hasNewTag();
        },
        get children() {
          var _el$11 = _tmpl$13();
          return insert(_el$11, createComponent(TouchGalleryNewTag, {
            source
          })), createRenderEffect(() => className(_el$11, tagging() ? "block" : "hidden")), _el$11;
        }
      }), null), insert(_el$, createComponent(TouchGalleryTagMenu, {
        source,
        get tag() {
          return selectedTag();
        },
        onClose: closeTagMenu,
        onTagUpdated: updateTag
      }), null), insert(_el$, createComponent(Show, {
        get when() {
          return ratingPickerOpen();
        },
        get children() {
          var _el$12 = _tmpl$27(), _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling;
          return _el$12.$$click = (event) => {
            event.target === event.currentTarget && (setRatingPreview(null), setRatingPickerOpen(!1));
          }, _el$15.$$click = (event) => {
            setRatingPreview(ratingFromPointer(event.clientX, event.currentTarget));
          }, insert(_el$16, createComponent(For, {
            each: RATING_STAR_INDEXES,
            children: () => createComponent(Icon, {
              name: "star",
              size: 48
            })
          })), insert(_el$17, createComponent(For, {
            each: RATING_STAR_INDEXES,
            children: () => createComponent(Icon, {
              name: "star",
              size: 48,
              filled: !0
            })
          })), _el$19.$$click = () => {
            submitRating(displayedRating()) && setRatingPickerOpen(!1);
          }, _el$20.$$click = () => {
            setRatingPreview(null), setRatingPickerOpen(!1);
          }, insert(_el$20, () => texts_default.button.close), createRenderEffect((_p$) => {
            var _v$ = `Rate gallery: ${displayedRating().toFixed(1)} stars`, _v$2 = `absolute top-0 left-0 flex gap-1px overflow-hidden pointer-events-none ${ratingSubmitted() ? "text-[var(--color-rating-submitted)]" : "ehp-color-site-accent"}`, _v$3 = `${displayedRating() / 5 * 100}%`;
            return _v$ !== _p$.e && setAttribute(_el$15, "aria-label", _p$.e = _v$), _v$2 !== _p$.t && className(_el$17, _p$.t = _v$2), _v$3 !== _p$.a && setStyleProperty(_el$17, "width", _p$.a = _v$3), _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          }), _el$12;
        }
      }), null), createRenderEffect((_$p) => style(_el$8, source.data.categoryAppearance, _$p)), _el$;
    })();
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
      var _el$35 = _tmpl$0(), _el$36 = _el$35.firstChild, _ref$ = root;
      return typeof _ref$ == "function" ? use(_ref$, _el$35) : root = _el$35, _el$36.$$click = (event) => {
        event.stopPropagation(), setOpen((value) => !value);
      }, insert(_el$36, createComponent(Icon, {
        name: "menu"
      })), insert(_el$35, createComponent(Show, {
        get when() {
          return open();
        },
        get children() {
          var _el$37 = _tmpl$92();
          return insert(_el$37, createComponent(DomNodes, {
            get nodes() {
              return props.items;
            }
          })), _el$37;
        }
      }), null), createRenderEffect(() => setAttribute(_el$36, "aria-expanded", open())), _el$35;
    })();
  }
  function TouchGalleryTagGroup(props) {
    return (() => {
      var _el$38 = _tmpl$1(), _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling;
      return insert(_el$39, () => props.group.namespace), _el$40.$$click = (event) => {
        if (!props.tagging || event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
          return;
        let href = (event.target instanceof Element ? event.target.closest("a.ehpeek-touch-gallery-tag") : null)?.getAttribute("href"), tag2 = props.group.tags.find((candidate) => candidate.url === href);
        tag2 && (event.preventDefault(), props.onTagOpen(tag2));
      }, insert(_el$40, createComponent(For, {
        get each() {
          return props.group.tags;
        },
        children: (tag2) => createComponent(TouchGalleryTag, {
          tag: tag2
        })
      })), _el$38;
    })();
  }
  function TouchGalleryTag(props) {
    return (() => {
      var _el$41 = _tmpl$102();
      return setAttribute(_el$41, "draggable", !1), insert(_el$41, createComponent(TouchGalleryTagContent, {
        get tag() {
          return props.tag;
        }
      })), createRenderEffect((_p$) => {
        var _v$9 = props.tag.url, _v$0 = props.tag.appearance.backgroundColor, _v$1 = props.tag.appearance.borderColor, _v$10 = props.tag.appearance.color, _v$11 = props.tag.label;
        return _v$9 !== _p$.e && setAttribute(_el$41, "href", _p$.e = _v$9), _v$0 !== _p$.t && setStyleProperty(_el$41, "background-color", _p$.t = _v$0), _v$1 !== _p$.a && setStyleProperty(_el$41, "border-color", _p$.a = _v$1), _v$10 !== _p$.o && setStyleProperty(_el$41, "color", _p$.o = _v$10), _v$11 !== _p$.i && setAttribute(_el$41, "aria-label", _p$.i = _v$11), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      }), _el$41;
    })();
  }
  function TouchGalleryTagMenu(props) {
    let onClose = untrack(() => props.onClose), onTagUpdated = untrack(() => props.onTagUpdated), [favoriteDialogOpen, setFavoriteDialogOpen] = createSignal(!1), tagSets = state.gallery.myTagSets.reload(), [selectedTagSet, setSelectedTagSet] = createSignal(tagSets.find((option2) => option2.selected)?.value ?? tagSets[0]?.value ?? "1"), [collectionOpen, setCollectionOpen] = createSignal(!1), [tagMode, setTagMode] = createSignal("marked"), [updating, setUpdating] = createSignal(!1), [favoriteTag, setFavoriteTag] = createSignal(null);
    onMount(() => {
      let onKeyDown = (event) => {
        event.key === "Escape" && props.tag && props.onClose();
      };
      document.addEventListener("keydown", onKeyDown), onCleanup(() => {
        document.removeEventListener("keydown", onKeyDown);
      });
    });
    let updateFavoriteTag = async (tag2) => {
      if (!updating()) {
        setUpdating(!0);
        try {
          let myTagsPage = tag2.myTag ? await props.source.handle.removeFavoriteTag(tag2) : await props.source.handle.submitFavoriteTag(tag2, selectedTagSet(), tagMode()), updateAppearance = (appearance) => onTagUpdated({
            ...tag2,
            appearance: appearance ? {
              ...tag2.appearance,
              backgroundColor: appearance.backgroundColor,
              color: appearance.color
            } : {
              backgroundColor: "",
              borderColor: "",
              color: ""
            },
            myTag: appearance ? {
              id: appearance.id,
              tagSet: appearance.tagSet
            } : null
          });
          updateAppearance(myTagsPage.appearances.find((item) => item.name === tag2.name)), setFavoriteDialogOpen(!1), onClose(), refreshMyTags(myTagsPage).then((appearances) => {
            appearances && updateAppearance(appearances.find((item) => item.name === tag2.name));
          });
        } catch (error) {
          console.error("[ehpeek]", error), window.alert(error instanceof Error ? error.message : texts_default.errors.loadFailed);
        } finally {
          setUpdating(!1);
        }
      }
    };
    return [(() => {
      var _el$42 = _tmpl$112(), _el$43 = _el$42.firstChild;
      return _el$42.$$click = (event) => {
        event.target === event.currentTarget && props.onClose();
      }, _el$43.$$click = () => {
        updating() || props.onClose();
      }, insert(_el$43, createComponent(Show, {
        get when() {
          return !updating();
        },
        get fallback() {
          return createComponent(WelcomeIcon, {
            embedded: !0,
            get label() {
              return texts_default.reader.loading;
            },
            showIcon: !1
          });
        },
        get children() {
          return [createComponent(DomNode2, {
            get node() {
              return props.source.elems.tagMenuAction;
            }
          }), createComponent(Show, {
            get when() {
              return props.tag;
            },
            children: (tag2) => createComponent(Show, {
              get when() {
                return !tag2().myTag;
              },
              get fallback() {
                return (() => {
                  var _el$63 = _tmpl$17(), _el$64 = _el$63.firstChild;
                  return _el$63.$$click = (event) => {
                    event.stopPropagation(), updateFavoriteTag(tag2());
                  }, insert(_el$63, createComponent(Icon, {
                    name: "heart",
                    filled: !0
                  }), _el$64), insert(_el$64, () => texts_default.gallery.removeFavoriteTag), createRenderEffect(() => className(_el$63, sharedApply.galleryTagMenuItem)), _el$63;
                })();
              },
              get children() {
                var _el$61 = _tmpl$17(), _el$62 = _el$61.firstChild;
                return _el$61.$$click = () => {
                  setFavoriteTag(tag2()), setCollectionOpen(!1), setFavoriteDialogOpen(!0);
                }, insert(_el$61, createComponent(Icon, {
                  name: "heart"
                }), _el$62), insert(_el$62, () => texts_default.gallery.favoriteTag), createRenderEffect(() => className(_el$61, sharedApply.galleryTagMenuItem)), _el$61;
              }
            })
          })];
        }
      })), createRenderEffect((_p$) => {
        var _v$12 = `ehpeek-touch-gallery-tag-menu-dialog fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65 transition-opacity duration-120 ${props.tag ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"}`, _v$13 = !props.tag, _v$14 = props.tag?.label ?? "";
        return _v$12 !== _p$.e && className(_el$42, _p$.e = _v$12), _v$13 !== _p$.t && setAttribute(_el$42, "aria-hidden", _p$.t = _v$13), _v$14 !== _p$.a && setAttribute(_el$42, "aria-label", _p$.a = _v$14), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$42;
    })(), createComponent(Show, {
      get when() {
        return favoriteDialogOpen();
      },
      get children() {
        var _el$44 = _tmpl$16(), _el$45 = _el$44.firstChild, _el$46 = _el$45.firstChild;
        return _el$44.$$click = (event) => {
          event.target === event.currentTarget && (setCollectionOpen(!1), setFavoriteDialogOpen(!1));
        }, insert(_el$46, () => texts_default.gallery.favoriteTag), insert(_el$45, createComponent(Show, {
          get when() {
            return !updating();
          },
          get fallback() {
            return createComponent(WelcomeIcon, {
              embedded: !0,
              get label() {
                return texts_default.reader.loading;
              },
              showIcon: !1
            });
          },
          get children() {
            return [(() => {
              var _el$47 = _tmpl$132(), _el$48 = _el$47.firstChild, _el$49 = _el$48.nextSibling, _el$50 = _el$49.firstChild, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling;
              return insert(_el$48, () => texts_default.gallery.tagCollection), _el$50.$$click = () => setCollectionOpen((open) => !open), insert(_el$51, () => tagSets.find((option2) => option2.value === selectedTagSet())?.label ?? selectedTagSet()), insert(_el$52, () => collectionOpen() ? "▴" : "▾"), insert(_el$49, createComponent(Show, {
                get when() {
                  return collectionOpen();
                },
                get children() {
                  var _el$53 = _tmpl$122();
                  return insert(_el$53, createComponent(For, {
                    each: tagSets,
                    children: (option2) => (() => {
                      var _el$65 = _tmpl$18(), _el$66 = _el$65.firstChild;
                      return _el$65.$$click = () => {
                        setSelectedTagSet(option2.value), setCollectionOpen(!1);
                      }, insert(_el$66, () => option2.label), insert(_el$65, createComponent(Show, {
                        get when() {
                          return selectedTagSet() === option2.value;
                        },
                        get children() {
                          return createComponent(Icon, {
                            name: "check"
                          });
                        }
                      }), null), createRenderEffect((_p$) => {
                        var _v$15 = `flex box-border w-full min-h-md coarse:min-h-64px items-center justify-between gap-md px-md border-0 border-b last:border-b-0 ehp-color-site-border-subtle-b ehp-color-site-text font-inherit text-left textsize-md cursor-pointer ${selectedTagSet() === option2.value ? "bg-[var(--color-site-item-hover)] font-700" : "!bg-transparent hover:!bg-[var(--color-site-item-hover)]"}`, _v$16 = selectedTagSet() === option2.value;
                        return _v$15 !== _p$.e && className(_el$65, _p$.e = _v$15), _v$16 !== _p$.t && setAttribute(_el$65, "aria-selected", _p$.t = _v$16), _p$;
                      }, {
                        e: void 0,
                        t: void 0
                      }), _el$65;
                    })()
                  })), createRenderEffect(() => setAttribute(_el$53, "aria-label", texts_default.gallery.tagCollection)), _el$53;
                }
              }), null), createRenderEffect(() => setAttribute(_el$50, "aria-expanded", collectionOpen())), _el$47;
            })(), (() => {
              var _el$54 = _tmpl$14(), _el$55 = _el$54.firstChild, _el$56 = _el$55.nextSibling;
              return insert(_el$55, () => texts_default.gallery.tagBehavior), insert(_el$56, createComponent(For, {
                get each() {
                  return [["marked", texts_default.gallery.markTag], ["watched", texts_default.gallery.watchTag], ["hidden", texts_default.gallery.hideTag]];
                },
                children: ([value, label]) => (() => {
                  var _el$67 = _tmpl$19(), _el$68 = _el$67.firstChild;
                  return _el$67.$$click = () => setTagMode(value), insert(_el$68, label), insert(_el$67, createComponent(Show, {
                    get when() {
                      return tagMode() === value;
                    },
                    get children() {
                      return createComponent(Icon, {
                        name: "check"
                      });
                    }
                  }), null), createRenderEffect((_p$) => {
                    var _v$17 = `flex box-border w-full min-h-md coarse:min-h-64px items-center justify-between gap-md px-md border-0 border-b last:border-b-0 ehp-color-site-border-subtle-b ehp-color-site-text font-inherit text-left textsize-md cursor-pointer ${tagMode() === value ? "bg-[var(--color-site-item-hover)] font-700" : "!bg-transparent hover:!bg-[var(--color-site-item-hover)]"}`, _v$18 = tagMode() === value;
                    return _v$17 !== _p$.e && className(_el$67, _p$.e = _v$17), _v$18 !== _p$.t && setAttribute(_el$67, "aria-checked", _p$.t = _v$18), _p$;
                  }, {
                    e: void 0,
                    t: void 0
                  }), _el$67;
                })()
              })), createRenderEffect(() => setAttribute(_el$56, "aria-label", texts_default.gallery.tagBehavior)), _el$54;
            })(), (() => {
              var _el$57 = _tmpl$15(), _el$58 = _el$57.firstChild, _el$59 = _el$58.nextSibling, _el$60 = _el$59.firstChild;
              return _el$58.$$click = () => {
                setCollectionOpen(!1), setFavoriteDialogOpen(!1);
              }, insert(_el$58, () => texts_default.button.close), _el$59.$$click = () => {
                let tag2 = favoriteTag();
                tag2 && updateFavoriteTag(tag2);
              }, insert(_el$59, createComponent(Icon, {
                name: "heart"
              }), _el$60), insert(_el$60, () => texts_default.button.confirm), _el$57;
            })()];
          }
        }), null), createRenderEffect(() => setAttribute(_el$44, "aria-label", texts_default.gallery.favoriteTag)), _el$44;
      }
    })];
  }
  function TouchGalleryNewTag(props) {
    return createComponent(DomNode2, {
      get node() {
        return props.source.elems.newTag;
      }
    });
  }
  function TouchGalleryTagContent(props) {
    let host;
    return onMount(() => {
      onCleanup(props.tag.contentSource.mirrorContentTo(host));
    }), (() => {
      var _el$69 = _tmpl$20(), _ref$2 = host;
      return typeof _ref$2 == "function" ? use(_ref$2, _el$69) : host = _el$69, _el$69;
    })();
  }
  function TouchGalleryFavoriteButton(props) {
    let [favorite, setFavorite] = createSignal(untrack(() => ({
      ...props.source.data.favorite
    }))), [open, setOpen] = createSignal(!1), [loadingState, setLoadingState] = createSignal("idle"), [options, setOptions] = createSignal([]), favorited = () => favorite().favorited, root;
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
          setOptions(await props.source.handle.loadGalleryFavoriteOptions(currentFavorite.actionUrl, currentFavorite.favorited)), setLoadingState("idle");
        } catch (error) {
          console.error("[ehpeek]", error), setLoadingState("failed");
        }
      }
    }, updateFavorite = async (option2) => {
      let actionUrl = favorite().actionUrl;
      if (!(!actionUrl || loadingState() === "loading")) {
        setLoadingState("loading");
        try {
          await props.source.handle.updateGalleryFavorite(actionUrl, option2.value), setFavorite({
            ...favorite(),
            color: option2.color,
            favorited: option2.value !== "favdel",
            label: option2.value === "favdel" ? "Not Favorited" : option2.label
          }), setLoadingState("idle"), setOpen(!1);
        } catch (error) {
          console.error("[ehpeek]", error), setLoadingState("failed");
        }
      }
    };
    return (() => {
      var _el$70 = _tmpl$222(), _el$71 = _el$70.firstChild, _el$72 = _el$71.firstChild, _el$73 = _el$72.nextSibling, _ref$3 = root;
      return typeof _ref$3 == "function" ? use(_ref$3, _el$70) : root = _el$70, _el$71.$$click = (event) => {
        event.stopPropagation(), open() ? setOpen(!1) : openMenu();
      }, insert(_el$72, () => favorite().label), insert(_el$73, createComponent(Icon, {
        name: "heart",
        get filled() {
          return favorited();
        }
      })), insert(_el$70, createComponent(Show, {
        get when() {
          return open();
        },
        get children() {
          var _el$74 = _tmpl$21();
          return insert(_el$74, createComponent(Show, {
            get when() {
              return loadingState() === "loading";
            },
            get children() {
              return createComponent(WelcomeIcon, {
                embedded: !0,
                get label() {
                  return texts_default.reader.loading;
                },
                showIcon: !1
              });
            }
          }), null), insert(_el$74, createComponent(Show, {
            get when() {
              return loadingState() === "failed";
            },
            get children() {
              return createComponent(TouchGalleryFavoriteStatus, {
                text: "Failed"
              });
            }
          }), null), insert(_el$74, createComponent(Show, {
            get when() {
              return loadingState() === "idle";
            },
            get children() {
              return createComponent(For, {
                get each() {
                  return options();
                },
                children: (option2) => createComponent(TouchGalleryFavoriteOption, {
                  option: option2,
                  onSelect: () => {
                    updateFavorite(option2);
                  }
                })
              });
            }
          }), null), _el$74;
        }
      }), null), createRenderEffect((_p$) => {
        var _v$19 = `ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-text text-center uppercase [touch-action:manipulation] textsize-md font-700 normal-case ${favorited() ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`, _v$20 = favorite().color ?? void 0, _v$21 = open();
        return _v$19 !== _p$.e && className(_el$71, _p$.e = _v$19), _v$20 !== _p$.t && setStyleProperty(_el$71, "color", _p$.t = _v$20), _v$21 !== _p$.a && setAttribute(_el$71, "aria-expanded", _p$.a = _v$21), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$70;
    })();
  }
  function TouchGalleryFavoriteStatus(props) {
    return (() => {
      var _el$75 = _tmpl$232();
      return insert(_el$75, () => props.text), _el$75;
    })();
  }
  function TouchGalleryFavoriteOption(props) {
    return (() => {
      var _el$76 = _tmpl$242(), _el$77 = _el$76.firstChild, _el$78 = _el$77.nextSibling, _el$79 = _el$78.nextSibling;
      return _el$76.$$click = (event) => {
        event.stopPropagation(), props.onSelect();
      }, insert(_el$77, createComponent(Icon, {
        name: "heart",
        get filled() {
          return props.option.value !== "favdel";
        }
      })), insert(_el$78, () => props.option.label), insert(_el$79, createComponent(Icon, {
        name: "check"
      })), createRenderEffect((_p$) => {
        var _v$22 = `ehpeek-touch-gallery-favorite-option flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md leading-[1.2] text-left ${props.option.value === "favdel" ? "ehpeek-touch-gallery-favorite-option-remove" : ""}`, _v$23 = props.option.selected, _v$24 = props.option.color ?? void 0, _v$25 = `ml-auto flex-none ehp-color-site-text ${props.option.selected ? "visible" : "invisible"}`, _v$26 = props.option.color ?? void 0;
        return _v$22 !== _p$.e && className(_el$76, _p$.e = _v$22), _v$23 !== _p$.t && setAttribute(_el$76, "aria-pressed", _p$.t = _v$23), _v$24 !== _p$.a && setStyleProperty(_el$77, "color", _p$.a = _v$24), _v$25 !== _p$.o && className(_el$79, _p$.o = _v$25), _v$26 !== _p$.i && setStyleProperty(_el$79, "color", _p$.i = _v$26), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      }), _el$76;
    })();
  }
  function ratingFromPointer(clientX, element) {
    let rect = element.getBoundingClientRect(), progress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.max(0.5, Math.ceil(progress * 10) / 2);
  }
  delegateEvents(["click", "pointermove"]);

  // src/components/TouchUI/FavoritesPanel.tsx
  var _tmpl$28 = /* @__PURE__ */ template('<div class="border-0 border-t border-t-[var(--color-site-border-subtle)]">'), _tmpl$29 = /* @__PURE__ */ template('<div class="box-border w-full min-w-0 overflow-hidden rounded-md border ehp-color-site-border bg-[var(--color-site-elevated)]"><button type=button class="flex box-border w-full min-h-md items-center justify-between gap-md px-md py-sm rounded-xs border-0 !bg-transparent ehp-color-site-text text-left textsize-md font-700 font-inherit cursor-pointer hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)]"><span class="flex min-w-0 items-center gap-sm overflow-hidden"><span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"> [<!>]</span></span><span class="flex h-20px w-20px flex-none items-center justify-center leading-none"aria-hidden=true>'), _tmpl$37 = /* @__PURE__ */ template('<button type=button><span class="flex min-w-0 items-center gap-sm"><span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"> [<!>]'), _tmpl$47 = /* @__PURE__ */ template('<span class="block h-15px w-15px flex-none bg-no-repeat"aria-hidden=true>');
  function FavoritesCategorySelect(props) {
    let container, [open, setOpen] = createSignal(!1), selected = () => props.source.data.favoritesCategory?.categories.find((category) => category.selected) ?? props.source.data.favoritesCategory?.categories[0] ?? null;
    return onMount(() => {
      let closeOnOutsidePointer = (event) => {
        event.target instanceof Node && !container.contains(event.target) && setOpen(!1);
      };
      document.addEventListener("pointerdown", closeOnOutsidePointer, !0), onCleanup(() => document.removeEventListener("pointerdown", closeOnOutsidePointer, !0));
    }), (() => {
      var _el$ = _tmpl$29(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$7 = _el$5.nextSibling, _el$6 = _el$7.nextSibling, _el$8 = _el$3.nextSibling, _ref$ = container;
      return typeof _ref$ == "function" ? use(_ref$, _el$) : container = _el$, _el$2.$$click = () => setOpen((value) => !value), insert(_el$3, () => categoryIndicator(selected()?.appearance), _el$4), insert(_el$4, () => selected()?.label, _el$5), insert(_el$4, () => selected()?.count, _el$7), insert(_el$8, () => open() ? "−" : "+"), insert(_el$, createComponent(Show, {
        get when() {
          return open();
        },
        get children() {
          var _el$9 = _tmpl$28();
          return insert(_el$9, createComponent(For, {
            get each() {
              return props.source.data.favoritesCategory?.categories;
            },
            children: (category, index) => (() => {
              var _el$0 = _tmpl$37(), _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$13 = _el$11.nextSibling, _el$12 = _el$13.nextSibling;
              return _el$0.$$click = () => props.source.handle.activateFavoriteCategory(index()), insert(_el$1, () => categoryIndicator(category.appearance), _el$10), insert(_el$10, () => category.label, _el$11), insert(_el$10, () => category.count, _el$13), createRenderEffect(() => className(_el$0, `flex box-border w-full min-h-md items-center px-md py-sm border-0 border-b ehp-color-site-border-subtle-b last:border-b-0 text-left textsize-md font-inherit no-underline cursor-pointer ${category.selected ? "bg-[var(--color-site-accent-hover)] ehp-color-site-accent font-700" : "!bg-transparent ehp-color-site-text hover:!bg-[var(--color-site-item-hover)]"}`)), _el$0;
            })()
          })), _el$9;
        }
      }), null), createRenderEffect(() => setAttribute(_el$2, "aria-expanded", open())), _el$;
    })();
  }
  function categoryIndicator(appearance) {
    return (() => {
      var _el$14 = _tmpl$47();
      return createRenderEffect((_$p) => style(_el$14, appearance ? {
        "background-image": appearance.backgroundImage,
        "background-position": appearance.backgroundPosition,
        "background-size": appearance.backgroundSize
      } : void 0, _$p)), _el$14;
    })();
  }
  delegateEvents(["click"]);

  // src/components/TouchUI/SearchPanel.tsx
  var _tmpl$30 = /* @__PURE__ */ template('<section class="ehpeek-touch-search-panel box-border flex w-[calc(100%_-_32px)] max-w-960px flex-col gap-md mx-auto mb-lg p-lg border ehp-color-site-border rounded-lg ehp-color-site-surface ehp-color-site-text shadow-[0_8px_24px_var(--color-shadow-panel)] font-sans">'), _tmpl$210 = /* @__PURE__ */ template('<button type=button class="appearance-none inline-flex min-h-md items-center px-md border-0 rounded-md bg-transparent ehp-color-site-accent text-left textsize-md font-700 font-inherit leading-[1.2] no-underline cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-accent-hover)]">'), _tmpl$38 = /* @__PURE__ */ template("<button>"), _tmpl$48 = /* @__PURE__ */ template('<span class="contents [&amp;>*:not([hidden])]:col-span-full">');
  var TOUCH_SEARCH_ACTION_CLASS = "appearance-none inline-flex box-border w-60px h-60px items-center justify-center p-0 rounded-md border-0 bg-transparent cursor-pointer transition-[background-color,transform] duration-120 [touch-action:manipulation] active:scale-96 active:bg-[var(--color-site-item-hover)]";
  function TouchSearchPanel(props) {
    return (() => {
      var _el$ = _tmpl$30();
      return insert(_el$, createComponent(DomNode2, {
        get node() {
          return props.source.elems.searchBox;
        }
      }), null), insert(_el$, createComponent(DomNode2, {
        get node() {
          return props.source.elems.fileSearch;
        }
      }), null), insert(_el$, () => props.after, null), _el$;
    })();
  }
  function TouchSearchCategoryToggle(props) {
    let [open, setOpen] = createSignal(!1);
    return createEffect(() => props.source.handle.updateCategoryVisibility(open())), createComponent(ToggleButton, {
      get expanded() {
        return open();
      },
      get label() {
        return texts_default.search.categories;
      },
      onClick: () => setOpen((value) => !value)
    });
  }
  function TouchSearchOptionToggle(props) {
    let [open, setOpen] = createSignal(!1);
    return createComponent(ToggleButton, {
      get expanded() {
        return open();
      },
      get label() {
        return texts_default.search[props.option];
      },
      onClick: () => {
        props.option === "advancedOptions" ? props.source.handle.toggleAdvancedOptions() : props.source.handle.toggleFileSearch(), setOpen((value) => !value);
      }
    });
  }
  function ToggleButton(props) {
    return (() => {
      var _el$2 = _tmpl$210();
      return _el$2.$$click = () => props.onClick(), insert(_el$2, () => props.label), createRenderEffect(() => setAttribute(_el$2, "aria-expanded", props.expanded)), _el$2;
    })();
  }
  function TouchSearchAction(props) {
    let source = untrack(() => props.source), search2 = untrack(() => props.action === "search"), label = search2 ? source.data.searchLabel : source.data.clearLabel ?? "", original = search2 ? source.elems.searchSubmit : source.elems.clearButton;
    return [(() => {
      var _el$3 = _tmpl$38();
      return _el$3.$$click = (event) => {
        event.preventDefault(), search2 ? source.handle.activateSearch() : source.handle.clearSearchText();
      }, setAttribute(_el$3, "type", search2 ? "submit" : "button"), setAttribute(_el$3, "aria-label", label), setAttribute(_el$3, "title", label), insert(_el$3, createComponent(Icon, {
        name: search2 ? "search" : "close",
        size: 32
      })), createRenderEffect(() => className(_el$3, search2 ? `${TOUCH_SEARCH_ACTION_CLASS} z-1 ${source.data.hasClear ? "col-start-3" : "col-start-2"} row-start-1 ehp-color-site-accent` : `${TOUCH_SEARCH_ACTION_CLASS} z-1 col-start-2 row-start-1 ehp-color-site-text`)), _el$3;
    })(), (() => {
      var _el$4 = _tmpl$48();
      return insert(_el$4, createComponent(DomNode2, {
        node: original
      })), _el$4;
    })()];
  }
  delegateEvents(["click"]);

  // src/components/TouchUI/TopBar.tsx
  var _tmpl$31 = /* @__PURE__ */ template('<div class="ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+8px)] right-0 z-overlay flex w-240px coarse:w-[calc(100vw-32px)] max-w-[calc(100vw-24px)] coarse:max-w-360px flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">'), _tmpl$211 = /* @__PURE__ */ template('<div class="ehpeek-touch-top-bar-menu relative"><button type=button class="ehpeek-touch-top-bar-menu-button inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"aria-haspopup=menu>'), _tmpl$39 = /* @__PURE__ */ template('<nav class="ehpeek-touch-top-bar relative z-ui flex box-border w-full min-h-xl items-center justify-between py-lg pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] ehp-color-site-surface ehp-color-site-text font-sans"><a class="ehpeek-touch-top-bar-project inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"></a><div class="flex items-center gap-sm"><a class="ehpeek-touch-top-bar-home inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"></a><a class="ehpeek-touch-top-bar-favorites inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"></a><a class="ehpeek-touch-top-bar-history inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"></a><button type=button class="ehpeek-touch-top-bar-settings inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]">'), TOUCH_TOP_BAR_ICON_SIZE = 41;
  function TouchTopBarMenu(props) {
    let [open, setOpen] = createSignal(!1), root;
    return onMount(() => {
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
          var _el$3 = _tmpl$31();
          return insert(_el$3, createComponent(For, {
            get each() {
              return props.navItems;
            },
            children: (item) => {
              let Component = item.Component;
              return createComponent(Component, {});
            }
          })), _el$3;
        }
      }), null), createRenderEffect(() => setAttribute(_el$2, "aria-expanded", open())), _el$;
    })();
  }
  function TouchTopBar(props) {
    return (() => {
      var _el$4 = _tmpl$39(), _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$8.nextSibling, _el$0 = _el$9.nextSibling;
      return insert(_el$5, createComponent(Icon, {
        name: "panda-peek",
        size: 58,
        strokeWidth: 1.8
      })), insert(_el$7, createComponent(Icon, {
        name: "home",
        size: TOUCH_TOP_BAR_ICON_SIZE
      })), insert(_el$8, createComponent(Icon, {
        name: "heart",
        size: TOUCH_TOP_BAR_ICON_SIZE
      })), insert(_el$9, createComponent(Icon, {
        name: "history",
        size: TOUCH_TOP_BAR_ICON_SIZE
      })), _el$0.$$click = (event) => {
        event.stopPropagation(), props.onSettingsMenuOpen();
      }, insert(_el$0, createComponent(Icon, {
        name: "settings",
        size: TOUCH_TOP_BAR_ICON_SIZE
      })), insert(_el$6, createComponent(TouchTopBarMenu, {
        get navItems() {
          return props.source.elems.navItems;
        }
      }), null), createRenderEffect((_p$) => {
        var _v$ = props.source.data.homeHref, _v$2 = props.source.data.homeHref, _v$3 = props.source.data.favoritesHref, _v$4 = props.historyHref;
        return _v$ !== _p$.e && setAttribute(_el$5, "href", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$7, "href", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$8, "href", _p$.a = _v$3), _v$4 !== _p$.o && setAttribute(_el$9, "href", _p$.o = _v$4), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0
      }), _el$4;
    })();
  }
  delegateEvents(["click"]);

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
.ehpeek-hide-original-gallery-info,
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
.ptb {
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

  // src/eh/dom/styles.css
  var styles_default = `/* Style dynamic EhSyringe suggestions without observing its injected nodes. */
.ehs-injected .eh-syringe-lite-auto-complete-list {
  max-height: 60dvh !important;
  padding-block: 8px !important;
}

.ehs-injected .eh-syringe-lite-auto-complete-list .auto-complete-item {
  box-sizing: border-box;
  min-height: 52px;
  padding: 8px 16px !important;
  font-size: var(--font-size-lg) !important;
  line-height: 1.25 !important;
}

.ehs-injected .eh-syringe-lite-auto-complete-list .auto-complete-text {
  font-size: inherit !important;
  line-height: inherit !important;
}

/* Keep TouchUI result tables inside the viewport without adding layout wrappers. */
html.ehpeek-constrain-results-to-viewport,
body.ehpeek-constrain-results-to-viewport {
  min-width: 0 !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
}

.ehpeek-constrain-results-to-viewport .ido,
.ehpeek-constrain-results-to-viewport .itg {
  box-sizing: border-box;
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

.ehpeek-expand-favorites-search {
  box-sizing: border-box;
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
}

.ehpeek-constrain-favorites-navigation .searchnav {
  box-sizing: border-box;
  max-width: 100% !important;
  overflow-x: auto;
}

.ehpeek-hide-original-favorites-categories {
  display: none !important;
}

.ehpeek-contain-search-results,
.ehpeek-contain-favorites-results {
  box-sizing: border-box;
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.ehpeek-enable-search-swipe-input {
  overscroll-behavior-x: contain;
  touch-action: pan-y;
}

.ehpeek-enable-search-swipe-input[data-dragging="true"] {
  user-select: none;
}

/* Compact wide Favorites columns while preserving the original table structure. */
.ehpeek-compact-all-favorites-results {
  table-layout: auto !important;
  width: 100% !important;
  overflow-x: hidden !important;
}

.ehpeek-compact-all-favorites-results > tbody > tr > .gl2e {
  width: auto !important;
  overflow-wrap: anywhere !important;
}

.ehpeek-compact-all-favorites-results .glink {
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

.ehpeek-compact-all-favorites-results .gl4e table {
  table-layout: fixed !important;
  width: 100% !important;
  max-width: 100% !important;
}

.ehpeek-compact-all-favorites-results .gl4e td {
  min-width: 0 !important;
  overflow-wrap: anywhere !important;
}

.ehpeek-compact-all-favorites-results .gl4e td.tc {
  width: 4em !important;
  white-space: nowrap !important;
}

.ehpeek-compact-all-favorites-results > tbody > tr > .glfe {
  width: 1% !important;
  white-space: nowrap !important;
}

@media (max-width: 849px) {
  .ehpeek-contain-favorites-results {
    table-layout: auto !important;
    width: 100% !important;
  }

  .ehpeek-contain-favorites-results > tbody > tr > .gl2e {
    width: auto !important;
    overflow-wrap: anywhere !important;
  }

  .ehpeek-contain-favorites-results .glink {
    white-space: normal !important;
    overflow-wrap: anywhere !important;
  }

  .ehpeek-contain-favorites-results .gl4e table {
    table-layout: fixed !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .ehpeek-contain-favorites-results .gl4e td {
    min-width: 0 !important;
    overflow-wrap: anywhere !important;
  }

  .ehpeek-contain-favorites-results .gl4e td.tc {
    width: 4em !important;
    white-space: nowrap !important;
  }

  .ehpeek-contain-favorites-results > tbody > tr > .glfe {
    width: 1% !important;
    white-space: nowrap !important;
  }
}

/* Present original Search rows through one shared EhPeek layout state. */
.ehpeek-layout-search-grid {
  display: block !important;
  width: 100% !important;
  table-layout: auto !important;
}

.ehpeek-layout-search-grid > tbody {
  display: block !important;
}

.ehpeek-layout-search-grid > tbody > tr {
  position: relative !important;
  display: grid !important;
  grid-template-columns: clamp(112px, 34%, 250px) minmax(0, 1fr) !important;
  align-items: start !important;
  column-gap: 0 !important;
  width: 100% !important;
  cursor: pointer !important;
}

.ehpeek-layout-search-grid > tbody > tr:has(> .glfe) {
  grid-template-columns: clamp(112px, 34%, 250px) minmax(0, 1fr) auto !important;
}

.ehpeek-layout-search-grid > tbody > tr.ehpeek-expand-coverless-search-grid {
  grid-template-columns: minmax(0, 1fr) !important;
}

.ehpeek-layout-search-grid > tbody > tr > .gl1e {
  width: auto !important;
}

.ehpeek-layout-search-grid > tbody > tr > .gl2e {
  box-sizing: border-box !important;
  grid-column: auto;
  align-self: stretch !important;
  min-width: 0 !important;
  width: auto !important;
  height: 100% !important;
  padding-left: 0 !important;
}

.ehpeek-layout-search-grid > tbody > tr.ehpeek-expand-coverless-search-grid > .gl2e {
  grid-column: 1 !important;
}

.ehpeek-layout-search-grid > tbody > tr > .glfe {
  width: auto !important;
  margin-left: 6px !important;
}

.ehpeek-layout-search-grid > tbody > tr > .gl1e > div,
.ehpeek-layout-search-grid > tbody > tr > .gl1e img {
  width: 100% !important;
  height: auto !important;
}

.ehpeek-layout-search-grid .gl4e {
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  gap: 12px !important;
  min-height: 0 !important;
  width: 100% !important;
  padding-left: 6px !important;
}

.ehpeek-layout-search-grid .glink {
  min-height: 0 !important;
  height: auto !important;
  overflow: visible !important;
  overflow-wrap: anywhere !important;
  white-space: normal !important;
  word-break: normal !important;
  text-align: left !important;
  font-size: var(--font-size-md) !important;
  font-weight: 700 !important;
  line-height: 1.35 !important;
}

.ehpeek-layout-search-grid .gl3e {
  position: static !important;
  display: flex !important;
  flex-flow: row wrap !important;
  align-items: center !important;
  align-content: flex-start !important;
  justify-content: flex-start !important;
  gap: 8px 12px !important;
  float: none !important;
  min-height: 0 !important;
  width: 100% !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  font-weight: 600 !important;
}

.ehpeek-layout-search-grid .gl3e > * {
  position: static !important;
  flex: 0 0 auto !important;
  min-width: 0 !important;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  font-size: var(--font-size-sm) !important;
  font-weight: 600 !important;
  line-height: 1.3 !important;
}

.ehpeek-layout-search-grid .gl3e > .ir {
  width: 80px !important;
  height: 16px !important;
  background-repeat: no-repeat !important;
}

.ehpeek-layout-search-grid .gl3e > .gldown {
  width: auto !important;
  height: auto !important;
}

.ehpeek-layout-search-grid .gl3e > :is(.cn, .cs, [class*="ct"]) {
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: max(72px, 6em) !important;
  height: max(32px, 2.2em) !important;
  padding: 0 0.6em !important;
}

.ehpeek-layout-search-grid .ehpeek-stack-search-grid-tags {
  position: static !important;
  flex: 0 0 auto !important;
  min-height: 0 !important;
  width: 100% !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

.ehpeek-layout-search-grid .ehpeek-stack-search-grid-tags :is(table, tbody, tr) {
  min-height: 0 !important;
  height: auto !important;
  margin: 0 !important;
}

.ehpeek-layout-search-grid .ehpeek-stack-search-grid-tags td {
  min-height: 0 !important;
  height: auto !important;
  vertical-align: top !important;
}

.ehpeek-layout-search-grid .ehpeek-stack-search-grid-tags :is(.gt, .gtl, .gtw, td.tc) {
  font-size: var(--font-size-sm) !important;
  line-height: 1.2 !important;
}

.ehpeek-cover-search-grid-row {
  grid-column: 1 / 3;
  grid-row: 1;
}

/* Reading state remains visual and never changes the original title text. */
.ehpeek-prefix-read-history-label::before {
  box-sizing: border-box;
  content: attr(data-ehpeek-history-label);
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  padding-inline: 4px;
  border: 1px solid var(--color-site-accent);
  border-radius: 3px;
  background: transparent;
  color: var(--color-site-accent);
  vertical-align: middle;
  font-size: var(--font-size-sm);
  font-weight: 700;
  line-height: 1.3;
}

[data-ehpeek-read-history="visited"] {
  --ehpeek-read-history-tint: color-mix(in srgb, var(--color-site-accent) 6%, transparent);
}

[data-ehpeek-read-history="reading"] {
  --ehpeek-read-history-tint: color-mix(in srgb, var(--color-site-accent) 12%, transparent);
}

tr[data-ehpeek-read-history] > td,
[data-ehpeek-read-history]:not(tr) {
  box-shadow: inset 0 0 0 9999px var(--ehpeek-read-history-tint) !important;
}

/* Style retained Search controls without replacing their original classes. */
.ehpeek-reset-search-box-layout {
  box-sizing: border-box !important;
  min-width: 0 !important;
  width: 100% !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  text-align: left !important;
  font-size: var(--font-size-md) !important;
}

.ehpeek-stack-search-form {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.ehpeek-overlay-search-actions {
  box-sizing: border-box !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) 60px !important;
  align-items: start !important;
  gap: 0 !important;
  min-width: 0 !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.ehpeek-overlay-search-actions[data-ehpeek-has-clear="true"] {
  grid-template-columns: minmax(0, 1fr) 60px 60px !important;
}

.ehpeek-expand-search-input {
  appearance: none !important;
  box-sizing: border-box !important;
  grid-column: 1 / -1 !important;
  grid-row: 1 !important;
  min-width: 0 !important;
  width: 100% !important;
  height: 60px !important;
  margin: 0 !important;
  padding: 0 72px 0 16px !important;
  border: 1px solid var(--color-site-border) !important;
  border-radius: 6px !important;
  outline: none !important;
  background: var(--color-site-elevated) !important;
  color: var(--color-site-text) !important;
  font-size: var(--font-size-md) !important;
  line-height: 1.2 !important;
}

.ehpeek-overlay-search-actions[data-ehpeek-has-clear="true"] .ehpeek-expand-search-input {
  padding-right: 132px !important;
}

.ehpeek-expand-search-input:focus {
  border-color: var(--color-site-accent) !important;
  background: var(--color-site-elevated) !important;
  box-shadow: 0 0 0 3px var(--color-site-accent-hover) !important;
}

.ehpeek-hide-original-search-action {
  display: none !important;
}

.ehpeek-layout-search-categories {
  width: 100% !important;
  margin: 0 !important;
  border-collapse: collapse !important;
}

.ehpeek-layout-search-categories[aria-hidden="true"] {
  display: none !important;
}

.ehpeek-layout-search-categories > tbody {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
  gap: 4px !important;
}

.ehpeek-layout-search-categories tr {
  display: contents !important;
}

.ehpeek-layout-search-categories td {
  padding: 0 !important;
}

.ehpeek-layout-search-categories [id^="cat_"] {
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 0 !important;
  width: 100% !important;
  height: 52px !important;
  padding-inline: 12px !important;
  border: 1px solid var(--color-site-border) !important;
  border-radius: 6px !important;
  color: #ffffff !important;
  text-align: center !important;
  white-space: nowrap !important;
  font-size: var(--font-size-md) !important;
  font-weight: 700 !important;
  line-height: 1.15 !important;
  box-shadow: 0 2px 6px var(--color-shadow-control) !important;
  cursor: pointer !important;
  user-select: none !important;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 120ms;
}

.ehpeek-layout-search-categories [id^="cat_"]:active {
  opacity: 0.7;
}

.ehpeek-layout-search-categories [id^="cat_"][data-disabled] {
  opacity: 0.4;
}

.ehpeek-wrap-search-options {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 8px 12px !important;
  width: 100% !important;
  padding: 0 !important;
  font-size: 0 !important;
}

.ehpeek-wrap-search-options > a {
  appearance: none !important;
  display: inline-flex !important;
  align-items: center !important;
  min-height: 40px !important;
  padding-inline: 12px !important;
  border: 0 !important;
  border-radius: 6px !important;
  background: transparent !important;
  color: var(--color-site-accent) !important;
  text-align: left !important;
  text-decoration: none !important;
  font: inherit !important;
  font-size: var(--font-size-md) !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  cursor: pointer !important;
  touch-action: manipulation;
}

.ehpeek-wrap-search-options > a:active {
  background: var(--color-site-accent-hover) !important;
}

.ehpeek-expand-search-advanced-options {
  box-sizing: border-box !important;
  width: 100% !important;
  padding: 0 !important;
  color: var(--color-site-text) !important;
}

.ehpeek-reset-search-box-layout .searchadv {
  box-sizing: border-box !important;
  width: 100% !important;
  padding-top: 12px !important;
  font-size: var(--font-size-md) !important;
}

.ehpeek-reset-search-box-layout .searchadv > div,
.ehpeek-expand-file-search .searchadv > div {
  flex-wrap: wrap !important;
  justify-content: flex-start !important;
  gap: 8px !important;
}

.ehpeek-reset-search-box-layout .searchadv > div > div,
.ehpeek-expand-file-search .searchadv > div > div {
  padding: 8px !important;
}

.ehpeek-expand-file-search {
  box-sizing: border-box !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 16px !important;
  border: 1px solid var(--color-site-border) !important;
  border-radius: 6px !important;
  background: var(--color-site-elevated) !important;
  color: var(--color-site-text) !important;
  text-align: left !important;
  font-size: var(--font-size-md) !important;
}

.ehpeek-expand-file-search form {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
}

.ehpeek-expand-file-search form > div {
  padding: 0 !important;
}

/* Apply dynamic My Tag colors through variables instead of direct presentation writes. */
.ehpeek-color-my-tag {
  background-color: var(--ehpeek-my-tag-background) !important;
}

.ehpeek-color-my-tag > a {
  color: var(--ehpeek-my-tag-color) !important;
}

.ehpeek-expand-gallery-actions {
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
}

.ehpeek-fit-gallery-cover {
  display: block;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  margin-inline: auto;
  object-fit: contain;
  object-position: center;
}

/* Hide original GalleryInfo content only while the TouchUI panel owns its host. */
.ehpeek-hide-original-gallery-info > :not([data-ehpeek-anchor="gallery-info"]) {
  display: none !important;
}

.ehpeek-layout-gallery-action,
.ehpeek-layout-top-bar-menu-item {
  box-sizing: border-box !important;
  display: block !important;
  position: static !important;
  float: none !important;
  min-height: 52px !important;
  width: 100% !important;
  height: auto !important;
  margin: 0 !important;
  padding: 12px 16px !important;
  border: 0 !important;
  border-bottom: 1px solid var(--color-site-border-subtle) !important;
  background: transparent !important;
  color: var(--color-site-text) !important;
  text-align: left !important;
  text-decoration: none !important;
  white-space: normal !important;
  font-size: var(--font-size-md) !important;
  line-height: 1.2 !important;
}

.ehpeek-layout-new-tag-form {
  box-sizing: border-box !important;
  display: block !important;
  width: 100% !important;
  padding-top: 12px !important;
}

.ehpeek-layout-new-tag-form form {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  min-width: 0 !important;
  width: 100% !important;
}

.ehpeek-layout-new-tag-form #newtagfield {
  box-sizing: border-box !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  height: 40px !important;
  padding-inline: 12px !important;
  border: 1px solid var(--color-site-border) !important;
  border-radius: 3px !important;
  outline: none !important;
  background: var(--color-site-surface) !important;
  color: var(--color-site-text) !important;
  font: inherit !important;
  font-size: var(--font-size-md) !important;
}

.ehpeek-layout-new-tag-form #newtagfield:focus {
  border-color: var(--color-site-accent) !important;
}

.ehpeek-layout-new-tag-form #newtagbutton {
  box-sizing: border-box !important;
  flex: 0 0 auto !important;
  height: 40px !important;
  padding-inline: 16px !important;
  border: 1px solid var(--color-site-accent) !important;
  border-radius: 3px !important;
  background: var(--color-site-accent) !important;
  color: var(--color-background) !important;
  font: inherit !important;
  font-size: var(--font-size-md) !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}

.ehpeek-layout-gallery-tag-menu {
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
  float: none !important;
  width: 100% !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  font-size: var(--font-size-md) !important;
}

.ehpeek-layout-gallery-tag-menu img {
  display: none !important;
}

.ehpeek-layout-gallery-tag-menu a,
.ehpeek-layout-gallery-tag-menu-item {
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  min-height: 52px !important;
  width: 100% !important;
  padding: 12px 16px !important;
  border: 0 !important;
  border-bottom: 1px solid var(--color-site-border-subtle) !important;
  background: transparent !important;
  color: var(--color-site-text) !important;
  text-align: left !important;
  text-decoration: none !important;
  font: inherit !important;
  font-size: var(--font-size-md) !important;
  cursor: pointer !important;
}

.ehpeek-enable-touch-comment-score .c5 {
  white-space: nowrap !important;
}

.ehpeek-enable-touch-comment-score .c7[aria-hidden="true"] {
  display: none !important;
}

/* Scope preview interaction visuals to one managed thumbnail root. */
.ehpeek-suppress-thumbnail-tap-highlight a {
  outline: none !important;
  -webkit-tap-highlight-color: transparent;
}

.ehpeek-enable-preview-swipe-input {
  touch-action: pan-y;
  user-select: none;
}

.ehpeek-enable-preview-swipe-input img {
  -webkit-user-drag: none;
}

.ehpeek-hide-original-preview-page-bars :is(.ptt, .ptb, .gpc) {
  display: none !important;
}

@media (pointer: coarse) {
  .ehpeek-layout-top-bar-menu-item {
    min-height: 88px !important;
    padding: 24px !important;
  }

  .ehpeek-suppress-thumbnail-tap-highlight > :is(:hover, :active) {
    border-color: var(--color-site-border) !important;
  }

  .ehpeek-suppress-thumbnail-tap-highlight a:is(:focus, :active) {
    outline: none !important;
  }
}
`;

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
.mb-sm{margin-bottom:8px;}
.mb-xs{margin-bottom:4px;}
.mr-sm{margin-right:8px;}
.mt-md{margin-top:12px;}
.mt-xs{margin-top:4px;}
.scrollbar-hidden::-webkit-scrollbar{display:none;}
.h-lg{height:52px;}
.h-md{height:40px;}
.\\!h-sm{height:32px !important;}
.h-sm{height:32px;}
.min-h-lg{min-height:52px;}
.min-h-md{min-height:40px;}
.min-h-sm{min-height:32px;}
.min-h-xl{min-height:80px;}
.min-h-xs{min-height:24px;}
.w-lg{width:52px;}
.w-md{width:40px;}
.\\!w-sm{width:32px !important;}
.w-sm{width:32px;}
.gap-lg{gap:16px;}
.gap-md{gap:12px;}
.gap-sm{gap:8px;}
.gap-xl{gap:24px;}
.gap-xs{gap:4px;}
.gap-x-lg{column-gap:16px;}
.gap-x-sm{column-gap:8px;}
.gap-y-md{row-gap:12px;}
.ehp-color-site-border{border-color:var(--color-site-border);}
.ehp-color-spinner{border-color:var(--color-border);border-top-color:var(--color-accent);}
.ehp-color-site-border-subtle-b{border-bottom-color:var(--color-site-border-subtle);}
.rounded-lg{border-radius:8px;}
.rounded-md{border-radius:6px;}
.rounded-sm{border-radius:4px;}
.rounded-xl{border-radius:10px;}
.rounded-xs{border-radius:3px;}
.focus-visible\\:rounded-xs:focus-visible{border-radius:3px;}
.ehp-color-reader{background-color:var(--color-reader-background);color:var(--color-reader-text);}
.ehp-color-site-elevated{background-color:var(--color-site-elevated);--un-shadow:0 8px 24px var(--un-shadow-color, var(--color-shadow-elevated));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.ehp-color-site-page{background-color:var(--color-site-page);}
.ehp-color-site-surface{background-color:var(--color-site-surface);}
.p-lg{padding:16px;}
.p-md{padding:12px;}
.p-sm{padding:8px;}
.p-xl{padding:24px;}
.px-lg{padding-left:16px;padding-right:16px;}
.px-md{padding-left:12px;padding-right:12px;}
.px-sm{padding-left:8px;padding-right:8px;}
.px-xl{padding-left:24px;padding-right:24px;}
.px-xs{padding-left:4px;padding-right:4px;}
.py-lg{padding-top:16px;padding-bottom:16px;}
.py-md{padding-top:12px;padding-bottom:12px;}
.py-sm{padding-top:8px;padding-bottom:8px;}
.py-xs{padding-top:4px;padding-bottom:4px;}
.pb-lg{padding-bottom:16px;}
.pb-md{padding-bottom:12px;}
.pb-sm{padding-bottom:8px;}
.pb-xs{padding-bottom:4px;}
.pl-md{padding-left:12px;}
.pl-xl{padding-left:24px;}
.pr-sm{padding-right:8px;}
.pt-lg{padding-top:16px;}
.pt-md{padding-top:12px;}
.pt-sm{padding-top:8px;}
.pt-xl{padding-top:24px;}
.textsize-lg{font-size:var(--font-size-lg);}
.textsize-md{font-size:var(--font-size-md);}
.textsize-sm{font-size:var(--font-size-sm);}
.textsize-xl{font-size:var(--font-size-xl);}
.textsize-xs{font-size:var(--font-size-xs);}
.ehp-color-site-accent{color:var(--color-site-accent);}
.ehp-color-site-text{color:var(--color-site-text);}
.ehp-color-text{color:var(--color-text);}
.hover\\:ehp-color-site-accent:hover{color:var(--color-site-accent);}
@media (pointer: coarse){
.coarse\\:\\!h-md{height:40px !important;}
.coarse\\:min-h-sm{min-height:32px;}
.coarse\\:\\!w-md{width:40px !important;}
.coarse\\:gap-lg{gap:16px;}
.coarse\\:gap-xl{gap:24px;}
.coarse\\:rounded-lg{border-radius:8px;}
.coarse\\:rounded-md{border-radius:6px;}
.coarse\\:p-lg{padding:16px;}
.coarse\\:p-md{padding:12px;}
.coarse\\:px-lg{padding-left:16px;padding-right:16px;}
.coarse\\:px-md{padding-left:12px;padding-right:12px;}
.coarse\\:py-lg{padding-top:16px;padding-bottom:16px;}
.coarse\\:py-md{padding-top:12px;padding-bottom:12px;}
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
.\\[-webkit-overflow-scrolling\\:touch\\]{-webkit-overflow-scrolling:touch;}
.\\[-webkit-tap-highlight-color\\:transparent\\]{-webkit-tap-highlight-color:transparent;}
.\\[-webkit-user-drag\\:none\\]{-webkit-user-drag:none;}
.\\[accent-color\\:var\\(--color-text\\)\\]{accent-color:var(--color-text);}
.\\[appearance\\:none\\]{appearance:none;}
.\\[contain\\:inline-size\\]{contain:inline-size;}
.\\[direction\\:ltr\\]{direction:ltr;}
.\\[font-size\\:min\\(var\\(--font-size-xl\\)\\,var\\(--reader-end-font-size\\)\\)\\]{font-size:min(var(--font-size-xl),var(--reader-end-font-size));}
.\\[font-variant-numeric\\:tabular-nums\\]{font-variant-numeric:tabular-nums;}
.\\[overflow-wrap\\:anywhere\\],
.break-anywhere{overflow-wrap:anywhere;}
.\\[touch-action\\:manipulation\\]{touch-action:manipulation;}
.\\[touch-action\\:none\\],
.touch-none,
#ehpeek-reader[data-navigation-mode=paged] .\\[\\#ehpeek-reader\\[data-navigation-mode\\=paged\\]_\\&\\]\\:touch-none{touch-action:none;}
.\\[touch-action\\:pan-x_pan-y\\]{touch-action:pan-x pan-y;}
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
.inset-y-0{top:0;bottom:0;}
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
.right-2px{right:2px;}
.right-auto{right:auto;}
.top-\\[calc\\(100\\%\\+8px\\)\\]{top:calc(100% + 8px);}
.top-\\[calc\\(10px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(10px + env(safe-area-inset-top,0px));}
.top-\\[calc\\(130px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(130px + env(safe-area-inset-top,0px));}
.top-\\[calc\\(70px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(70px + env(safe-area-inset-top,0px));}
.top-0{top:0;}
.top-1\\/2{top:50%;}
.top-24px{top:24px;}
.top-48px{top:48px;}
.top-full{top:100%;}
.line-clamp-2{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;}
.line-clamp-3{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;}
.line-clamp-4{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;line-clamp:4;}
.z-\\[1150\\]{z-index:1150;}
.z-\\[1200\\]{z-index:1200;}
.z-1{z-index:1;}
.z-2{z-index:2;}
.z-3{z-index:3;}
.z-4{z-index:4;}
.grid{display:grid;}
.\\[\\&\\>\\*\\:not\\(\\[hidden\\]\\)\\]\\:col-span-full>*:not([hidden]){grid-column:1/-1;}
.col-start-2{grid-column-start:2;}
.col-start-3{grid-column-start:3;}
.row-start-1{grid-row-start:1;}
.auto-rows-\\[100\\%\\]{grid-auto-rows:100%;}
.grid-cols-\\[1fr_1fr\\]{grid-template-columns:1fr 1fr;}
.grid-cols-\\[1fr_auto_1fr\\]{grid-template-columns:1fr auto 1fr;}
.grid-cols-\\[48px_minmax\\(64px\\,1fr\\)_64px_64px\\]{grid-template-columns:48px minmax(64px,1fr) 64px 64px;}
.grid-cols-\\[auto_96px_96px\\]{grid-template-columns:auto 96px 96px;}
.grid-cols-\\[max-content_minmax\\(0\\,1fr\\)\\]{grid-template-columns:max-content minmax(0,1fr);}
.grid-cols-\\[minmax\\(120px\\,38\\%\\)_minmax\\(0\\,1fr\\)\\]{grid-template-columns:minmax(120px,38%) minmax(0,1fr);}
.grid-cols-\\[repeat\\(3\\,minmax\\(0\\,1fr\\)\\)\\],
.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr));}
.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr));}
.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr));}
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
.my-auto{margin-top:auto;margin-bottom:auto;}
.mb-0{margin-bottom:0;}
.mb-10px{margin-bottom:10px;}
.ml-\\[max\\(14px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{margin-left:max(14px,env(safe-area-inset-left,0px));}
.ml-auto{margin-left:auto;}
.mr-\\[max\\(14px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{margin-right:max(14px,env(safe-area-inset-right,0px));}
.mt--18px{margin-top:-18px;}
.mt-0{margin-top:0;}
.mt-2px{margin-top:2px;}
.mt-auto{margin-top:auto;}
.last\\:mb-0:last-child{margin-bottom:0;}
.box-border{box-sizing:border-box;}
.block{display:block;}
.inline-block{display:inline-block;}
.contents{display:contents;}
.\\!hidden{display:none !important;}
.hidden{display:none;}
.aspect-\\[2\\/3\\]{aspect-ratio:2/3;}
.h-\\[120px\\]{height:120px;}
.h-\\[2\\.4em\\]{height:2.4em;}
.h-\\[var\\(--reader-frame-height\\)\\]{height:var(--reader-frame-height);}
.h-\\[var\\(--reader-page-height\\)\\]{height:var(--reader-page-height);}
.h-108px{height:108px;}
.h-10px{height:10px;}
.h-15px{height:15px;}
.h-20px{height:20px;}
.h-40px{height:40px;}
.h-48px{height:48px;}
.h-60px{height:60px;}
.h-64px{height:64px;}
.h-68px{height:68px;}
.h-full{height:100%;}
.h1{height:0.25rem;}
.max-h-\\[60dvh\\]{max-height:60dvh;}
.max-h-\\[calc\\(100dvh-32px\\)\\]{max-height:calc(100dvh - 32px);}
.max-h-\\[calc\\(100vh-48px\\)\\]{max-height:calc(100vh - 48px);}
.max-h-\\[min\\(720px\\,calc\\(100dvh-32px\\)\\)\\]{max-height:min(720px,calc(100dvh - 32px));}
.max-h-240px{max-height:240px;}
.max-h-full{max-height:100%;}
.max-h-screen{max-height:100vh;}
.max-w-\\[calc\\(100vw-24px\\)\\]{max-width:calc(100vw - 24px);}
.max-w-\\[calc\\(100vw-32px\\)\\]{max-width:calc(100vw - 32px);}
.max-w-\\[calc\\(100vw-48px\\)\\]{max-width:calc(100vw - 48px);}
.max-w-\\[min\\(78vw\\,320px\\)\\]{max-width:min(78vw,320px);}
.max-w-\\[min\\(86vw\\,760px\\)\\]{max-width:min(86vw,760px);}
.max-w-420px{max-width:420px;}
.max-w-480px{max-width:480px;}
.max-w-520px{max-width:520px;}
.max-w-960px{max-width:960px;}
.max-w-full{max-width:100%;}
.max-w-none{max-width:none;}
.max-w-screen{max-width:100vw;}
.min-h-\\[clamp\\(260px\\,42vh\\,340px\\)\\]{min-height:clamp(260px,42vh,340px);}
.min-h-0{min-height:0;}
.min-h-87px{min-height:87px;}
.min-h-full{min-height:100%;}
.min-w-0{min-width:0;}
.min-w-285px{min-width:285px;}
.min-w-48px{min-width:48px;}
.min-w-64px{min-width:64px;}
.min-w-full{min-width:100%;}
.w-\\[65\\%\\]{width:65%;}
.w-\\[calc\\(100\\%_-_32px\\)\\]{width:calc(100% - 32px);}
.w-\\[min\\(680px\\,calc\\(100vw-24px\\)\\)\\]{width:min(680px,calc(100vw - 24px));}
.w-\\[min\\(86vw\\,360px\\)\\]{width:min(86vw,360px);}
.w-\\[min\\(92vw\\,420px\\)\\]{width:min(92vw,420px);}
.w-\\[var\\(--reader-frame-width\\)\\]{width:var(--reader-frame-width);}
.w-\\[var\\(--reader-page-width\\)\\]{width:var(--reader-page-width);}
.w-10px{width:10px;}
.w-15px{width:15px;}
.w-160px{width:160px;}
.w-18px{width:18px;}
.w-20px{width:20px;}
.w-240px{width:240px;}
.w-320px{width:320px;}
.w-32px{width:32px;}
.w-3px{width:3px;}
.w-40px{width:40px;}
.w-42px{width:42px;}
.w-60px{width:60px;}
.w-64px{width:64px;}
.w-68px{width:68px;}
.w-auto{width:auto;}
.w-fit{width:fit-content;}
.w-full{width:100%;}
.w-max{width:max-content;}
.flex{display:flex;}
.inline-flex{display:inline-flex;}
.flex-\\[0_0_100\\%\\]{flex:0 0 100%;}
.flex-\\[0_0_var\\(--reader-page-width\\)\\]{flex:0 0 var(--reader-page-width);}
.flex-1{flex:1 1 0%;}
.flex-none{flex:none;}
.flex-row{flex-direction:row;}
.flex-col{flex-direction:column;}
.flex-wrap{flex-wrap:wrap;}
.table{display:table;}
.border-collapse{border-collapse:collapse;}
.border-separate{border-collapse:separate;}
.border-spacing-4px{--un-border-spacing-x:4px;--un-border-spacing-y:4px;border-spacing:var(--un-border-spacing-x) var(--un-border-spacing-y);}
.origin-center{transform-origin:center;}
.-translate-x-1\\/2{--un-translate-x:-50%;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.-translate-y-1\\/2{--un-translate-y:-50%;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.\\[\\&\\[data-open\\=false\\]\\]\\:translate-y-\\[calc\\(100\\%\\+16px\\)\\][data-open=false]{--un-translate-y:calc(100% + 16px);transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.active\\:scale-96:active{--un-scale-x:0.96;--un-scale-y:0.96;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.active\\:scale-98:active{--un-scale-x:0.98;--un-scale-y:0.98;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.transform{transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.animate-spin{animation:spin 1s linear infinite;}
.cursor-default{cursor:default;}
.disabled\\:cursor-default:disabled{cursor:default;}
.cursor-pointer{cursor:pointer;}
.cursor-grab{cursor:grab;}
.\\[\\&\\[data-dragging\\=true\\]\\]\\:cursor-grabbing[data-dragging=true]{cursor:grabbing;}
.active\\:cursor-grabbing:active{cursor:grabbing;}
.touch-pan-y{--un-pan-y:pan-y;touch-action:var(--un-pan-x) var(--un-pan-y) var(--un-pinch-zoom);}
.select-text{-webkit-user-select:text;user-select:text;}
.\\[\\&\\[data-dragging\\=true\\]\\]\\:select-none[data-dragging=true],
.select-none,
#ehpeek-reader[data-navigation-mode=paged] .\\[\\#ehpeek-reader\\[data-navigation-mode\\=paged\\]_\\&\\]\\:select-none{-webkit-user-select:none;user-select:none;}
.resize{resize:both;}
.appearance-none{-webkit-appearance:none;appearance:none;}
.items-start{align-items:flex-start;}
.items-end{align-items:flex-end;}
.items-center{align-items:center;}
.items-stretch{align-items:stretch;}
.self-start{align-self:flex-start;}
.self-end{align-self:flex-end;}
.self-center{align-self:center;}
.self-stretch{align-self:stretch;}
.justify-start{justify-content:flex-start;}
.justify-end{justify-content:flex-end;}
.justify-center{justify-content:center;}
.justify-between{justify-content:space-between;}
.justify-self-end{justify-self:end;}
.justify-self-stretch{justify-self:stretch;}
.gap-18px{gap:18px;}
.gap-1px{gap:1px;}
.gap-3px{gap:3px;}
.gap-4px{gap:4px;}
.gap-6px{gap:6px;}
.gap-8px{gap:8px;}
.gap-x-3px{column-gap:3px;}
.overflow-auto{overflow:auto;}
.overflow-hidden,
#ehpeek-reader[data-navigation-mode=paged] .\\[\\#ehpeek-reader\\[data-navigation-mode\\=paged\\]_\\&\\]\\:overflow-hidden{overflow:hidden;}
.overflow-visible{overflow:visible;}
.overflow-x-auto{overflow-x:auto;}
.overflow-x-hidden{overflow-x:hidden;}
.overflow-y-auto{overflow-y:auto;}
.overscroll-contain{overscroll-behavior:contain;}
.overscroll-x-contain{overscroll-behavior-x:contain;}
.scroll-auto{scroll-behavior:auto;}
.text-ellipsis{text-overflow:ellipsis;}
.whitespace-normal{white-space:normal;}
.whitespace-nowrap{white-space:nowrap;}
.whitespace-pre-line{white-space:pre-line;}
.break-normal{overflow-wrap:normal;word-break:normal;}
.\\!border{border-width:1px !important;}
.border{border-width:1px;}
.border-0{border-width:0px;}
.border-4,
.border-4px{border-width:4px;}
.border-y{border-top-width:1px;border-bottom-width:1px;}
.border-b{border-bottom-width:1px;}
.border-l{border-left-width:1px;}
.border-l-8{border-left-width:8px;}
.border-t{border-top-width:1px;}
.last\\:border-b-0:last-child{border-bottom-width:0px;}
.\\!border-transparent{border-color:transparent !important;}
.border-\\[var\\(--color-border\\)\\]{border-color:var(--color-border);}
.border-\\[var\\(--color-reader-border\\)\\]{border-color:var(--color-reader-border);}
.border-\\[var\\(--color-site-accent\\)\\]{border-color:var(--color-site-accent);}
.border-\\[var\\(--color-site-border-subtle\\)\\]{border-color:var(--color-site-border-subtle);}
.border-\\[var\\(--color-site-swipe-border\\)\\]{border-color:var(--color-site-swipe-border);}
.hover\\:border-\\[var\\(--color-site-border\\)\\]:hover{border-color:var(--color-site-border);}
.border-l-\\[var\\(--color-site-page\\)\\]{border-left-color:var(--color-site-page);}
.border-t-\\[var\\(--color-reader-accent\\)\\]{border-top-color:var(--color-reader-accent);}
.border-t-\\[var\\(--color-site-border-subtle\\)\\]{border-top-color:var(--color-site-border-subtle);}
.rounded{border-radius:0.25rem;}
.rounded-3px{border-radius:3px;}
.rounded-full{border-radius:9999px;}
.rounded-l-md{border-top-left-radius:0.375rem;border-bottom-left-radius:0.375rem;}
.border-solid{border-style:solid;}
.\\!bg-\\[color-mix\\(in_srgb\\,var\\(--color-site-page\\)_82\\%\\,black\\)\\]{background-color:color-mix(in srgb,var(--color-site-page) 82%,black) !important;}
.\\!bg-transparent,
.\\[\\&_\\*\\]\\:\\!bg-transparent *{background-color:transparent !important;}
.bg-\\[var\\(--color-background\\)\\]{background-color:var(--color-background);}
.bg-\\[var\\(--color-badge\\)\\]{background-color:var(--color-badge);}
.bg-\\[var\\(--color-control\\)\\]{background-color:var(--color-control);}
.bg-\\[var\\(--color-loading\\)\\]{background-color:var(--color-loading);}
.bg-\\[var\\(--color-reader-border\\)\\]{background-color:var(--color-reader-border);}
.bg-\\[var\\(--color-reader-scrollbar\\)\\]{background-color:var(--color-reader-scrollbar);}
.bg-\\[var\\(--color-reader-surface\\)\\]{background-color:var(--color-reader-surface);}
.bg-\\[var\\(--color-site-accent-hover\\)\\]{background-color:var(--color-site-accent-hover);}
.bg-\\[var\\(--color-site-accent\\)\\]{background-color:var(--color-site-accent);}
.bg-\\[var\\(--color-site-elevated\\)\\]{background-color:var(--color-site-elevated);}
.bg-\\[var\\(--color-site-item-hover\\)\\]{background-color:var(--color-site-item-hover);}
.bg-\\[var\\(--color-site-surface\\)\\]{background-color:var(--color-site-surface);}
.bg-\\[var\\(--color-site-swipe-background\\)\\]{background-color:var(--color-site-swipe-background);}
.bg-\\[var\\(--color-state-off\\)\\]{background-color:var(--color-state-off);}
.bg-\\[var\\(--color-state-on\\)\\]{background-color:var(--color-state-on);}
.bg-black\\/65{background-color:rgb(0 0 0 / 0.65);}
.bg-transparent{background-color:transparent;}
.hover\\:\\!bg-\\[var\\(--color-site-item-hover\\)\\]:hover{background-color:var(--color-site-item-hover) !important;}
.hover\\:\\!bg-transparent:hover{background-color:transparent !important;}
.hover\\:bg-\\[var\\(--color-badge\\)\\]:hover{background-color:var(--color-badge);}
.hover\\:bg-\\[var\\(--color-site-accent-hover\\)\\]:hover{background-color:var(--color-site-accent-hover);}
.hover\\:bg-\\[var\\(--color-site-item-hover\\)\\]:hover{background-color:var(--color-site-item-hover);}
.active\\:\\!bg-\\[var\\(--color-site-item-hover\\)\\]:active{background-color:var(--color-site-item-hover) !important;}
.active\\:\\!bg-transparent:active{background-color:transparent !important;}
.active\\:bg-\\[var\\(--color-site-accent-hover\\)\\]:active{background-color:var(--color-site-accent-hover);}
.active\\:bg-\\[var\\(--color-site-item-hover\\)\\]:active{background-color:var(--color-site-item-hover);}
.bg-no-repeat{background-repeat:no-repeat;}
.object-contain{object-fit:contain;}
.\\!p-0{padding:0 !important;}
.p-\\[var\\(--reader-end-padding\\)\\]{padding:var(--reader-end-padding);}
.p-0{padding:0;}
.px{padding-left:1rem;padding-right:1rem;}
.px-\\[0\\.6em\\]{padding-left:0.6em;padding-right:0.6em;}
.px-0{padding-left:0;padding-right:0;}
.px-10px{padding-left:10px;padding-right:10px;}
.py-0{padding-top:0;padding-bottom:0;}
.py-56px{padding-top:56px;padding-bottom:56px;}
.py-6px{padding-top:6px;padding-bottom:6px;}
.pb-48px{padding-bottom:48px;}
.pb-72px{padding-bottom:72px;}
.pl-\\[max\\(12px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{padding-left:max(12px,env(safe-area-inset-left,0px));}
.pl-\\[max\\(16px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{padding-left:max(16px,env(safe-area-inset-left,0px));}
.pl-56px{padding-left:56px;}
.pl-6px{padding-left:6px;}
.pl-72px{padding-left:72px;}
.pr-\\[max\\(12px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{padding-right:max(12px,env(safe-area-inset-right,0px));}
.pr-\\[max\\(16px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{padding-right:max(16px,env(safe-area-inset-right,0px));}
.pr-56px{padding-right:56px;}
.pr-72px{padding-right:72px;}
.pt-2px{padding-top:2px;}
.text-center{text-align:center;}
.text-left{text-align:left;}
.text-right{text-align:right;}
.align-middle{vertical-align:middle;}
.\\!text-\\[var\\(--color-site-text\\)\\]{color:var(--color-site-text) !important;}
.text-\\[clamp\\(88px\\,25vw\\,180px\\)\\]{font-size:clamp(88px,25vw,180px);}
.text-\\[var\\(--color-danger\\)\\]{color:var(--color-danger);}
.text-\\[var\\(--color-muted\\)\\]{color:var(--color-muted);}
.text-\\[var\\(--color-rating-submitted\\)\\]{color:var(--color-rating-submitted);}
.text-\\[var\\(--color-reader-muted\\)\\]{color:var(--color-reader-muted);}
.text-\\[var\\(--color-site-accent\\)\\]{color:var(--color-site-accent);}
.text-\\[var\\(--color-site-surface\\)\\]{color:var(--color-site-surface);}
.text-\\[var\\(--color-site-text\\)\\]{color:var(--color-site-text);}
.text-\\[var\\(--color-text\\)\\]{color:var(--color-text);}
.visited\\:\\!text-\\[var\\(--color-site-text\\)\\]:visited{color:var(--color-site-text) !important;}
.hover\\:\\!text-\\[var\\(--color-site-text\\)\\]:hover{color:var(--color-site-text) !important;}
.active\\:\\!text-\\[var\\(--color-site-text\\)\\]:active{color:var(--color-site-text) !important;}
.\\[\\&_\\*\\]\\:\\!text-inherit *{color:inherit !important;}
.font-400{font-weight:400;}
.font-500{font-weight:500;}
.font-600{font-weight:600;}
.font-700{font-weight:700;}
.font-850{font-weight:850;}
.leading-\\[1\\.05\\]{line-height:1.05;}
.leading-\\[1\\.1\\]{line-height:1.1;}
.leading-\\[1\\.15\\]{line-height:1.15;}
.leading-\\[1\\.16\\]{line-height:1.16;}
.leading-\\[1\\.2\\]{line-height:1.2;}
.leading-\\[1\\.3\\]{line-height:1.3;}
.leading-\\[1\\.35\\]{line-height:1.35;}
.leading-\\[1\\.4\\]{line-height:1.4;}
.leading-\\[1\\.45\\]{line-height:1.45;}
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
.tab{-moz-tab-size:4;-o-tab-size:4;tab-size:4;}
.accent-\\[var\\(--color-reader-accent\\)\\]{accent-color:var(--color-reader-accent);}
.\\[\\&\\[data-open\\=false\\]\\]\\:opacity-0[data-open=false],
.opacity-0{opacity:0;}
.opacity-100{opacity:1;}
.opacity-40{opacity:0.4;}
.opacity-70{opacity:0.7;}
.opacity-72{opacity:0.72;}
.opacity-75{opacity:0.75;}
.opacity-78{opacity:0.78;}
.opacity-80{opacity:0.8;}
.opacity-82{opacity:0.82;}
.disabled\\:opacity-40:disabled{opacity:0.4;}
.disabled\\:opacity-50:disabled{opacity:0.5;}
.shadow-\\[0_2px_10px_var\\(--color-shadow-control\\)\\]{--un-shadow:0 2px 10px var(--un-shadow-color, var(--color-shadow-control));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_2px_10px_var\\(--color-shadow-panel\\)\\]{--un-shadow:0 2px 10px var(--un-shadow-color, var(--color-shadow-panel));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_2px_8px_var\\(--color-shadow-panel\\)\\]{--un-shadow:0 2px 8px var(--un-shadow-color, var(--color-shadow-panel));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_4px_14px_var\\(--color-shadow-floating\\)\\]{--un-shadow:0 4px 14px var(--un-shadow-color, var(--color-shadow-floating));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_6px_20px_var\\(--color-shadow-floating\\)\\]{--un-shadow:0 6px 20px var(--un-shadow-color, var(--color-shadow-floating));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-\\[0_8px_24px_var\\(--color-shadow-panel\\)\\]{--un-shadow:0 8px 24px var(--un-shadow-color, var(--color-shadow-panel));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-none{--un-shadow:0 0 var(--un-shadow-color, rgb(0 0 0 / 0));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.shadow-xl{--un-shadow:var(--un-shadow-inset) 0 20px 25px -5px var(--un-shadow-color, rgb(0 0 0 / 0.1)),var(--un-shadow-inset) 0 8px 10px -6px var(--un-shadow-color, rgb(0 0 0 / 0.1));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.focus-visible\\:outline-2:focus-visible{outline-width:2px;}
.focus-visible\\:outline-\\[var\\(--color-site-accent\\)\\]:focus-visible{outline-color:var(--color-site-accent);}
.focus-visible\\:outline-offset-3px:focus-visible{outline-offset:3px;}
.outline{outline-style:solid;}
.focus-visible\\:outline:focus-visible{outline-style:solid;}
.hover\\:brightness-108:hover{--un-brightness:brightness(1.08);filter:var(--un-blur) var(--un-brightness) var(--un-contrast) var(--un-drop-shadow) var(--un-grayscale) var(--un-hue-rotate) var(--un-invert) var(--un-saturate) var(--un-sepia);}
.filter{filter:var(--un-blur) var(--un-brightness) var(--un-contrast) var(--un-drop-shadow) var(--un-grayscale) var(--un-hue-rotate) var(--un-invert) var(--un-saturate) var(--un-sepia);}
.backdrop-filter{-webkit-backdrop-filter:var(--un-backdrop-blur) var(--un-backdrop-brightness) var(--un-backdrop-contrast) var(--un-backdrop-grayscale) var(--un-backdrop-hue-rotate) var(--un-backdrop-invert) var(--un-backdrop-opacity) var(--un-backdrop-saturate) var(--un-backdrop-sepia);backdrop-filter:var(--un-backdrop-blur) var(--un-backdrop-brightness) var(--un-backdrop-contrast) var(--un-backdrop-grayscale) var(--un-backdrop-hue-rotate) var(--un-backdrop-invert) var(--un-backdrop-opacity) var(--un-backdrop-saturate) var(--un-backdrop-sepia);}
.transition{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[background-color\\,color\\]{transition-property:background-color,color;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[background-color\\,transform\\]{transition-property:background-color,transform;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[border-color\\,background-color\\,color\\]{transition-property:border-color,background-color,color;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[filter\\,transform\\,box-shadow\\]{transition-property:filter,transform,box-shadow;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[opacity\\,transform\\]{transition-property:opacity,transform;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[width\\,opacity\\]{transition-property:width,opacity;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
.transition-\\[width\\]{transition-property:width;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms;}
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
.landscape\\:top-\\[calc\\(122px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(122px + env(safe-area-inset-top,0px));}
.landscape\\:top-\\[calc\\(62px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(62px + env(safe-area-inset-top,0px));}
.landscape\\:max-w-\\[calc\\(100vw-20px\\)\\]{max-width:calc(100vw - 20px);}
.landscape\\:min-w-0{min-width:0;}
.landscape\\:w-\\[min\\(600px\\,calc\\(100vw-24px\\)\\)\\]{width:min(600px,calc(100vw - 24px));}
.landscape\\:translate-x-0{--un-translate-x:0;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.landscape\\:text-right{text-align:right;}
}
@media (orientation: landscape) and (pointer: coarse){
.coarse-landscape\\:right-8px{right:8px;}
.coarse-landscape\\:top-\\[calc\\(150px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(150px + env(safe-area-inset-top,0px));}
.coarse-landscape\\:top-\\[calc\\(74px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(74px + env(safe-area-inset-top,0px));}
.coarse-landscape\\:max-w-\\[calc\\(100vw-16px\\)\\]{max-width:calc(100vw - 16px);}
}
@media (pointer: coarse){
.coarse\\:right-8px{right:8px;}
.coarse\\:top-\\[calc\\(160px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(160px + env(safe-area-inset-top,0px));}
.coarse\\:top-\\[calc\\(80px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(80px + env(safe-area-inset-top,0px));}
.coarse\\:top-\\[calc\\(8px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(8px + env(safe-area-inset-top,0px));}
.coarse\\:top-8px{top:8px;}
.coarse\\:grid-cols-\\[48px_minmax\\(40px\\,1fr\\)_80px_80px\\]{grid-template-columns:48px minmax(40px,1fr) 80px 80px;}
.coarse\\:grid-cols-\\[minmax\\(0\\,1\\.6fr\\)_minmax\\(0\\,1fr\\)_minmax\\(0\\,1fr\\)\\]{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);}
.coarse\\:block{display:block;}
.coarse\\:h-\\[200px\\]{height:200px;}
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
.coarse\\:w-12px{width:12px;}
.coarse\\:w-180px{width:180px;}
.coarse\\:w-18px{width:18px;}
.coarse\\:w-24px{width:24px;}
.coarse\\:w-48px{width:48px;}
.coarse\\:w-full{width:100%;}
.coarse\\:border-spacing-6px{--un-border-spacing-x:6px;--un-border-spacing-y:6px;border-spacing:var(--un-border-spacing-x) var(--un-border-spacing-y);}
}`;

  // src/theme.css
  var theme_default = `:root {
  --font-size-xs: 10px;
  --font-size-sm: 13px;
  --font-size-md: 16px;
  --font-size-lg: 24px;
  --font-size-xl: 32px;

  /* --color-background: #070707;
  --color-surface: #151515;
  --color-elevated: #232323;
  --color-text: #f3f3f3;
  --color-accent: #4da3ff; */
  --color-background: var(--color-site-page);
  --color-surface: var(--color-site-surface);
  --color-elevated: var(--color-site-elevated);
  --color-text: var(--color-site-text);
  --color-accent: var(--color-site-accent);
  --color-danger: #ffb2a7;
  --color-state-on: #4ec46a;
  --color-state-off: #8c8f96;
  --color-rating-submitted: #8595ff;
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
  /* --color-border: color-mix(in srgb, var(--color-text) 18%, transparent); */
  --color-border: var(--color-site-border);
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
  --color-loading: color-mix(
    in srgb,
    color-mix(in srgb, var(--color-site-elevated) 80%, var(--color-site-surface)) 92%,
    transparent
  );
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
  var SCROLL_ANIMATION_MS = 180, SCROLL_EASING_POWER = 3, ANIMATION_FRAME_MIN_DELTA_MS = 1, ANIMATION_FRAME_MAX_DELTA_MS = 32, SCROLL_FLING_MIN_VELOCITY = 0.35, SCROLL_FLING_STOP_VELOCITY = 0.02, SCROLL_FLING_DECAY = 45e-4, ScrollAnimator = class {
    constructor(axis) {
      this.axis = axis;
      this.frame = null;
    }
    scrollTo(scroller, target, motion = "instant", onComplete) {
      if (this.cancel(), motion !== "animated") {
        this.setScrollPosition(scroller, target), onComplete?.();
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
      this.velocity = 0;
      this.lastFrameTime = 0;
    }
    start(options) {
      this.cancel();
      let initialVelocity = options.maxVelocity ? clamp(options.initialVelocity, -options.maxVelocity, options.maxVelocity) : options.initialVelocity;
      if (Math.abs(initialVelocity) < SCROLL_FLING_MIN_VELOCITY)
        return;
      this.velocity = initialVelocity, this.lastFrameTime = performance.now();
      let step = (time) => {
        if (!options.canRun()) {
          this.cancel();
          return;
        }
        let elapsed = clamp(time - this.lastFrameTime, ANIMATION_FRAME_MIN_DELTA_MS, ANIMATION_FRAME_MAX_DELTA_MS);
        this.lastFrameTime = time;
        let previousPosition = options.axis === "x" ? options.scroller.scrollLeft : options.scroller.scrollTop;
        if (options.setScrollPosition(previousPosition + this.velocity * elapsed), (options.axis === "x" ? options.scroller.scrollLeft : options.scroller.scrollTop) === previousPosition) {
          this.cancel(), options.onStop();
          return;
        }
        if (this.velocity *= Math.exp(-SCROLL_FLING_DECAY * elapsed), Math.abs(this.velocity) < SCROLL_FLING_STOP_VELOCITY) {
          this.cancel(), options.onStop();
          return;
        }
        this.frame = window.requestAnimationFrame(step);
      };
      this.frame = window.requestAnimationFrame(step);
    }
    cancel() {
      this.frame !== null && (window.cancelAnimationFrame(this.frame), this.frame = null), this.velocity = 0;
    }
  };

  // src/components/Reader/Viewport.tsx
  var _tmpl$40 = /* @__PURE__ */ template("<div tabindex=-1><main>"), _tmpl$212 = /* @__PURE__ */ template('<section><div class="flex w-[var(--reader-frame-width)] h-[var(--reader-frame-height)] items-center justify-center overflow-hidden">'), _tmpl$310 = /* @__PURE__ */ template('<button type=button class="ehpeek-reader-page-reload appearance-none inline-flex w-64px h-64px items-center justify-center border border-[var(--color-border)] rounded-md bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer font-sans textsize-lg font-700 leading-1 hover:bg-[var(--color-badge)] active:scale-96 [touch-action:manipulation]">'), _tmpl$49 = /* @__PURE__ */ template('<div class="max-w-[min(86vw,760px)] break-anywhere [direction:ltr] [unicode-bidi:plaintext]">'), _tmpl$56 = /* @__PURE__ */ template('<div class="max-w-[min(86vw,760px)] opacity-80 break-anywhere textsize-sm font-500 leading-[1.4] [direction:ltr] [unicode-bidi:plaintext]">'), _tmpl$66 = /* @__PURE__ */ template("<div>"), _tmpl$74 = /* @__PURE__ */ template('<span class="flex w-full h-full flex-col items-center justify-center gap-xl overflow-hidden"aria-hidden=true><span class="block max-w-full flex-none m-0 p-0 text-center leading-[1] whitespace-nowrap [direction:ltr] [unicode-bidi:plaintext]"></span><span class="block w-md h-md flex-none box-border animate-spin rounded-full border-4px border-solid border-[var(--color-reader-border)] border-t-[var(--color-reader-accent)]">'), FALLBACK_ASPECT_RATIO = 1.42, PAGE_SLOT_SPACING = 8, DEFAULT_DECODED_IMAGE_CACHE_LIMIT = 24, DECODED_IMAGE_CACHE_BYTES = 96 * 1024 * 1024, HORIZONTAL_FLING_VELOCITY_MULTIPLIER = 1.2, HORIZONTAL_FLING_MAX_VELOCITY = 1.6;
  function pageWindowNumbers(currentPageNum, windowSize) {
    let numbers = [];
    for (let offset = -windowSize; offset <= windowSize; offset += 1)
      numbers.push(currentPageNum + offset);
    return numbers;
  }
  function PagesViewport(props) {
    let [slots, setSlots] = createSignal([]), [revision, setRevision] = createSignal(0), [renderedScrollSizeScale, setRenderedScrollSizeScale] = createSignal(untrack(() => props.scrollSizeScale)), horizontalAnimator = new ScrollAnimator("x"), verticalAnimator = new ScrollAnimator("y"), flingAnimator = new ScrollFlingAnimator(), pageSlots2 = [], scroller, scrollerApi, dragStartPosition = null, resizeFrame = null, scrollScaleRevision = 0, moveRequestToken = 0, disposed = !1, syncedDirection = untrack(() => props.direction), syncedNavigationMode = untrack(() => props.navigationMode), decodedImageCacheLimit = Math.max(0, Math.floor(untrack(() => props.decodedImageCacheLimit) ?? DEFAULT_DECODED_IMAGE_CACHE_LIMIT)), cachedImages = /* @__PURE__ */ new Map(), cachedImageBytes = 0, refresh = () => setRevision((value) => value + 1), pagedMode = () => props.navigationMode === "paged", horizontalAxis = () => props.direction !== "ttb", slotFor = (pageNum) => pageSlots2.find((slot) => slot.pageNum === pageNum), viewportWidth = () => scrollerApi.viewportWidth(), viewportHeight = () => scrollerApi.viewportHeight(), scrollTop = () => scrollerApi.scrollTop(), visualSlotIndex = (index, slotCount) => props.direction === "rtl" ? slotCount - 1 - index : index, horizontalAnchorOffset = (pageSlots3, anchor2) => {
      let orderedSlots = props.direction === "rtl" ? pageSlots3.slice().reverse() : pageSlots3, offset = 0;
      for (let slot of orderedSlots) {
        let extent = slot.frameWidth + PAGE_SLOT_SPACING;
        if (slot.pageNum === anchor2.pageNum)
          return offset + extent * anchor2.xRatio;
        offset += extent;
      }
      return null;
    }, applySlotSize = (slot) => {
      let aspectRatio = pageSlotAspectRatio(slot);
      if (pagedMode()) {
        let availableWidth = props.pageLayout === "double" ? Math.max(1, (viewportWidth() - 3) / 2) : viewportWidth();
        if (slot.kind !== "page") {
          slot.frameWidth = availableWidth, slot.frameHeight = viewportHeight();
          return;
        }
        let frameSize2 = containFitFrame(aspectRatio, availableWidth, viewportHeight());
        slot.frameWidth = frameSize2.width, slot.frameHeight = frameSize2.height;
        return;
      }
      let sizeScale = renderedScrollSizeScale(), reference = props.scrollFitImageSize, referenceAspectRatio = reference ? reference.height / reference.width : props.window.pages.get(props.scrollFitPageNum)?.aspectRatio ?? FALLBACK_ASPECT_RATIO, scaleMultiplier = sizeScale === "one-to-one" && reference ? 1 / containFitScale(reference.width, reference.height, viewportWidth(), viewportHeight()) : typeof sizeScale == "number" ? sizeScale : 1, frameSize = containFitFrame(referenceAspectRatio, viewportWidth(), viewportHeight(), scaleMultiplier);
      slot.frameWidth = frameSize.width, slot.frameHeight = frameSize.height;
    }, renderSlots = () => {
      for (let slot of pageSlots2)
        applySlotSize(slot);
      setSlots(pageSlots2.slice()), refresh();
    }, refreshSlot = (slot) => {
      applySlotSize(slot), refresh();
    }, pageOffset = (pageNum) => {
      let elements = slotFor(pageNum)?.elements;
      return elements ? scrollerApi.slotOffset(elements, props.navigationMode, props.direction, props.pageLayout) : null;
    }, verticalScrollBoundsForElements = (firstElements, lastElements) => {
      let bounds = {};
      if (firstElements && (bounds.min = scrollerApi.slotTop(firstElements)), lastElements) {
        let lastElementsRect = lastElements.node.getBoundingClientRect(), lastElementsTop = scrollerApi.slotTop(lastElements);
        bounds.max = lastElementsTop + lastElementsRect.height - viewportHeight();
      }
      return bounds.min === void 0 && bounds.max === void 0 ? null : (bounds.min !== void 0 && bounds.max !== void 0 && (bounds.max = Math.max(bounds.min, bounds.max)), bounds);
    }, verticalScrollBounds = () => props.navigationMode !== "scroll" || horizontalAxis() ? null : verticalScrollBoundsForElements(slotFor(1)?.elements, props.window.totalPages ? slotFor(props.window.totalPages + 1)?.elements : null), moveToTop = (nextScrollTop) => {
      scrollerApi.moveToTop(nextScrollTop, verticalScrollBounds());
    }, horizontalScrollBounds = () => {
      if (props.navigationMode !== "scroll" || !horizontalAxis())
        return null;
      let firstElements = slotFor(1)?.elements, endElements = props.window.totalPages ? slotFor(props.window.totalPages + 1)?.elements : null, bounds = {};
      return props.direction === "rtl" ? (firstElements && (bounds.max = scrollerApi.slotLeft(firstElements) + firstElements.node.getBoundingClientRect().width - viewportWidth()), endElements && (bounds.min = scrollerApi.slotLeft(endElements))) : (firstElements && (bounds.min = scrollerApi.slotLeft(firstElements)), endElements && (bounds.max = scrollerApi.slotLeft(endElements) + endElements.node.getBoundingClientRect().width - viewportWidth())), bounds.min !== void 0 && bounds.max !== void 0 && (bounds.max = Math.max(bounds.min, bounds.max)), bounds.min === void 0 && bounds.max === void 0 ? null : bounds;
    }, moveToLeft = (nextScrollLeft) => {
      let bounds = horizontalScrollBounds();
      scrollerApi.moveToLeft(bounds ? clamp(nextScrollLeft, bounds.min ?? Number.NEGATIVE_INFINITY, bounds.max ?? Number.POSITIVE_INFINITY) : nextScrollLeft);
    }, pageNumAtPoint = (point) => {
      let element = document.elementFromPoint(point.clientX, point.clientY), pageNode = element instanceof Element ? element.closest(".ehpeek-page") : null;
      if (!pageNode || !scroller.contains(pageNode))
        return null;
      let pageNum = Number(pageNode.dataset.ehpeekPageNum || "");
      return Number.isFinite(pageNum) ? pageNum : null;
    }, stopMotion = () => {
      moveRequestToken += 1, dragStartPosition = null, flingAnimator.cancel(), horizontalAnimator.cancel(), verticalAnimator.cancel();
    }, performPageMove = (pageNum, motion, onComplete) => {
      let delta = pageOffset(pageNum);
      return delta === null ? !1 : (horizontalAxis() ? horizontalAnimator.scrollTo(scroller, scrollerApi.scrollLeft() + delta, motion, onComplete) : pagedMode() ? verticalAnimator.scrollTo(scroller, scrollTop() + delta, motion, onComplete) : (moveToTop(scrollTop() + delta), onComplete?.()), !0);
    }, moveToPage = (pageNum, motion = "instant", onComplete) => {
      let requestToken = ++moveRequestToken;
      performPageMove(pageNum, motion, onComplete) || queueMicrotask(() => {
        untrack(() => {
          !disposed && requestToken === moveRequestToken && performPageMove(pageNum, motion, onComplete);
        });
      });
    }, resizePages = () => {
      for (let slot of pageSlots2)
        applySlotSize(slot);
      refresh();
    }, gestureDragging = createPointerGestureElement(() => scroller ?? null, () => props.callbacks.pointer), syncWindow = (options) => {
      let anchor2 = props.navigationMode === "scroll" && horizontalAxis() && syncedNavigationMode === props.navigationMode && syncedDirection === props.direction ? scrollerApi.centerAnchor() : null, oldAnchorOffset = anchor2 ? horizontalAnchorOffset(pageSlots2, anchor2) : null, oldScrollLeft = scrollerApi.scrollLeft(), oldSlots = new Map(pageSlots2.map((slot) => [slot.pageNum, slot])), nextSlots = [];
      for (let pageNum of pageWindowNumbers(options.currentPageNum, options.windowSize)) {
        let kind = pageSlotKind(pageNum, options.totalPages), oldSlot = oldSlots.get(pageNum), slot = oldSlot && oldSlot.kind === kind ? oldSlot : pageSlot(pageNum, kind);
        if (!oldSlot && kind === "page") {
          let cached = cachedImages.get(pageNum);
          cached && (cachedImages.delete(pageNum), cachedImageBytes -= cached.bytes, slot.state = "ready", slot.image = cached.image, slot.width = cached.width, slot.height = cached.height);
        }
        if (kind === "page") {
          let page2 = options.pages.get(pageNum);
          page2 && applyPageMetaToSlot(slot, page2);
        } else
          clearNonPageSlotMeta(slot);
        nextSlots.push(slot);
      }
      let nextSet = new Set(nextSlots);
      for (let slot of pageSlots2)
        if (!nextSet.has(slot)) {
          if (slot.kind === "page" && slot.state === "ready" && slot.image) {
            let width = positiveNumber(slot.image.naturalWidth) ?? slot.width, height = positiveNumber(slot.image.naturalHeight) ?? slot.height, cached = {
              bytes: width && height ? width * height * 4 : 0,
              height,
              image: slot.image,
              width
            }, previous = cachedImages.get(slot.pageNum);
            previous && (cachedImageBytes -= previous.bytes), cachedImages.delete(slot.pageNum), cachedImages.set(slot.pageNum, cached), cachedImageBytes += cached.bytes;
          }
          slot.token += 1;
        }
      for (; cachedImages.size > decodedImageCacheLimit || cachedImageBytes > DECODED_IMAGE_CACHE_BYTES; ) {
        let oldest = cachedImages.entries().next().value;
        if (!oldest)
          break;
        cachedImages.delete(oldest[0]), cachedImageBytes -= oldest[1].bytes, oldest[1].image.removeAttribute("src");
      }
      pageSlots2 = nextSlots, pageSlots2.forEach((slot, index) => {
        slot.index = index;
      }), renderSlots();
      let newAnchorOffset = anchor2 ? horizontalAnchorOffset(pageSlots2, anchor2) : null;
      oldAnchorOffset !== null && newAnchorOffset !== null && moveToLeft(oldScrollLeft + newAnchorOffset - oldAnchorOffset), syncedNavigationMode = props.navigationMode, syncedDirection = props.direction;
    }, actions = {
      focus: () => scroller.focus({
        preventScroll: !0
      }),
      isDragging: gestureDragging,
      beginDrag() {
        stopMotion(), dragStartPosition = {
          left: scrollerApi.scrollLeft(),
          top: scrollTop()
        };
      },
      cancelDrag: () => {
        dragStartPosition = null;
      },
      moveDrag(delta) {
        return dragStartPosition === null ? !1 : (pagedMode() ? horizontalAxis() ? scrollerApi.moveToLeft(dragStartPosition.left - delta.dx) : moveToTop(dragStartPosition.top - delta.dy) : (moveToLeft(dragStartPosition.left - delta.dx), moveToTop(dragStartPosition.top - delta.dy)), !0);
      },
      moveToLeft,
      resetPosition: () => scrollerApi.resetPosition(),
      stopMotion,
      markPageLoading(pageNum) {
        let slot = slotFor(pageNum);
        return !slot || slot.kind !== "page" || slot.state !== "idle" ? null : (slot.state = "loading", slot.errorMessage = null, slot.token += 1, refreshSlot(slot), slot.token);
      },
      async loadPageImage(pageNum, token, slotImage) {
        let image2 = pageImageDom(pageNum, slotImage), pendingSlot = slotFor(pageNum);
        pendingSlot && pendingSlot.token === token && (pendingSlot.width = slotImage.width, pendingSlot.height = slotImage.height, refreshSlot(pendingSlot)), await loadImage(image2);
        let slot = slotFor(pageNum);
        return !slot || slot.token !== token || !slot.elements ? !1 : (slot.state = "ready", slot.image = image2, slot.errorMessage = null, slot.width = positiveNumber(image2.naturalWidth) ?? slotImage.width, slot.height = positiveNumber(image2.naturalHeight) ?? slotImage.height, refreshSlot(slot), !0);
      },
      setPageError(pageNum, token, errorMessage) {
        let slot = slotFor(pageNum);
        return !slot || slot.token !== token ? !1 : (slot.state = "error", slot.image = null, slot.errorMessage = errorMessage, refresh(), !0);
      },
      resetPageError(pageNum) {
        let slot = slotFor(pageNum);
        return !slot || slot.kind !== "page" || slot.state !== "error" ? !1 : (slot.state = "idle", slot.errorMessage = null, refreshSlot(slot), !0);
      },
      resetPageLoading(pageNum, token) {
        let slot = slotFor(pageNum);
        return !slot || slot.kind !== "page" || slot.state !== "loading" || slot.token !== token ? !1 : (slot.state = "idle", refreshSlot(slot), !0);
      },
      moveToPage,
      moveToTop,
      scrollLeft: () => scrollerApi.scrollLeft(),
      scrollTop,
      viewportWidth,
      pageOffset,
      centerPageNum() {
        for (let slot of pageSlots2)
          if (slot.elements && slot.kind !== "blank" && scrollerApi.slotContainsViewportTarget(slot.elements, props.direction))
            return slot.pageNum;
        return null;
      },
      isHitEndPage(point) {
        let pageNum = pageNumAtPoint(point);
        return pageNum !== null && slotFor(pageNum)?.kind === "end";
      },
      pageImageHeight(pageNum) {
        let slot = slotFor(pageNum);
        return slot?.image?.naturalHeight || slot?.height || null;
      },
      pageImageWidth(pageNum) {
        let slot = slotFor(pageNum);
        return slot?.image?.naturalWidth || slot?.width || null;
      },
      pageZoomScale(pageNum) {
        let slot = slotFor(pageNum), frameRect = slot?.elements?.frame.getBoundingClientRect(), imageWidth = slot?.image?.naturalWidth || slot?.width, imageHeight = slot?.image?.naturalHeight || slot?.height;
        if (!frameRect || !imageWidth || !imageHeight)
          return 1;
        let readerScale = Math.min(frameRect.width / imageWidth, frameRect.height / imageHeight), overlayScale = Math.min(1, viewportWidth() / imageWidth, viewportHeight() / imageHeight);
        return readerScale > 0 && overlayScale > 0 ? readerScale / overlayScale : 1;
      },
      pageNumAtPoint,
      startVerticalFlingFromDragVelocity(dragVelocityY, onStop) {
        flingAnimator.start({
          axis: "y",
          scroller,
          initialVelocity: -dragVelocityY,
          setScrollPosition: moveToTop,
          canRun: () => !disposed && props.navigationMode === "scroll" && !horizontalAxis(),
          onStop
        });
      },
      startHorizontalFlingFromDragVelocity(dragVelocityX, onStop) {
        flingAnimator.start({
          axis: "x",
          scroller,
          initialVelocity: -dragVelocityX * HORIZONTAL_FLING_VELOCITY_MULTIPLIER,
          maxVelocity: HORIZONTAL_FLING_MAX_VELOCITY,
          setScrollPosition: moveToLeft,
          canRun: () => !disposed && props.navigationMode === "scroll" && horizontalAxis(),
          onStop
        });
      }
    };
    untrack(() => props.actionsRef(actions)), createEffect(() => syncWindow(props.window)), createEffect(() => {
      let navigationMode = props.navigationMode, direction = props.direction, scrollFitImageSize = props.scrollFitImageSize, scrollSizeScale = props.scrollSizeScale;
      if (navigationMode !== "scroll") {
        setRenderedScrollSizeScale(1);
        return;
      }
      let anchor2 = scrollerApi.centerAnchor(), scaleRevision = ++scrollScaleRevision;
      setRenderedScrollSizeScale(scrollSizeScale), untrack(resizePages), queueMicrotask(() => {
        disposed || scaleRevision !== scrollScaleRevision || (anchor2 ? scrollerApi.restoreCenterAnchor(anchor2) : direction === "ttb" ? scrollerApi.centerHorizontal() : scrollerApi.centerVertical());
      });
    });
    let scrollStripStyle = () => (revision(), props.navigationMode !== "scroll" ? {} : props.direction === "ttb" ? {
      width: `${Math.max(viewportWidth(), ...pageSlots2.map((slot) => slot.frameWidth))}px`
    } : {
      height: `${Math.max(viewportHeight(), ...pageSlots2.map((slot) => slot.frameHeight))}px`,
      width: "max-content"
    }), stripClass = () => props.navigationMode === "paged" ? props.direction === "ttb" && props.pageLayout === "double" ? "grid grid-cols-2 auto-rows-[100%] w-full h-full gap-x-3px" : props.direction === "ttb" ? "flex flex-col w-full h-full" : `flex flex-row w-auto h-full${props.pageLayout === "double" ? " gap-3px" : ""}` : props.direction === "ttb" ? "flex flex-col min-h-full mx-auto py-56px px-0 pb-72px" : `flex flex-row min-w-full my-auto py-0 ${props.direction === "rtl" ? "pl-72px pr-56px" : "pl-56px pr-72px"}`;
    return onMount(() => {
      let observer = new ResizeObserver(() => {
        resizeFrame === null && (resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = null, untrack(resizePages);
        }));
      });
      observer.observe(scroller), onCleanup(() => observer.disconnect());
    }), onCleanup(() => {
      disposed = !0, stopMotion();
      for (let cached of cachedImages.values())
        cached.image.removeAttribute("src");
      cachedImages.clear(), cachedImageBytes = 0, resizeFrame !== null && (window.cancelAnimationFrame(resizeFrame), resizeFrame = null);
    }), (() => {
      var _el$ = _tmpl$40(), _el$2 = _el$.firstChild;
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
          get doublePageSide() {
            return doublePageSide(slot.pageNum, props.window.currentPageNum, props.navigationMode, props.pageLayout, props.direction);
          },
          get direction() {
            return props.direction;
          },
          get navigationMode() {
            return props.navigationMode;
          },
          get pageLayout() {
            return props.pageLayout;
          },
          slot,
          get revision() {
            return revision();
          },
          get visualIndex() {
            return visualSlotIndex(slot.index, slots().length);
          },
          onReloadPage: (pageNum) => props.callbacks.onReloadPage(pageNum)
        })
      })), createRenderEffect((_p$) => {
        var _v$ = "w-full h-full overflow-auto overscroll-contain scroll-auto cursor-grab scrollbar-hidden " + (props.navigationMode === "scroll" && props.direction === "ttb" ? "[touch-action:pan-x_pan-y] " : "touch-none ") + "[&[data-dragging=true]]:cursor-grabbing [&[data-dragging=true]]:select-none [#ehpeek-reader[data-navigation-mode=paged]_&]:overflow-hidden [#ehpeek-reader[data-navigation-mode=paged]_&]:touch-none [#ehpeek-reader[data-navigation-mode=paged]_&]:select-none", _v$2 = `ehpeek-reader-page-strip ${stripClass()}`, _v$3 = scrollStripStyle();
        return _v$ !== _p$.e && className(_el$, _p$.e = _v$), _v$2 !== _p$.t && className(_el$2, _p$.t = _v$2), _p$.a = style(_el$2, _v$3, _p$.a), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$;
    })();
  }
  function PageSlotView(props) {
    let node, frame, content = createMemo(() => (props.revision, {
      pageNum: props.slot.pageNum,
      kind: props.slot.kind,
      state: props.slot.state,
      errorMessage: props.slot.errorMessage ?? void 0
    })), image2 = createMemo(() => (props.revision, props.slot.state === "ready" ? props.slot.image : null)), slotStyle = createMemo(() => {
      props.revision;
      let frameShortSide = Math.min(props.slot.frameWidth, props.slot.frameHeight);
      return {
        "--reader-page-height": `${props.slot.frameHeight + PAGE_SLOT_SPACING}px`,
        "--reader-page-width": `${props.slot.frameWidth + PAGE_SLOT_SPACING}px`,
        "--reader-frame-width": `${props.slot.frameWidth}px`,
        "--reader-frame-height": `${props.slot.frameHeight}px`,
        "--reader-end-font-size": `${Math.max(10, frameShortSide * 0.11)}px`,
        "--reader-end-padding": `${Math.min(24, Math.max(4, frameShortSide * 0.06))}px`,
        order: String(props.visualIndex)
      };
    });
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
          return image2();
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
        var _v$4 = `ehpeek-page flex items-center ${props.doublePageSide === "left" ? "justify-end" : props.doublePageSide === "right" ? "justify-start" : "justify-center"} ${pageSlotClass(props.navigationMode, props.direction, props.pageLayout)}`, _v$5 = String(props.slot.pageNum), _v$6 = slotStyle();
        return _v$4 !== _p$.e && className(_el$3, _p$.e = _v$4), _v$5 !== _p$.t && setAttribute(_el$3, "data-ehpeek-page-num", _p$.t = _v$5), _p$.a = style(_el$3, _v$6, _p$.a), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$3;
    })();
  }
  function doublePageSide(pageNum, currentPageNum, navigationMode, pageLayout, direction) {
    if (navigationMode !== "paged" || pageLayout !== "double")
      return null;
    let firstInPair = Math.abs(pageNum - currentPageNum) % 2 === 0;
    return direction === "rtl" ? firstInPair ? "right" : "left" : firstInPair ? "left" : "right";
  }
  function pageSlotClass(navigationMode, direction, pageLayout) {
    return navigationMode === "scroll" ? direction === "ttb" ? "w-full h-[var(--reader-page-height)] items-start pb-sm" : "flex-[0_0_var(--reader-page-width)] w-[var(--reader-page-width)] h-full pr-sm" : direction === "ttb" ? pageLayout === "double" ? "w-full h-full" : "flex-[0_0_100%] w-full h-full" : pageLayout === "double" ? "h-full" : "flex-[0_0_100%] w-full h-full";
  }
  function PageSlotPlaceholder(props) {
    let stop = (event) => {
      event.preventDefault(), event.stopPropagation();
    };
    return (() => {
      var _el$5 = _tmpl$66();
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
              var _el$9 = _tmpl$74(), _el$0 = _el$9.firstChild;
              return insert(_el$0, () => props.text), _el$9;
            }
          });
        },
        get children() {
          return [(() => {
            var _el$6 = _tmpl$310();
            return _el$6.$$click = (event) => {
              stop(event), props.onReloadPage(props.content.pageNum);
            }, _el$6.$$pointerdown = stop, insert(_el$6, createComponent(Icon, {
              name: "refresh",
              size: 32
            })), createRenderEffect((_p$) => {
              var _v$7 = `${texts_default.reader.reloadPage} ${props.content.pageNum}`, _v$8 = texts_default.reader.reloadPage;
              return _v$7 !== _p$.e && setAttribute(_el$6, "aria-label", _p$.e = _v$7), _v$8 !== _p$.t && setAttribute(_el$6, "title", _p$.t = _v$8), _p$;
            }, {
              e: void 0,
              t: void 0
            }), _el$6;
          })(), (() => {
            var _el$7 = _tmpl$49();
            return insert(_el$7, () => texts_default.reader.failedPrefix), _el$7;
          })(), createComponent(Show, {
            get when() {
              return props.content.errorMessage;
            },
            get children() {
              var _el$8 = _tmpl$56();
              return insert(_el$8, () => props.content.errorMessage), _el$8;
            }
          })];
        }
      })), createRenderEffect((_p$) => {
        var _v$9 = props.content.state === "error" ? "flex w-full h-full flex-col items-center justify-center gap-lg bg-[var(--color-reader-surface)] p-xl text-[var(--color-danger)] text-center textsize-md font-700 leading-1" : "relative flex w-full h-full items-center justify-center bg-[var(--color-reader-surface)] text-[var(--color-reader-muted)] text-center " + (props.content.kind === "end" ? "p-[var(--reader-end-padding)] [direction:ltr] [font-size:min(var(--font-size-xl),var(--reader-end-font-size))] font-700 leading-[1.3] [unicode-bidi:plaintext]" : "text-[clamp(88px,25vw,180px)] desktop:text-[clamp(72px,10vw,140px)] font-mono font-850 leading-[1] [font-variant-numeric:tabular-nums]"), _v$0 = props.content.state === "loading" ? "status" : void 0, _v$1 = props.content.state === "loading" ? `${texts_default.reader.loading} ${props.text}` : void 0;
        return _v$9 !== _p$.e && className(_el$5, _p$.e = _v$9), _v$0 !== _p$.t && setAttribute(_el$5, "role", _p$.t = _v$0), _v$1 !== _p$.a && setAttribute(_el$5, "aria-label", _p$.a = _v$1), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$5;
    })();
  }
  function pageImageDom(pageNum, slotImage) {
    let image2 = document.createElement("img");
    return image2.className = "block w-full h-full object-contain select-none [-webkit-user-drag:none]", image2.alt = `Page ${pageNum}`, image2.decoding = "async", image2.loading = "eager", image2.draggable = !1, image2.setAttribute("fetchpriority", slotImage.highPriority ? "high" : "low"), image2.src = slotImage.imageUrl, slotImage.width && slotImage.height && (image2.width = slotImage.width, image2.height = slotImage.height), image2;
  }
  async function loadImage(image2) {
    if (!(image2.complete && image2.naturalWidth > 0)) {
      await new Promise((resolve, reject) => {
        image2.addEventListener("load", () => resolve(), {
          once: !0
        }), image2.addEventListener("error", () => reject(new Error(texts_default.errors.imageLoadFailed)), {
          once: !0
        });
      });
      try {
        await image2.decode();
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
      centerHorizontal() {
        element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
      },
      centerVertical() {
        element.scrollTop = Math.max(0, (element.scrollHeight - element.clientHeight) / 2);
      },
      centerAnchor() {
        let viewportRect = element.getBoundingClientRect(), centerX = viewportRect.left + viewportRect.width / 2, centerY = viewportRect.top + viewportRect.height / 2, pages = Array.from(element.querySelectorAll(".ehpeek-page")), closest = null;
        for (let node of pages) {
          let rect2 = node.getBoundingClientRect(), dx = centerX < rect2.left ? rect2.left - centerX : centerX > rect2.right ? centerX - rect2.right : 0, dy = centerY < rect2.top ? rect2.top - centerY : centerY > rect2.bottom ? centerY - rect2.bottom : 0, distance = Math.hypot(dx, dy);
          (!closest || distance < closest.distance) && (closest = {
            distance,
            node
          });
        }
        if (!closest)
          return null;
        let rect = closest.node.getBoundingClientRect(), pageNum = Number(closest.node.dataset.ehpeekPageNum || "");
        return Number.isFinite(pageNum) && rect.width > 0 && rect.height > 0 ? {
          pageNum,
          xRatio: (centerX - rect.left) / rect.width,
          yRatio: (centerY - rect.top) / rect.height
        } : null;
      },
      restoreCenterAnchor(anchor2) {
        let node = element.querySelector(`.ehpeek-page[data-ehpeek-page-num="${anchor2.pageNum}"]`);
        if (!node)
          return;
        let viewportRect = element.getBoundingClientRect(), pageRect = node.getBoundingClientRect(), centerX = viewportRect.left + viewportRect.width / 2, centerY = viewportRect.top + viewportRect.height / 2;
        element.scrollLeft += pageRect.left + pageRect.width * anchor2.xRatio - centerX, element.scrollTop += pageRect.top + pageRect.height * anchor2.yRatio - centerY;
      },
      moveToTop(scrollTop, bounds) {
        element.scrollTop = clampedTop(scrollTop, bounds);
      },
      slotTop(elements) {
        let elementsRect = elements.node.getBoundingClientRect(), scrollerRect = element.getBoundingClientRect();
        return element.scrollTop + elementsRect.top - scrollerRect.top;
      },
      slotLeft(elements) {
        let elementsRect = elements.node.getBoundingClientRect(), scrollerRect = element.getBoundingClientRect();
        return element.scrollLeft + elementsRect.left - scrollerRect.left;
      },
      slotOffset(elements, navigationMode, direction, pageLayout) {
        let pageRect = elements.node.getBoundingClientRect(), scrollerRect = element.getBoundingClientRect();
        return direction === "ttb" ? pageRect.top - scrollerRect.top : direction === "rtl" && (navigationMode === "scroll" || pageLayout === "double") ? pageRect.right - scrollerRect.right : pageRect.left - scrollerRect.left;
      },
      slotContainsViewportTarget(elements, direction) {
        let scrollerRect = element.getBoundingClientRect(), rect = elements.node.getBoundingClientRect();
        if (direction === "ttb") {
          let target2 = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
          return rect.top <= target2 && rect.bottom > target2;
        }
        let offset = Math.min(80, scrollerRect.width * 0.14), target = direction === "rtl" ? scrollerRect.right - offset : scrollerRect.left + offset;
        return rect.left <= target && rect.right > target;
      }
    };
  }
  function slotPlaceholderText(content) {
    return content.state === "error" ? texts_default.reader.failedPrefix : content.kind === "end" ? texts_default.reader.end : content.kind === "blank" ? "" : String(content.pageNum);
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
  function applyPageMetaToSlot(slot, page2) {
    let aspectRatio = normalizedAspectRatio(page2.aspectRatio, FALLBACK_ASPECT_RATIO);
    slot.aspectRatio === aspectRatio && slot.state !== "error" || (slot.aspectRatio = aspectRatio, slot.kind = "page", slot.state = "idle", slot.image = null, slot.errorMessage = null, slot.width = null, slot.height = null, slot.token += 1);
  }
  function clearNonPageSlotMeta(slot) {
    slot.kind !== "blank" && slot.kind !== "end" || (slot.state = "ready", slot.image = null, slot.errorMessage = null, slot.width = null, slot.height = null, slot.token += 1);
  }
  function pageSlotAspectRatio(slot) {
    return slot.width && slot.height && slot.width > 0 && slot.height > 0 ? slot.height / slot.width : normalizedAspectRatio(slot.aspectRatio, FALLBACK_ASPECT_RATIO);
  }
  function containFitScale(imageWidth, imageHeight, viewportWidth, viewportHeight) {
    return Math.min(Math.max(1, viewportWidth) / Math.max(1, imageWidth), Math.max(1, viewportHeight) / Math.max(1, imageHeight));
  }
  function containFitFrame(aspectRatio, viewportWidth, viewportHeight, scale = 1) {
    let width = Math.max(1, Math.min(Math.max(1, viewportWidth), Math.max(1, viewportHeight) / aspectRatio) * scale);
    return {
      height: width * aspectRatio,
      width
    };
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
  var _tmpl$41 = /* @__PURE__ */ template("<input type=range>"), PROGRESS_BAR_CLASS = "ehpeek-progress-bar", PROGRESS_BAR_CLASS_NAME = [PROGRESS_BAR_CLASS, "w-full h-[2.4em] px-[0.6em] py-0 m-0", "bg-transparent", "cursor-grab active:cursor-grabbing touch-none select-none", "[-webkit-appearance:none] [appearance:none]", "[--progress-bar-fill:0%] [--progress-bar-track-direction:to_right]", "[accent-color:var(--color-text)]"].join(" ");
  registerGlobalStyle(PROGRESS_BAR_CLASS, ProgressBar_default);
  function ProgressBar(props) {
    let input2;
    createEffect(() => {
      let direction = props.direction ?? "ltr";
      input2.min = String(props.min), input2.max = String(Math.max(1, props.max ?? props.min)), input2.step = String(props.step), input2.dir = direction, input2.style.setProperty("--progress-bar-track-direction", direction === "rtl" ? "to left" : "to right"), input2.style.setProperty("--progress-bar-fill", `${Math.min(100, Math.max(0, props.fillPercent ?? 0))}%`), !props.keepInputValue && props.value !== void 0 && (input2.value = String(props.value));
    });
    let currentValue = (event) => Number(event.currentTarget.value || "");
    return (() => {
      var _el$ = _tmpl$41();
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
        input2 = element, element.min = String(props.min), element.max = String(Math.max(1, props.max ?? props.min)), element.step = String(props.step), element.value = String(props.value ?? props.min);
      }, _el$), createRenderEffect((_p$) => {
        var _v$ = `${PROGRESS_BAR_CLASS_NAME}${props.class ? ` ${props.class}` : ""}`, _v$2 = String(props.min), _v$3 = String(Math.max(1, props.max ?? props.min)), _v$4 = String(props.step), _v$5 = props.direction ?? "ltr";
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
  var _tmpl$50 = /* @__PURE__ */ template('<div class="flex flex-row gap-md coarse:gap-lg"><button type=button></button><button type=button></button><button type=button></button><button type=button></button><button type=button>'), _tmpl$213 = /* @__PURE__ */ template('<div class="ehpeek-reader-fullscreen-status fixed z-3 flex items-center gap-sm pointer-events-none top-[calc(10px+env(safe-area-inset-top,0px))] left-[max(10px,env(safe-area-inset-left,0px))] py-xs px-md rounded-md bg-[var(--color-badge)] ehp-color-text font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap"role=status><span>'), _tmpl$311 = /* @__PURE__ */ template('<div class="fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65 pointer-events-auto"role=dialog aria-modal=true><div class="ehpeek-reader-download-dialog-panel w-full max-w-480px p-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] shadow-xl"><div class="flex items-center justify-between gap-md mb-lg"><div class="font-sans textsize-md font-700"></div><button type=button></button></div><div class="grid gap-md font-sans textsize-md">'), _tmpl$410 = /* @__PURE__ */ template('<div class=contents><div class="ehpeek-reader-toolbar fixed z-3 flex justify-end pointer-events-none top-[calc(10px+env(safe-area-inset-top,0px))] right-10px coarse:top-[calc(8px+env(safe-area-inset-top,0px))] coarse:right-8px"><div><div class="flex flex-row gap-md coarse:gap-lg"><button type=button>?</button><button type=button></button><button type=button></button><button type=button></button><button type=button></button><button type=button></button></div></div></div><div></div><div class="fixed z-2 flex items-center p-0 transition-[opacity,transform] duration-160 ease-in-out right-[max(12px,env(safe-area-inset-right,0px))] bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-[max(12px,env(safe-area-inset-left,0px))] [&amp;[data-open=false]]:opacity-0 [&amp;[data-open=false]]:translate-y-[calc(100%+16px)] [&amp;[data-open=false]]:pointer-events-none">'), _tmpl$57 = /* @__PURE__ */ template('<div class="fixed z-overlay top-1/2 left-1/2 max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-lg bg-[var(--color-badge)] ehp-color-text px-xl py-lg font-sans textsize-lg font-700 leading-[1.3] whitespace-pre-line text-center shadow-xl">'), _tmpl$67 = /* @__PURE__ */ template('<div class="grid gap-md"><button type=button><span class="textsize-md font-700"></span><span class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap textsize-sm opacity-75"></span></button><button type=button><span class="textsize-md font-700"></span><span class="textsize-sm opacity-75">'), READER_BUTTON_CLASS = ["inline-flex min-w-48px h-48px items-center justify-center px-md py-0 rounded-md coarse:min-w-64px coarse:h-64px coarse:px-lg coarse:rounded-lg", "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer font-sans textsize-md font-700 leading-1 disabled:opacity-40 disabled:cursor-default"].join(" "), READER_ICON_SIZE = "1.4em", TIME_FORMATTER = new Intl.DateTimeFormat(void 0, {
    hour: "2-digit",
    minute: "2-digit"
  }), DOWNLOAD_OPTION_CLASS = ["flex w-full min-h-lg flex-col items-start justify-center gap-xs px-lg py-md rounded-md", "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer text-left", "hover:bg-[var(--color-badge)] disabled:opacity-40 disabled:cursor-default"].join(" ");
  function Toolbar(props) {
    let [downloadDialogPageNum, setDownloadDialogPageNum] = createSignal(null), [helpOpen, setHelpOpen] = createSignal(!1), [moreOpen, setMoreOpen] = createSignal(!1), [controlChange, setControlChange] = createSignal(null), controlChangeTimer = null, fullscreenTime = createFullscreenTime(() => props.fullscreenActive), showControlChange = (message) => {
      controlChangeTimer !== null && window.clearTimeout(controlChangeTimer), setControlChange(message), controlChangeTimer = window.setTimeout(() => {
        setControlChange(null), controlChangeTimer = null;
      }, 1200);
    };
    return onCleanup(() => {
      controlChangeTimer !== null && window.clearTimeout(controlChangeTimer);
    }), createEffect(() => {
      props.open || setMoreOpen(!1);
    }), createEffect(() => {
      let pageNum = downloadDialogPageNum();
      pageNum !== null && pageNum !== props.progress.pageNum && setDownloadDialogPageNum(null);
    }), createEffect(() => {
      if (downloadDialogPageNum() === null)
        return;
      let closeOnEscape = (event) => {
        event.key === "Escape" && (event.preventDefault(), event.stopPropagation(), setDownloadDialogPageNum(null));
      };
      window.addEventListener("keydown", closeOnEscape, !0), onCleanup(() => window.removeEventListener("keydown", closeOnEscape, !0));
    }), (() => {
      var _el$ = _tmpl$410(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.nextSibling, _el$9 = _el$8.nextSibling, _el$0 = _el$9.nextSibling, _el$15 = _el$2.nextSibling, _el$18 = _el$15.nextSibling;
      return addEventListener(_el$2, "wheel", stopEvent), addEventListener(_el$2, "pointerdown", stopEvent, !0), addEventListener(_el$2, "click", stopEvent, !0), _el$5.$$click = () => setHelpOpen(!0), className(_el$5, READER_BUTTON_CLASS), _el$6.$$click = () => props.callbacks.onOpenOriginalPageClick(), className(_el$6, READER_BUTTON_CLASS), insert(_el$6, createComponent(Icon, {
        name: "external-link",
        size: READER_ICON_SIZE
      })), _el$7.$$click = () => setMoreOpen((open) => !open), className(_el$7, READER_BUTTON_CLASS), insert(_el$7, createComponent(Icon, {
        name: "book-open",
        size: READER_ICON_SIZE
      })), _el$8.$$click = () => setDownloadDialogPageNum(props.progress.pageNum), className(_el$8, READER_BUTTON_CLASS), insert(_el$8, createComponent(Icon, {
        name: "download",
        size: READER_ICON_SIZE
      })), _el$9.$$click = () => props.callbacks.onFullscreenClick(), className(_el$9, READER_BUTTON_CLASS), insert(_el$9, createComponent(Icon, {
        get name() {
          return props.fullscreenActive ? "fullscreen-exit" : "fullscreen";
        },
        size: READER_ICON_SIZE
      })), _el$0.$$click = () => props.callbacks.onCloseClick(), className(_el$0, READER_BUTTON_CLASS), insert(_el$0, createComponent(Icon, {
        name: "close",
        size: READER_ICON_SIZE
      })), insert(_el$3, createComponent(Show, {
        get when() {
          return moreOpen();
        },
        get children() {
          var _el$1 = _tmpl$50(), _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$11.nextSibling, _el$13 = _el$12.nextSibling, _el$14 = _el$13.nextSibling;
          return _el$10.$$click = () => {
            let navigationMode = props.controls.navigationMode === "scroll" ? "paged" : "scroll";
            props.callbacks.onControlsChange({
              ...props.controls,
              navigationMode
            }), showControlChange(navigationMode === "paged" ? texts_default.reader.pagedMode : texts_default.reader.scrollMode);
          }, className(_el$10, READER_BUTTON_CLASS), insert(_el$10, createComponent(Icon, {
            get name() {
              return props.controls.navigationMode === "paged" ? "page" : "pages";
            },
            size: READER_ICON_SIZE
          })), _el$11.$$click = () => {
            let direction = props.controls.direction === "rtl" ? "ltr" : props.controls.direction === "ltr" ? "ttb" : "rtl";
            props.callbacks.onControlsChange({
              ...props.controls,
              direction
            }), showControlChange(direction === "rtl" ? texts_default.reader.directionRtl : direction === "ltr" ? texts_default.reader.directionLtr : texts_default.reader.directionTtb);
          }, className(_el$11, READER_BUTTON_CLASS), insert(_el$11, createComponent(Icon, {
            get name() {
              return memo(() => props.controls.direction === "rtl")() ? "arrow-left" : props.controls.direction === "ltr" ? "arrow-right" : "arrow-down";
            },
            size: READER_ICON_SIZE
          })), _el$12.$$click = () => {
            let pageLayout = props.controls.pageLayout === "single" ? "double" : "single";
            props.callbacks.onControlsChange({
              ...props.controls,
              pageLayout
            }), showControlChange(pageLayout === "double" ? texts_default.reader.doublePageMode : texts_default.reader.singlePageMode);
          }, className(_el$12, READER_BUTTON_CLASS), insert(_el$12, () => props.controls.pageLayout === "double" ? "2P" : "1P"), _el$13.$$click = () => {
            let rightTapAction = props.controls.rightTapAction === "previous" ? "next" : "previous";
            props.callbacks.onControlsChange({
              ...props.controls,
              rightTapAction
            }), showControlChange(rightTapAction === "previous" ? texts_default.reader.rightTapPrevious : texts_default.reader.rightTapNext);
          }, className(_el$13, READER_BUTTON_CLASS), insert(_el$13, () => props.controls.rightTapAction === "previous" ? "R-" : "R+"), _el$14.$$click = () => props.callbacks.onViewportAdjustClick(), className(_el$14, READER_BUTTON_CLASS), insert(_el$14, createComponent(Icon, {
            name: "viewport",
            size: READER_ICON_SIZE
          })), createRenderEffect((_p$) => {
            var _v$ = props.controls.navigationMode === "scroll" ? texts_default.reader.scrollMode : texts_default.reader.pagedMode, _v$2 = props.controls.navigationMode === "scroll" ? texts_default.reader.scrollMode : texts_default.reader.pagedMode, _v$3 = props.controls.direction === "rtl" ? texts_default.reader.directionRtl : props.controls.direction === "ltr" ? texts_default.reader.directionLtr : texts_default.reader.directionTtb, _v$4 = props.controls.pageLayout === "double" ? texts_default.reader.doublePageMode : texts_default.reader.singlePageMode, _v$5 = props.controls.navigationMode !== "paged", _v$6 = props.controls.rightTapAction === "previous" ? texts_default.reader.rightTapPrevious : texts_default.reader.rightTapNext, _v$7 = texts_default.reader.adjustScrollViewport, _v$8 = texts_default.reader.adjustScrollViewport, _v$9 = props.controls.navigationMode !== "scroll";
            return _v$ !== _p$.e && setAttribute(_el$10, "aria-label", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$10, "title", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$11, "aria-label", _p$.a = _v$3), _v$4 !== _p$.o && setAttribute(_el$12, "aria-label", _p$.o = _v$4), _v$5 !== _p$.i && (_el$12.disabled = _p$.i = _v$5), _v$6 !== _p$.n && setAttribute(_el$13, "aria-label", _p$.n = _v$6), _v$7 !== _p$.s && setAttribute(_el$14, "aria-label", _p$.s = _v$7), _v$8 !== _p$.h && setAttribute(_el$14, "title", _p$.h = _v$8), _v$9 !== _p$.r && (_el$14.disabled = _p$.r = _v$9), _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0,
            i: void 0,
            n: void 0,
            s: void 0,
            h: void 0,
            r: void 0
          }), _el$1;
        }
      }), null), insert(_el$15, () => pageNumberText(props.progress.pageNum, props.progress.totalPages, props.controls.navigationMode, props.controls.pageLayout)), insert(_el$, createComponent(Show, {
        get when() {
          return props.fullscreenActive;
        },
        get children() {
          var _el$16 = _tmpl$213(), _el$17 = _el$16.firstChild;
          return insert(_el$17, fullscreenTime), _el$16;
        }
      }), _el$18), insert(_el$, createComponent(Show, {
        get when() {
          return controlChange();
        },
        keyed: !0,
        children: (message) => (() => {
          var _el$25 = _tmpl$57();
          return insert(_el$25, message), _el$25;
        })()
      }), _el$18), addEventListener(_el$18, "wheel", stopEvent), addEventListener(_el$18, "pointerdown", stopEvent, !0), addEventListener(_el$18, "click", stopEvent, !0), insert(_el$18, createComponent(ProgressBar, {
        class: "ehpeek-reader-progress textsize-lg",
        get direction() {
          return props.controls.direction === "rtl" ? "rtl" : "ltr";
        },
        get fillPercent() {
          return progressFillPercent(props.progress);
        },
        get keepInputValue() {
          return props.progress.keepInputValue;
        },
        get max() {
          return Math.max(1, props.progress.maxProgressPageNum);
        },
        min: 1,
        step: 1,
        get value() {
          return props.progress.pageNum;
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
          return memo(() => downloadDialogPageNum() !== null)() && props.downloadInfos.length > 0;
        },
        get children() {
          var _el$19 = _tmpl$311(), _el$20 = _el$19.firstChild, _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$21.nextSibling;
          return addEventListener(_el$19, "wheel", stopEvent), addEventListener(_el$19, "pointerdown", stopEvent, !0), _el$19.$$click = (event) => {
            event.stopPropagation(), event.target === event.currentTarget && setDownloadDialogPageNum(null);
          }, insert(_el$22, () => `${texts_default.reader.download} · ${props.downloadInfos.map((info) => info.pageNum).join(", ")}`), _el$23.$$click = () => setDownloadDialogPageNum(null), className(_el$23, READER_BUTTON_CLASS), insert(_el$23, createComponent(Icon, {
            name: "close",
            size: READER_ICON_SIZE
          })), insert(_el$24, createComponent(For, {
            get each() {
              return props.downloadInfos;
            },
            children: (downloadInfo) => (() => {
              var _el$26 = _tmpl$67(), _el$27 = _el$26.firstChild, _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling, _el$30 = _el$27.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling;
              return _el$27.$$click = () => startImageDownload(downloadInfo.currentImageUrl, downloadInfo.currentFileName), className(_el$27, DOWNLOAD_OPTION_CLASS), insert(_el$28, () => `${texts_default.reader.downloadDisplayedImage} · ${downloadInfo.pageNum}`), insert(_el$29, () => downloadInfo.currentFileName), _el$30.$$click = () => {
                downloadInfo.originalImageUrl && startImageDownload(downloadInfo.originalImageUrl);
              }, className(_el$30, DOWNLOAD_OPTION_CLASS), insert(_el$31, () => `${texts_default.reader.downloadOriginalImage} · ${downloadInfo.pageNum}`), insert(_el$32, (() => {
                var _c$ = memo(() => !!downloadInfo.originalImageUrl);
                return () => _c$() ? texts_default.reader.originalImageSource : texts_default.reader.originalImageUnavailable;
              })()), createRenderEffect(() => _el$30.disabled = !downloadInfo.originalImageUrl), _el$26;
            })()
          })), createRenderEffect((_p$) => {
            var _v$0 = texts_default.reader.download, _v$1 = texts_default.button.close, _v$10 = texts_default.button.close;
            return _v$0 !== _p$.e && setAttribute(_el$19, "aria-label", _p$.e = _v$0), _v$1 !== _p$.t && setAttribute(_el$23, "title", _p$.t = _v$1), _v$10 !== _p$.a && setAttribute(_el$23, "aria-label", _p$.a = _v$10), _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          }), _el$19;
        }
      }), null), insert(_el$, createComponent(Show, {
        get when() {
          return helpOpen();
        },
        get children() {
          return createComponent(InteractionHelp, {
            variant: "reader",
            onClose: () => setHelpOpen(!1)
          });
        }
      }), null), createRenderEffect((_p$) => {
        var _v$11 = `ehpeek-reader-toolbar-buttons flex flex-col items-end gap-md coarse:gap-lg pointer-events-auto${props.open ? "" : " !hidden"}`, _v$12 = texts_default.help.title, _v$13 = texts_default.help.title, _v$14 = texts_default.reader.readingOptions, _v$15 = texts_default.reader.readingOptions, _v$16 = moreOpen(), _v$17 = props.downloadInfos.length === 0, _v$18 = "ehpeek-reader-page-number fixed z-3 pointer-events-none " + (moreOpen() ? "top-[calc(130px+env(safe-area-inset-top,0px))] coarse:top-[calc(160px+env(safe-area-inset-top,0px))] landscape:top-[calc(122px+env(safe-area-inset-top,0px))] coarse-landscape:top-[calc(150px+env(safe-area-inset-top,0px))] " : "top-[calc(70px+env(safe-area-inset-top,0px))] coarse:top-[calc(80px+env(safe-area-inset-top,0px))] landscape:top-[calc(62px+env(safe-area-inset-top,0px))] coarse-landscape:top-[calc(74px+env(safe-area-inset-top,0px))] ") + "left-1/2 right-auto -translate-x-1/2 landscape:left-auto landscape:right-10px landscape:translate-x-0 coarse-landscape:right-8px min-w-64px landscape:min-w-0 max-w-none landscape:max-w-[calc(100vw-20px)] coarse-landscape:max-w-[calc(100vw-16px)] py-xs px-md rounded-md bg-[var(--color-badge)] ehp-color-text font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap text-center landscape:text-right", _v$19 = props.controls.navigationMode === "scroll" && !props.open && !props.fullscreenActive, _v$20 = String(props.open);
        return _v$11 !== _p$.e && className(_el$3, _p$.e = _v$11), _v$12 !== _p$.t && setAttribute(_el$5, "aria-label", _p$.t = _v$12), _v$13 !== _p$.a && setAttribute(_el$5, "title", _p$.a = _v$13), _v$14 !== _p$.o && setAttribute(_el$7, "aria-label", _p$.o = _v$14), _v$15 !== _p$.i && setAttribute(_el$7, "title", _p$.i = _v$15), _v$16 !== _p$.n && setAttribute(_el$7, "aria-expanded", _p$.n = _v$16), _v$17 !== _p$.s && (_el$8.disabled = _p$.s = _v$17), _v$18 !== _p$.h && className(_el$15, _p$.h = _v$18), _v$19 !== _p$.r && (_el$15.hidden = _p$.r = _v$19), _v$20 !== _p$.d && setAttribute(_el$18, "data-open", _p$.d = _v$20), _p$;
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
        d: void 0
      }), _el$;
    })();
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
  function pageNumberText(pageNum, totalPages, navigationMode, pageLayout) {
    if (totalPages && pageNum === totalPages + 1)
      return texts_default.reader.endPage;
    if (!totalPages)
      return navigationMode === "paged" && pageLayout === "double" ? `${pageNum}–${pageNum + 1}` : String(pageNum);
    let doublePageEnd = Math.min(totalPages, pageNum + 1);
    return navigationMode === "paged" && pageLayout === "double" && doublePageEnd > pageNum ? `${pageNum}–${doublePageEnd} / ${totalPages}` : `${pageNum} / ${totalPages}`;
  }
  delegateEvents(["click", "pointerdown"]);

  // src/components/Reader/ZoomOverlay.tsx
  var _tmpl$51 = /* @__PURE__ */ template('<div class="fixed inset-0 z-4 flex items-center justify-center overflow-hidden ehp-color-reader pointer-events-none"><img class="block max-w-screen max-h-screen object-contain origin-center select-none will-change-transform [-webkit-user-drag:none]">'), MIN_SCALE = 1, MAX_SCALE = 5, CLOSE_SCALE = 1.02;
  function ZoomOverlay(props) {
    let [transform, setTransform] = createSignal("translate3d(0px, 0px, 0) scale(1)"), element, scale = 1, requestedScale = 1, closeScale = CLOSE_SCALE, minScale = MIN_SCALE, maxScale = MAX_SCALE, offsetX = 0, offsetY = 0, pinchStartScale = 1, pinchStartOffsetX = 0, pinchStartOffsetY = 0, pinchStartCenterX = 0, pinchStartCenterY = 0, dragStartOffsetX = 0, dragStartOffsetY = 0, renderTransform = () => {
      setTransform(`translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`);
    }, startPinch = (pinch) => {
      pinchStartScale = scale, pinchStartOffsetX = offsetX, pinchStartOffsetY = offsetY, pinchStartCenterX = pinch.centerX, pinchStartCenterY = pinch.centerY;
    }, actions = {
      reset(reset2) {
        scale = Math.max(0.01, reset2.scale), requestedScale = scale, closeScale = scale * CLOSE_SCALE, minScale = Math.min(MIN_SCALE, scale), maxScale = Math.max(MAX_SCALE, scale * MAX_SCALE), offsetX = 0, offsetY = 0, startPinch(reset2), renderTransform();
      },
      startPinch,
      movePinch(pinch) {
        if (!props.image)
          return;
        requestedScale = pinchStartScale * pinch.scale, scale = clamp(requestedScale, minScale, maxScale);
        let rect = element.getBoundingClientRect(), viewportCenterX = rect.left + rect.width / 2, viewportCenterY = rect.top + rect.height / 2, ratio = scale / pinchStartScale;
        offsetX = pinch.centerX - viewportCenterX - (pinchStartCenterX - viewportCenterX - pinchStartOffsetX) * ratio, offsetY = pinch.centerY - viewportCenterY - (pinchStartCenterY - viewportCenterY - pinchStartOffsetY) * ratio, renderTransform();
      },
      moveWheel(wheel) {
        if (!props.image)
          return;
        let nextScale = clamp(scale * Math.exp(-clamp(wheel.delta, -100, 100) * 25e-4), minScale, maxScale);
        if (nextScale === scale)
          return;
        let rect = element.getBoundingClientRect(), viewportCenterX = rect.left + rect.width / 2, viewportCenterY = rect.top + rect.height / 2, ratio = nextScale / scale;
        offsetX = wheel.centerX - viewportCenterX - (wheel.centerX - viewportCenterX - offsetX) * ratio, offsetY = wheel.centerY - viewportCenterY - (wheel.centerY - viewportCenterY - offsetY) * ratio, scale = nextScale, requestedScale = nextScale, renderTransform();
      },
      endPinch() {
        if (requestedScale <= closeScale) {
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
    return untrack(() => props.actionsRef(actions)), (() => {
      var _el$ = _tmpl$51(), _el$2 = _el$.firstChild, _ref$ = element;
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

  // src/components/Reader/session.ts
  var DEFAULT_WINDOW_SIZE = 10, DEFAULT_FAR_CONCURRENT_LOADS = 6, ReaderSession = class {
    constructor(options) {
      this.animationFrames = /* @__PURE__ */ new Set();
      this.timers = /* @__PURE__ */ new Set();
      this.disposed = !1;
      this.imageQueue = new PriorityLoadQueue(
        options.concurrentLoads
      );
      let navigationMode = state.reader.navigationMode.value, [controls, setControls] = createSignal({
        navigationMode,
        direction: navigationMode === "scroll" ? state.reader.scrollDirection.value : state.reader.pagedDirection.value,
        pageLayout: state.reader.pageLayout.value,
        rightTapAction: state.reader.rightTapAction.value
      }), [toolbarOpen, setToolbarOpen] = createSignal(!1), [viewportWindow, setViewportWindow] = createSignal(initialViewportWindow(options)), [zoomImage, setZoomImage] = createSignal(null), [currentPageNum, setCurrentPageNum] = createSignal(initialPageNumber(options)), [direction, setDirection] = createSignal(1), [downloadInfos, setDownloadInfos] = createSignal([]), [maxProgressPageNum, setMaxProgressPageNum] = createSignal(initialMaxProgressPageNumber(options)), [progressInputActive, setProgressInputActive] = createSignal(!1), [scrollBarVisible, setScrollBarVisible] = createSignal(!1), [scrollBarExpanded, setScrollBarExpanded] = createSignal(!1), [scrollViewportAdjusting, setScrollViewportAdjusting] = createSignal(!1), [scrollViewportTtbScale, setScrollViewportTtbScale] = createSignal(
        state.reader.scrollTtbScale.value
      ), [scrollViewportHorizontalScale, setScrollViewportHorizontalScale] = createSignal(
        state.reader.scrollHorizontalScale.value
      ), [scrollFitImageSize, setScrollFitImageSize] = createSignal(null), [readerViewportWidth, setReaderViewportWidth] = createSignal(Math.max(1, window.innerWidth)), [readerViewportHeight, setReaderViewportHeight] = createSignal(Math.max(1, window.innerHeight)), scrollViewportSizeScale = () => controls().direction === "ttb" ? scrollViewportTtbScale() : scrollViewportHorizontalScale(), setScrollViewportSizeScale = (scale) => {
        controls().direction === "ttb" ? setScrollViewportTtbScale(scale) : setScrollViewportHorizontalScale(scale);
      }, scrollFitScale = () => {
        let imageSize = scrollFitImageSize();
        return imageSize ? containFitScale(
          imageSize.width,
          imageSize.height,
          readerViewportWidth(),
          readerViewportHeight()
        ) : null;
      };
      this.state = {
        navi: {
          currentPageNum,
          direction,
          setCurrentPageNum,
          setDirection,
          setViewportWindow,
          viewportWindow,
          leftDragDelta: () => controls().direction === "rtl" ? -1 : 1,
          leftTapDelta: () => controls().rightTapAction === "previous" ? 1 : -1,
          rightDragDelta: () => controls().direction === "rtl" ? 1 : -1,
          rightTapDelta: () => controls().rightTapAction === "previous" ? -1 : 1,
          downloadInfos,
          maxProgressPageNum,
          progressInputActive,
          setDownloadInfos,
          setMaxProgressPageNum,
          setProgressInputActive
        },
        ctrls: { update: setControls, value: controls },
        toolbar: {
          open: toolbarOpen,
          toggle: () => setToolbarOpen((open) => !open)
        },
        scrollBar: {
          expanded: scrollBarExpanded,
          updateExpanded: setScrollBarExpanded,
          updateVisible: setScrollBarVisible,
          visible: scrollBarVisible
        },
        scrollViewport: {
          adjusting: scrollViewportAdjusting,
          scaleMode: () => scrollViewportSizeScale() === null ? "fit" : scrollViewportSizeScale() === "one-to-one" ? "one-to-one" : "custom",
          scalePercent: () => {
            let sizeScale = scrollViewportSizeScale();
            if (sizeScale === "one-to-one")
              return 100;
            let fitScale = scrollFitScale();
            return fitScale ? (sizeScale ?? 1) * fitScale * 100 : null;
          },
          fitImageSize: scrollFitImageSize,
          fitScale: scrollFitScale,
          setAdjusting: setScrollViewportAdjusting,
          setFitImageSize: setScrollFitImageSize,
          setViewportWidth: setReaderViewportWidth,
          setSizeScale: setScrollViewportSizeScale,
          setViewportHeight: setReaderViewportHeight,
          viewportWidth: readerViewportWidth,
          viewportHeight: readerViewportHeight,
          sizeScale: scrollViewportSizeScale
        },
        overlay: { image: zoomImage, update: setZoomImage }
      };
    }
    setTimeout(callback, delay) {
      let timer = window.setTimeout(() => {
        this.timers.delete(timer), callback();
      }, delay);
      return this.timers.add(timer), timer;
    }
    clearTimeout(timer) {
      timer !== null && (window.clearTimeout(timer), this.timers.delete(timer));
    }
    requestAnimationFrame(callback) {
      let frame = window.requestAnimationFrame((time) => {
        this.animationFrames.delete(frame), callback(time);
      });
      return this.animationFrames.add(frame), frame;
    }
    cancelAnimationFrame(frame) {
      frame !== null && (window.cancelAnimationFrame(frame), this.animationFrames.delete(frame));
    }
    dispose() {
      if (!this.disposed) {
        this.disposed = !0;
        for (let timer of this.timers)
          window.clearTimeout(timer);
        for (let frame of this.animationFrames)
          window.cancelAnimationFrame(frame);
        this.imageQueue.dispose(), this.timers.clear(), this.animationFrames.clear();
      }
    }
  };
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
  function initialMaxProgressPageNumber(options) {
    return options.totalPages && options.totalPages > 0 ? options.totalPages + 1 : 1;
  }
  var PriorityLoadQueue = class {
    constructor(concurrentLoads = DEFAULT_FAR_CONCURRENT_LOADS) {
      this.concurrentLoads = concurrentLoads;
      this.pending = /* @__PURE__ */ new Map();
      this.active = /* @__PURE__ */ new Set();
      this.timer = null;
      this.disposed = !1;
      this.callbacks = {};
    }
    updateCallbacks(callbacks) {
      this.callbacks = callbacks, this.schedule();
    }
    dispose() {
      this.disposed = !0, this.pending.clear(), this.timer !== null && (window.clearTimeout(this.timer), this.timer = null);
    }
    sync(targets) {
      this.pending = new Map(targets.filter(({ key }) => !this.active.has(key)).map((target) => [target.key, target])), this.schedule();
    }
    schedule() {
      this.timer !== null || this.disposed || !this.callbacks.loadTarget || (this.timer = window.setTimeout(() => {
        this.timer = null, this.process();
      }, 0));
    }
    process() {
      if (!this.disposed)
        for (; this.active.size < this.concurrentLoads; ) {
          let next = Array.from(this.pending.values()).sort((left, right) => left.priority - right.priority)[0];
          if (!next)
            return;
          this.pending.delete(next.key), this.start(next);
        }
    }
    start({ key, target }) {
      let { loadTarget, markLoading, onLoaded, onError } = this.callbacks;
      if (!loadTarget || !markLoading || !onLoaded || !onError)
        return;
      let token = markLoading(target);
      token !== null && (this.active.add(key), loadTarget(target).then((loaded) => {
        this.disposed || onLoaded(target, loaded, token);
      }).catch((error) => {
        this.disposed || onError(target, error, token);
      }).finally(() => {
        this.active.delete(key), this.process();
      }));
    }
  };

  // src/components/Reader/ScrollBar.tsx
  var _tmpl$58 = /* @__PURE__ */ template('<div><div class="absolute inset-y-0 right-2px w-3px bg-[var(--color-reader-border)]"></div><div><span>');
  function ReaderScrollBar(props) {
    let track, thumb, [dragging, setDragging] = createSignal(!1), dragOffset = 0, expanded = () => props.expanded || dragging(), interactionWidth = () => expanded() ? "w-18px coarse:w-24px" : "w-10px coarse:w-12px", position = () => props.totalPages <= 1 ? 0 : (props.currentPage - 1) / (props.totalPages - 1) * 100, pageAt = (clientY) => {
      let trackRect = track.getBoundingClientRect(), travel = Math.max(1, trackRect.height - thumb.offsetHeight), ratio = clamp((clientY - trackRect.top - dragOffset) / travel, 0, 1);
      return Math.round(1 + ratio * (props.totalPages - 1));
    }, updatePage = (clientY) => {
      let page2 = pageAt(clientY);
      return props.callbacks.onProgressInput(page2), page2;
    };
    return (() => {
      var _el$ = _tmpl$58(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.firstChild;
      _el$.addEventListener("wheel", (event) => event.stopPropagation()), _el$.addEventListener("pointercancel", (event) => {
        dragging() && (setDragging(!1), track.releasePointerCapture(event.pointerId), props.callbacks.onProgressCommit(props.currentPage));
      }), _el$.$$pointerup = (event) => {
        if (!dragging())
          return;
        setDragging(!1);
        let page2 = updatePage(event.clientY);
        track.releasePointerCapture(event.pointerId), props.callbacks.onProgressCommit(page2);
      }, _el$.$$pointermove = (event) => {
        dragging() && updatePage(event.clientY);
      }, _el$.$$pointerdown = (event) => {
        event.preventDefault(), event.stopPropagation(), setDragging(!0), track.setPointerCapture(event.pointerId);
        let thumbRect = thumb.getBoundingClientRect();
        dragOffset = event.target instanceof Node && thumb.contains(event.target) ? event.clientY - thumbRect.top : thumbRect.height / 2, props.callbacks.onProgressPointerDown(event), updatePage(event.clientY);
      }, _el$.$$contextmenu = (event) => {
        event.preventDefault(), event.stopPropagation();
      }, _el$.$$click = (event) => event.stopPropagation();
      var _ref$ = track;
      typeof _ref$ == "function" ? use(_ref$, _el$) : track = _el$;
      var _ref$2 = thumb;
      return typeof _ref$2 == "function" ? use(_ref$2, _el$3) : thumb = _el$3, createRenderEffect((_p$) => {
        var _v$ = `fixed inset-y-0 right-0 z-2 ${interactionWidth()} touch-none select-none transition-[width,opacity] duration-160 ease-in-out ` + (props.visible || dragging() ? "opacity-100" : "opacity-0 pointer-events-none"), _v$2 = `absolute right-0 flex ${interactionWidth()} h-[120px] coarse:h-[200px] items-center justify-end cursor-grab active:cursor-grabbing transition-[width] duration-160`, _v$3 = `${position()}%`, _v$4 = `translateY(-${position()}%)`, _v$5 = `block h-full rounded-l-md bg-[var(--color-reader-scrollbar)] shadow-[0_2px_10px_var(--color-shadow-control)] transition-[width] duration-160 ${expanded() ? "w-18px coarse:w-24px" : "w-10px coarse:w-12px"}`;
        return _v$ !== _p$.e && className(_el$, _p$.e = _v$), _v$2 !== _p$.t && className(_el$3, _p$.t = _v$2), _v$3 !== _p$.a && setStyleProperty(_el$3, "top", _p$.a = _v$3), _v$4 !== _p$.o && setStyleProperty(_el$3, "transform", _p$.o = _v$4), _v$5 !== _p$.i && className(_el$4, _p$.i = _v$5), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      }), _el$;
    })();
  }
  delegateEvents(["click", "contextmenu", "pointerdown", "pointermove", "pointerup"]);

  // src/components/Reader/ViewportCanvas.tsx
  var _tmpl$59 = /* @__PURE__ */ template('<div class="absolute inset-0 z-2 touch-none select-none">'), _tmpl$214 = /* @__PURE__ */ template("<span>"), _tmpl$312 = /* @__PURE__ */ template('<div class="fixed bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-1/2 z-3 flex w-[min(680px,calc(100vw-24px))] -translate-x-1/2 flex-col items-center gap-sm rounded-lg border border-[var(--color-reader-border)] bg-[var(--color-control)] p-sm shadow-xl landscape:w-[min(600px,calc(100vw-24px))]"role=toolbar><div class="grid w-full grid-cols-[48px_minmax(64px,1fr)_64px_64px] items-center justify-center gap-sm coarse:grid-cols-[48px_minmax(40px,1fr)_80px_80px]"><span class="flex w-full flex-col items-center justify-center text-center font-mono textsize-sm font-600 leading-[1.05]"><span></span></span><input type=range class="w-full min-w-0 accent-[var(--color-reader-accent)]"min=10 max=500 step=1><button type=button></button><button type=button>1:1</button></div><div class="grid w-fit max-w-full grid-cols-[auto_96px_96px] items-stretch justify-center gap-sm coarse:w-full coarse:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]"><button type=button></button><button type=button></button><button type=button>'), _tmpl$411 = /* @__PURE__ */ template('<div class="fixed inset-0 z-1">'), MIN_SCALE_PERCENT = 10, MAX_SCALE_PERCENT = 500;
  function ViewportCanvas(props) {
    let pointers = /* @__PURE__ */ new Map(), pinchStart = null, interactionLayer, sliderPercent = () => Math.min(MAX_SCALE_PERCENT, Math.max(MIN_SCALE_PERCENT, props.scalePercent ?? 100)), clampScale = (scale) => Math.min(MAX_SCALE_PERCENT / 100, Math.max(MIN_SCALE_PERCENT / 100, scale)), stopInteraction = (event) => {
      event.preventDefault(), event.stopPropagation();
    }, endPointer = (event) => {
      pointers.delete(event.pointerId), pointers.size < 2 && (pinchStart = null);
    };
    return createEffect(() => {
      props.adjusting || (pointers.clear(), pinchStart = null);
    }), (() => {
      var _el$ = _tmpl$411();
      return insert(_el$, () => props.children, null), insert(_el$, createComponent(Show, {
        get when() {
          return props.adjusting;
        },
        get children() {
          return [(() => {
            var _el$2 = _tmpl$59();
            _el$2.addEventListener("pointercancel", endPointer), _el$2.$$pointerup = endPointer, _el$2.$$pointermove = (event) => {
              if (!pointers.has(event.pointerId) || (pointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY
              }), !pinchStart || pointers.size < 2))
                return;
              let [first, second] = Array.from(pointers.values());
              if (!first || !second)
                return;
              let distance = Math.hypot(second.x - first.x, second.y - first.y);
              props.callbacks.onScaleChange(clampScale(pinchStart.scale * distance / pinchStart.distance));
            }, _el$2.$$pointerdown = (event) => {
              if (stopInteraction(event), pointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY
              }), interactionLayer.setPointerCapture(event.pointerId), pointers.size !== 2)
                return;
              let [first, second] = Array.from(pointers.values());
              !first || !second || (pinchStart = {
                distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
                scale: (props.scalePercent ?? 100) / 100
              });
            }, _el$2.addEventListener("wheel", (event) => {
              stopInteraction(event);
              let deltaPixels = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? interactionLayer.clientHeight : 1);
              props.callbacks.onScaleChange(clampScale((props.scalePercent ?? 100) / 100 * Math.exp(-deltaPixels * 15e-4)));
            }), _el$2.$$click = stopInteraction;
            var _ref$ = interactionLayer;
            return typeof _ref$ == "function" ? use(_ref$, _el$2) : interactionLayer = _el$2, _el$2;
          })(), (() => {
            var _el$3 = _tmpl$312(), _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$7 = _el$5.firstChild, _el$8 = _el$5.nextSibling, _el$9 = _el$8.nextSibling, _el$0 = _el$9.nextSibling, _el$1 = _el$4.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$11.nextSibling;
            return insert(_el$5, createComponent(Show, {
              get when() {
                return props.scaleMode !== "custom";
              },
              get children() {
                var _el$6 = _tmpl$214();
                return insert(_el$6, (() => {
                  var _c$ = memo(() => props.scaleMode === "fit");
                  return () => _c$() ? texts_default.reader.fit : "1:1";
                })()), _el$6;
              }
            }), _el$7), insert(_el$7, (() => {
              var _c$2 = memo(() => props.scalePercent === null);
              return () => _c$2() ? "—" : `${Math.round(props.scalePercent)}%`;
            })()), _el$8.$$input = (event) => props.callbacks.onScaleChange(event.currentTarget.valueAsNumber / 100), _el$9.$$click = () => props.callbacks.onFit(), className(_el$9, `${READER_BUTTON_CLASS} w-full`), insert(_el$9, () => texts_default.reader.fit), _el$0.$$click = () => props.callbacks.onOneToOne(), className(_el$0, `${READER_BUTTON_CLASS} w-full`), _el$10.$$click = () => props.callbacks.onApplyAll(), className(_el$10, `${READER_BUTTON_CLASS} w-full whitespace-normal leading-[1.1]`), insert(_el$10, () => texts_default.reader.applyGlobally), _el$11.$$click = () => props.callbacks.onApply(), className(_el$11, `${READER_BUTTON_CLASS} w-full`), insert(_el$11, () => texts_default.button.apply), _el$12.$$click = () => props.callbacks.onClose(), className(_el$12, `${READER_BUTTON_CLASS} w-full`), insert(_el$12, () => texts_default.button.close), createRenderEffect((_p$) => {
              var _v$ = texts_default.reader.adjustScrollViewport, _v$2 = texts_default.reader.resizeScrollViewport;
              return _v$ !== _p$.e && setAttribute(_el$3, "aria-label", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$8, "aria-label", _p$.t = _v$2), _p$;
            }, {
              e: void 0,
              t: void 0
            }), createRenderEffect(() => _el$8.value = sliderPercent()), _el$3;
          })()];
        }
      }), null), _el$;
    })();
  }
  delegateEvents(["click", "pointerdown", "pointermove", "pointerup", "input"]);

  // src/components/Reader/index.css
  var Reader_default = `#ehpeek-reader,
[data-ehpeek-reader-container="true"]:fullscreen {
  --color-reader-background: #070707;
  --color-reader-surface: #151515;
  --color-reader-elevated: #232323;
  --color-reader-text: #f3f3f3;
  --color-reader-accent: #4da3ff;
  --color-reader-border: color-mix(in srgb, var(--color-reader-text) 18%, transparent);
  --color-reader-muted: color-mix(in srgb, var(--color-reader-text) 72%, transparent);
  --color-reader-scrollbar: color-mix(in srgb, var(--color-reader-text) 56%, transparent);
  --color-background: var(--color-reader-background);
  --color-surface: var(--color-reader-surface);
  --color-elevated: var(--color-reader-elevated);
  --color-text: var(--color-reader-text);
  --color-accent: var(--color-reader-accent);
  --color-border: color-mix(in srgb, var(--color-text) 18%, transparent);
  --color-muted: color-mix(in srgb, var(--color-text) 72%, transparent);
  --color-track: color-mix(in srgb, var(--color-text) 34%, var(--color-background));
  --color-control: color-mix(in srgb, var(--color-elevated) 88%, transparent);
  --color-badge: color-mix(in srgb, var(--color-background) 34%, transparent);
}

#ehpeek-reader,
#ehpeek-reader * {
  box-sizing: border-box;
}

[data-ehpeek-reader-container="true"]:fullscreen {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-reader-background);
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
  #ehpeek-reader[data-navigation-mode="scroll"][data-read-direction="ttb"]
  .ehpeek-reader-page-strip {
  padding-top: 0;
}

#ehpeek-reader[data-navigation-mode="paged"][data-page-layout="double"]:not([data-read-direction="ttb"])
  .ehpeek-page {
  width: calc(50% - 1.5px);
  flex: 0 0 calc(50% - 1.5px);
}
`;

  // src/components/Reader/index.tsx
  var _tmpl$60 = /* @__PURE__ */ template("<header class=contents>"), _tmpl$215 = /* @__PURE__ */ template('<div id=ehpeek-reader class="fixed inset-0 z-reader overflow-hidden ehp-color-reader font-sans textsize-sm leading-[1.4]">');
  registerGlobalStyle("ehpeek-reader-style", Reader_default);
  var DEFAULT_WINDOW_SIZE2 = 10, PAGED_SWIPE_THRESHOLD = 24, PAGED_WHEEL_THRESHOLD = 8, HORIZONTAL_SCROLL_WHEEL_FACTOR = 0.5, PROGRESS_IDLE_COMMIT_MS = 180, LOADED_IMAGE_INFO_CACHE_LIMIT = 160, SCROLL_GESTURE_IDLE_MS = 160, SCROLL_BAR_IDLE_MS = 900, SCROLL_BAR_SHOW_DISTANCE = 48, SCROLL_BAR_EXPAND_VIEWPORTS = 2, DOUBLE_TAP_MS = 340, DOUBLE_TAP_DISTANCE = 36, TAP_CANCEL_DISTANCE = 8, FALLBACK_ASPECT_RATIO2 = 1.42;
  function Reader(props) {
    let options = untrack(() => props.options), totalPages = options.totalPages ?? 0, previewCache = untrack(() => props.previewCache), callbacks = untrack(() => props.callbacks), session = new ReaderSession(options), readerState = session.state, scrollFitPageNum = readerState.navi.currentPageNum(), readerCallbacks2 = wireReaderCallbacks(session, options, previewCache, callbacks), previousFullscreenActive = untrack(() => props.fullscreenActive);
    return createEffect(() => {
      let fullscreenActive = props.fullscreenActive;
      fullscreenActive !== previousFullscreenActive && (previousFullscreenActive = fullscreenActive, session.requestAnimationFrame(() => {
        session.requestAnimationFrame(readerCallbacks2.realignCurrentPage);
      }));
    }), onMount(() => {
      readerCallbacks2.init(), onCleanup(() => {
        readerCallbacks2.cleanup(), session.dispose();
      });
    }), (() => {
      var _el$ = _tmpl$215();
      return insert(_el$, createComponent(Show, {
        get when() {
          return !readerState.scrollViewport.adjusting();
        },
        get children() {
          var _el$2 = _tmpl$60();
          return insert(_el$2, createComponent(Toolbar, {
            get callbacks() {
              return readerCallbacks2.toolbar;
            },
            get controls() {
              return readerState.ctrls.value();
            },
            get downloadInfos() {
              return readerState.navi.downloadInfos();
            },
            get fullscreenActive() {
              return props.fullscreenActive;
            },
            get open() {
              return readerState.toolbar.open();
            },
            get progress() {
              return {
                pageNum: readerState.navi.currentPageNum(),
                totalPages: options.totalPages,
                maxProgressPageNum: readerState.navi.maxProgressPageNum(),
                keepInputValue: readerState.navi.progressInputActive()
              };
            }
          })), _el$2;
        }
      }), null), insert(_el$, createComponent(ViewportCanvas, {
        get adjusting() {
          return readerState.scrollViewport.adjusting();
        },
        get callbacks() {
          return readerCallbacks2.viewportCanvas;
        },
        get scaleMode() {
          return readerState.scrollViewport.scaleMode();
        },
        get scalePercent() {
          return readerState.scrollViewport.scalePercent();
        },
        get children() {
          return createComponent(PagesViewport, {
            get actionsRef() {
              return readerCallbacks2.viewportActionsRef;
            },
            get callbacks() {
              return readerCallbacks2.viewport;
            },
            get decodedImageCacheLimit() {
              return options.decodedImageCacheLimit;
            },
            get direction() {
              return readerState.ctrls.value().direction;
            },
            get navigationMode() {
              return readerState.ctrls.value().navigationMode;
            },
            get pageLayout() {
              return readerState.ctrls.value().pageLayout;
            },
            get scrollFitImageSize() {
              return readerState.scrollViewport.fitImageSize();
            },
            scrollFitPageNum,
            get scrollSizeScale() {
              return readerState.scrollViewport.sizeScale();
            },
            get window() {
              return readerState.navi.viewportWindow();
            }
          });
        }
      }), null), insert(_el$, createComponent(Show, {
        get when() {
          return readerState.ctrls.value().navigationMode === "scroll" && readerState.ctrls.value().direction === "ttb" && totalPages > 1;
        },
        get children() {
          return createComponent(ReaderScrollBar, {
            get callbacks() {
              return readerCallbacks2.toolbar;
            },
            get currentPage() {
              return readerState.navi.currentPageNum();
            },
            get expanded() {
              return readerState.scrollBar.expanded();
            },
            totalPages,
            get visible() {
              return readerState.scrollBar.visible();
            }
          });
        }
      }), null), insert(_el$, createComponent(ZoomOverlay, {
        get actionsRef() {
          return readerCallbacks2.zoomOverlayActionsRef;
        },
        get image() {
          return readerState.overlay.image();
        },
        onClose: () => readerState.overlay.update(null)
      }), null), createRenderEffect((_p$) => {
        var _v$ = readerState.ctrls.value().navigationMode, _v$2 = readerState.ctrls.value().pageLayout, _v$3 = readerState.ctrls.value().direction;
        return _v$ !== _p$.e && setAttribute(_el$, "data-navigation-mode", _p$.e = _v$), _v$2 !== _p$.t && setAttribute(_el$, "data-page-layout", _p$.t = _v$2), _v$3 !== _p$.a && setAttribute(_el$, "data-read-direction", _p$.a = _v$3), _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      }), _el$;
    })();
  }
  function wireReaderCallbacks(session, options, previewCache, callbacks) {
    let state2 = session.state, viewportActions, zoomOverlay, totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : void 0, renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE2, preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE2, pages = /* @__PURE__ */ new Map(), loadedImages = /* @__PURE__ */ new Map(), pagedTargetPageNumber = null, syncToken = 0, closed = !1, scrollFitPageNum = state2.navi.currentPageNum(), pagedMode = () => state2.ctrls.value().navigationMode === "paged", pageTurnStep = () => state2.ctrls.value().pageLayout === "double" ? 2 : 1, updateReaderViewportSize = () => {
      state2.scrollViewport.setViewportWidth(Math.max(1, window.innerWidth)), state2.scrollViewport.setViewportHeight(Math.max(1, window.innerHeight));
    };
    function requestReaderClose() {
      closed || (closed = !0, callbacks.onClosed());
    }
    function setCurrentPageNumber(pageNumber, scrollIntoView, scrollMotion = "instant") {
      pagedTargetPageNumber = null;
      let target = clamp(Math.round(pageNumber), 1, maxProgressPageNum());
      target !== state2.navi.currentPageNum() && (state2.navi.setDirection(target > state2.navi.currentPageNum() ? 1 : -1), state2.navi.setCurrentPageNum(target)), syncAfterPageChange({
        scrollIntoView,
        scrollMotion
      });
    }
    function syncAfterPageChange(options2) {
      let token = ++syncToken, missing = pageWindowNumbers(state2.navi.currentPageNum(), renderWindowSize).filter((number) => isRealPageNum(number) && !pages.has(number));
      syncViewportWindow(), maintainLoadQueue(), notifyActivePageChange(), options2.scrollIntoView && scrollToCurrentPage(options2.scrollMotion), missing.length > 0 && loadMissingPages(missing, token);
    }
    async function loadMissingPages(pageNums, token) {
      let pageGroups = /* @__PURE__ */ new Map();
      for (let pageNum of pageNums) {
        let previewIndex = previewCache.previewIndexForPage(pageNum);
        pageGroups.set(previewIndex, [...pageGroups.get(previewIndex) ?? [], pageNum]);
      }
      await Promise.all(Array.from(pageGroups.values(), async (groupPageNums) => {
        let loadingTokens = new Map(groupPageNums.flatMap((pageNum) => {
          let loadingToken = viewportActions.markPageLoading(pageNum);
          return loadingToken === null ? [] : [[pageNum, loadingToken]];
        })), incoming;
        try {
          incoming = await previewCache.getPages(groupPageNums);
        } catch (error) {
          console.error("[ehpeek]", error);
          let message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
          for (let [pageNum, loadingToken] of loadingTokens)
            viewportActions.setPageError(pageNum, loadingToken, message);
          return;
        }
        if (closed)
          return;
        addPages(incoming);
        let loadedPageNums = new Set(incoming.flatMap((page2) => page2.pageNum && page2.pageNum > 0 ? [page2.pageNum] : []));
        for (let [pageNum, loadingToken] of loadingTokens)
          loadedPageNums.has(pageNum) ? viewportActions.resetPageLoading(pageNum, loadingToken) : viewportActions.setPageError(pageNum, loadingToken, texts_default.errors.imageNotFound);
      })), !(closed || token !== syncToken) && (syncViewportWindow(), maintainLoadQueue(), notifyActivePageChange(), state2.ctrls.value().navigationMode === "scroll" && state2.navi.currentPageNum() === scrollFitPageNum && scrollToCurrentPage());
    }
    function addPages(incomingPages) {
      for (let [index, page2] of incomingPages.entries()) {
        let pageNum = pageNumForPage(page2, index);
        pageNum > 0 && pages.set(pageNum, {
          ...page2,
          aspectRatio: normalizedAspectRatio(page2.aspectRatio, FALLBACK_ASPECT_RATIO2),
          pageNum
        });
      }
    }
    function syncViewportWindow() {
      state2.navi.setViewportWindow({
        currentPageNum: state2.navi.currentPageNum(),
        windowSize: renderWindowSize,
        totalPages,
        pages: pageMetaForViewport()
      }), updatePageNumber();
    }
    function maintainLoadQueue() {
      let currentPageNum = state2.navi.currentPageNum(), pageNums = [currentPageNum];
      state2.ctrls.value().navigationMode === "scroll" && !state2.scrollViewport.fitImageSize() && pageNums.push(scrollFitPageNum), state2.ctrls.value().navigationMode === "paged" && state2.ctrls.value().pageLayout === "double" && pageNums.push(currentPageNum + 1);
      for (let offset = 1; offset <= preloadWindowSize; offset += 1)
        pageNums.push(currentPageNum + offset * state2.navi.direction());
      session.imageQueue.sync(Array.from(new Set(pageNums)).flatMap((pageNum, priority) => {
        let target = loadTargetFor(pageNum);
        return target ? [{
          key: pageNum,
          priority,
          target
        }] : [];
      }));
    }
    function pageMetaForViewport() {
      return new Map(Array.from(pages, ([pageNum, page2]) => [pageNum, {
        aspectRatio: page2.aspectRatio
      }]));
    }
    function loadTargetFor(pageNum) {
      let page2 = pages.get(pageNum);
      return page2 ? {
        pageNum,
        page: page2
      } : null;
    }
    function maxProgressPageNum() {
      return totalPages ? totalPages + 1 : Number.MAX_SAFE_INTEGER;
    }
    function isRealPageNum(pageNum) {
      return pageNum >= 1 && (!totalPages || pageNum <= totalPages);
    }
    function turnPageBy(delta) {
      if (pagedMode()) {
        animatePagedStep(delta * pageTurnStep());
        return;
      }
      setCurrentPageNumber(state2.navi.currentPageNum() + delta, !0);
    }
    function animatePagedStep(delta) {
      let base = pagedTargetPageNumber ?? state2.navi.currentPageNum(), target = clamp(Math.round(base + delta), 1, maxProgressPageNum());
      if (target === base) {
        scrollToCurrentPage("animated");
        return;
      }
      if (viewportActions.pageOffset(target) === null) {
        pagedTargetPageNumber = null, setCurrentPageNumber(target, !0, "animated");
        return;
      }
      state2.navi.setDirection(target > base ? 1 : -1), pagedTargetPageNumber = target, viewportActions.moveToPage(target, "animated", () => {
        pagedTargetPageNumber === target && (pagedTargetPageNumber = null, setCurrentPageNumber(target, !0));
      });
    }
    function scrollToCurrentPage(motion = "instant") {
      viewportActions.moveToPage(state2.navi.currentPageNum(), motion);
    }
    function updatePageNumber() {
      let pageNum = state2.navi.currentPageNum(), downloadPageNums = pagedMode() && state2.ctrls.value().pageLayout === "double" ? [pageNum, pageNum + 1] : [pageNum];
      state2.navi.setDownloadInfos(downloadPageNums.flatMap((downloadPageNum) => {
        let image2 = loadedImages.get(downloadPageNum);
        return !image2 || !isRealPageNum(downloadPageNum) ? [] : (loadedImages.delete(downloadPageNum), loadedImages.set(downloadPageNum, image2), [{
          currentFileName: displayedImageFileName(options.galleryId, downloadPageNum, image2.imageUrl),
          currentImageUrl: image2.imageUrl,
          imageHeight: viewportActions.pageImageHeight(downloadPageNum) ?? image2.height,
          imageWidth: viewportActions.pageImageWidth(downloadPageNum) ?? image2.width,
          originalImageUrl: image2.originalImageUrl,
          pageNum: downloadPageNum
        }]);
      })), state2.navi.setMaxProgressPageNum(Math.max(1, maxProgressPageNum()));
    }
    function notifyActivePageChange() {
      let page2 = pages.get(state2.navi.currentPageNum());
      page2 && callbacks.onActivePageChange(page2);
    }
    function updateCurrentFromScroll() {
      let next = viewportActions.centerPageNum();
      next !== null && next !== state2.navi.currentPageNum() && (state2.navi.setDirection(next > state2.navi.currentPageNum() ? 1 : -1), state2.navi.setCurrentPageNum(next), syncAfterPageChange({
        scrollIntoView: !1
      }));
    }
    let onKeydown = (event) => {
      shouldIgnoreKeyboardEvent(event) || (event.key === "Escape" ? (state2.overlay.image() !== null ? state2.overlay.update(null) : requestReaderClose(), event.preventDefault()) : (event.key === "ArrowLeft" || event.key === "ArrowRight" || state2.ctrls.value().direction === "ttb" && (event.key === "ArrowUp" || event.key === "ArrowDown")) && (event.preventDefault(), state2.overlay.image() === null && (event.key === "ArrowUp" || event.key === "ArrowDown" ? turnPageBy(event.key === "ArrowUp" ? -1 : 1) : turnPageBy(event.key === "ArrowLeft" ? state2.navi.leftTapDelta() : state2.navi.rightTapDelta()))));
    }, gesture = wireGesture(), viewport = wireViewport(), scrollViewport = wireScrollViewport();
    wireImageQueue();
    let toolbar = wireToolbar();
    return {
      viewportActionsRef: (actions) => {
        viewportActions = actions;
      },
      zoomOverlayActionsRef: (actions) => {
        zoomOverlay = actions;
      },
      init: () => {
        document.addEventListener("keydown", onKeydown, !0), window.addEventListener("resize", updateReaderViewportSize), viewportActions.focus(), updatePageNumber(), syncAfterPageChange({
          scrollIntoView: !0
        });
      },
      cleanup: () => {
        document.removeEventListener("keydown", onKeydown, !0), window.removeEventListener("resize", updateReaderViewportSize);
      },
      realignCurrentPage: () => {
        scrollToCurrentPage();
      },
      toolbar,
      viewport,
      viewportCanvas: scrollViewport.callbacks
    };
    function wireScrollViewport() {
      let adjustmentStartSizeScale = state2.scrollViewport.sizeScale(), updateImageScale = (scale) => {
        if (scale === null) {
          state2.scrollViewport.setSizeScale(null);
          return;
        }
        let fitScale = state2.scrollViewport.fitScale();
        fitScale && state2.scrollViewport.setSizeScale(normalizeReaderScrollSizeScale(scale / fitScale));
      };
      return {
        open: () => {
          adjustmentStartSizeScale = state2.scrollViewport.sizeScale(), state2.scrollViewport.setAdjusting(!0);
        },
        callbacks: {
          onApply: () => state2.scrollViewport.setAdjusting(!1),
          onApplyAll: () => {
            (state2.ctrls.value().direction === "ttb" ? state.reader.scrollTtbScale : state.reader.scrollHorizontalScale).set(state2.scrollViewport.sizeScale()), state2.scrollViewport.setAdjusting(!1);
          },
          onClose: () => {
            state2.scrollViewport.setSizeScale(adjustmentStartSizeScale), state2.scrollViewport.setAdjusting(!1);
          },
          onFit: () => updateImageScale(null),
          onOneToOne: () => state2.scrollViewport.setSizeScale("one-to-one"),
          onScaleChange: updateImageScale
        }
      };
    }
    function wireViewport() {
      let scrollFrame = null, scrollBarTimer = null, scrollGestureTimer = null, previousScrollPosition = null, scrollDistance = 0, scrollPosition = () => state2.ctrls.value().direction === "ttb" ? viewportActions.scrollTop() : viewportActions.scrollLeft(), updateScrollBarActivity = () => {
        let currentScrollPosition = scrollPosition();
        previousScrollPosition !== null && (scrollDistance += Math.abs(currentScrollPosition - previousScrollPosition)), previousScrollPosition = currentScrollPosition, scrollDistance >= SCROLL_BAR_SHOW_DISTANCE && state2.scrollBar.updateVisible(!0);
        let viewportSize = state2.ctrls.value().direction === "ttb" ? window.innerHeight : window.innerWidth;
        scrollDistance >= viewportSize * SCROLL_BAR_EXPAND_VIEWPORTS && state2.scrollBar.updateExpanded(!0), session.clearTimeout(scrollGestureTimer), scrollGestureTimer = session.setTimeout(() => {
          scrollGestureTimer = null, scrollDistance = 0, previousScrollPosition = scrollPosition();
        }, SCROLL_GESTURE_IDLE_MS), session.clearTimeout(scrollBarTimer), scrollBarTimer = session.setTimeout(() => {
          scrollBarTimer = null, scrollDistance = 0, previousScrollPosition = scrollPosition(), state2.scrollBar.updateExpanded(!1), state2.scrollBar.updateVisible(!1);
        }, SCROLL_BAR_IDLE_MS);
      };
      return onCleanup(() => {
        session.clearTimeout(scrollBarTimer), session.clearTimeout(scrollGestureTimer);
      }), {
        onNativeScroll: () => {
          if (state2.overlay.image() !== null || pagedMode() || state2.scrollViewport.adjusting() || (updateScrollBarActivity(), viewportActions.isDragging()))
            return;
          let previousPosition = scrollPosition();
          state2.ctrls.value().direction === "ttb" ? viewportActions.moveToTop(previousPosition) : viewportActions.moveToLeft(previousPosition), !(scrollPosition() !== previousPosition || scrollFrame !== null) && (scrollFrame = session.requestAnimationFrame(() => {
            scrollFrame = null, updateCurrentFromScroll();
          }));
        },
        onReloadPage: (pageNum) => {
          viewportActions.resetPageError(pageNum) && (pages.has(pageNum) ? maintainLoadQueue() : loadMissingPages([pageNum], ++syncToken));
        },
        onWheel: (delta, event) => {
          if (state2.overlay.image() !== null) {
            event.preventDefault(), zoomOverlay.moveWheel({
              centerX: event.clientX,
              centerY: event.clientY,
              delta: wheelDeltaPixels(delta, event.deltaMode)
            });
            return;
          }
          if (!(!pagedMode() && state2.ctrls.value().direction === "ttb")) {
            if (event.preventDefault(), !pagedMode()) {
              let direction = state2.ctrls.value().direction === "rtl" ? -1 : 1;
              viewportActions.moveToLeft(viewportActions.scrollLeft() + wheelDeltaPixels(delta, event.deltaMode) * direction * HORIZONTAL_SCROLL_WHEEL_FACTOR);
              return;
            }
            !viewportActions.isDragging() && Math.abs(delta) >= PAGED_WHEEL_THRESHOLD && turnPageBy(delta > 0 ? 1 : -1);
          }
        },
        pointer: gesture
      };
    }
    function wireImageQueue() {
      let rememberLoadedImage = (pageNum, loaded) => {
        let image2 = {
          pageNum,
          imageUrl: loaded.imageUrl,
          originalImageUrl: loaded.originalImageUrl ?? null,
          width: positiveNumber(loaded.width),
          height: positiveNumber(loaded.height)
        };
        for (pageNum === scrollFitPageNum && image2.width && image2.height && !state2.scrollViewport.fitImageSize() && state2.scrollViewport.setFitImageSize({
          height: image2.height,
          width: image2.width
        }), loadedImages.delete(pageNum), loadedImages.set(pageNum, image2); loadedImages.size > LOADED_IMAGE_INFO_CACHE_LIMIT; ) {
          let oldestPageNum = loadedImages.keys().next().value;
          if (oldestPageNum === void 0)
            break;
          loadedImages.delete(oldestPageNum);
        }
        return image2;
      }, installImage = async (target, loaded, token) => {
        let imageUrl = loaded.imageUrl, width = positiveNumber(loaded.width), height = positiveNumber(loaded.height), installed = !1;
        try {
          installed = await viewportActions.loadPageImage(target.pageNum, token, {
            imageUrl,
            highPriority: target.pageNum === state2.navi.currentPageNum() || state2.ctrls.value().navigationMode === "paged" && state2.ctrls.value().pageLayout === "double" && target.pageNum === state2.navi.currentPageNum() + 1,
            width,
            height
          });
        } catch (error) {
          let message = error instanceof Error ? error.message : texts_default.errors.imageLoadFailed;
          viewportActions.setPageError(target.pageNum, token, message);
          return;
        }
        if (installed && target.pageNum === scrollFitPageNum && !state2.scrollViewport.fitImageSize()) {
          let fitWidth = viewportActions.pageImageWidth(target.pageNum), fitHeight = viewportActions.pageImageHeight(target.pageNum);
          fitWidth && fitHeight && state2.scrollViewport.setFitImageSize({
            height: fitHeight,
            width: fitWidth
          });
        }
        if (!closed) {
          let currentPageNum = state2.navi.currentPageNum();
          (target.pageNum === currentPageNum || pagedMode() && state2.ctrls.value().pageLayout === "double" && target.pageNum === currentPageNum + 1) && updatePageNumber();
        }
      };
      session.imageQueue.updateCallbacks({
        loadTarget: (target) => Promise.resolve(loadedImages.get(target.pageNum) ?? previewCache.loadImage(target.page)),
        markLoading: (target) => viewportActions.markPageLoading(target.pageNum),
        onLoaded: async (target, loaded, token) => {
          let image2 = rememberLoadedImage(target.pageNum, loaded);
          pageWindowNumbers(state2.navi.currentPageNum(), renderWindowSize).includes(target.pageNum) && await installImage(target, image2, token);
        },
        onError: (target, error, token) => {
          let message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
          viewportActions.setPageError(target.pageNum, token, message);
        }
      });
    }
    function wireToolbar() {
      let toolbar2 = {}, progressNavigationTimer = null, pendingProgressPageNum = null, updateControls = (requestedControls) => {
        let previous = state2.ctrls.value(), controls = requestedControls.navigationMode === previous.navigationMode ? requestedControls : {
          ...requestedControls,
          direction: requestedControls.navigationMode === "scroll" ? state.reader.scrollDirection.value : state.reader.pagedDirection.value
        };
        state.reader.navigationMode.set(controls.navigationMode), controls.navigationMode === "scroll" ? state.reader.scrollDirection.set(controls.direction) : state.reader.pagedDirection.set(controls.direction), state.reader.pageLayout.set(controls.pageLayout), state.reader.rightTapAction.set(controls.rightTapAction), state2.ctrls.update(controls), controls.navigationMode !== "scroll" && state2.scrollViewport.setAdjusting(!1), controls.navigationMode !== previous.navigationMode || controls.pageLayout !== previous.pageLayout ? (viewportActions.stopMotion(), viewportActions.resetPosition(), syncAfterPageChange({
          scrollIntoView: !0
        })) : controls.direction !== previous.direction && (syncViewportWindow(), scrollToCurrentPage());
      }, cancelProgressNavigation = () => {
        progressNavigationTimer !== null && (session.clearTimeout(progressNavigationTimer), progressNavigationTimer = null);
      }, previewProgress = (pageNum) => {
        let target = clamp(Math.round(pageNum), 1, maxProgressPageNum());
        target !== state2.navi.currentPageNum() && (state2.navi.setDirection(target > state2.navi.currentPageNum() ? 1 : -1), state2.navi.setCurrentPageNum(target)), ++syncToken, syncViewportWindow(), scrollToCurrentPage(), updatePageNumber();
      };
      return onCleanup(cancelProgressNavigation), toolbar2.onCloseClick = requestReaderClose, toolbar2.onControlsChange = updateControls, toolbar2.onFullscreenClick = callbacks.onFullscreenToggle, toolbar2.onOpenOriginalPageClick = () => {
        let page2 = pages.get(state2.navi.currentPageNum());
        page2 && isRealPageNum(state2.navi.currentPageNum()) && callbacks.onOpenOriginalPage(page2);
      }, toolbar2.onViewportAdjustClick = scrollViewport.open, toolbar2.onProgressPointerDown = (event) => {
        state2.navi.setProgressInputActive(!0), cancelProgressNavigation(), event.stopPropagation();
      }, toolbar2.onProgressInput = (pageNum) => {
        !Number.isFinite(pageNum) || pageNum <= 0 || (state2.navi.setProgressInputActive(!0), pendingProgressPageNum = clamp(Math.round(pageNum), 1, maxProgressPageNum()), previewProgress(pendingProgressPageNum), cancelProgressNavigation(), progressNavigationTimer = session.setTimeout(() => toolbar2.onProgressCommit(pendingProgressPageNum ?? state2.navi.currentPageNum()), PROGRESS_IDLE_COMMIT_MS));
      }, toolbar2.onProgressCommit = (value) => {
        if (!state2.navi.progressInputActive() && pendingProgressPageNum === null)
          return;
        let pageNum = pendingProgressPageNum ?? value;
        state2.navi.setProgressInputActive(!1), pendingProgressPageNum = null, cancelProgressNavigation(), Number.isFinite(pageNum) && pageNum > 0 && setCurrentPageNumber(pageNum, !0);
      }, toolbar2;
    }
    function wireGesture() {
      let gesture2 = {
        get dragAxis() {
          return state2.overlay.image() !== null || !pagedMode() ? "any" : state2.ctrls.value().direction === "ttb" ? "y" : "x";
        }
      }, tapTimer = null, pendingTap = null, isPageReloadButtonTarget = (event) => event.target instanceof Element && event.target.closest(".ehpeek-reader-page-reload") !== null, shouldStartDrag = (event) => state2.overlay.image() !== null || pagedMode() || state2.ctrls.value().direction !== "ttb" || event.pointerType === "mouse", imageAtPoint = (point) => {
        let pageNum = viewportActions.pageNumAtPoint(point);
        return pageNum === null ? null : loadedImages.get(pageNum) ?? null;
      }, cancelPendingTap = () => {
        tapTimer !== null && (session.clearTimeout(tapTimer), tapTimer = null), pendingTap = null;
      }, toggleZoomAtPoint = (point) => {
        if (state2.overlay.image() !== null)
          return state2.overlay.update(null), !0;
        let image2 = imageAtPoint(point);
        if (!image2)
          return !1;
        viewportActions.stopMotion(), viewportActions.cancelDrag();
        let zoomScale = viewportActions.pageZoomScale(image2.pageNum);
        return state2.overlay.update(image2), zoomOverlay.reset({
          centerX: point.clientX,
          centerY: point.clientY,
          scale: zoomScale
        }), zoomOverlay.movePinch({
          centerX: point.clientX,
          centerY: point.clientY,
          scale: 2
        }), zoomOverlay.endPinch(), !0;
      }, consumeDoubleTap = (info, event) => {
        let now = event.timeStamp || performance.now(), nativeDoubleClick = event instanceof MouseEvent && event.detail >= 2, nearPendingTap = pendingTap ? now - pendingTap.time <= DOUBLE_TAP_MS && Math.hypot(info.clientX - pendingTap.info.clientX, info.clientY - pendingTap.info.clientY) <= DOUBLE_TAP_DISTANCE : !1;
        return !nativeDoubleClick && !nearPendingTap || (cancelPendingTap(), !toggleZoomAtPoint(info)) ? !1 : (event.preventDefault(), !0);
      }, runSingleTap = (info, event) => {
        if (state2.overlay.image() !== null)
          event.preventDefault();
        else if (viewportActions.isHitEndPage(info))
          requestReaderClose();
        else {
          let zone = info.clientX / viewportActions.viewportWidth();
          zone >= 1 / 3 && zone <= 2 / 3 ? state2.toolbar.toggle() : turnPageBy(zone < 1 / 3 ? state2.navi.leftTapDelta() : state2.navi.rightTapDelta());
        }
      }, queueSingleTap = (info, event) => {
        cancelPendingTap(), pendingTap = {
          info,
          event,
          time: event.timeStamp || performance.now()
        }, tapTimer = session.setTimeout(() => {
          let pending = pendingTap;
          pendingTap = null, tapTimer = null, pending && runSingleTap(pending.info, pending.event);
        }, DOUBLE_TAP_MS);
      };
      return gesture2.onTap = (info, event) => {
        viewportActions.cancelDrag(), !consumeDoubleTap(info, event) && queueSingleTap(info, event);
      }, gesture2.onStart = () => {
        if (state2.overlay.image() !== null) {
          zoomOverlay.startDrag();
          return;
        }
        viewportActions.beginDrag();
      }, gesture2.onMove = (info) => {
        if (state2.overlay.image() !== null) {
          zoomOverlay.moveDrag(info);
          return;
        }
        viewportActions.moveDrag({
          dx: info.dx,
          dy: info.dy
        }) && (Math.abs(info.dx) >= TAP_CANCEL_DISTANCE || Math.abs(info.dy) >= TAP_CANCEL_DISTANCE) && cancelPendingTap();
      }, gesture2.onEnd = (info) => {
        if (state2.overlay.image() === null) {
          if (viewportActions.cancelDrag(), !pagedMode()) {
            state2.ctrls.value().direction === "ttb" ? (viewportActions.moveToTop(viewportActions.scrollTop()), viewportActions.startVerticalFlingFromDragVelocity(info.velocityY, () => updateCurrentFromScroll())) : (viewportActions.moveToLeft(viewportActions.scrollLeft()), viewportActions.startHorizontalFlingFromDragVelocity(info.velocityX, () => updateCurrentFromScroll())), updateCurrentFromScroll();
            return;
          }
          if (state2.ctrls.value().direction === "ttb") {
            info.dy >= PAGED_SWIPE_THRESHOLD ? turnPageBy(-1) : info.dy <= -PAGED_SWIPE_THRESHOLD ? turnPageBy(1) : scrollToCurrentPage("animated");
            return;
          }
          info.dx >= PAGED_SWIPE_THRESHOLD ? turnPageBy(state2.navi.rightDragDelta()) : info.dx <= -PAGED_SWIPE_THRESHOLD ? turnPageBy(state2.navi.leftDragDelta()) : scrollToCurrentPage("animated");
        }
      }, gesture2.onPinchStart = (info) => {
        if (cancelPendingTap(), viewportActions.stopMotion(), viewportActions.cancelDrag(), state2.overlay.image() !== null)
          return zoomOverlay.startPinch({
            centerX: info.clientX,
            centerY: info.clientY
          }), !0;
        let image2 = imageAtPoint(info);
        if (!image2)
          return !1;
        let zoomScale = viewportActions.pageZoomScale(image2.pageNum);
        return state2.overlay.update(image2), zoomOverlay.reset({
          centerX: info.clientX,
          centerY: info.clientY,
          scale: zoomScale
        }), !0;
      }, gesture2.onPinchMove = (info) => zoomOverlay.movePinch({
        centerX: info.clientX,
        centerY: info.clientY,
        scale: info.scale
      }), gesture2.onPinchEnd = () => zoomOverlay.endPinch(), gesture2.shouldCaptureDrag = (event) => isPageReloadButtonTarget(event) || !(event instanceof PointerEvent) || event.pointerType === "mouse" && event.button !== 0 ? !1 : shouldStartDrag(event), gesture2.shouldObserveTap = (event) => event instanceof PointerEvent && !isPageReloadButtonTarget(event) && event.pointerType !== "mouse" && !shouldStartDrag(event), gesture2.dragStartThreshold = TAP_CANCEL_DISTANCE, gesture2.tapMoveThreshold = TAP_CANCEL_DISTANCE, gesture2;
    }
  }
  function wheelDeltaPixels(delta, mode) {
    return mode === WheelEvent.DOM_DELTA_LINE ? delta * 16 : mode === WheelEvent.DOM_DELTA_PAGE ? delta * window.innerHeight : delta;
  }
  function displayedImageFileName(galleryId, pageNum, imageUrl) {
    return `${galleryId}-p${String(pageNum).padStart(2, "0")}.${imageFileExtension(imageUrl)}`;
  }
  function imageFileExtension(imageUrl) {
    try {
      let extension = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop() ?? "").match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
      if (extension && ["avif", "bmp", "gif", "jpeg", "jpg", "png", "webp"].includes(extension))
        return extension;
    } catch {
      return "";
    }
    return "";
  }
  function pageNumForPage(page2, index) {
    let pageNum = page2?.pageNum;
    return typeof pageNum == "number" && Number.isFinite(pageNum) && pageNum > 0 ? pageNum : index + 1;
  }
  function shouldIgnoreKeyboardEvent(event) {
    if (event.isComposing)
      return !0;
    let eventTarget = event.target;
    return eventTarget instanceof Element ? !!eventTarget.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']") : !1;
  }

  // src/App/Reader.tsx
  var activeReaderClose;
  function openReaderFromUserAction(startPageUrl, callbacks, previewCache, viewport, preferredPageNum) {
    let fullscreenLaunch = requestConfiguredFullscreen(viewport);
    openReader(startPageUrl, callbacks, previewCache, viewport, preferredPageNum, fullscreenLaunch).catch(async (error) => {
      if (fullscreenLaunch) {
        let fullscreenEntered = await fullscreenLaunch.result;
        document.fullscreenElement === fullscreenLaunch.host && await document.exitFullscreen().catch((fullscreenError) => {
          console.warn("[ehpeek] Failed to exit fullscreen", fullscreenError);
        }), fullscreenEntered && await fullscreenLaunch.fullscreen.exit(), fullscreenLaunch.host.remove(), await fullscreenLaunch.fullscreen.restore();
      }
      reportReaderOpenError(error);
    });
  }
  async function openReaderFromHash(callbacks, previewCache, viewport) {
    let peekPage = peekPageFromHash();
    if (peekPage === null)
      return;
    let pages = previewCache.current().data.pages, page2 = pages.find((item) => item.pageNum === peekPage) ?? pages[0];
    page2 && await openReader(page2.url, callbacks, previewCache, viewport).catch(reportReaderOpenError);
  }
  async function openOriginalReader(pageNum, previewCache) {
    let page2 = (await previewCache.getPages([pageNum]))[0];
    if (!page2 || page2.pageNum !== pageNum)
      throw new Error(texts_default.errors.imageNotFound);
    window.location.assign(page2.url);
  }
  async function openReader(startPageUrl, callbacks, previewCache, viewport, preferredPageNum, fullscreenLaunch) {
    if (!state.reader.enabled.value)
      return;
    let preview = previewCache.current().data, gallery2 = galleryIdentityFromUrl(preview.currentUrl);
    if (!gallery2)
      return;
    let currentPreviewIndex = preview.currentIndex, pageSize = preview.pageSize, maxPreviewIndex = preview.maxIndex, totalPages = preview.totalImages, startPageNum = preferredPageNum ?? peekPageFromHash() ?? galleryPageNumber(startPageUrl);
    if (!startPageNum)
      throw new Error(texts_default.errors.imageNotFound);
    let historySession = callbacks.readHistoryEnabled ? new ReadHistorySession({
      gallery: extractGalleryHistoryInfo(),
      galleryId: gallery2.galleryId,
      token: gallery2.token,
      totalPages
    }) : null;
    if ((fullscreenLaunch ? await fullscreenLaunch.result : void 0) && document.fullscreenElement !== fullscreenLaunch?.host) {
      historySession?.dispose(), await fullscreenLaunch?.fullscreen.exit(), fullscreenLaunch?.host.remove(), await fullscreenLaunch?.fullscreen.restore();
      return;
    }
    let lastPageNum = startPageNum, onExit = () => {
      if (historySession?.dispose(), callbacks.onReaderClosed(lastPageNum, totalPages ?? null), clearPeekLocation(), lastPageNum === startPageNum)
        return;
      let exitIndex = previewCache.previewIndexForPage(lastPageNum), galleryUrl = previewUrlForIndex(exitIndex);
      if (callbacks.enhanceThumbsGridsEnabled) {
        callbacks.onGotoPreviewIndex(exitIndex), previewCache.select(exitIndex).catch(() => {
          window.location.replace(galleryUrl);
        });
        return;
      }
      exitIndex === currentPreviewIndex ? window.history.replaceState(window.history.state, "", galleryUrl) : window.location.replace(galleryUrl);
    }, host = fullscreenLaunch?.host ?? createReaderHost(), fullscreen = fullscreenLaunch?.fullscreen ?? viewport.createFullscreen(host);
    mountReader({
      galleryId: gallery2.galleryId,
      initialPageNum: startPageNum,
      totalPages
    }, previewCache, {
      onActivePageChange: (page2) => {
        page2.pageNum && (lastPageNum = page2.pageNum, callbacks.enhanceThumbsGridsEnabled && callbacks.onGotoPreviewIndex(previewCache.previewIndexForPage(page2.pageNum))), historySession?.update(page2.pageNum, totalPages), updatePeekLocation(page2.pageNum, pageSize, maxPreviewIndex);
      },
      onOpenOriginalPage: (page2) => {
        historySession?.dispose(), window.location.assign(page2.url);
      }
    }, viewport.lockScroll, fullscreen, onExit, host);
  }
  function mountReader(options, previewCache, callbacks, lockPageScroll2, fullscreen, onExit, host) {
    activeReaderClose?.();
    let disposeRoot = () => {
    }, unlockPageScroll = lockPageScroll2(), setFullscreenActive = (_active) => {
    }, keepReaderOpen = !1, historyEntry = !0, closeRequested = !1, closing = !1, close = () => requestClose();
    function requestClose() {
      if (!(closing || closeRequested)) {
        if (historyEntry) {
          closeRequested = !0, window.history.back();
          return;
        }
        onClosed();
      }
    }
    let onPopState = () => {
      historyEntry = !1, onClosed();
    };
    async function onClosed() {
      closing || (closing = !0, await fullscreen.exit().catch((error) => {
        console.warn("[ehpeek] Failed to exit fullscreen", error);
      }), disposeRoot(), disposeRoot = () => {
      }, unlockPageScroll(), unlockPageScroll = () => {
      }, host.remove(), await fullscreen.restore().catch((error) => {
        console.warn("[ehpeek] Failed to restore page viewport", error);
      }), activeReaderClose === close && (activeReaderClose = void 0), onExit());
    }
    host.isConnected || document.body.append(host), window.addEventListener("popstate", onPopState), window.history.pushState({
      ehpeekReader: !0
    }, "", window.location.href), activeReaderClose = close;
    let unsubscribeFullscreen = fullscreen.subscribe((active) => {
      setFullscreenActive(active), !active && !keepReaderOpen && requestClose(), keepReaderOpen = !1;
    });
    disposeRoot = render(() => {
      let [fullscreenActive, updateFullscreenActive] = createSignal(fullscreen.active());
      return setFullscreenActive = updateFullscreenActive, createComponent(Reader, {
        get callbacks() {
          return {
            ...callbacks,
            onClosed: requestClose,
            onFullscreenToggle: () => {
              fullscreen.active() ? (keepReaderOpen = !0, fullscreen.exit().catch((error) => {
                keepReaderOpen = !1, console.warn("[ehpeek] Failed to exit fullscreen", error);
              })) : fullscreen.enter().catch((error) => {
                console.warn("[ehpeek] Fullscreen request failed", error);
              });
            }
          };
        },
        options,
        previewCache,
        get fullscreenActive() {
          return fullscreenActive();
        }
      });
    }, host);
    let previousDispose = disposeRoot;
    disposeRoot = () => {
      window.removeEventListener("popstate", onPopState), unsubscribeFullscreen(), previousDispose();
    };
  }
  function requestConfiguredFullscreen(viewportSource) {
    if (!state.reader.enabled.value || !state.reader.fullscreen.value || document.fullscreenElement)
      return;
    let host = createReaderHost();
    document.body.append(host);
    let fullscreen = viewportSource.createFullscreen(host);
    return !document.fullscreenEnabled || typeof host.requestFullscreen != "function" ? {
      fullscreen,
      host,
      result: Promise.resolve(!1)
    } : {
      fullscreen,
      host,
      result: fullscreen.enter().then(() => !0, (error) => (console.warn("[ehpeek] Fullscreen request failed", error), !1))
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

  // src/App/GalleryPreviewCache.ts
  var PREVIEW_CACHE_LIMIT = 10;
  function createGalleryPreviewCache(initialPreview) {
    let [current, setCurrent] = createSignal(initialPreview), [loading, setLoading] = createSignal(!1), previews = /* @__PURE__ */ new Map(), pages = /* @__PURE__ */ new Map(), pending = /* @__PURE__ */ new Map(), pageSize = initialPreview.data.pageSize, maxPreviewIndex = initialPreview.data.maxIndex, currentPreviewIndex = initialPreview.data.currentIndex, selectionId = 0, remember = (preview) => {
      let index = preview.data.currentIndex;
      previews.delete(index), previews.set(index, preview);
      for (let page2 of preview.data.pages)
        page2.pageNum && page2.pageNum > 0 && pages.set(page2.pageNum, page2);
      for (; previews.size > PREVIEW_CACHE_LIMIT; ) {
        let removable;
        for (let candidate of previews.keys())
          if (candidate !== currentPreviewIndex && candidate !== index) {
            removable = candidate;
            break;
          }
        if (removable === void 0)
          break;
        previews.delete(removable);
      }
    }, previewIndexForPage = (pageNum) => previewPageIndexForGalleryPage(
      pageNum,
      pageSize,
      maxPreviewIndex
    ), load = (previewIndex) => {
      if (previewIndex < 0 || previewIndex > maxPreviewIndex)
        return Promise.reject(new RangeError(`Invalid Preview index: ${previewIndex}`));
      let cached = previews.get(previewIndex);
      if (cached)
        return previews.delete(previewIndex), previews.set(previewIndex, cached), Promise.resolve(cached);
      let existing = pending.get(previewIndex);
      if (existing)
        return existing;
      setLoading(!0);
      let request = loadGalleryPreviewPage(
        previewIndex,
        initialPreview.data.currentUrl
      ).then(
        (preview) => (pending.delete(previewIndex), setLoading(pending.size > 0), remember(preview), preview),
        (error) => {
          throw pending.delete(previewIndex), setLoading(pending.size > 0), error;
        }
      );
      return pending.set(previewIndex, request), request;
    }, getPages = async (pageNums) => {
      let requested = Array.from(new Set(pageNums.filter((pageNum) => pageNum > 0))), previewIndexes = Array.from(new Set(requested.filter((pageNum) => !pages.has(pageNum)).map(previewIndexForPage)));
      return await Promise.all(previewIndexes.map(load)), requested.flatMap((pageNum) => pages.get(pageNum) ?? []);
    }, select2 = async (previewIndex) => {
      if (previewIndex === current().data.currentIndex)
        return current();
      let activeSelection = ++selectionId, preview = await load(previewIndex);
      return activeSelection === selectionId && (currentPreviewIndex = preview.data.currentIndex, setCurrent(preview), window.history.replaceState(
        window.history.state,
        "",
        preview.data.currentUrl
      )), preview;
    };
    return remember(initialPreview), {
      current,
      getPages,
      load,
      loadImage: loadEhImagePage,
      loading,
      previewIndexForPage,
      select: select2
    };
  }

  // src/App/host.ts
  function createAppMount(className2 = "", host = document.body ?? document.documentElement) {
    let mount = createManagedElement("div");
    return className2 && mount.replaceClasses(className2), host.append(mount.Component()), mount;
  }

  // src/App/viewport.ts
  var FULLSCREEN_UI_SCALE_PROPERTY = "--ehpeek-reader-fullscreen-ui-scale", FULLSCREEN_PROGRESS_SIZE_PROPERTY = "--ehpeek-reader-fullscreen-progress-size";
  function lockPageScroll() {
    let documentElement = document.documentElement, body = document.body, documentOverflow = documentElement.style.overflow, bodyOverflow = body.style.overflow;
    return documentElement.style.overflow = "hidden", body.style.overflow = "hidden", () => {
      documentElement.style.overflow = documentOverflow, body.style.overflow = bodyOverflow;
    };
  }
  function pageViewportForFullscreen() {
    let existing = document.querySelector(
      'meta[name="viewport"]'
    ), meta = existing ?? document.createElement("meta"), scale = Math.max(0.1, window.visualViewport?.scale ?? 1), snapshot = {
      content: existing?.getAttribute("content") ?? null,
      created: !existing,
      meta,
      scale,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
    return existing || (meta.name = "viewport", document.head.append(meta)), meta.content = lockedViewportContent(snapshot.content, scale), snapshot;
  }
  async function restorePageViewport(snapshot) {
    await nextAnimationFrame(), snapshot.created ? snapshot.meta.remove() : snapshot.content === null ? snapshot.meta.removeAttribute("content") : snapshot.meta.content = snapshot.content, await nextAnimationFrame(), await nextAnimationFrame(), window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  }
  var readerViewport = {
    createFullscreen: createReaderFullscreen,
    lockScroll: lockPageScroll,
    prepareFullscreen: pageViewportForFullscreen,
    restore: restorePageViewport
  };
  function createReaderFullscreen(target, initialSnapshot = null) {
    let snapshot = initialSnapshot, restorePromise = null, restore = async () => {
      target.style.removeProperty(FULLSCREEN_UI_SCALE_PROPERTY), target.style.removeProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY), snapshot && (restorePromise ?? (restorePromise = restorePageViewport(snapshot).finally(() => {
        restorePromise = null;
      })), await restorePromise);
    };
    return {
      active: () => document.fullscreenElement === target,
      enter: async () => {
        if (document.fullscreenElement || !document.fullscreenEnabled)
          return;
        snapshot = pageViewportForFullscreen();
        let scaleBefore = window.visualViewport?.scale ?? 1;
        try {
          await target.requestFullscreen(), await nextAnimationFrame();
          let scaleAfter = window.visualViewport?.scale ?? 1, uiScale = Math.min(1, Math.max(0.25, scaleBefore / Math.max(scaleAfter, 0.01))), progressSize = Number.parseFloat(getComputedStyle(target).getPropertyValue("--font-size-lg")) || 24;
          target.style.setProperty(FULLSCREEN_UI_SCALE_PROPERTY, String(uiScale)), target.style.setProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY, `${progressSize * uiScale}px`);
        } catch (error) {
          throw await restore(), error;
        }
      },
      exit: async () => {
        document.fullscreenElement === target && await document.exitFullscreen(), snapshot && await waitForViewportSettled(), target.style.removeProperty(FULLSCREEN_UI_SCALE_PROPERTY), target.style.removeProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY);
      },
      restore,
      subscribe: (callback) => {
        let onChange = () => {
          let active = document.fullscreenElement === target;
          active || (target.style.removeProperty(FULLSCREEN_UI_SCALE_PROPERTY), target.style.removeProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY)), callback(active);
        };
        return document.addEventListener("fullscreenchange", onChange), () => document.removeEventListener("fullscreenchange", onChange);
      }
    };
  }
  function lockedViewportContent(content, scale) {
    let preserved = (content ?? "").split(",").map((item) => item.trim()).filter(
      (item) => item && !/^(?:initial-scale|minimum-scale|maximum-scale|user-scalable|viewport-fit)\s*=/i.test(item)
    ), value = String(Math.round(scale * 1e3) / 1e3);
    return [
      ...preserved,
      `initial-scale=${value}`,
      `minimum-scale=${value}`,
      `maximum-scale=${value}`,
      "user-scalable=no",
      "viewport-fit=cover"
    ].join(", ");
  }
  function nextAnimationFrame() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
  async function waitForViewportSettled() {
    await nextAnimationFrame(), await new Promise((resolve) => {
      let viewport = window.visualViewport, quietTimer = window.setTimeout(finish, 80), timeoutTimer = window.setTimeout(finish, 500), onResize = () => {
        window.clearTimeout(quietTimer), quietTimer = window.setTimeout(finish, 80);
      };
      function finish() {
        viewport?.removeEventListener("resize", onResize), window.clearTimeout(quietTimer), window.clearTimeout(timeoutTimer), resolve();
      }
      viewport?.addEventListener("resize", onResize);
    }), await nextAnimationFrame();
  }

  // src/App/index.tsx
  var _tmpl$61 = /* @__PURE__ */ template("<a href=#>");
  function settingsMenuState(defaults = !1) {
    let read = (setting) => defaults ? setting.defaultValue : setting.value;
    return {
      openGalleryInNewTab: read(state.app.openGalleryInNewTab),
      readerEnabled: read(state.reader.enabled),
      readerFullscreenEnabled: read(state.reader.fullscreen),
      enhanceThumbsGridsEnabled: read(state.gallery.enhanceThumbs),
      enhanceSearchGridsEnabled: read(state.search.enhance),
      myTagsEnabled: read(state.gallery.myTags),
      readHistoryEnabled: read(state.gallery.readHistory),
      includeUnreadHistoryEnabled: read(state.gallery.includeUnreadHistory),
      searchHistoryEnabled: read(state.search.history),
      touchUiEnabled: read(state.touch.enabled)
    };
  }
  function applySettingsMenuState(next) {
    state.app.openGalleryInNewTab.set(next.openGalleryInNewTab), state.reader.enabled.set(next.readerEnabled), state.reader.fullscreen.set(next.readerFullscreenEnabled), state.gallery.enhanceThumbs.set(next.enhanceThumbsGridsEnabled), state.search.enhance.set(next.enhanceSearchGridsEnabled), state.gallery.myTags.set(next.myTagsEnabled), state.gallery.readHistory.set(next.readHistoryEnabled), state.gallery.includeUnreadHistory.set(next.includeUnreadHistoryEnabled), state.search.history.set(next.searchHistoryEnabled), state.touch.enabled.set(next.touchUiEnabled), window.location.reload();
  }
  var gState = (() => {
    let [settingsMenuOpen, setSettingsMenuOpen] = createSignal(!1), [readProgress, setReadProgress] = createSignal({
      currentPage: 1,
      hasHistory: !1,
      totalPages: null
    });
    return {
      readProgress,
      setReadProgress,
      settings: settingsMenuState(),
      settingsMenuOpen,
      setSettingsMenuOpen,
      thumbsGridsActions: void 0
    };
  })();
  document.documentElement.setAttribute("data-ehpeek-site", ehSiteTheme());
  registerGlobalStyle("ehpeek-uno-style", ehpeek_uno_default);
  registerGlobalStyle("ehpeek-theme-style", theme_default);
  registerGlobalStyle("ehpeek-dom-style", styles_default);
  var readerCallbacks = {
    enhanceThumbsGridsEnabled: gState.settings.enhanceThumbsGridsEnabled,
    readHistoryEnabled: gState.settings.readHistoryEnabled,
    onGotoPreviewIndex: (previewIndex) => {
      gState.thumbsGridsActions?.gotoPreview(previewIndex);
    },
    onReaderClosed: (currentPage, totalPages) => {
      gState.setReadProgress({
        currentPage,
        hasHistory: !0,
        totalPages
      });
    }
  };
  function allowFeatureFailure(name, run) {
    try {
      return run();
    } catch (error) {
      return console.error(`[ehpeek] ${name} failed`, error), null;
    }
  }
  async function allowAsyncFeatureFailure(name, run) {
    try {
      return await run();
    } catch (error) {
      return console.error(`[ehpeek] ${name} failed`, error), null;
    }
  }
  function openGalleryPage(previewCache, startPageUrl, preferredPageNum) {
    state.reader.enabled.value ? openReaderFromUserAction(startPageUrl, readerCallbacks, previewCache, readerViewport, preferredPageNum) : preferredPageNum !== void 0 && openOriginalReader(preferredPageNum, previewCache).catch(reportReaderOpenError);
  }
  function openFromReadButton(previewCache) {
    let pageNum = gState.readProgress().currentPage, firstPage = previewCache.current().data.pages[0];
    firstPage && openGalleryPage(previewCache, firstPage.url, pageNum);
  }
  function GalleryReadButton(props) {
    return createComponent(ReadButton, {
      get currentPage() {
        return gState.readProgress().currentPage;
      },
      get hasHistory() {
        return gState.readProgress().hasHistory;
      },
      get totalPages() {
        return gState.readProgress().totalPages;
      },
      onClick: () => openFromReadButton(props.previewCache),
      get variant() {
        return props.variant;
      }
    });
  }
  function installSettingsMenu() {
    typeof GM_registerMenuCommand == "function" && GM_registerMenuCommand(texts_default.settings.openSettings, () => {
      gState.setSettingsMenuOpen(!0);
    }), createAppMount("fixed inset-0 z-[1150] pointer-events-none").mount(() => createComponent(SettingsMenu, {
      get historyHref() {
        return readHistoryUrl();
      },
      get open() {
        return gState.settingsMenuOpen();
      },
      get defaultState() {
        return settingsMenuState(!0);
      },
      get initState() {
        return gState.settings;
      },
      onApply: (next) => {
        applySettingsMenuState(next);
      },
      get onOpenChange() {
        return gState.setSettingsMenuOpen;
      }
    }));
  }
  function injectEnhanceUI(page2, previewCache, searchTextInput, searchResultsDom, touchResultsDom) {
    let galleryPage = page2.type === "gallery", searchPage = page2.type === "search" || page2.type === "favorites", preview = previewCache?.current() ?? null, previewMount = preview?.elems.mount ?? null, updateSearchGridModeSelector = () => {
      mutateSearchGridModeSelect(state.search.grid.value, () => {
        state.search.grid.set(!0), window.location.assign(new URL("/?inline_set=dm_e", window.location.href).href);
      }, () => {
        state.search.grid.set(!1);
      });
    };
    galleryPage && preview && previewCache && gState.settings.readerEnabled && allowFeatureFailure("Reader thumbnail links", () => {
      preview.handle.interceptPreviewImageOpen((pageUrl) => {
        openGalleryPage(previewCache, pageUrl);
      });
    }), searchPage && allowFeatureFailure("Search grid mode selector", () => {
      updateSearchGridModeSelector();
    });
    let searchGridEnabled = !!(searchPage && state.search.grid.value);
    searchGridEnabled && allowFeatureFailure("Search grid", () => manageSearchGrids());
    let updateSearchReadHistoryAppearance = () => {
      !searchPage || !gState.settings.readHistoryEnabled || mutateSearchReadHistoryAppearance((galleryId, token) => loadReadHistory(galleryId, token)?.pageNum ?? null);
    };
    allowFeatureFailure("Search Read History appearance", updateSearchReadHistoryAppearance), gState.settings.openGalleryInNewTab && searchResultsDom && allowFeatureFailure("Gallery links in new tabs", () => {
      searchResultsDom.handle.ensureGalleryLinksOpenInNewTab();
    }), gState.settings.touchUiEnabled || allowFeatureFailure("Desktop settings entry", () => {
      let settingsMount = manageSettingsMenuMount();
      settingsMount && settingsMount.mount(() => (() => {
        var _el$ = _tmpl$61();
        return _el$.$$click = (event) => {
          event.preventDefault(), event.stopPropagation(), gState.setSettingsMenuOpen(!0);
        }, insert(_el$, () => texts_default.settings.menuLabel), _el$;
      })());
    }), !gState.settings.touchUiEnabled && gState.settings.readHistoryEnabled && galleryPage && preview && previewCache && allowFeatureFailure("Desktop Read button", () => {
      manageGalleryContinueReadingButtonMount().mount(() => createComponent(GalleryReadButton, {
        previewCache,
        variant: "gallery"
      }));
    }), galleryPage && gState.settings.enhanceThumbsGridsEnabled && previewCache && previewMount ? allowFeatureFailure("Enhanced thumbnail grid", () => {
      previewMount.mount(() => createComponent(ThumbsGrids, {
        actionsRef: (actions) => {
          gState.thumbsGridsActions = actions;
        },
        onLoadError: reportReaderOpenError,
        previewCache
      }));
    }) : galleryPage && preview && previewCache && allowFeatureFailure("Original thumbnail grid", () => {
      preview.elems.mount?.remove();
    }), gState.settings.enhanceSearchGridsEnabled && searchResultsDom && (searchResultsDom.data.previousUrl || searchResultsDom.data.nextUrl) && allowFeatureFailure("Enhanced Search pagination", () => {
      createAppMount().mount(() => createComponent(EnhanceSearchGrids, {
        source: searchResultsDom,
        onPageChange: (source) => {
          allowFeatureFailure("Changed Search page", () => {
            updateSearchGridModeSelector(), gState.settings.openGalleryInNewTab && source.handle.ensureGalleryLinksOpenInNewTab(), touchResultsDom?.handle.updateTouchResultsLayout(), searchGridEnabled && manageSearchGrids(), updateSearchReadHistoryAppearance();
          });
        }
      }));
    }), gState.settings.searchHistoryEnabled && searchTextInput && allowFeatureFailure("Search history", () => {
      createAppMount().mount(() => createComponent(SearchHistory, {
        source: searchTextInput
      }));
    });
  }
  function injectTouchUI(page2, previewCache) {
    let galleryPage = page2.type === "gallery", searchPage = page2.type === "search" || page2.type === "favorites", resultsPage = searchPage || page2.type === "readHistory", preview = previewCache?.current() ?? null, resultsDom = resultsPage ? allowFeatureFailure("Touch results layout", () => manageTouchResultsPage(page2)) : null;
    return allowFeatureFailure("Touch top bar", () => {
      let topBarDom = manageTopBar();
      topBarDom && topBarDom.elems.mount.mount(() => createComponent(TouchTopBar, {
        get historyHref() {
          return readHistoryUrl();
        },
        source: topBarDom,
        onSettingsMenuOpen: () => {
          gState.setSettingsMenuOpen(!0);
        }
      }));
    }), (galleryPage || resultsPage) && allowFeatureFailure("Back to top", () => {
      createAppMount("ehpeek-back-to-top-host").mount(() => createComponent(BackToTop, {}));
    }), galleryPage && (allowFeatureFailure("Touch GalleryInfo", () => {
      registerGlobalStyle("ehpeek-touch-gallery-page-rearrange-style", galleryRearrange_default);
      let galleryInfoDom = manageGalleryInfo(preview?.data ?? null);
      galleryInfoDom && (galleryInfoDom.handle.installGalleryInfoPanel(), galleryInfoDom.elems.mount.mount(() => createComponent(GalleryInfoPanel, {
        source: galleryInfoDom,
        get primaryAction() {
          return memo(() => !!(gState.settings.readHistoryEnabled && preview && previewCache))() ? createComponent(GalleryReadButton, {
            previewCache,
            variant: "touchGallery"
          }) : void 0;
        }
      })));
    }), allowFeatureFailure("Touch Gallery comments", () => {
      mutateGalleryCommentsTouch();
    })), searchPage && allowFeatureFailure("Touch Search panel", () => {
      let searchPanelDom = manageSearchPanel();
      searchPanelDom && (searchPanelDom.elems.mount.mount(() => createComponent(TouchSearchPanel, {
        source: searchPanelDom,
        get after() {
          return memo(() => !!resultsDom?.data.favoritesCategory)() ? createComponent(FavoritesCategorySelect, {
            source: resultsDom
          }) : void 0;
        }
      })), searchPanelDom.elems.categoryToggleMount && searchPanelDom.elems.categoryToggleMount.mount(() => createComponent(TouchSearchCategoryToggle, {
        source: searchPanelDom
      })), searchPanelDom.elems.advancedToggleMount && searchPanelDom.elems.advancedToggleMount.mount(() => createComponent(TouchSearchOptionToggle, {
        option: "advancedOptions",
        source: searchPanelDom
      })), searchPanelDom.elems.fileSearchToggleMount && searchPanelDom.elems.fileSearchToggleMount.mount(() => createComponent(TouchSearchOptionToggle, {
        option: "fileSearch",
        source: searchPanelDom
      })), searchPanelDom.elems.searchActionMount.mount(() => createComponent(TouchSearchAction, {
        action: "search",
        source: searchPanelDom
      })), searchPanelDom.elems.clearActionMount && searchPanelDom.elems.clearActionMount.mount(() => createComponent(TouchSearchAction, {
        action: "clear",
        source: searchPanelDom
      })));
    }), resultsDom;
  }
  async function injectPage(page2) {
    let galleryPage = page2.type === "gallery", searchPage = page2.type === "search" || page2.type === "favorites";
    if (page2.type === "settings") {
      let titlePreference = extractGalleryTitlePreference();
      titlePreference && state.gallery.titlePreference.set(titlePreference);
    }
    page2.type === "readHistory" && allowFeatureFailure("Read History page", () => {
      let records = loadReadHistoryRecords(), pageCount = Math.max(1, Math.ceil(records.length / 25)), pageIndex = Math.min(page2.pageIndex, pageCount - 1), items = records.map((record) => ({
        currentPage: record.pageNum,
        galleryId: record.galleryId,
        info: record.gallery,
        token: record.token,
        totalPages: record.totalPages,
        updatedAt: record.updatedAt
      })), titlePreference = state.gallery.titlePreference.reload(), historyDom = manageReadHistoryPage(items.slice(pageIndex * 25, (pageIndex + 1) * 25), titlePreference);
      historyDom?.elems.navigationTopMount.mount(() => createComponent(ReadHistoryPage, {
        initialPageIndex: pageIndex,
        items,
        pageSize: 25,
        source: historyDom
      }));
    });
    let galleryPreview = galleryPage ? allowFeatureFailure("Gallery Preview", () => manageGalleryPreview()) : null, galleryPreviewCache = galleryPreview ? allowFeatureFailure("Gallery Preview cache", () => createGalleryPreviewCache(galleryPreview)) : null;
    page2.type === "gallery" && galleryPreview && allowFeatureFailure("Gallery Read History", () => {
      let existing = loadReadHistory(page2.galleryId, page2.token), galleryInfo = extractGalleryHistoryInfo(), record = existing;
      gState.settings.readHistoryEnabled && gState.settings.includeUnreadHistoryEnabled ? record = recordGalleryVisit(page2.galleryId, page2.token, galleryPreview.data.totalImages, galleryInfo) : gState.settings.readHistoryEnabled && existing && (record = updateReadHistoryGalleryInfo(page2.galleryId, page2.token, galleryInfo)), gState.setReadProgress({
        currentPage: record?.pageNum && record.pageNum > 0 ? record.pageNum : 1,
        hasHistory: !!(record && record.pageNum > 0),
        totalPages: record?.totalPages ?? galleryPreview.data.totalImages
      });
    });
    let searchTextInput = searchPage ? allowFeatureFailure("Search text input", () => manageSearchTextInput()) : null, searchResultsSource = searchPage ? allowFeatureFailure("Search results", () => manageSearchResults()) : null;
    if (gState.settings.myTagsEnabled) {
      if (page2.type === "myTags")
        allowAsyncFeatureFailure("My Tags refresh", async () => {
          let currentMyTags = extractMyTagsPageData();
          await refreshMyTags(currentMyTags);
        });
      else if (galleryPage) {
        let myTagAppearances = loadMyTagAppearances();
        myTagAppearances ? allowFeatureFailure("Gallery My Tags appearance", () => {
          mutateGalleryMyTags(myTagAppearances);
        }) : allowAsyncFeatureFailure("My Tags appearance", async () => {
          let appearances = await refreshMyTags();
          appearances && mutateGalleryMyTags(appearances);
        });
      }
    }
    gState.settings.readHistoryEnabled && page2.type === "image" && allowFeatureFailure("Image Read History", () => {
      let gallery2 = extractImageGalleryPage();
      if (gallery2?.galleryId === page2.galleryId) {
        let previous = loadReadHistory(gallery2.galleryId, gallery2.token);
        new ReadHistorySession({
          gallery: previous?.gallery,
          galleryId: gallery2.galleryId,
          token: gallery2.token,
          totalPages: previous?.totalPages
        }).update(page2.pageNum, previous?.totalPages);
      }
    });
    let touchResultsDom = gState.settings.touchUiEnabled ? injectTouchUI(page2, galleryPreviewCache) : null;
    injectEnhanceUI(page2, galleryPreviewCache, searchTextInput, searchResultsSource, touchResultsDom), page2.type === "gallery" && state.reader.enabled.value && page2.peekPage !== null && galleryPreviewCache && allowAsyncFeatureFailure("Reader deep link", () => openReaderFromHash(readerCallbacks, galleryPreviewCache, readerViewport));
  }
  ehSyringe_exports.initialize();
  var historyRouteActive = extractPageType().type === "readHistory";
  window.addEventListener("hashchange", () => {
    let nextHistoryRouteActive = extractPageType().type === "readHistory";
    historyRouteActive !== nextHistoryRouteActive && window.location.reload(), historyRouteActive = nextHistoryRouteActive;
  });
  async function startApp() {
    document.readyState === "loading" && await new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), {
        once: !0
      });
    }), installSettingsMenu(), await injectPage(extractPageType());
  }
  startApp().catch((error) => {
    console.error("[ehpeek] App startup failed", error);
  });
  delegateEvents(["click"]);
})();

// ==UserScript==
// @name         ehpeek: E-H/ExH viewer
// @namespace    ehpeek
// @version      260715.1425
// @description  A mobile-optimized E-H/ExH viewer
// @match        *://e-hentai.org/*
// @match        *://exhentai.org/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @updateURL    https://github.com/yamipot/ehpeek/raw/build-master/ehpeek.user.js
// @downloadURL  https://github.com/yamipot/ehpeek/raw/build-master/ehpeek.user.js
// ==/UserScript==

"use strict";
(() => {
  // node_modules/.pnpm/preact@10.29.7/node_modules/preact/dist/preact.module.js
  var n, l, u, t, i, r, o, e, f, c, a, s, h, p, v, y, d = {}, w = [], _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, g = Array.isArray;
  function m(n2, l3) {
    for (var u3 in l3) n2[u3] = l3[u3];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k(l3, u3, t3) {
    var i3, r3, o3, e3 = {};
    for (o3 in u3) o3 == "key" ? i3 = u3[o3] : o3 == "ref" ? r3 = u3[o3] : e3[o3] = u3[o3];
    if (arguments.length > 2 && (e3.children = arguments.length > 3 ? n.call(arguments, 2) : t3), typeof l3 == "function" && l3.defaultProps != null) for (o3 in l3.defaultProps) e3[o3] === void 0 && (e3[o3] = l3.defaultProps[o3]);
    return x(l3, e3, i3, r3, null);
  }
  function x(n2, t3, i3, r3, o3) {
    var e3 = { type: n2, props: t3, key: i3, ref: r3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: o3 ?? ++u, __i: -1, __u: 0 };
    return o3 == null && l.vnode != null && l.vnode(e3), e3;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l3) {
    this.props = n2, this.context = l3;
  }
  function $(n2, l3) {
    if (l3 == null) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u3; l3 < n2.__k.length; l3++) if ((u3 = n2.__k[l3]) != null && u3.__e != null) return u3.__e;
    return typeof n2.type == "function" ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u3 = n2.__v, t3 = u3.__e, i3 = [], r3 = [], o3 = m({}, u3);
      o3.__v = u3.__v + 1, l.vnode && l.vnode(o3), q(n2.__P, o3, u3, n2.__n, n2.__P.namespaceURI, 32 & u3.__u ? [t3] : null, i3, t3 ?? $(u3), !!(32 & u3.__u), r3), o3.__v = u3.__v, o3.__.__k[o3.__i] = o3, D(i3, o3, r3), u3.__e = u3.__ = null, o3.__e != t3 && P(o3);
    }
  }
  function P(n2) {
    if ((n2 = n2.__) != null && n2.__c != null) return n2.__e = n2.__c.base = null, n2.__k.some(function(l3) {
      if (l3 != null && l3.__e != null) return n2.__e = n2.__c.base = l3.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = !0) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n2, l3 = 1; i.length; ) i.length > l3 && i.sort(e), n2 = i.shift(), l3 = i.length, I(n2);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n2, l3, u3, t3, i3, r3, o3, e3, f3, c3, a3) {
    var s3, h3, p3, v3, y3, _3, g2, m3 = t3 && t3.__k || w, b2 = l3.length;
    for (f3 = T(u3, l3, m3, f3, b2), s3 = 0; s3 < b2; s3++) (p3 = u3.__k[s3]) != null && (h3 = p3.__i != -1 && m3[p3.__i] || d, p3.__i = s3, _3 = q(n2, p3, h3, i3, r3, o3, e3, f3, c3, a3), v3 = p3.__e, p3.ref && h3.ref != p3.ref && (h3.ref && J(h3.ref, null, p3), a3.push(p3.ref, p3.__c || v3, p3)), y3 == null && v3 != null && (y3 = v3), (g2 = !!(4 & p3.__u)) || h3.__k === p3.__k ? (f3 = j(p3, f3, n2, g2), g2 && h3.__e && (h3.__e = null)) : typeof p3.type == "function" && _3 !== void 0 ? f3 = _3 : v3 && (f3 = v3.nextSibling), p3.__u &= -7);
    return u3.__e = y3, f3;
  }
  function T(n2, l3, u3, t3, i3) {
    var r3, o3, e3, f3, c3, a3 = u3.length, s3 = a3, h3 = 0;
    for (n2.__k = new Array(i3), r3 = 0; r3 < i3; r3++) (o3 = l3[r3]) != null && typeof o3 != "boolean" && typeof o3 != "function" ? (typeof o3 == "string" || typeof o3 == "number" || typeof o3 == "bigint" || o3.constructor == String ? o3 = n2.__k[r3] = x(null, o3, null, null, null) : g(o3) ? o3 = n2.__k[r3] = x(S, { children: o3 }, null, null, null) : o3.constructor === void 0 && o3.__b > 0 ? o3 = n2.__k[r3] = x(o3.type, o3.props, o3.key, o3.ref ? o3.ref : null, o3.__v) : n2.__k[r3] = o3, f3 = r3 + h3, o3.__ = n2, o3.__b = n2.__b + 1, e3 = null, (c3 = o3.__i = O(o3, u3, f3, s3)) != -1 && (s3--, (e3 = u3[c3]) && (e3.__u |= 2)), e3 == null || e3.__v == null ? (c3 == -1 && (i3 > a3 ? h3-- : i3 < a3 && h3++), typeof o3.type != "function" && (o3.__u |= 4)) : c3 != f3 && (c3 == f3 - 1 ? h3-- : c3 == f3 + 1 ? h3++ : (c3 > f3 ? h3-- : h3++, o3.__u |= 4))) : n2.__k[r3] = null;
    if (s3) for (r3 = 0; r3 < a3; r3++) (e3 = u3[r3]) != null && (2 & e3.__u) == 0 && (e3.__e == t3 && (t3 = $(e3)), K(e3, e3));
    return t3;
  }
  function j(n2, l3, u3, t3) {
    var i3, r3;
    if (typeof n2.type == "function") {
      for (i3 = n2.__k, r3 = 0; i3 && r3 < i3.length; r3++) i3[r3] && (i3[r3].__ = n2, l3 = j(i3[r3], l3, u3, t3));
      return l3;
    }
    n2.__e != l3 && (t3 && (l3 && n2.type && !l3.parentNode && (l3 = $(n2)), u3.insertBefore(n2.__e, l3 || null)), l3 = n2.__e);
    do
      l3 = l3 && l3.nextSibling;
    while (l3 != null && l3.nodeType == 8);
    return l3;
  }
  function O(n2, l3, u3, t3) {
    var i3, r3, o3, e3 = n2.key, f3 = n2.type, c3 = l3[u3], a3 = c3 != null && (2 & c3.__u) == 0;
    if (c3 === null && e3 == null || a3 && e3 == c3.key && f3 == c3.type) return u3;
    if (t3 > (a3 ? 1 : 0)) {
      for (i3 = u3 - 1, r3 = u3 + 1; i3 >= 0 || r3 < l3.length; ) if ((c3 = l3[o3 = i3 >= 0 ? i3-- : r3++]) != null && (2 & c3.__u) == 0 && e3 == c3.key && f3 == c3.type) return o3;
    }
    return -1;
  }
  function z(n2, l3, u3) {
    l3[0] == "-" ? n2.setProperty(l3, u3 ?? "") : n2[l3] = u3 == null ? "" : typeof u3 != "number" || _.test(l3) ? u3 : u3 + "px";
  }
  function N(n2, l3, u3, t3, i3) {
    var r3, o3;
    n: if (l3 == "style") if (typeof u3 == "string") n2.style.cssText = u3;
    else {
      if (typeof t3 == "string" && (n2.style.cssText = t3 = ""), t3) for (l3 in t3) u3 && l3 in u3 || z(n2.style, l3, "");
      if (u3) for (l3 in u3) t3 && u3[l3] == t3[l3] || z(n2.style, l3, u3[l3]);
    }
    else if (l3[0] == "o" && l3[1] == "n") r3 = l3 != (l3 = l3.replace(s, "$1")), o3 = l3.toLowerCase(), l3 = o3 in n2 || l3 == "onFocusOut" || l3 == "onFocusIn" ? o3.slice(2) : l3.slice(2), n2.l || (n2.l = {}), n2.l[l3 + r3] = u3, u3 ? t3 ? u3[a] = t3[a] : (u3[a] = h, n2.addEventListener(l3, r3 ? v : p, r3)) : n2.removeEventListener(l3, r3 ? v : p, r3);
    else {
      if (i3 == "http://www.w3.org/2000/svg") l3 = l3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if (l3 != "width" && l3 != "height" && l3 != "href" && l3 != "list" && l3 != "form" && l3 != "tabIndex" && l3 != "download" && l3 != "rowSpan" && l3 != "colSpan" && l3 != "role" && l3 != "popover" && l3 in n2) try {
        n2[l3] = u3 ?? "";
        break n;
      } catch {
      }
      typeof u3 == "function" || (u3 == null || u3 === !1 && l3[4] != "-" ? n2.removeAttribute(l3) : n2.setAttribute(l3, l3 == "popover" && u3 == 1 ? "" : u3));
    }
  }
  function V(n2) {
    return function(u3) {
      if (this.l) {
        var t3 = this.l[u3.type + n2];
        if (u3[c] == null) u3[c] = h++;
        else if (u3[c] < t3[a]) return;
        return t3(l.event ? l.event(u3) : u3);
      }
    };
  }
  function q(n2, u3, t3, i3, r3, o3, e3, f3, c3, a3) {
    var s3, h3, p3, v3, y3, d3, _3, k3, x2, M, $2, I2, P2, A3, H2, T3, j3 = u3.type;
    if (u3.constructor !== void 0) return null;
    128 & t3.__u && (c3 = !!(32 & t3.__u), o3 = [f3 = u3.__e = t3.__e]), (s3 = l.__b) && s3(u3);
    n: if (typeof j3 == "function") {
      h3 = e3.length;
      try {
        if (x2 = u3.props, M = j3.prototype && j3.prototype.render, $2 = (s3 = j3.contextType) && i3[s3.__c], I2 = s3 ? $2 ? $2.props.value : s3.__ : i3, t3.__c ? k3 = (p3 = u3.__c = t3.__c).__ = p3.__E : (M ? u3.__c = p3 = new j3(x2, I2) : (u3.__c = p3 = new C(x2, I2), p3.constructor = j3, p3.render = Q), $2 && $2.sub(p3), p3.state || (p3.state = {}), p3.__n = i3, v3 = p3.__d = !0, p3.__h = [], p3._sb = []), M && p3.__s == null && (p3.__s = p3.state), M && j3.getDerivedStateFromProps != null && (p3.__s == p3.state && (p3.__s = m({}, p3.__s)), m(p3.__s, j3.getDerivedStateFromProps(x2, p3.__s))), y3 = p3.props, d3 = p3.state, p3.__v = u3, v3) M && j3.getDerivedStateFromProps == null && p3.componentWillMount != null && p3.componentWillMount(), M && p3.componentDidMount != null && p3.__h.push(p3.componentDidMount);
        else {
          if (M && j3.getDerivedStateFromProps == null && x2 !== y3 && p3.componentWillReceiveProps != null && p3.componentWillReceiveProps(x2, I2), u3.__v == t3.__v || !p3.__e && p3.shouldComponentUpdate != null && p3.shouldComponentUpdate(x2, p3.__s, I2) === !1) {
            u3.__v != t3.__v && (p3.props = x2, p3.state = p3.__s, p3.__d = !1), u3.__e = t3.__e, u3.__k = t3.__k, u3.__k.some(function(n3) {
              n3 && (n3.__ = u3);
            }), w.push.apply(p3.__h, p3._sb), p3._sb = [], p3.__h.length && e3.push(p3);
            break n;
          }
          p3.componentWillUpdate != null && p3.componentWillUpdate(x2, p3.__s, I2), M && p3.componentDidUpdate != null && p3.__h.push(function() {
            p3.componentDidUpdate(y3, d3, _3);
          });
        }
        if (p3.context = I2, p3.props = x2, p3.__P = n2, p3.__e = !1, P2 = l.__r, A3 = 0, M) p3.state = p3.__s, p3.__d = !1, P2 && P2(u3), s3 = p3.render(p3.props, p3.state, p3.context), w.push.apply(p3.__h, p3._sb), p3._sb = [];
        else do
          p3.__d = !1, P2 && P2(u3), s3 = p3.render(p3.props, p3.state, p3.context), p3.state = p3.__s;
        while (p3.__d && ++A3 < 25);
        p3.state = p3.__s, p3.getChildContext != null && (i3 = m(m({}, i3), p3.getChildContext())), M && !v3 && p3.getSnapshotBeforeUpdate != null && (_3 = p3.getSnapshotBeforeUpdate(y3, d3)), H2 = s3 != null && s3.type === S && s3.key == null ? E(s3.props.children) : s3, f3 = L(n2, g(H2) ? H2 : [H2], u3, t3, i3, r3, o3, e3, f3, c3, a3), p3.base = u3.__e, u3.__u &= -161, p3.__h.length && e3.push(p3), k3 && (p3.__E = p3.__ = null);
      } catch (n3) {
        if (e3.length = h3, u3.__v = null, c3 || o3 != null) {
          if (n3.then) {
            for (u3.__u |= c3 ? 160 : 128; f3 && f3.nodeType == 8 && f3.nextSibling; ) f3 = f3.nextSibling;
            o3 != null && (o3[o3.indexOf(f3)] = null), u3.__e = f3;
          } else if (o3 != null) for (T3 = o3.length; T3--; ) b(o3[T3]);
        } else u3.__e = t3.__e;
        u3.__k == null && (u3.__k = t3.__k || []), n3.then || B(u3), l.__e(n3, u3, t3);
      }
    } else o3 == null && u3.__v == t3.__v ? (u3.__k = t3.__k, u3.__e = t3.__e) : f3 = u3.__e = G(t3.__e, u3, t3, i3, r3, o3, e3, c3, a3);
    return (s3 = l.diffed) && s3(u3), 128 & u3.__u ? void 0 : f3;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__e = !0), n2.__k && n2.__k.some(B));
  }
  function D(n2, u3, t3) {
    for (var i3 = 0; i3 < t3.length; i3++) J(t3[i3], t3[++i3], t3[++i3]);
    l.__c && l.__c(u3, n2), n2.some(function(u4) {
      try {
        n2 = u4.__h, u4.__h = [], n2.some(function(n3) {
          n3.call(u4);
        });
      } catch (n3) {
        l.__e(n3, u4.__v);
      }
    });
  }
  function E(n2) {
    return typeof n2 != "object" || n2 == null || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : n2.constructor !== void 0 ? null : m({}, n2);
  }
  function G(u3, t3, i3, r3, o3, e3, f3, c3, a3) {
    var s3, h3, p3, v3, y3, w3, _3, m3 = i3.props || d, k3 = t3.props, x2 = t3.type;
    if (x2 == "svg" ? o3 = "http://www.w3.org/2000/svg" : x2 == "math" ? o3 = "http://www.w3.org/1998/Math/MathML" : o3 || (o3 = "http://www.w3.org/1999/xhtml"), e3 != null) {
      for (s3 = 0; s3 < e3.length; s3++) if ((y3 = e3[s3]) && "setAttribute" in y3 == !!x2 && (x2 ? y3.localName == x2 : y3.nodeType == 3)) {
        u3 = y3, e3[s3] = null;
        break;
      }
    }
    if (u3 == null) {
      if (x2 == null) return document.createTextNode(k3);
      u3 = document.createElementNS(o3, x2, k3.is && k3), c3 && (l.__m && l.__m(t3, e3), c3 = !1), e3 = null;
    }
    if (x2 == null) m3 === k3 || c3 && u3.data == k3 || (u3.data = k3);
    else {
      if (e3 = x2 == "textarea" && k3.defaultValue != null ? null : e3 && n.call(u3.childNodes), !c3 && e3 != null) for (m3 = {}, s3 = 0; s3 < u3.attributes.length; s3++) m3[(y3 = u3.attributes[s3]).name] = y3.value;
      for (s3 in m3) y3 = m3[s3], s3 == "dangerouslySetInnerHTML" ? p3 = y3 : s3 == "children" || s3 in k3 || s3 == "value" && "defaultValue" in k3 || s3 == "checked" && "defaultChecked" in k3 || N(u3, s3, null, y3, o3);
      for (s3 in k3) y3 = k3[s3], s3 == "children" ? v3 = y3 : s3 == "dangerouslySetInnerHTML" ? h3 = y3 : s3 == "value" ? w3 = y3 : s3 == "checked" ? _3 = y3 : c3 && typeof y3 != "function" || m3[s3] === y3 || N(u3, s3, y3, m3[s3], o3);
      if (h3) c3 || p3 && (h3.__html == p3.__html || h3.__html == u3.innerHTML) || (u3.innerHTML = h3.__html), t3.__k = [];
      else if (p3 && (u3.innerHTML = ""), L(t3.type == "template" ? u3.content : u3, g(v3) ? v3 : [v3], t3, i3, r3, x2 == "foreignObject" ? "http://www.w3.org/1999/xhtml" : o3, e3, f3, e3 ? e3[0] : i3.__k && $(i3, 0), c3, a3), e3 != null) for (s3 = e3.length; s3--; ) b(e3[s3]);
      c3 && x2 != "textarea" || (s3 = "value", x2 == "progress" && w3 == null ? u3.removeAttribute("value") : w3 != null && (w3 !== u3[s3] || x2 == "progress" && !w3 || x2 == "option" && w3 != m3[s3]) && N(u3, s3, w3, m3[s3], o3), s3 = "checked", _3 != null && _3 != u3[s3] && N(u3, s3, _3, m3[s3], o3));
    }
    return u3;
  }
  function J(n2, u3, t3) {
    try {
      if (typeof n2 == "function") {
        var i3 = typeof n2.__u == "function";
        i3 && n2.__u(), i3 && u3 == null || (n2.__u = n2(u3));
      } else n2.current = u3;
    } catch (n3) {
      l.__e(n3, t3);
    }
  }
  function K(n2, u3, t3) {
    var i3, r3;
    if (l.unmount && l.unmount(n2), (i3 = n2.ref) && (i3.current && i3.current != n2.__e || J(i3, null, u3)), (i3 = n2.__c) != null) {
      if (i3.componentWillUnmount) try {
        i3.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u3);
      }
      i3.base = i3.__P = i3.__n = null;
    }
    if (i3 = n2.__k) for (r3 = 0; r3 < i3.length; r3++) i3[r3] && K(i3[r3], u3, t3 || typeof n2.type != "function");
    t3 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l3, u3) {
    return this.constructor(n2, u3);
  }
  function R(u3, t3, i3) {
    var r3, o3, e3, f3;
    t3 == document && (t3 = document.documentElement), l.__ && l.__(u3, t3), o3 = (r3 = typeof i3 == "function") ? null : i3 && i3.__k || t3.__k, e3 = [], f3 = [], q(t3, u3 = (!r3 && i3 || t3).__k = k(S, null, [u3]), o3 || d, d, t3.namespaceURI, !r3 && i3 ? [i3] : o3 ? null : t3.firstChild ? n.call(t3.childNodes) : null, e3, !r3 && i3 ? i3 : o3 ? o3.__e : t3.firstChild, r3, f3), D(e3, u3, f3), u3.props.children = null;
  }
  n = w.slice, l = { __e: function(n2, l3, u3, t3) {
    for (var i3, r3, o3; l3 = l3.__; ) if ((i3 = l3.__c) && !i3.__) try {
      if ((r3 = i3.constructor) && r3.getDerivedStateFromError != null && (i3.setState(r3.getDerivedStateFromError(n2)), o3 = i3.__d), i3.componentDidCatch != null && (i3.componentDidCatch(n2, t3 || {}), o3 = i3.__d), o3) return i3.__E = i3;
    } catch (l4) {
      n2 = l4;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return n2 != null && n2.constructor === void 0;
  }, C.prototype.setState = function(n2, l3) {
    var u3;
    u3 = this.__s != null && this.__s != this.state ? this.__s : this.__s = m({}, this.state), typeof n2 == "function" && (n2 = n2(m({}, u3), this.props)), n2 && m(u3, n2), n2 != null && this.__v && (l3 && this._sb.push(l3), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = !0, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i = [], o = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l3) {
    return n2.__v.__b - l3.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(!1), v = V(!0), y = 0;

  // node_modules/.pnpm/preact@10.29.7/node_modules/preact/hooks/dist/hooks.module.js
  var t2, r2, u2, i2, o2 = 0, f2 = [], c2 = l, e2 = c2.__b, a2 = c2.__r, v2 = c2.diffed, l2 = c2.__c, m2 = c2.unmount, p2 = c2.__;
  function s2(n2, t3) {
    c2.__h && c2.__h(r2, n2, o2 || t3), o2 = 0;
    var u3 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u3.__.length && u3.__.push({}), u3.__[n2];
  }
  function d2(n2) {
    return o2 = 1, y2(D2, n2);
  }
  function y2(n2, u3, i3) {
    var o3 = s2(t2++, 2);
    if (o3.t = n2, !o3.__c && (o3.__ = [i3 ? i3(u3) : D2(void 0, u3), function(n3) {
      var t3 = o3.__N ? o3.__N[0] : o3.__[0], r3 = o3.t(t3, n3);
      t3 !== r3 && (o3.__N = [r3, o3.__[1]], o3.__c.setState({}));
    }], o3.__c = r2, !r2.__f)) {
      var f3 = function(n3, t3, r3) {
        if (!o3.__c.__H) return !0;
        var u4 = !1, i4 = o3.__c.props !== n3;
        if (o3.__c.__H.__.some(function(n4) {
          if (n4.__N) {
            u4 = !0;
            var t4 = n4.__[0];
            n4.__ = n4.__N, n4.__N = void 0, t4 !== n4.__[0] && (i4 = !0);
          }
        }), c3) {
          var f4 = c3.call(this, n3, t3, r3);
          return u4 ? f4 || i4 : f4;
        }
        return !u4 || i4;
      };
      r2.__f = !0;
      var c3 = r2.shouldComponentUpdate, e3 = r2.componentWillUpdate;
      r2.componentWillUpdate = function(n3, t3, r3) {
        if (this.__e) {
          var u4 = c3;
          c3 = void 0, f3(n3, t3, r3), c3 = u4;
        }
        e3 && e3.call(this, n3, t3, r3);
      }, r2.shouldComponentUpdate = f3;
    }
    return o3.__N || o3.__;
  }
  function h2(n2, u3) {
    var i3 = s2(t2++, 3);
    !c2.__s && C2(i3.__H, u3) && (i3.__ = n2, i3.u = u3, r2.__H.__h.push(i3));
  }
  function _2(n2, u3) {
    var i3 = s2(t2++, 4);
    !c2.__s && C2(i3.__H, u3) && (i3.__ = n2, i3.u = u3, r2.__h.push(i3));
  }
  function A2(n2) {
    return o2 = 5, T2(function() {
      return { current: n2 };
    }, []);
  }
  function T2(n2, r3) {
    var u3 = s2(t2++, 7);
    return C2(u3.__H, r3) && (u3.__ = n2(), u3.__H = r3, u3.__h = n2), u3.__;
  }
  function j2() {
    for (var n2; n2 = f2.shift(); ) {
      var t3 = n2.__H;
      if (n2.__P && t3) try {
        t3.__h.some(z2), t3.__h.some(B2), t3.__h = [];
      } catch (r3) {
        t3.__h = [], c2.__e(r3, n2.__v);
      }
    }
  }
  c2.__b = function(n2) {
    r2 = null, e2 && e2(n2);
  }, c2.__ = function(n2, t3) {
    n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), p2 && p2(n2, t3);
  }, c2.__r = function(n2) {
    a2 && a2(n2), t2 = 0;
    var i3 = (r2 = n2.__c).__H;
    i3 && (u2 === r2 ? (i3.__h = [], r2.__h = [], i3.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })) : (i3.__h.some(z2), i3.__h.some(B2), i3.__h = [], t2 = 0)), u2 = r2;
  }, c2.diffed = function(n2) {
    v2 && v2(n2);
    var t3 = n2.__c;
    t3 && t3.__H && (t3.__H.__h.length && (f2.push(t3) !== 1 && i2 === c2.requestAnimationFrame || ((i2 = c2.requestAnimationFrame) || w2)(j2)), t3.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u, n3.u = void 0);
    })), u2 = r2 = null;
  }, c2.__c = function(n2, t3) {
    t3.some(function(n3) {
      try {
        n3.__h.some(z2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || B2(n4);
        });
      } catch (r3) {
        t3.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t3 = [], c2.__e(r3, n3.__v);
      }
    }), l2 && l2(n2, t3);
  }, c2.unmount = function(n2) {
    m2 && m2(n2);
    var t3, r3 = n2.__c;
    r3 && r3.__H && (r3.__H.__.some(function(n3) {
      try {
        z2(n3);
      } catch (n4) {
        t3 = n4;
      }
    }), r3.__H = void 0, t3 && c2.__e(t3, r3.__v));
  };
  var k2 = typeof requestAnimationFrame == "function";
  function w2(n2) {
    var t3, r3 = function() {
      clearTimeout(u3), k2 && cancelAnimationFrame(t3), setTimeout(n2);
    }, u3 = setTimeout(r3, 35);
    k2 && (t3 = requestAnimationFrame(r3));
  }
  function z2(n2) {
    var t3 = r2, u3 = n2.__c;
    typeof u3 == "function" && (n2.__c = void 0, u3()), r2 = t3;
  }
  function B2(n2) {
    var t3 = r2;
    n2.__c = n2.__(), r2 = t3;
  }
  function C2(n2, t3) {
    return !n2 || n2.length !== t3.length || t3.some(function(t4, r3) {
      return t4 !== n2[r3];
    });
  }
  function D2(n2, t3) {
    return typeof t3 == "function" ? t3(n2) : t3;
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
      disableReader: "Disable Ehpeek Reader",
      download: "Download",
      startReading: "Read",
      continueReading: "Continue",
      loading: "Loading...",
      pages: "Pages",
      endPage: "End",
      end: "End of gallery. Tap to exit.",
      failedPrefix: "Failed",
      reload: "Reload"
    },
    settings: {
      openSettings: "Settings",
      menuLabel: "Ehpeek",
      readerOn: "Reader: on",
      readerOff: "Reader: off",
      enhanceSearchOn: "Enhance Search Grids: on",
      enhanceSearchOff: "Enhance Search Grids: off",
      enhanceThumbsOn: "Enhance Thumbs Preview: on",
      enhanceThumbsOff: "Enhance Thumbs Preview: off",
      touchUiOn: "Touch UI: on",
      touchUiOff: "Touch UI: off",
      apply: "Apply",
      close: "Close"
    },
    errors: {
      imageNotFound: "Image not found",
      loadFailed: "Load failed",
      imageLoadFailed: "Image load failed",
      previewPageSizeUnknown: "Cannot determine gallery preview page size",
      searchPageContentNotFound: "Cannot find search page content"
    }
  };

  // src/state.ts
  var state = {
    reader: {
      enabled: persisted("ehpeek:reader:enabled", !0),
      viewMode: persisted("ehpeek:reader:view-mode", "scroll"),
      readDirection: persisted("ehpeek:reader:read-direction", "rtl"),
      rightTapAction: persisted("ehpeek:reader:right-tap-action", "previous")
    },
    gallery: {
      enhanceThumbs: persisted("ehpeek:enhance-thumbs:enabled", !0)
    },
    search: {
      enhance: persisted("ehpeek:enhance-search:enabled", !0)
    },
    touch: {
      enabled: persisted("ehpeek:touch-ui:enabled", !0)
    }
  };
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
  async function requestText(url) {
    let controller = new AbortController(), timeout = window.setTimeout(() => {
      controller.abort();
    }, 3e4);
    try {
      let response = await fetch(url, {
        credentials: "include",
        signal: controller.signal
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } finally {
      window.clearTimeout(timeout);
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
    let style = document.createElement("style");
    style.id = styleId, style.textContent = css, document.head.append(style);
  }
  function targetSummary(target) {
    if (!(target instanceof Element))
      return String(target);
    let id = target.id ? `#${target.id}` : "", className = typeof target.className == "string" && target.className ? `.${target.className.replace(/\s+/g, ".")}` : "";
    return `${target.tagName.toLowerCase()}${id}${className}`;
  }

  // src/components/pointerGesture.ts
  var PointerGesture = class {
    constructor(target, callbacks) {
      this.target = target;
      this.callbacks = callbacks;
      this.mousePointerId = -1;
      this.pinchPointers = /* @__PURE__ */ new Map();
      this.drag = null;
      this.suppressClick = !1;
      this.suppressClickTimer = null;
      this.passiveTap = null;
      this.pinch = null;
      this.onDragStart = (event) => {
        this.isDragging() && event.preventDefault();
      };
      this.onClick = (event) => {
        this.suppressClick && (this.suppressClick = !1, event.preventDefault(), event.stopPropagation());
      };
      this.onPointerDown = (event) => {
        if (!(event.pointerType === "mouse" && event.button !== 0) && !this.trackPinchPointerDown(event) && !this.pinch) {
          if (this.callbacks.shouldCaptureDrag && !this.callbacks.shouldCaptureDrag(event)) {
            this.beginPassiveTap(event);
            return;
          }
          this.start(event.pointerId, event.pointerType, event.clientX, event.clientY, event);
        }
      };
      this.onMouseDown = (event) => {
        event.button !== 0 || typeof PointerEvent < "u" || this.drag || this.callbacks.shouldCaptureDrag && !this.callbacks.shouldCaptureDrag(event) || (this.start(this.mousePointerId, "mouse", event.clientX, event.clientY, event), this.addMouseListeners());
      };
      this.onPointerMove = (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || this.move(event.clientX, event.clientY, event);
      };
      this.onPointerUp = (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || (this.finish(event.clientX, event.clientY, event), this.releasePinchPointer(event));
      };
      this.onPointerCancel = (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || (this.finish(event.clientX, event.clientY, event), this.releasePinchPointer(event));
      };
      this.onMouseMove = (event) => {
        !this.drag || this.drag.pointerType !== "mouse" || this.move(event.clientX, event.clientY, event);
      };
      this.onMouseUp = (event) => {
        !this.drag || this.drag.pointerType !== "mouse" || this.finish(event.clientX, event.clientY, event);
      };
      this.onPassiveTapMove = (event) => {
        this.trackPassiveTap(event);
      };
      this.onPassiveTapEnd = (event) => {
        this.endPassiveTap(event);
      };
      this.onPinchPointerMove = (event) => {
        if (!this.pinch || !this.pinchPointers.has(event.pointerId))
          return;
        this.pinchPointers.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY
        });
        let snapshot = this.pinchSnapshot();
        snapshot && (this.callbacks.onPinchMove?.(
          {
            ...snapshot,
            scale: snapshot.distance / this.pinch.startDistance
          },
          event
        ), event.preventDefault());
      };
      this.onPinchPointerEnd = (event) => {
        this.pinchPointers.has(event.pointerId) && (this.pinchPointers.delete(event.pointerId), !(!this.pinch || this.pinchPointers.size >= 2) && (this.callbacks.onPinchEnd?.(), this.clearPinch(), event.preventDefault()));
      };
      this.setDragging(!1), target.addEventListener("pointerdown", this.onPointerDown), target.addEventListener("mousedown", this.onMouseDown), target.addEventListener("dragstart", this.onDragStart), target.addEventListener("click", this.onClick, !0);
    }
    dispose() {
      this.drag?.captured && this.target.releasePointerCapture?.(this.drag.pointerId), this.drag = null, this.setDragging(!1), this.clearPinch(), this.passiveTap = null, this.removePointerListeners(), this.removeMouseListeners(), this.removePassiveTapListeners(), this.target.removeEventListener("pointerdown", this.onPointerDown), this.target.removeEventListener("mousedown", this.onMouseDown), this.target.removeEventListener("dragstart", this.onDragStart), this.target.removeEventListener("click", this.onClick, !0), this.suppressClickTimer !== null && (window.clearTimeout(this.suppressClickTimer), this.suppressClickTimer = null);
    }
    isDragging() {
      return this.drag?.active === !0;
    }
    cancel() {
      this.drag && (this.drag.captured && this.target.releasePointerCapture?.(this.drag.pointerId), this.drag = null, this.setDragging(!1), this.removePointerListeners(), this.removeMouseListeners());
    }
    start(pointerId, pointerType, clientX, clientY, event) {
      this.drag = {
        active: !1,
        captured: !1,
        pointerId,
        pointerType,
        startClientX: clientX,
        startClientY: clientY,
        lastClientX: clientX,
        lastClientY: clientY,
        lastMoveTime: event.timeStamp,
        startTarget: event.target,
        velocityY: 0
      }, this.addPointerListeners();
    }
    move(clientX, clientY, event) {
      let drag = this.drag;
      if (!drag)
        return;
      if (!drag.active && this.dragIntent(clientX - drag.startClientX, clientY - drag.startClientY) === "cancel") {
        this.cancel();
        return;
      }
      if (!drag.active && this.dragIntent(clientX - drag.startClientX, clientY - drag.startClientY) !== "start") {
        this.updateLastMove(drag, clientX, clientY, event);
        return;
      }
      drag.active || this.activateDrag(drag, event);
      let elapsed = Math.max(1, event.timeStamp - drag.lastMoveTime);
      drag.velocityY = (clientY - drag.lastClientY) / elapsed, drag.lastClientX = clientX, drag.lastClientY = clientY, drag.lastMoveTime = event.timeStamp, this.callbacks.onMove?.(
        {
          pointerId: drag.pointerId,
          clientX,
          clientY,
          dx: clientX - drag.startClientX,
          dy: clientY - drag.startClientY,
          velocityY: drag.velocityY
        },
        event
      ), event.preventDefault();
    }
    finish(clientX, clientY, event) {
      let drag = this.drag;
      if (!drag)
        return;
      this.drag = null, this.setDragging(!1), drag.captured && this.target.releasePointerCapture?.(drag.pointerId), this.removePointerListeners(), this.removeMouseListeners();
      let info = {
        pointerId: drag.pointerId,
        clientX,
        clientY,
        dx: clientX - drag.startClientX,
        dy: clientY - drag.startClientY,
        velocityY: drag.velocityY
      }, isTap = Math.abs(info.dx) < this.tapMoveThreshold() && Math.abs(info.dy) < this.tapMoveThreshold();
      !drag.active && isTap && this.callbacks.onTap?.({ ...info, startTarget: drag.startTarget }, event), drag.active && (this.suppressNextClick(), this.callbacks.onEnd?.(info, event));
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
    beginPassiveTap(event) {
      this.callbacks.shouldObserveTap?.(event) && (this.passiveTap = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startClientX: event.clientX,
        startClientY: event.clientY,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        startTarget: event.target,
        moved: !1
      }, this.addPassiveTapListeners());
    }
    trackPassiveTap(event) {
      let tap = this.passiveTap;
      !tap || !this.matchesPassiveTapPointer(event, tap) || (tap.lastClientX = event.clientX, tap.lastClientY = event.clientY, (Math.abs(event.clientX - tap.startClientX) >= this.tapMoveThreshold() || Math.abs(event.clientY - tap.startClientY) >= this.tapMoveThreshold()) && (tap.moved = !0));
    }
    endPassiveTap(event) {
      let tap = this.passiveTap;
      if (!tap || !this.matchesPassiveTapPointer(event, tap) || (this.passiveTap = null, this.removePassiveTapListeners(), this.releasePinchPointer(event), event.type === "pointercancel"))
        return;
      let dx = event.clientX - tap.startClientX, dy = event.clientY - tap.startClientY;
      tap.moved || Math.abs(dx) >= this.tapMoveThreshold() || Math.abs(dy) >= this.tapMoveThreshold() || this.callbacks.onTap?.(
        {
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          dx,
          dy,
          velocityY: 0,
          startTarget: tap.startTarget
        },
        event
      );
    }
    addPassiveTapListeners() {
      document.addEventListener("pointermove", this.onPassiveTapMove, !0), document.addEventListener("pointerup", this.onPassiveTapEnd, !0), document.addEventListener("pointercancel", this.onPassiveTapEnd, !0);
    }
    removePassiveTapListeners() {
      document.removeEventListener("pointermove", this.onPassiveTapMove, !0), document.removeEventListener("pointerup", this.onPassiveTapEnd, !0), document.removeEventListener("pointercancel", this.onPassiveTapEnd, !0);
    }
    trackPinchPointerDown(event) {
      if (!this.callbacks.onPinchStart || event.pointerType === "mouse" || (this.pinchPointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY
      }), this.pinch || this.pinchPointers.size !== 2))
        return !1;
      let snapshot = this.pinchSnapshot();
      return !snapshot || !this.callbacks.onPinchStart(snapshot, event) ? !1 : (this.cancel(), this.passiveTap = null, this.removePassiveTapListeners(), this.pinch = {
        startDistance: snapshot.distance
      }, this.addPinchListeners(), event.preventDefault(), event.stopPropagation(), !0);
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
      return this.callbacks.tapMoveThreshold ?? 8;
    }
    dragStartThreshold() {
      return this.callbacks.dragStartThreshold ?? 8;
    }
    dragIntentRatio() {
      return this.callbacks.dragIntentRatio ?? 1;
    }
    dragAxis() {
      return this.callbacks.dragAxis ?? "any";
    }
    dragIntent(dx, dy) {
      let absX = Math.abs(dx), absY = Math.abs(dy), threshold = this.dragStartThreshold(), ratio = this.dragIntentRatio();
      return this.dragAxis() === "x" ? absY >= threshold && absY > absX ? "cancel" : absX >= threshold && absX >= absY * ratio ? "start" : "pending" : this.dragAxis() === "y" ? absX >= threshold && absX > absY ? "cancel" : absY >= threshold && absY >= absX * ratio ? "start" : "pending" : Math.hypot(dx, dy) >= threshold ? "start" : "pending";
    }
    activateDrag(drag, event) {
      drag.active = !0, this.setDragging(!0), event instanceof PointerEvent && this.target.setPointerCapture && (this.target.setPointerCapture(drag.pointerId), drag.captured = !0), this.callbacks.onStart?.(
        {
          pointerId: drag.pointerId,
          clientX: drag.startClientX,
          clientY: drag.startClientY
        },
        event
      ), event.preventDefault();
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
    matchesPassiveTapPointer(event, tap) {
      return event.pointerId === tap.pointerId && event.pointerType === tap.pointerType;
    }
  };

  // src/components/PointerGestureSurface.tsx
  function usePointerGestureElement(target, callbacks, handleRef) {
    let callbacksRef = A2(callbacks), handleRefRef = A2(handleRef), gestureRef = A2(null);
    callbacksRef.current = callbacks, handleRefRef.current = handleRef, _2(() => {
      if (!target) {
        handleRefRef.current?.(null);
        return;
      }
      let gesture = new PointerGesture(target, pointerGestureCallbackProxy(callbacksRef));
      return gestureRef.current = gesture, handleRefRef.current?.({
        gesture: () => gestureRef.current
      }), () => {
        handleRefRef.current?.(null), gesture.dispose(), gestureRef.current = null;
      };
    }, [target]);
  }
  function pointerGestureCallbackProxy(callbacksRef) {
    return {
      get dragAxis() {
        return callbacksRef.current.dragAxis;
      },
      get dragIntentRatio() {
        return callbacksRef.current.dragIntentRatio;
      },
      get dragStartThreshold() {
        return callbacksRef.current.dragStartThreshold;
      },
      shouldCaptureDrag: (event) => callbacksRef.current.shouldCaptureDrag?.(event) ?? !0,
      shouldObserveTap: (event) => callbacksRef.current.shouldObserveTap?.(event) ?? !1,
      onStart: (info, event) => callbacksRef.current.onStart?.(info, event),
      onMove: (info, event) => callbacksRef.current.onMove?.(info, event),
      onEnd: (info, event) => callbacksRef.current.onEnd?.(info, event),
      onTap: (info, event) => callbacksRef.current.onTap?.(info, event),
      onPinchStart: (info, event) => callbacksRef.current.onPinchStart?.(info, event) ?? !1,
      onPinchMove: (info, event) => callbacksRef.current.onPinchMove?.(info, event),
      onPinchEnd: () => callbacksRef.current.onPinchEnd?.(),
      get tapMoveThreshold() {
        return callbacksRef.current.tapMoveThreshold;
      }
    };
  }

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
  var FALLBACK_ASPECT_RATIO = 1.42;
  function pagesViewportDom(options) {
    let scroller = document.createElement("div"), strip = document.createElement("main");
    scroller.className = "w-full h-full overflow-auto overscroll-contain scroll-auto touch-pan-y cursor-grab control-scroll-hidden [&[data-dragging=true]]:cursor-grabbing [&[data-dragging=true]]:select-none [#ehpeek-reader[data-view-mode=paged]_&]:overflow-hidden [#ehpeek-reader[data-view-mode=paged]_&]:touch-none [#ehpeek-reader[data-view-mode=paged]_&]:select-none", scroller.tabIndex = -1, strip.className = "flex flex-col w-full min-h-full py-56px px-0 pb-72px [#ehpeek-reader[data-view-mode=paged]_&]:flex-row [#ehpeek-reader[data-view-mode=paged]_&]:w-auto [#ehpeek-reader[data-view-mode=paged]_&]:h-full [#ehpeek-reader[data-view-mode=paged]_&]:min-h-0 [#ehpeek-reader[data-view-mode=paged]_&]:p-0", scroller.append(strip);
    let setOrder = (elements, visualIndex) => {
      elements.node.style.setProperty("order", String(visualIndex)), elements.node.dataset.ehpeekIndex = String(visualIndex);
    }, setPageNum = (elements, pageNum) => {
      elements.node.dataset.ehpeekPageNum = String(pageNum);
    }, newSlotElements = (pageNum, visualIndex) => {
      let elements = slotElements();
      return setOrder(elements, visualIndex), setPageNum(elements, pageNum), elements;
    }, appendSlotElements = (elements) => {
      strip.append(elements.node);
    }, removeSlotElements = (elements) => {
      elements.node.remove();
    }, removeStaleElements = (keepNodes) => {
      for (let node of Array.from(strip.children))
        keepNodes.has(node) || node.remove();
    }, slotElementsConnected = (elements) => elements.node.isConnected, slots = {
      sync(pageSlots2, options2) {
        let keepNodes = new Set(pageSlots2.map((slot) => slot.elements?.node ?? null).filter(Boolean));
        removeStaleElements(keepNodes);
        for (let slot of pageSlots2)
          slot.elements && !slotElementsConnected(slot.elements) && (slot.elements = null), slot.elements || (slot.elements = newSlotElements(slot.pageNum, options2.visualIndex(slot.index, pageSlots2.length)), appendSlotElements(slot.elements)), options2.refreshSlot(slot), slot.elements && setOrder(slot.elements, options2.visualIndex(slot.index, pageSlots2.length));
      },
      removeSlot(slot) {
        slot.elements && (removeSlotElements(slot.elements), slot.elements = null);
      },
      setImage(elements, image) {
        elements.frame.replaceChildren(image);
      },
      setPageNum,
      setPlaceholder(elements, content, text) {
        let placeholder = content.state === "error" ? errorPlaceholderDom(content.pageNum, text, options.onReloadPage) : placeholderDom(content.kind, text);
        elements.frame.replaceChildren(placeholder);
      },
      setSize(elements, frameWidth, frameHeight) {
        elements.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`), elements.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`), elements.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
      }
    };
    return { element: scroller, scroller: createPagesScroller(scroller), slots };
  }
  function slotElements() {
    let node = document.createElement("section"), frame = document.createElement("div");
    return node.className = "ehpeek-page flex w-full h-[var(--ehpeek-page-height)] items-start justify-center pb-8px [#ehpeek-reader[data-view-mode=paged]_&]:flex-[0_0_100%] [#ehpeek-reader[data-view-mode=paged]_&]:w-full [#ehpeek-reader[data-view-mode=paged]_&]:h-full [#ehpeek-reader[data-view-mode=paged]_&]:items-center [#ehpeek-reader[data-view-mode=paged]_&]:p-0", frame.className = "flex w-[var(--ehpeek-frame-width)] h-[var(--ehpeek-frame-height)] items-center justify-center overflow-hidden [#ehpeek-reader[data-view-mode=paged]_&]:w-full [#ehpeek-reader[data-view-mode=paged]_&]:h-full", node.append(frame), { node, frame };
  }
  function placeholderDom(kind, text) {
    let placeholder = document.createElement("div");
    return placeholder.className = "flex w-full h-full items-center justify-center bg-[#151515] text-[rgba(245,245,245,0.72)] leading-1 text-center " + (kind === "end" ? "p-24px [direction:ltr] text-[clamp(24px,6vw,42px)] font-700 leading-[1.3] [unicode-bidi:plaintext]" : "text-[clamp(88px,25vw,180px)] desktop:text-[clamp(72px,10vw,140px)] font-850"), placeholder.textContent = text, placeholder;
  }
  function errorPlaceholderDom(pageNum, text, onReloadPage) {
    let button = document.createElement("button"), icon = document.createElement("span"), placeholder = document.createElement("div"), message = document.createElement("div"), stop = (event) => {
      event.preventDefault(), event.stopPropagation();
    };
    return button.className = "inline-flex w-64px h-64px items-center justify-center border border-[rgba(255,178,167,0.64)] rounded-[var(--ehpeek-control-radius-pill)] bg-[rgba(255,178,167,0.12)] text-[#ffddd8] cursor-pointer font-sans text-34px font-700 leading-1 active:scale-96 [touch-action:manipulation]", button.type = "button", button.setAttribute("aria-label", texts_default.reader.reload), icon.setAttribute("aria-hidden", "true"), icon.textContent = "↻", button.append(icon), placeholder.className = "flex w-full h-full flex-col items-center justify-center gap-18px bg-[#151515] p-24px text-[#ffb2a7] text-center text-18px font-700 leading-1", message.className = "max-w-[min(86vw,760px)] break-anywhere [direction:ltr] [unicode-bidi:plaintext]", message.textContent = text, placeholder.append(message, button), button.addEventListener("pointerdown", stop), button.addEventListener("click", (event) => {
      stop(event), onReloadPage(pageNum);
    }), placeholder;
  }
  function pageImageDom(pageNum, slotImage) {
    let image = document.createElement("img");
    return image.className = "block w-[var(--ehpeek-frame-width)] h-[var(--ehpeek-frame-height)] object-contain select-none [-webkit-user-drag:none] [#ehpeek-reader[data-view-mode=paged]_&]:w-full [#ehpeek-reader[data-view-mode=paged]_&]:h-full", image.alt = `Page ${pageNum}`, image.decoding = "async", image.loading = "eager", image.draggable = !1, image.setAttribute("fetchpriority", slotImage.highPriority ? "high" : "low"), image.src = slotImage.imageUrl, slotImage.width && slotImage.height && (image.width = slotImage.width, image.height = slotImage.height), image;
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
  var PagesViewport = class {
    constructor(options) {
      this.options = options;
      this.slots = [];
      this.horizontalAnimator = new ScrollAnimator("x");
      this.flingAnimator = new ScrollFlingAnimator();
      this.dom = pagesViewportDom({ onReloadPage: options.onReloadPage }), this.element = this.dom.element;
    }
    scrollerElement() {
      return this.dom.scroller.element;
    }
    syncWindow(options) {
      let oldSlots = new Map(this.slots.map((slot) => [slot.pageNum, slot])), nextSlots = [];
      for (let pageNum of this.windowPageNums(options.currentPageNum, options.windowSize)) {
        let kind = pageSlotKind(pageNum, options.totalPages), oldSlot = oldSlots.get(pageNum), slot = oldSlot && oldSlot.kind === kind ? oldSlot : pageSlot(pageNum, kind);
        if (kind === "page") {
          let page = options.pages.get(pageNum);
          page && applyPageMetaToSlot(slot, page);
        } else
          clearNonPageSlotMeta(slot);
        nextSlots.push(slot);
      }
      let nextSet = new Set(nextSlots);
      for (let slot of this.slots)
        nextSet.has(slot) || this.removeSlot(slot);
      this.slots = nextSlots, this.slots.forEach((slot, index) => {
        slot.index = index;
      }), this.renderSlots();
    }
    resetPosition() {
      this.dom.scroller.resetPosition();
    }
    stopMotion() {
      this.flingAnimator.cancel(), this.horizontalAnimator.cancel();
    }
    resizePages() {
      for (let slot of this.slots)
        this.applySlotSize(slot);
    }
    requiredImagePageNums() {
      return this.slots.filter((slot) => slot.kind === "page" && slot.state === "idle").map((slot) => slot.pageNum);
    }
    windowPageNums(currentPageNum, windowSize) {
      let numbers = [];
      for (let offset = -windowSize; offset <= windowSize; offset += 1)
        numbers.push(currentPageNum + offset);
      return numbers;
    }
    markPageLoading(pageNum) {
      let slot = this.slotFor(pageNum);
      return !slot || slot.kind !== "page" || slot.state !== "idle" ? null : (slot.state = "loading", slot.token += 1, this.refreshSlot(slot), slot.token);
    }
    createPageImage(pageNum, slotImage) {
      return pageImageDom(pageNum, slotImage);
    }
    setPageImage(pageNum, token, slotImage, image) {
      let slot = this.slotFor(pageNum);
      return !slot || slot.token !== token || !slot.elements ? !1 : (slot.state = "ready", slot.imageUrl = slotImage.imageUrl, slot.width = positiveDimension(image.naturalWidth) ?? slotImage.width, slot.height = positiveDimension(image.naturalHeight) ?? slotImage.height, this.applySlotSize(slot), this.dom.slots.setImage(slot.elements, image), !0);
    }
    setPageError(pageNum, token, errorMessage) {
      let slot = this.slotFor(pageNum);
      return !slot || slot.token !== token ? !1 : (slot.state = "error", this.renderSlotPlaceholder(slot, errorMessage), !0);
    }
    resetPageError(pageNum) {
      let slot = this.slotFor(pageNum);
      return !slot || slot.kind !== "page" || slot.state !== "error" ? !1 : (slot.state = "idle", this.refreshSlot(slot), !0);
    }
    moveToPage(pageNum, motion = "instant", onComplete) {
      let delta = this.pageOffset(pageNum);
      delta !== null && this.moveBy(delta, motion, onComplete);
    }
    moveBy(delta, motion = "instant", onComplete) {
      if (this.options.mode() === "paged") {
        this.horizontalAnimator.scrollTo(this.dom.scroller.element, this.dom.scroller.scrollLeft() + delta, motion, onComplete);
        return;
      }
      this.moveToTop(this.dom.scroller.scrollTop() + delta), onComplete?.();
    }
    moveToTop(scrollTop) {
      this.dom.scroller.moveToTop(scrollTop, this.verticalScrollBounds());
    }
    startDragPosition() {
      return this.options.mode() === "paged" ? this.dom.scroller.scrollLeft() : this.dom.scroller.scrollTop();
    }
    dragPage(startPosition, delta) {
      if (this.options.mode() === "paged") {
        this.dom.scroller.moveToLeft(startPosition - delta.dx);
        return;
      }
      this.moveToTop(startPosition - delta.dy);
    }
    scrollTop() {
      return this.dom.scroller.scrollTop();
    }
    viewportWidth() {
      return this.dom.scroller.viewportWidth();
    }
    viewportHeight() {
      return this.dom.scroller.viewportHeight();
    }
    pageOffset(pageNum) {
      let elements = this.slotFor(pageNum)?.elements;
      return elements ? this.dom.scroller.slotOffset(elements, this.options.mode()) : null;
    }
    centerPageNum() {
      for (let slot of this.slots)
        if (!(!slot.elements || slot.kind === "blank") && this.dom.scroller.slotContainsViewportTarget(slot.elements))
          return slot.pageNum;
      return null;
    }
    isHitEndPage(point) {
      let pageNum = this.pageNumAtPoint(point);
      return (pageNum === null ? void 0 : this.slotFor(pageNum))?.kind === "end";
    }
    pageNumAtPoint(point) {
      let element = document.elementFromPoint(point.clientX, point.clientY), pageNode = element instanceof Element ? element.closest(".ehpeek-page") : null;
      if (!pageNode)
        return null;
      let pageNum = Number(pageNode.dataset.ehpeekPageNum || "");
      return Number.isFinite(pageNum) ? pageNum : null;
    }
    startVerticalFlingFromDragVelocity(dragVelocityY, onStop) {
      this.flingAnimator.start({
        scroller: this.dom.scroller.element,
        initialVelocityY: -dragVelocityY,
        setScrollTop: (scrollTop) => this.moveToTop(scrollTop),
        canRun: () => !this.options.closed() && this.options.mode() === "scroll",
        onStop
      });
    }
    verticalScrollBounds() {
      if (this.options.mode() !== "scroll")
        return null;
      let totalPages = this.options.totalPages();
      return this.verticalScrollBoundsForPages(1, totalPages ? totalPages + 1 : null);
    }
    verticalScrollBoundsForPages(firstPageNum, lastPageNum) {
      return this.verticalScrollBoundsForElements(
        this.slotFor(firstPageNum)?.elements,
        lastPageNum === null ? null : this.slotFor(lastPageNum)?.elements
      );
    }
    verticalScrollBoundsForElements(firstElements, lastElements) {
      let bounds = {};
      if (firstElements && (bounds.min = this.dom.scroller.slotTop(firstElements)), lastElements) {
        let lastElementsRect = lastElements.node.getBoundingClientRect(), lastElementsTop = this.dom.scroller.slotTop(lastElements);
        bounds.max = lastElementsTop + lastElementsRect.height - this.viewportHeight();
      }
      return bounds.min === void 0 && bounds.max === void 0 ? null : (bounds.min !== void 0 && bounds.max !== void 0 && (bounds.max = Math.max(bounds.min, bounds.max)), bounds);
    }
    slotFor(pageNum) {
      return this.slots.find((slot) => slot.pageNum === pageNum);
    }
    visualSlotIndex(index, slotCount) {
      return this.options.mode() === "paged" && this.options.readDirection() === "rtl" ? slotCount - 1 - index : index;
    }
    setSlotPlaceholder(elements, content) {
      this.dom.slots.setPlaceholder(elements, content, this.slotPlaceholderText(content));
    }
    removeSlot(slot) {
      slot.token += 1, slot.elements && this.dom.slots.removeSlot(slot);
    }
    renderSlots() {
      this.dom.slots.sync(this.slots, {
        refreshSlot: (slot) => this.refreshSlot(slot),
        visualIndex: (slotIndex, slotCount) => this.visualSlotIndex(slotIndex, slotCount)
      });
    }
    refreshSlot(slot) {
      slot.elements && (this.dom.slots.setPageNum(slot.elements, slot.pageNum), this.applySlotSize(slot), !(slot.state === "ready" && slot.imageUrl) && this.renderSlotPlaceholder(slot, void 0));
    }
    renderSlotPlaceholder(slot, errorMessage) {
      slot.elements && this.setSlotPlaceholder(slot.elements, {
        pageNum: slot.pageNum,
        kind: slot.kind,
        state: slot.state,
        errorMessage
      });
    }
    applySlotSize(slot) {
      if (!slot.elements)
        return;
      let frameWidth = Math.max(1, this.viewportWidth()), frameHeight = Math.ceil(frameWidth * pageSlotAspectRatio(slot));
      this.dom.slots.setSize(slot.elements, frameWidth, frameHeight);
    }
    slotPlaceholderText(content) {
      if (content.state === "error") {
        let suffix = content.errorMessage ? `: ${content.errorMessage}` : "";
        return `${texts_default.reader.failedPrefix} ${content.pageNum}${suffix}`;
      }
      return content.kind === "end" ? texts_default.reader.end : content.kind === "blank" ? "" : String(content.pageNum);
    }
  };
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
      imageUrl: null,
      width: null,
      height: null,
      elements: null,
      token: 0
    };
  }
  function applyPageMetaToSlot(slot, page) {
    let aspectRatio = normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO);
    slot.aspectRatio === aspectRatio && slot.state !== "error" || (slot.aspectRatio = aspectRatio, slot.kind = "page", slot.state = "idle", slot.imageUrl = null, slot.width = null, slot.height = null, slot.token += 1);
  }
  function clearNonPageSlotMeta(slot) {
    slot.kind !== "blank" && slot.kind !== "end" || (slot.state = "ready", slot.imageUrl = null, slot.width = null, slot.height = null, slot.token += 1);
  }
  function pageSlotAspectRatio(slot) {
    return slot.width && slot.height && slot.width > 0 && slot.height > 0 ? slot.height / slot.width : normalizedAspectRatio(slot.aspectRatio, FALLBACK_ASPECT_RATIO);
  }

  // src/components/Misc.tsx
  var PROGRESS_BAR_CLASS = "ehpeek-progress-bar", PROGRESS_BAR_CLASS_NAME = [
    PROGRESS_BAR_CLASS,
    "w-full h-[2.4em] px-[0.6em] py-0 m-0",
    "cursor-grab active:cursor-grabbing touch-none select-none",
    "[-webkit-appearance:none] [appearance:none]",
    "[--progress-bar-fill:0%] [--progress-bar-track-direction:to_right]",
    "[accent-color:var(--ehp-color-foreground)]"
  ].join(" ");
  registerGlobalStyle(PROGRESS_BAR_CLASS, `
.${PROGRESS_BAR_CLASS}::-webkit-slider-runnable-track {
  height: 0.4em;
  border-radius: 9999px;
  background: linear-gradient(
    var(--progress-bar-track-direction),
    var(--ehp-color-accent) 0 var(--progress-bar-fill),
    var(--ehp-color-track) var(--progress-bar-fill) 100%
  );
}

.${PROGRESS_BAR_CLASS}::-webkit-slider-thumb {
  width: 1.4em;
  height: 1.4em;
  margin-top: -0.5em;
  border: 2px solid var(--ehp-color-border);
  border-radius: 9999px;
  background: var(--ehp-color-foreground);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  -webkit-appearance: none;
  appearance: none;
}

.${PROGRESS_BAR_CLASS}::-moz-range-track {
  height: 0.4em;
  border-radius: 9999px;
  background: var(--ehp-color-track);
}

.${PROGRESS_BAR_CLASS}::-moz-range-progress {
  height: 0.4em;
  border-radius: 9999px;
  background: var(--ehp-color-accent);
}

.${PROGRESS_BAR_CLASS}::-moz-range-thumb {
  width: 1.4em;
  height: 1.4em;
  border: 2px solid var(--ehp-color-border);
  border-radius: 9999px;
  background: var(--ehp-color-foreground);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}`);
  function ProgressBar(props) {
    let input = A2(null);
    _2(() => {
      let element = input.current;
      if (!element)
        return;
      let max = Math.max(1, props.max ?? props.min), direction = props.direction ?? "ltr";
      element.min = String(props.min), element.max = String(max), element.step = String(props.step), element.dir = direction, element.style.setProperty("--progress-bar-track-direction", direction === "rtl" ? "to left" : "to right"), element.style.setProperty("--progress-bar-fill", `${Math.min(100, Math.max(0, props.fillPercent ?? 0))}%`), !props.keepInputValue && props.value !== void 0 && (element.value = String(props.value));
    }, [props.direction, props.fillPercent, props.keepInputValue, props.max, props.min, props.step, props.value]);
    let currentValue = (event) => Number(event.currentTarget.value || "");
    return /* @__PURE__ */ k(
      "input",
      {
        ref: input,
        type: "range",
        className: `${PROGRESS_BAR_CLASS_NAME}${props.className ? ` ${props.className}` : ""}`,
        min: String(props.min),
        max: props.max === void 0 ? void 0 : String(props.max),
        step: String(props.step),
        defaultValue: String(props.value ?? props.min),
        dir: props.direction ?? "ltr",
        onPointerDown: (event) => {
          props.onPointerDown?.(event);
        },
        onInput: (event) => {
          props.onInput?.(currentValue(event));
        },
        onChange: (event) => {
          props.onCommit?.(currentValue(event));
        },
        onPointerUp: (event) => {
          props.onCommit?.(currentValue(event));
        },
        onPointerCancel: (event) => {
          props.onCommit?.(currentValue(event));
        }
      }
    );
  }

  // src/components/Reader/Toolbar.tsx
  var READER_BUTTON_CLASS = [
    "control-reader-btn coarse:w-68px coarse:h-60px coarse:px-16px coarse:rounded-8px coarse:text-18px",
    "border color-button-reader cursor-pointer font-sans textsize-sm font-700 leading-1"
  ].join(" ");
  function initialToolbarState() {
    return {
      controls: {
        mode: "scroll",
        readDirection: "rtl",
        rightTapAction: "previous"
      },
      open: !1,
      progress: {
        pageNum: 1,
        maxProgressPageNum: 1
      }
    };
  }
  function Toolbar(props) {
    let controls = props.state.controls, progress = props.state.progress, open = props.state.open, modeButton = modeButtonInfo(controls.mode), readDirectionButton = readDirectionButtonInfo(controls.readDirection), rightTapButton = rightTapButtonInfo(controls.rightTapAction);
    return /* @__PURE__ */ k(S, null, /* @__PURE__ */ k(
      "div",
      {
        className: "fixed z-3 flex justify-end pointer-events-none top-[calc(10px+env(safe-area-inset-top,0px))] right-10px coarse:top-[calc(8px+env(safe-area-inset-top,0px))] coarse:right-8px",
        onClick: stopEvent,
        onPointerDown: stopEvent,
        onWheel: stopEvent
      },
      /* @__PURE__ */ k("div", { className: "flex flex-row gap-8px pointer-events-auto" }, /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: "coarse:w-68px coarse:px-16px coarse:text-16px " + READER_BUTTON_CLASS,
          hidden: !open,
          title: readDirectionButton.title,
          onClick: props.callbacks.onReadDirectionClick
        },
        readDirectionButton.text
      ), /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: "coarse:w-68px coarse:px-16px coarse:text-16px " + READER_BUTTON_CLASS,
          hidden: !open,
          title: rightTapButton.title,
          onClick: props.callbacks.onRightTapClick
        },
        rightTapButton.text
      ), /* @__PURE__ */ k("button", { type: "button", className: READER_BUTTON_CLASS, hidden: !open, title: modeButton.title, onClick: props.callbacks.onModeClick }, modeButton.text), /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: "coarse:w-68px coarse:text-15px uppercase " + READER_BUTTON_CLASS,
          hidden: !open,
          title: texts_default.reader.disableReader,
          onClick: props.callbacks.onDisableReaderClick
        },
        "off"
      ), /* @__PURE__ */ k("button", { type: "button", className: READER_BUTTON_CLASS, title: texts_default.reader.close, onClick: props.callbacks.onCloseClick }, "X"))
    ), /* @__PURE__ */ k(
      "div",
      {
        className: "fixed z-3 pointer-events-none top-[calc(62px+env(safe-area-inset-top,0px))] left-1/2 right-auto -translate-x-1/2 coarse:top-[calc(72px+env(safe-area-inset-top,0px))] landscape:top-[calc(54px+env(safe-area-inset-top,0px))] landscape:left-auto landscape:right-10px landscape:translate-x-0 coarse-landscape:top-[calc(62px+env(safe-area-inset-top,0px))] coarse-landscape:right-8px min-w-64px landscape:min-w-0 max-w-none landscape:max-w-[calc(100vw-20px)] coarse-landscape:max-w-[calc(100vw-16px)] py-4px px-10px rounded-6px color-reader-badge color-reader-text font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap text-center landscape:text-right"
      },
      pageNumberText(progress.pageNum, progress.totalPages)
    ), /* @__PURE__ */ k(
      "div",
      {
        className: "fixed z-2 flex items-center p-0 transition-[opacity,transform] duration-160 ease-in-out right-[max(12px,env(safe-area-inset-right,0px))] bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-[max(12px,env(safe-area-inset-left,0px))] [&[data-open=false]]:opacity-0 [&[data-open=false]]:translate-y-[calc(100%+16px)] [&[data-open=false]]:pointer-events-none",
        "data-open": String(open),
        onClick: stopEvent,
        onPointerDown: stopEvent,
        onWheel: stopEvent
      },
      /* @__PURE__ */ k(
        ProgressBar,
        {
          className: "text-xl coarse:text-3xl",
          direction: controls.readDirection === "rtl" ? "rtl" : "ltr",
          fillPercent: progressFillPercent(progress),
          keepInputValue: progress.keepInputValue,
          max: Math.max(1, progress.maxProgressPageNum),
          min: 1,
          step: 1,
          value: progress.pageNum,
          onPointerDown: props.callbacks.onProgressPointerDown,
          onInput: props.callbacks.onProgressInput,
          onCommit: props.callbacks.onProgressCommit
        }
      )
    ));
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
      text: paged ? "⇔" : "⇕",
      title: paged ? texts_default.reader.scrollMode : texts_default.reader.pagedMode
    };
  }
  function readDirectionButtonInfo(direction) {
    let rtl = direction === "rtl";
    return {
      text: rtl ? "RL" : "LR",
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

  // src/components/Reader/ZoomOverlay.tsx
  var MIN_SCALE = 1, MAX_SCALE = 5, CLOSE_SCALE = 1.02;
  function createZoomOverlayDom() {
    let element = document.createElement("div"), image = document.createElement("img");
    return element.className = "fixed inset-0 z-4 flex items-center justify-center overflow-hidden bg-[#070707] pointer-events-none", element.hidden = !0, element.style.display = "none", image.className = "block max-w-screen max-h-screen object-contain origin-center select-none will-change-transform [-webkit-user-drag:none]", element.append(image), {
      element,
      image
    };
  }
  function createZoomOverlay() {
    let dom = createZoomOverlayDom(), activeImage = null, scale = 1, requestedScale = 1, offsetX = 0, offsetY = 0, pinchStartScale = 1, pinchStartOffsetX = 0, pinchStartOffsetY = 0, pinchStartCenterX = 0, pinchStartCenterY = 0, dragStartOffsetX = 0, dragStartOffsetY = 0, active = () => activeImage !== null, renderTransform = () => {
      dom.image.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
    }, close = () => {
      activeImage = null, dom.element.hidden = !0, dom.element.style.display = "none", dom.image.removeAttribute("src");
    }, startPinch = (pinch) => {
      pinchStartScale = scale, pinchStartOffsetX = offsetX, pinchStartOffsetY = offsetY, pinchStartCenterX = pinch.centerX, pinchStartCenterY = pinch.centerY;
    };
    return {
      element: dom.element,
      active,
      start(image, pinch) {
        activeImage = image, scale = 1, requestedScale = 1, offsetX = 0, offsetY = 0, dom.image.src = image.imageUrl, dom.image.alt = `Page ${image.pageNum}`, image.width && image.height ? (dom.image.width = image.width, dom.image.height = image.height) : (dom.image.removeAttribute("width"), dom.image.removeAttribute("height")), dom.element.hidden = !1, dom.element.style.display = "", startPinch(pinch), renderTransform();
      },
      startPinch,
      movePinch(pinch) {
        if (!active())
          return;
        requestedScale = pinchStartScale * pinch.scale, scale = clamp(requestedScale, MIN_SCALE, MAX_SCALE);
        let rect = dom.element.getBoundingClientRect(), viewportCenterX = rect.left + rect.width / 2, viewportCenterY = rect.top + rect.height / 2, ratio = scale / pinchStartScale;
        offsetX = pinch.centerX - viewportCenterX - (pinchStartCenterX - viewportCenterX - pinchStartOffsetX) * ratio, offsetY = pinch.centerY - viewportCenterY - (pinchStartCenterY - viewportCenterY - pinchStartOffsetY) * ratio, renderTransform();
      },
      endPinch() {
        if (requestedScale <= CLOSE_SCALE) {
          close();
          return;
        }
        renderTransform();
      },
      startDrag() {
        dragStartOffsetX = offsetX, dragStartOffsetY = offsetY;
      },
      moveDrag(move) {
        active() && (offsetX = dragStartOffsetX + move.dx, offsetY = dragStartOffsetY + move.dy, renderTransform());
      },
      close
    };
  }

  // src/components/ExternalDom.tsx
  function ExternalDomNode(props) {
    let root = A2(null);
    return _2(() => {
      if (!(!root.current || !props.node))
        return root.current.replaceChildren(props.node), () => {
          root.current?.replaceChildren();
        };
    }, [props.node]), /* @__PURE__ */ k("span", { ref: root, className: "contents" });
  }
  function ExternalDomNodes(props) {
    let root = A2(null);
    return _2(() => {
      if (root.current)
        return root.current.replaceChildren(...props.nodes.map((node) => props.clone ? node.cloneNode(!0) : node)), () => {
          root.current?.replaceChildren();
        };
    }, [props.nodes, props.clone]), /* @__PURE__ */ k("span", { ref: root, className: "contents" });
  }

  // src/components/Reader/index.tsx
  var VIEWER_ID = "ehpeek-reader", STYLE_ID = "ehpeek-reader-style", DEFAULT_WINDOW_SIZE = 10, DEFAULT_NEAR_CONCURRENT_LOADS = 3, DEFAULT_FAR_CONCURRENT_LOADS = 6, NEAR_LOAD_AHEAD = 3, PAGED_SWIPE_THRESHOLD = 24, PAGED_WHEEL_THRESHOLD = 8, PROGRESS_IDLE_COMMIT_MS = 1e3, DOUBLE_TAP_MS = 340, DOUBLE_TAP_DISTANCE = 36, TAP_CANCEL_DISTANCE = 8, FALLBACK_ASPECT_RATIO2 = 1.42, TwoTierImageQueue = class {
    constructor(loadTarget, markLoading, onLoaded, onError, nearConcurrentLoads, farConcurrentLoads) {
      this.loadTarget = loadTarget;
      this.markLoading = markLoading;
      this.onLoaded = onLoaded;
      this.onError = onError;
      this.nearConcurrentLoads = nearConcurrentLoads;
      this.farConcurrentLoads = farConcurrentLoads;
      this.nearQueue = /* @__PURE__ */ new Map();
      this.farQueue = /* @__PURE__ */ new Map();
      this.activeNearLoads = 0;
      this.activeTotalLoads = 0;
      this.timer = null;
      this.disposed = !1;
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
  function ReaderRoot(props) {
    return _2(() => {
      let previousDocumentOverflow = document.documentElement.style.overflow, previousBodyOverflow = document.body.style.overflow;
      return ensureReaderStyle(), document.documentElement.style.overflow = "hidden", document.body.style.overflow = "hidden", () => {
        document.documentElement.style.overflow = previousDocumentOverflow, document.body.style.overflow = previousBodyOverflow;
      };
    }, []), /* @__PURE__ */ k(
      "div",
      {
        id: VIEWER_ID,
        className: "fixed inset-0 z-[2147483647] bg-[#070707] color-reader-text font-sans text-13px leading-[1.4]",
        "data-read-direction": props.readDirection,
        "data-toolbar-open": String(props.toolbarOpen),
        "data-view-mode": props.viewMode
      },
      props.children
    );
  }
  function PagesGesture(props) {
    let shouldStartDrag = (event) => event instanceof PointerEvent ? (event.pointerType, event.button, event.buttons, targetSummary(event.target), event.pointerType === "mouse" && event.button !== 0 ? (event.button, event.buttons, !1) : props.callbacks.shouldStartDrag(event)) : !1, shouldObserveTap = (event) => event instanceof PointerEvent && event.pointerType !== "mouse" && !props.callbacks.shouldStartDrag(event), onDragEnd = (info, event) => {
      props.callbacks.onDragEnd(info, event);
    };
    return usePointerGestureElement(props.target, {
      shouldCaptureDrag: shouldStartDrag,
      onStart: props.callbacks.onDragStart,
      onMove: props.callbacks.onDragMove,
      onEnd: onDragEnd,
      onTap: props.callbacks.onTap,
      dragStartThreshold: TAP_CANCEL_DISTANCE,
      tapMoveThreshold: TAP_CANCEL_DISTANCE,
      shouldObserveTap,
      onPinchStart: props.callbacks.onPinchStart,
      onPinchMove: props.callbacks.onPinchMove,
      onPinchEnd: props.callbacks.onPinchEnd
    }, (handle) => {
      props.handleRef(
        handle ? {
          dragging: () => handle.gesture()?.isDragging() ?? !1
        } : null
      );
    }), h2(() => {
      let onWheel = (event) => {
        let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        props.callbacks.onWheel(delta, event);
      }, onScroll = () => {
        props.callbacks.onNativeScroll();
      };
      return props.target.addEventListener("scroll", onScroll), props.target.addEventListener("wheel", onWheel), () => {
        props.target.removeEventListener("scroll", onScroll), props.target.removeEventListener("wheel", onWheel);
      };
    }, [props.callbacks, props.target]), null;
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
        event.preventDefault(), callbacks.onKeyboardClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault(), callbacks.onKeyboardArrow("left");
        return;
      }
      event.key === "ArrowRight" && (event.preventDefault(), callbacks.onKeyboardArrow("right"));
    }
  }
  function FullscreenReader(props) {
    let [toolbarState, setToolbarState] = d2(() => initialToolbarState()), [rootState, setRootState] = d2(() => ({
      readDirection: state.reader.readDirection.value,
      toolbarOpen: !1,
      viewMode: state.reader.viewMode.value
    })), gestureHandle = A2(null), [session, setSession] = d2(null);
    return _2(() => {
      let nextSession = new ReaderSession(props.options, {
        close: props.onClosed,
        isDragging: () => gestureHandle.current?.dragging() ?? !1,
        setRootState,
        setToolbarState
      });
      return setSession(nextSession), props.handleRef({
        close: () => nextSession.close()
      }), () => {
        props.handleRef(null), nextSession.dispose();
      };
    }, [props.handleRef, props.onClosed, props.options]), h2(() => {
      session?.open();
    }, [session]), h2(() => {
      if (!session)
        return;
      let onKeydown = (event) => {
        handlePagesKeydown(event, session.gestureCallbacks);
      };
      return document.addEventListener("keydown", onKeydown, !0), () => {
        document.removeEventListener("keydown", onKeydown, !0);
      };
    }, [session]), session ? /* @__PURE__ */ k(ReaderRoot, { readDirection: rootState.readDirection, toolbarOpen: rootState.toolbarOpen, viewMode: rootState.viewMode }, /* @__PURE__ */ k(Toolbar, { callbacks: session.toolbarCallbacks, state: toolbarState }), /* @__PURE__ */ k(
      PagesGesture,
      {
        callbacks: session.gestureCallbacks,
        handleRef: (handle) => {
          gestureHandle.current = handle;
        },
        target: session.scrollerElement()
      }
    ), /* @__PURE__ */ k(ExternalDomNode, { node: session.viewportElement() }), /* @__PURE__ */ k(ExternalDomNode, { node: session.zoomOverlayElement() })) : null;
  }
  var ReaderSession = class {
    constructor(options, bindings) {
      this.pages = /* @__PURE__ */ new Map();
      this.loadedImages = /* @__PURE__ */ new Map();
      this.direction = 1;
      this.scrollFrame = null;
      this.resizeFrame = null;
      this.progressNavigationTimer = null;
      this.tapTimer = null;
      this.pendingTap = null;
      this.pendingProgressNavigationPageNum = null;
      this.progressNavigating = !1;
      this.viewportDrag = null;
      this.pagedTargetPageNumber = null;
      this.syncToken = 0;
      this.historyEntry = !1;
      this.closing = !1;
      this.closed = !1;
      this.onPopState = () => {
        this.historyEntry && (this.historyEntry = !1, this.finishClose(), this.onExit?.());
      };
      this.onImageLoaded = (target, loaded, token) => {
        this.viewport.windowPageNums(this.currentPageNum, this.renderWindowSize).includes(target.pageNum) && this.installImage(target, loaded, token);
      };
      this.onImageError = (target, error, token) => {
        let message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
        this.viewport.setPageError(target.pageNum, token, message);
      };
      this.onProgressPointerDown = (event) => {
        this.progressNavigating = !0, this.cancelProgressNavigation(), event.stopPropagation();
      };
      this.onProgressInput = (pageNum) => {
        if (!Number.isFinite(pageNum) || pageNum <= 0)
          return;
        this.progressNavigating = !0;
        let target = clamp(Math.round(pageNum), 1, this.maxProgressPageNum());
        this.pendingProgressNavigationPageNum = target, this.navigateProgressPage(target), this.cancelProgressNavigation(), this.progressNavigationTimer = window.setTimeout(
          () => this.onProgressCommit(this.pendingProgressNavigationPageNum ?? this.currentPageNum),
          PROGRESS_IDLE_COMMIT_MS
        );
      };
      this.onProgressCommit = (value) => {
        if (!this.progressNavigating && this.pendingProgressNavigationPageNum === null)
          return;
        let pageNum = this.pendingProgressNavigationPageNum ?? value;
        this.progressNavigating = !1, this.pendingProgressNavigationPageNum = null, this.cancelProgressNavigation(), Number.isFinite(pageNum) && pageNum > 0 && this.setCurrentPageNumber(pageNum, !0);
      };
      this.onResize = () => {
        this.resizeFrame === null && (this.resizeFrame = window.requestAnimationFrame(() => {
          this.resizeFrame = null, this.viewport.resizePages();
        }));
      };
      this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : void 0, this.renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
      for (let [index, page] of options.pages.entries()) {
        let pageNum = pageNumForPage(page, index);
        this.pages.set(pageNum, {
          ...page,
          aspectRatio: normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO2),
          pageNum
        });
      }
      let startIndex = clamp(options.startIndex, 0, Math.max(0, options.pages.length - 1));
      this.currentPageNum = pageNumForPage(options.pages[startIndex], startIndex), this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE, this.loadPages = options.loadPages, this.onExit = options.onExit, this.onActivePageChange = options.onActivePageChange, this.onDisableReader = options.onDisableReader, this.closeComponent = bindings.close, this.isDragging = bindings.isDragging, this.setRootComponentState = bindings.setRootState, this.setToolbarComponentState = bindings.setToolbarState, this.toolbarState = initialToolbarState(), this.rootState = {
        readDirection: state.reader.readDirection.value,
        toolbarOpen: !1,
        viewMode: state.reader.viewMode.value
      }, this.viewport = new PagesViewport({
        mode: () => state.reader.viewMode.value,
        readDirection: () => state.reader.readDirection.value,
        closed: () => this.closed,
        totalPages: () => this.totalPages,
        onReloadPage: (pageNum) => this.reloadPage(pageNum)
      }), this.zoomOverlay = createZoomOverlay(), this.toolbarCallbacks = {
        onReadDirectionClick: () => this.toggleReadDirection(),
        onRightTapClick: () => this.toggleRightTapAction(),
        onModeClick: () => this.setMode(state.reader.viewMode.value === "paged" ? "scroll" : "paged"),
        onCloseClick: () => this.close(),
        onDisableReaderClick: () => {
          this.onDisableReader?.(), this.close();
        },
        onOpenChange: (open) => this.setRootState({ toolbarOpen: open }),
        onProgressPointerDown: this.onProgressPointerDown,
        onProgressInput: this.onProgressInput,
        onProgressCommit: this.onProgressCommit
      }, this.gestureCallbacks = {
        onTap: (info, event) => this.handleTap(info, event),
        onKeyboardClose: () => this.handleKeyboardClose(),
        onKeyboardArrow: (direction) => this.handleKeyboardArrow(direction),
        onWheel: (delta, event) => this.handleWheel(delta, event),
        shouldStartDrag: (event) => this.shouldStartDrag(event),
        onDragStart: (info, event) => this.handleDragStart(info, event),
        onDragMove: (info, event) => this.handleDragMove(info, event),
        onDragEnd: (info, event) => this.handleDragEnd(info, event),
        onPinchStart: (info) => this.handlePinchStart(info),
        onPinchMove: (info) => this.zoomOverlay.movePinch({ centerX: info.clientX, centerY: info.clientY, scale: info.scale }),
        onPinchEnd: () => this.zoomOverlay.endPinch(),
        onNativeScroll: () => this.handleNativeScroll()
      }, this.imageQueue = new TwoTierImageQueue(
        (target) => options.loadPage(target.page, target.index),
        (pageNum) => this.viewport.markPageLoading(pageNum),
        this.onImageLoaded,
        this.onImageError,
        options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS,
        options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS
      );
    }
    scrollerElement() {
      return this.viewport.scrollerElement();
    }
    viewportElement() {
      return this.viewport.element;
    }
    zoomOverlayElement() {
      return this.zoomOverlay.element;
    }
    open() {
      if (this.pages.size === 0) {
        this.close();
        return;
      }
      this.viewport.scrollerElement().focus({ preventScroll: !0 }), this.onExit && (window.history.pushState({ ehpeekReader: !0 }, "", window.location.href), this.historyEntry = !0, window.addEventListener("popstate", this.onPopState)), window.addEventListener("resize", this.onResize), this.syncInitialUi(), this.syncAfterPageChange({ scrollIntoView: !0 });
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
      this.syncReaderControls(), this.updatePageNumber();
    }
    finishClose() {
      this.cleanup() && this.closeComponent();
    }
    cleanup() {
      return this.closed ? !1 : (this.closed = !0, this.cancelProgressNavigation(), this.cancelPendingTap(), this.imageQueue.dispose(), window.removeEventListener("resize", this.onResize), window.removeEventListener("popstate", this.onPopState), this.scrollFrame !== null && (window.cancelAnimationFrame(this.scrollFrame), this.scrollFrame = null), this.resizeFrame !== null && (window.cancelAnimationFrame(this.resizeFrame), this.resizeFrame = null), this.viewport.stopMotion(), !0);
    }
    setCurrentPageNumber(pageNumber, scrollIntoView, scrollMotion = "instant") {
      this.pagedTargetPageNumber = null;
      let target = clamp(Math.round(pageNumber), 1, this.maxProgressPageNum());
      target !== this.currentPageNum && (this.direction = target > this.currentPageNum ? 1 : -1, this.currentPageNum = target), this.syncAfterPageChange({ scrollIntoView, scrollMotion });
    }
    syncAfterPageChange(options) {
      let token = ++this.syncToken, missing = this.viewport.windowPageNums(this.currentPageNum, this.renderWindowSize).filter((number) => this.isRealPageNum(number) && !this.pages.has(number));
      this.syncViewportWindow(), this.maintainLoadQueue(), this.notifyActivePageChange(), options.scrollIntoView && this.scrollToCurrentPage(options.scrollMotion), missing.length > 0 && this.loadMissingPages(missing, token);
    }
    rebuildForCurrentMode() {
      this.viewport.stopMotion(), this.viewport.resetPosition(), this.syncAfterPageChange({ scrollIntoView: !0 });
    }
    async loadMissingPages(pageNums, token) {
      let incoming;
      try {
        incoming = await this.loadPages?.(pageNums);
      } catch (error) {
        console.error("[ehpeek]", error);
        return;
      }
      this.closed || token !== this.syncToken || (this.addPages(incoming ?? []), this.syncViewportWindow(), this.maintainLoadQueue(), this.notifyActivePageChange());
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
      this.viewport.syncWindow({
        currentPageNum: this.currentPageNum,
        windowSize: this.renderWindowSize,
        totalPages: this.totalPages,
        pages: this.pageMetaForViewport()
      }), this.updatePageNumber();
    }
    maintainLoadQueue() {
      let targets = this.viewport.requiredImagePageNums().map((pageNum) => this.loadTargetFor(pageNum)).filter((target) => !!target), windowSet = new Set(targets.map((target) => target.pageNum));
      this.imageQueue.sync(targets, this.currentPageNum, this.direction, windowSet, this.preloadWindowSize);
    }
    pageMetaForViewport() {
      return new Map(Array.from(this.pages, ([pageNum, page]) => [pageNum, { aspectRatio: page.aspectRatio }]));
    }
    loadTargetFor(pageNum) {
      let page = this.pages.get(pageNum);
      return page ? { pageNum, page, index: pageNum - 1 } : null;
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
    setToolbarControls(controls) {
      this.toolbarState = { ...this.toolbarState, controls }, this.setToolbarComponentState(this.toolbarState);
    }
    setToolbarProgress(progress) {
      this.toolbarState = { ...this.toolbarState, progress }, this.setToolbarComponentState(this.toolbarState);
    }
    reloadPage(pageNum) {
      this.viewport.resetPageError(pageNum) && this.maintainLoadQueue();
    }
    async installImage(target, loaded, token) {
      let imageUrl = loaded.imageUrl, width = positiveNumber(loaded.width), height = positiveNumber(loaded.height), image = this.viewport.createPageImage(target.pageNum, {
        imageUrl,
        highPriority: target.pageNum === this.currentPageNum,
        width,
        height
      });
      try {
        await loadImage(image);
      } catch (error) {
        let message = error instanceof Error ? error.message : texts_default.errors.imageLoadFailed;
        this.viewport.setPageError(target.pageNum, token, message);
        return;
      }
      this.closed || (this.loadedImages.set(target.pageNum, { pageNum: target.pageNum, imageUrl, width, height }), this.viewport.setPageImage(target.pageNum, token, { imageUrl, highPriority: target.pageNum === this.currentPageNum, width, height }, image));
    }
    updatePageNumber() {
      this.setToolbarProgress({
        pageNum: this.currentPageNum,
        totalPages: this.totalPages,
        maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
        keepInputValue: this.progressNavigating
      });
    }
    notifyActivePageChange() {
      let page = this.pages.get(this.currentPageNum);
      page && this.onActivePageChange?.(page, this.currentPageNum - 1);
    }
    handleKeyboardArrow(direction) {
      this.zoomOverlay.active() || this.turnPageBy(direction === "left" ? this.leftTapDelta() : this.rightTapDelta());
    }
    handleWheel(delta, event) {
      if (this.zoomOverlay.active()) {
        event.preventDefault();
        return;
      }
      state.reader.viewMode.value === "paged" && (event.preventDefault(), !this.isDragging() && Math.abs(delta) >= PAGED_WHEEL_THRESHOLD && this.turnPageBy(delta > 0 ? 1 : -1));
    }
    shouldStartDrag(event) {
      return this.zoomOverlay.active() ? !0 : state.reader.viewMode.value === "paged" || event.pointerType === "mouse";
    }
    handleDragStart(_info, _event) {
      if (this.zoomOverlay.active()) {
        this.zoomOverlay.startDrag();
        return;
      }
      this.viewport.stopMotion(), this.viewportDrag = {
        startScroll: this.viewport.startDragPosition()
      };
    }
    handleDragMove(info, event) {
      if (this.zoomOverlay.active()) {
        this.zoomOverlay.moveDrag(info);
        return;
      }
      let drag = this.viewportDrag;
      drag && ((Math.abs(info.dx) >= TAP_CANCEL_DISTANCE || Math.abs(info.dy) >= TAP_CANCEL_DISTANCE) && this.cancelPendingTap(), pointerTypeForEvent(event), info.clientY, this.viewport.scrollTop(), this.viewport.dragPage(drag.startScroll, { dx: info.dx, dy: info.dy }));
    }
    handleDragEnd(info, event) {
      if (!this.zoomOverlay.active()) {
        if (pointerTypeForEvent(event), this.viewport.scrollTop(), info.dx, info.dy, this.viewportDrag = null, state.reader.viewMode.value !== "paged") {
          this.viewport.moveToTop(this.viewport.scrollTop()), this.viewport.startVerticalFlingFromDragVelocity(info.velocityY, () => this.updateCurrentFromScroll()), this.updateCurrentFromScroll();
          return;
        }
        info.dx >= PAGED_SWIPE_THRESHOLD ? this.turnPageBy(this.rightDragDelta()) : info.dx <= -PAGED_SWIPE_THRESHOLD ? this.turnPageBy(this.leftDragDelta()) : this.scrollToCurrentPage("animated");
      }
    }
    handleNativeScroll() {
      if (this.zoomOverlay.active() || this.isDragging() || state.reader.viewMode.value === "paged")
        return;
      let previousScrollTop = this.viewport.scrollTop();
      this.viewport.moveToTop(previousScrollTop), this.viewport.scrollTop() === previousScrollTop && this.scrollFrame === null && (this.scrollFrame = window.requestAnimationFrame(() => {
        this.scrollFrame = null, this.updateCurrentFromScroll();
      }));
    }
    updateCurrentFromScroll() {
      let next = this.viewport.centerPageNum();
      next !== null && next !== this.currentPageNum && (this.direction = next > this.currentPageNum ? 1 : -1, this.currentPageNum = next, this.syncAfterPageChange({ scrollIntoView: !1 }));
    }
    handleTap(info, event) {
      this.viewportDrag = null, !this.consumeDoubleTap(info, event) && this.queueSingleTap(info, event);
    }
    runSingleTap(info, event) {
      if (this.zoomOverlay.active()) {
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
      if (this.zoomOverlay.active()) {
        this.zoomOverlay.close();
        return;
      }
      this.close();
    }
    handlePinchStart(info) {
      if (this.cancelPendingTap(), this.viewport.stopMotion(), this.viewportDrag = null, this.zoomOverlay.active())
        return this.zoomOverlay.startPinch({ centerX: info.clientX, centerY: info.clientY }), !0;
      let image = this.imageAtPoint(info);
      return image ? (this.zoomOverlay.start(image, { centerX: info.clientX, centerY: info.clientY }), !0) : !1;
    }
    toggleZoomAtPoint(point) {
      if (this.zoomOverlay.active())
        return this.zoomOverlay.close(), !0;
      let image = this.imageAtPoint(point);
      return image ? (this.viewport.stopMotion(), this.viewportDrag = null, this.zoomOverlay.start(image, { centerX: point.clientX, centerY: point.clientY }), this.zoomOverlay.movePinch({ centerX: point.clientX, centerY: point.clientY, scale: 2 }), this.zoomOverlay.endPinch(), !0) : !1;
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
      target !== this.currentPageNum && (this.direction = target > this.currentPageNum ? 1 : -1, this.currentPageNum = target), ++this.syncToken, this.syncViewportWindow(), this.scrollToCurrentPage(), this.setToolbarProgress({
        pageNum: target,
        totalPages: this.totalPages,
        maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
        keepInputValue: !0
      });
    }
    cancelProgressNavigation() {
      this.progressNavigationTimer !== null && (window.clearTimeout(this.progressNavigationTimer), this.progressNavigationTimer = null);
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
      this.setRootState({
        readDirection: state.reader.readDirection.value,
        viewMode: state.reader.viewMode.value
      }), this.setToolbarControls({
        mode: state.reader.viewMode.value,
        readDirection: state.reader.readDirection.value,
        rightTapAction: state.reader.rightTapAction.value
      });
    }
    toggleToolbar() {
      let open = !this.toolbarState.open;
      this.toolbarState = { ...this.toolbarState, open }, this.setToolbarComponentState(this.toolbarState), this.setRootState({ toolbarOpen: open });
    }
    setRootState(nextState) {
      this.rootState = { ...this.rootState, ...nextState }, this.setRootComponentState(this.rootState);
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
  async function loadImage(image) {
    if (!(image.complete && image.naturalWidth > 0)) {
      await new Promise((resolve, reject) => {
        image.addEventListener("load", () => resolve(), { once: !0 }), image.addEventListener("error", () => reject(new Error(texts_default.errors.imageLoadFailed)), { once: !0 });
      });
      try {
        await image.decode();
      } catch {
      }
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
  function ensureReaderStyle() {
    registerGlobalStyle(STYLE_ID, `
#ehpeek-reader,
#ehpeek-reader * {
  box-sizing: border-box;
}`);
  }
  function pointerTypeForEvent(event) {
    return "pointerType" in event ? event.pointerType : "mouse";
  }

  // src/components/SettingsMenu.tsx
  var SETTINGS_ACTION_BUTTON_CLASS = "block w-full control-btn color-btn cursor-pointer font-inherit text-center textsize-md", SETTINGS_DOT_CLASS = "block flex-none w-[var(--ehpeek-control-toggle-dot-size)] h-[var(--ehpeek-control-toggle-dot-size)] touch:w-[var(--ehpeek-control-toggle-dot-touch-size)] touch:h-[var(--ehpeek-control-toggle-dot-touch-size)] rounded-[var(--ehpeek-control-radius-pill)]";
  function SwitchButton(props) {
    let [initialChecked, labelOn, labelOff] = props.checked, [checked, setChecked] = d2(initialChecked), setValue = (value) => {
      setChecked(value), props.onChange(value);
    };
    return /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: "flex w-full items-center justify-between gap-16px touch:gap-20px control-action border-0 border-b color-border-subtle-b bg-transparent color-text color-item-hover cursor-pointer font-inherit text-left textsize-md",
        onClick: (event) => {
          event.stopPropagation(), setValue(!checked);
        }
      },
      /* @__PURE__ */ k("span", null, checked ? labelOn : labelOff),
      /* @__PURE__ */ k("span", { className: `${SETTINGS_DOT_CLASS} ${checked ? "bg-[var(--ehpeek-color-state-on)]" : "bg-[var(--ehpeek-color-state-off)]"}` })
    );
  }
  function SettingsMenu(props) {
    let [draft, setDraft] = d2(() => ({ ...props.initState })), menuRef = A2(null), close = () => {
      props.onOpenChange(!1);
    };
    return h2(() => {
      props.open && setDraft({ ...props.initState });
    }, [props.open, props.initState]), h2(() => {
      let onClick = (event) => {
        props.open && (event.target instanceof Element && menuRef.current?.contains(event.target) || close());
      }, onKeyDown = (event) => {
        props.open && event.key === "Escape" && close();
      };
      return document.addEventListener("click", onClick), document.addEventListener("keydown", onKeyDown), () => {
        document.removeEventListener("click", onClick), document.removeEventListener("keydown", onKeyDown);
      };
    }, [props.open]), props.open ? /* @__PURE__ */ k("div", { ref: menuRef, className: "ehpeek-settings-menu fixed top-24px right-24px z-[2147483646] min-w-260px touch:min-w-[min(92vw,520px)] p-8px border color-border rounded-4px color-elevated color-text textsize-md leading-[1.2]" }, /* @__PURE__ */ k(
      SwitchButton,
      {
        checked: [draft.readerEnabled, texts_default.settings.readerOn, texts_default.settings.readerOff],
        onChange: (value) => {
          draft.readerEnabled = value;
        }
      }
    ), /* @__PURE__ */ k(
      SwitchButton,
      {
        checked: [draft.enhanceSearchGridsEnabled, texts_default.settings.enhanceSearchOn, texts_default.settings.enhanceSearchOff],
        onChange: (value) => {
          draft.enhanceSearchGridsEnabled = value;
        }
      }
    ), /* @__PURE__ */ k(
      SwitchButton,
      {
        checked: [draft.enhanceThumbsGridsEnabled, texts_default.settings.enhanceThumbsOn, texts_default.settings.enhanceThumbsOff],
        onChange: (value) => {
          draft.enhanceThumbsGridsEnabled = value;
        }
      }
    ), /* @__PURE__ */ k(
      SwitchButton,
      {
        checked: [draft.touchUiEnabled, texts_default.settings.touchUiOn, texts_default.settings.touchUiOff],
        onChange: (value) => {
          draft.touchUiEnabled = value;
        }
      }
    ), /* @__PURE__ */ k("div", { className: "ehpeek-settings-actions grid grid-cols-[1fr_1fr] gap-8px touch:gap-10px mt-6px touch:mt-8px" }, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-settings-apply ${SETTINGS_ACTION_BUTTON_CLASS}`,
        onClick: (event) => {
          event.stopPropagation(), props.onApply({ ...draft });
        }
      },
      texts_default.settings.apply
    ), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-settings-close ${SETTINGS_ACTION_BUTTON_CLASS}`,
        onClick: (event) => {
          event.stopPropagation(), close();
        }
      },
      texts_default.settings.close
    ))) : /* @__PURE__ */ k(S, null);
  }

  // src/eh/galleryRearrange.css
  var galleryRearrange_default = `:root {
  --ehpeek-touch-gallery-gutter: clamp(16px, 2.5vw, 36px);
}

html,
body {
  min-width: 0 !important;
  overflow-x: hidden !important;
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
}

body {
  box-sizing: border-box;
  padding-left: 0 !important;
  padding-right: 0 !important;
  background: #34353b !important;
  font-size: 14px !important;
  line-height: 1.35 !important;
}

.ehpeek-touch-gallery-host,
.gpc,
body #gdt[class],
#cdiv,
.ptt,
.ptb {
  box-sizing: border-box !important;
  width: calc(100% - (var(--ehpeek-touch-gallery-gutter) * 2)) !important;
  max-width: none !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

body #gdt[class],
.ptt,
.ptb,
.ehpeek-scroll-page-bar {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}

#gdt .gdtm,
#gdt .gdtl,
#gdt > div {
  display: inline-flex !important;
  min-width: 132px !important;
  align-items: center !important;
  justify-content: center !important;
  vertical-align: top;
}

#gdt a {
  display: flex !important;
  min-height: 150px;
  align-items: center;
  justify-content: center;
}

.ehpeek-touch-gallery-rating {
  display: flex !important;
  min-height: var(--ehpeek-rating-height, auto) !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
}

.ehpeek-touch-gallery-rating-scale {
  width: max-content;
  max-width: none !important;
  transform: scale(var(--ehpeek-rating-scale, 1));
  transform-origin: left top;
}

.ehpeek-touch-gallery-rating img,
.ehpeek-touch-gallery-rating input,
.ehpeek-touch-gallery-rating button,
.ehpeek-touch-gallery-rating table,
.ehpeek-touch-gallery-rating tbody,
.ehpeek-touch-gallery-rating tr,
.ehpeek-touch-gallery-rating td,
.ehpeek-touch-gallery-rating > * {
  max-width: 100%;
  min-height: 24px;
  height: auto;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background-color: transparent !important;
  overflow: visible;
  touch-action: manipulation;
}

.ehpeek-touch-gallery-rating table {
  border-collapse: collapse !important;
  border-spacing: 0 !important;
}
`;

  // src/eh/dom.ts
  var TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID = "ehpeek-touch-gallery-page-rearrange-style";
  function imageAspectRatio(image) {
    let width = image?.naturalWidth || image?.width || Number(image?.getAttribute("width") || ""), height = image?.naturalHeight || image?.height || Number(image?.getAttribute("height") || "");
    return width > 0 && height > 0 ? height / width : 1.42;
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
    let match = (root.querySelector(".gpc")?.textContent ?? "").match(/([\d,]+)\s*-\s*([\d,]+)\s+of\s+([\d,]+)/i);
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
  function searchNavigationBars(root = document) {
    return Array.from(root.querySelectorAll(".searchnav"));
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
    replaceFirstElement("#rangebar", doc), replaceFirstElement(".searchtext", doc), replaceSearchRangeScript(doc), replaceSearchNavigationBars(doc);
    let importedList = document.importNode(incomingList, !0);
    return currentList.replaceWith(importedList), importedList;
  }
  function maxPreviewPageIndex(root = document, baseUrl = window.location.href) {
    let indexes = Array.from(root.querySelectorAll("a[href*='?p='], a[href*='&p=']")).map((link) => {
      try {
        return Number(new URL(link.getAttribute("href") || "", baseUrl).searchParams.get("p") || "");
      } catch {
        return NaN;
      }
    }).filter((value) => Number.isFinite(value) && value >= 0);
    return indexes.length === 0 ? null : Math.max(...indexes);
  }
  function findClickedImageLink(target, extractPageType2) {
    let link = target instanceof Element ? target.closest("a[href]") : null;
    return !(link instanceof HTMLAnchorElement) || extractPageType2(link.href).type !== "image" ? null : link.querySelector("img") || link.closest("#gdt, .gdtm, .gdtl") ? link : null;
  }
  function replaceGalleryPageBarMounts(topClassName, bottomClassName) {
    let originals = Array.from(document.querySelectorAll(".ptt, .ptb")), topSource = originals.find((item) => item.classList.contains("ptt")) ?? originals[0], bottomSource = originals.find((item) => item.classList.contains("ptb")) ?? originals[1] ?? originals[0], mounts = [];
    topSource && mounts.push(replaceGalleryPageBarAt(topSource, !0, topClassName)), bottomSource && mounts.push(replaceGalleryPageBarAt(bottomSource, !1, bottomClassName));
    for (let original of originals)
      original.hidden = !0;
    return mounts;
  }
  function snapshotPreview() {
    return {
      description: document.querySelector(".gpc")?.cloneNode(!0) ?? null,
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
    replaceFirstElement(".gpc", doc), replaceFirstElement("#gdt", doc);
  }
  function prepareThumbsGridSwipeTargets(thumbs) {
    thumbs.style.touchAction = "pan-y", thumbs.style.userSelect = "none", thumbs.querySelectorAll("a, img, .gdtm, .gdtl").forEach((element) => {
      element.style.touchAction = "pan-y", element.style.userSelect = "none", element instanceof HTMLImageElement && (element.draggable = !1, element.style.setProperty("-webkit-user-drag", "none"));
    });
  }
  function restorePreview(snapshot) {
    let currentDescription = document.querySelector(".gpc"), currentThumbs = document.querySelector("#gdt");
    snapshot.description && currentDescription && currentDescription.replaceWith(snapshot.description), snapshot.thumbs && currentThumbs && currentThumbs.replaceWith(snapshot.thumbs);
  }
  function settingsMenuMountTarget() {
    let thumbnailContainer = document.querySelector("#gdt"), titleContainer = document.querySelector("#gd2, h1"), topNav = document.querySelector("#nb"), anchor = thumbnailContainer ?? titleContainer;
    if (topNav)
      return topNav;
    if (!anchor?.parentElement)
      return null;
    let wrapper = document.createElement("div");
    return wrapper.style.textAlign = "right", thumbnailContainer ? anchor.parentElement.insertBefore(wrapper, anchor) : anchor.insertAdjacentElement("afterend", wrapper), wrapper;
  }
  function applyTouchGalleryPanelPageStyle() {
    if (document.getElementById(TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID))
      return;
    let style = document.createElement("style");
    style.id = TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID, style.textContent = galleryRearrange_default, document.head.append(style);
  }
  function insertTouchTopBar(topBar) {
    let original = document.querySelector("#nb");
    return original?.parentElement ? (original.replaceWith(topBar), !0) : !1;
  }
  function insertTouchGalleryPanel(panel) {
    let host = document.querySelector("#gmid")?.parentElement ?? document.querySelector("#gleft")?.parentElement;
    if (!host)
      return !1;
    host.classList.add("ehpeek-touch-gallery-host");
    for (let child of Array.from(host.children))
      child.hidden = !0;
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
      homeHref: navItems.find((item) => item instanceof HTMLAnchorElement)?.href ?? "/"
    };
  }
  function readGalleryInfo(actionMenuItemClassName, tagClassName) {
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
      categoryClassName: readGalleryCategoryClassName(),
      cover: coverUrl ? galleryCoverImageElement(coverUrl) : null,
      favorite: readGalleryFavoriteInfo(),
      summary,
      actions: readGalleryActionsDom(actionMenuItemClassName),
      rating: readGalleryRatingDom(),
      tagGroups: readGalleryTagGroupsDom(tagClassName)
    };
  }
  function replaceGalleryPageBarAt(source, top, className) {
    let existing = document.querySelector(`.${className}`);
    if (existing)
      return { element: existing, top };
    let pageBar = document.createElement("div");
    return source.insertAdjacentElement("afterend", pageBar), { element: pageBar, top };
  }
  function replaceFirstElement(selector, doc) {
    let current = document.querySelector(selector), incoming = doc.querySelector(selector);
    !current || !incoming || current.replaceWith(document.importNode(incoming, !0));
  }
  function replaceSearchNavigationBars(doc) {
    let currentBars = searchNavigationBars(), incomingBars = searchNavigationBars(doc), count = Math.min(currentBars.length, incomingBars.length);
    for (let index = 0; index < count; index += 1)
      currentBars[index].replaceWith(document.importNode(incomingBars[index], !0));
  }
  function replaceSearchRangeScript(doc) {
    let incomingScript = Array.from(doc.querySelectorAll("script")).find(
      (item) => item.textContent?.includes("build_rangebar()")
    );
    if (!incomingScript)
      return;
    let currentScript = Array.from(document.querySelectorAll("script")).find(
      (item) => item.textContent?.includes("build_rangebar()")
    ), script = document.createElement("script");
    script.type = incomingScript.type || "text/javascript", script.textContent = incomingScript.textContent, currentScript ? currentScript.replaceWith(script) : searchNavigationBars()[0]?.before(script);
  }
  function readGalleryMeta() {
    let entries = Array.from(document.querySelectorAll("#gdd tr")).map((row) => {
      let cells = Array.from(row.cells), label = cells[0]?.textContent?.trim().replace(/:$/, "").toLowerCase() ?? "", value = cells.slice(1).map((cell) => cell.textContent?.trim() ?? "").filter(Boolean).join(" ");
      return [label, value];
    }).filter(([label, value]) => label && value);
    return new Map(entries);
  }
  function readGalleryCategoryClassName() {
    let category = document.querySelector("#gdc"), categoryStyleElement = category?.querySelector("[class*='ct']") ?? category;
    return Array.from(categoryStyleElement?.classList ?? []).filter((className) => /^ct\d+$/i.test(className)).join(" ");
  }
  function readGalleryRatingDom() {
    let element = document.querySelector("#gdr") ?? document.querySelector("#rating") ?? document.querySelector("#rating_label")?.parentElement ?? null;
    if (!element)
      return null;
    let wrapper = document.createElement("div"), scaler = document.createElement("div");
    return wrapper.className = "ehpeek-touch-gallery-rating", scaler.className = "ehpeek-touch-gallery-rating-scale", scaler.append(element), wrapper.append(scaler), wrapper;
  }
  function readGalleryActionsDom(actionMenuItemClassName) {
    return Array.from(document.querySelectorAll("#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']")).map((item) => {
      let clone = item.cloneNode(!0);
      return clone.removeAttribute("id"), clone.className = actionMenuItemClassName, clone;
    }).slice(0, 6);
  }
  function readGalleryTagGroupsDom(tagClassName) {
    let rows = Array.from(document.querySelectorAll("#taglist tr"));
    if (rows.length > 0)
      return rows.map((row) => {
        let namespace = row.querySelector(".tc, td:first-child")?.textContent?.trim().replace(/:$/, "") || "tag", tags = Array.from(row.querySelectorAll("a")).map((tag) => cloneGalleryTagDom(tag, tagClassName)).filter(Boolean).slice(0, 30);
        return { namespace, tags };
      }).filter((group) => group.tags.length > 0);
    let groups = /* @__PURE__ */ new Map();
    for (let tag of Array.from(document.querySelectorAll("#taglist a")).slice(0, 60)) {
      let clone = cloneGalleryTagDom(tag, tagClassName), tags = groups.get("tag") ?? [];
      tags.push(clone), groups.set("tag", tags);
    }
    return Array.from(groups, ([namespace, tags]) => ({ namespace, tags }));
  }
  function cloneGalleryTagDom(tag, tagClassName) {
    let clone = tag.cloneNode(!0);
    return clone.removeAttribute("id"), clone.className = tagClassName, clone;
  }
  function readGalleryFavoriteInfo() {
    let label = textOf("#favoritelink"), iconTitle = document.querySelector("#fav [title]")?.getAttribute("title")?.trim() ?? "", text = label || iconTitle, favorited = /^favorites?\s+\d+/i.test(text);
    return {
      actionUrl: galleryFavoriteActionUrl(),
      favorited,
      label: favorited ? text : "Not Favorited"
    };
  }
  function parseGalleryFavoriteOptions(doc) {
    return Array.from(doc.querySelectorAll("input[name='favcat']")).map((input) => ({
      label: input.closest("div[style*='height']")?.textContent?.trim().replace(/\s+/g, " ") || input.value,
      selected: input.checked,
      value: input.value
    }));
  }
  function galleryFavoriteActionUrl() {
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

  // src/components/Enhance/Misc.tsx
  function ReadButton(props) {
    let buttonClassName = props.variant === "touchGallery" ? "ehpeek-continue-reading ehpeek-touch-gallery-primary-button control-primary-action textsize-lg font-700" : "ehpeek-continue-reading block box-border w-full max-w-full mt-4px control-compact color-btn shadow-none cursor-pointer text-center font-sans textsize-sm font-700 leading-[1.15]", detailClassName = props.variant === "touchGallery" ? "ehpeek-continue-reading-page block mt-2px color-accent textsize-sm font-600 opacity-78 normal-case" : "ehpeek-continue-reading-page block mt-1px opacity-72 textsize-xs font-600";
    return /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: buttonClassName,
        onClick: (event) => {
          event.preventDefault(), event.stopPropagation(), props.onClick();
        }
      },
      props.info.label,
      /* @__PURE__ */ k("span", { className: detailClassName }, props.info.detail)
    );
  }
  var SWIPE_INDICATOR_HIDE_PROGRESS = 1e-3;
  function SwipeIndicator(props) {
    let handleFor = (element) => ({
      hide: (direction) => {
        updateSwipeIndicatorElement(element, { direction, progress: 0 });
      },
      update: (state2) => {
        updateSwipeIndicatorElement(element, state2);
      }
    });
    return /* @__PURE__ */ k(
      "div",
      {
        ref: (element) => {
          props.handleRef(element ? handleFor(element) : null);
        },
        className: "ehpeek-swipe-indicator fixed top-1/2 z-[2147483645] flex w-42px h-108px items-center justify-center border color-search-swipe rounded-22px text-52px font-sans font-300 leading-1 pointer-events-none select-none transition-opacity duration-120 ease-in-out",
        "aria-hidden": "true",
        style: {
          backdropFilter: "blur(8px)",
          display: "none",
          opacity: "0",
          transform: "translate(42px, -50%)"
        }
      }
    );
  }
  function updateSwipeIndicatorElement(element, state2) {
    let clampedProgress = Math.min(1, Math.max(0, state2.progress)), pull = Math.round(48 * clampedProgress), hidden = clampedProgress <= SWIPE_INDICATOR_HIDE_PROGRESS, offset = state2.direction === "left" ? 42 - pull : pull - 42, blocked = state2.blocked === !0;
    element.setAttribute("aria-hidden", hidden ? "true" : "false"), element.textContent = blocked ? "×" : state2.direction === "left" ? "‹" : "›", element.style.display = hidden ? "none" : "flex", element.style.left = state2.direction === "right" ? "6px" : "", element.style.opacity = String(0.35 + clampedProgress * 0.65), element.style.right = state2.direction === "left" ? "6px" : "", element.style.transform = `translate(${offset}px, -50%)`, element.style.width = "";
  }

  // src/components/Enhance/TouchGalleryPanel.tsx
  var TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS = "ehpeek-touch-gallery-actions-menu-item control-touch-menu-item text-21px leading-[1.2]", TOUCH_GALLERY_TAG_CLASS = "ehpeek-touch-gallery-tag control-tag color-tag text-23px";
  function TouchGalleryPanel(props) {
    let rootRef = A2(null), categoryClassName = "ehpeek-touch-gallery-category min-w-0 self-center overflow-hidden text-ellipsis whitespace-nowrap py-6px px-12px text-17px font-700 leading-[1.1] uppercase " + (props.source.categoryClassName || "bg-[#34353b] color-accent");
    return h2(() => {
      rootRef.current && prepareRatingScale(rootRef.current);
    }, []), /* @__PURE__ */ k("section", { ref: rootRef, className: "ehpeek-touch-gallery flex box-border w-full flex-col mb-12px color-text font-sans" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-hero relative grid h-[clamp(260px,42vh,340px)] pt-18px pr-[max(16px,env(safe-area-inset-right,0px))] pb-48px pl-[max(16px,env(safe-area-inset-left,0px))] color-surface color-text" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-summary grid h-full min-h-0 grid-cols-[36%_minmax(0,1fr)] gap-18px items-start" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-cover flex self-center justify-self-center w-auto max-w-full h-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden" }, /* @__PURE__ */ k(ExternalDomNode, { node: props.source.cover })), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-hero-side flex self-stretch min-w-0 min-h-0 flex-col items-start gap-10px pt-2px" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-heading flex min-w-0 min-h-0 w-full flex-col gap-6px items-start overflow-hidden" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-title-main line-clamp-4 overflow-hidden text-22px text-[clamp(22px,5.9vw,32px)] font-400 leading-[1.1] text-left break-anywhere" }, props.source.titleMain), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-title-sub line-clamp-3 overflow-hidden opacity-88 text-[clamp(17px,4.6vw,25px)] leading-[1.15] text-left break-anywhere" }, props.source.titleSub)), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-category-row flex w-full min-h-64px gap-4px items-center mt-auto" }, /* @__PURE__ */ k("div", { className: categoryClassName }, props.source.category), /* @__PURE__ */ k(ExternalDomNode, { node: props.source.rating }))))), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-primary relative z-1 grid grid-cols-[1fr_1fr] min-h-[var(--ehpeek-control-primary-height)] mt--18px mr-[max(14px,env(safe-area-inset-right,0px))] ml-[max(14px,env(safe-area-inset-left,0px))] overflow-visible rounded-[var(--ehpeek-control-radius-sm)] color-panel-primary" }, /* @__PURE__ */ k(TouchGalleryFavoriteButton, { source: props.source.favorite }), /* @__PURE__ */ k(
      "div",
      {
        className: "ehpeek-touch-gallery-primary-actions flex min-w-0 border-l border-[rgba(255,255,255,0.12)]",
        ref: (node) => {
          props.onPrimaryActionMount(node);
        }
      }
    )), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-content flex flex-col gap-16px pt-28px pr-[max(16px,env(safe-area-inset-right,0px))] pb-18px pl-[max(16px,env(safe-area-inset-left,0px))] bg-[#34353b]" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-14px gap-x-18px items-center text-27px leading-[1.2] text-center" }, props.source.summary.map((item) => /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal" }, item.value)), /* @__PURE__ */ k(TouchGalleryActionsMenu, { actions: props.source.actions })), props.source.tagGroups.length > 0 && /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-tag-groups flex flex-col gap-10px pt-2px" }, props.source.tagGroups.map((group) => /* @__PURE__ */ k(TouchGalleryTagGroup, { group })))));
  }
  function TouchGalleryActionsMenu(props) {
    let [open, setOpen] = d2(!1), rootRef = A2(null);
    return h2(() => {
      let onClick = (event) => {
        event.target instanceof Element && rootRef.current?.contains(event.target) || setOpen(!1);
      };
      return document.addEventListener("click", onClick), () => {
        document.removeEventListener("click", onClick);
      };
    }, []), /* @__PURE__ */ k("div", { ref: rootRef, className: "ehpeek-touch-gallery-actions-menu relative flex min-w-0 items-center justify-center" }, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: "ehpeek-touch-gallery-actions-menu-button inline-flex control-icon items-center justify-center border-0 bg-transparent color-text text-28px leading-1",
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: (event) => {
          event.stopPropagation(), setOpen(!open);
        }
      },
      "⋮"
    ), open && /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-actions-menu-panel absolute top-48px right-0 z-[2147483644] flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border color-border rounded-[var(--ehpeek-control-radius-md)] color-elevated" }, /* @__PURE__ */ k(ExternalDomNodes, { nodes: props.actions, clone: !0 })));
  }
  function TouchGalleryTagGroup(props) {
    return /* @__PURE__ */ k("section", { className: "ehpeek-touch-gallery-tag-group grid grid-cols-[minmax(88px,28%)_minmax(0,1fr)] gap-8px items-start" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-tag-group-name control-tag-group color-tag-group text-21px" }, props.group.namespace), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-tags flex flex-wrap gap-8px" }, /* @__PURE__ */ k(ExternalDomNodes, { nodes: props.group.tags, clone: !0 })));
  }
  function TouchGalleryFavoriteButton(props) {
    let [favorite, setFavorite] = d2(() => ({ ...props.source })), [open, setOpen] = d2(!1), [loadingState, setLoadingState] = d2("idle"), [options, setOptions] = d2([]), rootRef = A2(null), favorited = favorite.favorited;
    h2(() => {
      let onClick = (event) => {
        event.target instanceof Element && rootRef.current?.contains(event.target) || setOpen(!1);
      };
      return document.addEventListener("click", onClick), () => {
        document.removeEventListener("click", onClick);
      };
    }, []);
    let openMenu = async () => {
      if (favorite.actionUrl) {
        setOpen(!0), setLoadingState("loading");
        try {
          let html = await requestText(favorite.actionUrl), doc = new DOMParser().parseFromString(html, "text/html");
          setOptions(parseGalleryFavoriteOptions(doc)), setLoadingState("idle");
        } catch (error) {
          console.error("[ehpeek]", error), setLoadingState("failed");
        }
      }
    };
    return /* @__PURE__ */ k("div", { ref: rootRef, className: "ehpeek-touch-gallery-favorite-menu relative z-2 min-w-0" }, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button control-primary-action textsize-lg font-700 normal-case ${favorited ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: (event) => {
          event.stopPropagation(), open ? setOpen(!1) : openMenu();
        }
      },
      /* @__PURE__ */ k("span", { className: "block leading-[1.15]" }, favorite.label),
      /* @__PURE__ */ k(
        "span",
        {
          className: `ehpeek-touch-gallery-favorite-icon block mt-2px textsize-md font-600 opacity-78 normal-case leading-[1.15] ${favorited ? "color-accent" : "text-[#111]"}`,
          "aria-hidden": "true"
        },
        favorited ? "♥" : "♡"
      )
    ), open && /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-favorite-panel absolute top-[calc(100%+8px)] left-0 z-[2147483644] flex w-[min(86vw,360px)] flex-col overflow-hidden border color-border rounded-[var(--ehpeek-control-radius-md)] color-elevated" }, loadingState === "loading" && /* @__PURE__ */ k(TouchGalleryFavoriteStatus, { text: "Loading..." }), loadingState === "failed" && /* @__PURE__ */ k(TouchGalleryFavoriteStatus, { text: "Failed" }), loadingState === "idle" && options.map((option) => /* @__PURE__ */ k(
      TouchGalleryFavoriteOption,
      {
        actionUrl: favorite.actionUrl,
        option,
        onApplied: () => {
          setFavorite({
            ...favorite,
            favorited: option.value !== "favdel",
            label: option.value === "favdel" ? "Not Favorited" : option.label
          }), setOpen(!1);
        }
      }
    ))));
  }
  function TouchGalleryFavoriteStatus(props) {
    return /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-favorite-loading flex min-h-[var(--ehpeek-control-menu-item-min-height)] items-center gap-12px py-14px px-18px border-0 border-b color-border-subtle-b bg-transparent color-text font-inherit text-21px leading-[1.2] text-left" }, props.text);
  }
  function TouchGalleryFavoriteOption(props) {
    return /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-touch-gallery-favorite-option flex min-h-[var(--ehpeek-control-menu-item-min-height)] items-center gap-12px py-14px px-18px border-0 border-b color-border-subtle-b bg-transparent color-text font-inherit text-21px leading-[1.2] text-left ${props.option.value === "favdel" ? "ehpeek-touch-gallery-favorite-option-remove" : ""}`,
        "aria-pressed": props.option.selected,
        onClick: (event) => {
          event.stopPropagation(), applyFavoriteOption(props.actionUrl, props.option).then(props.onApplied).catch((error) => {
            console.error("[ehpeek]", error);
          });
        }
      },
      /* @__PURE__ */ k(
        "span",
        {
          className: `ehpeek-touch-gallery-favorite-option-icon flex-none text-24px leading-1 ${props.option.value === "favdel" ? "text-[#111]" : "color-accent"}`,
          "aria-hidden": "true"
        },
        props.option.value === "favdel" ? "♡" : "♥"
      ),
      /* @__PURE__ */ k("span", null, props.option.label)
    );
  }
  async function applyFavoriteOption(actionUrl, option) {
    let body = new URLSearchParams();
    body.set("favcat", option.value), body.set("favnote", ""), body.set("apply", "Apply Changes"), body.set("update", "1");
    let response = await fetch(actionUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`);
  }
  function prepareRatingScale(root) {
    let wrapper = root.querySelector(".ehpeek-touch-gallery-rating"), scaler = root.querySelector(".ehpeek-touch-gallery-rating-scale");
    if (!wrapper || !scaler)
      return;
    let wrapperWidth = wrapper.getBoundingClientRect().width, scalerRect = scaler.getBoundingClientRect(), scale = scalerRect.width > 0 && wrapperWidth > 0 ? Math.min(2, Math.max(1, wrapperWidth / scalerRect.width)) : 1;
    wrapper.style.setProperty("--ehpeek-rating-scale", String(scale)), wrapper.style.setProperty("--ehpeek-rating-height", `${Math.ceil(scalerRect.height * scale)}px`);
  }

  // src/components/Enhance/TouchTopBar.tsx
  var TOUCH_ICON_BUTTON_CLASS = "inline-flex control-icon border-0 bg-transparent color-text text-28px leading-1 no-underline", TOUCH_TOP_BAR_MENU_ITEM_CLASS = "ehpeek-touch-top-bar-menu-item block box-border w-full min-h-[var(--ehpeek-control-touch-min-height)] py-18px px-24px touch:px-26px border-0 border-b color-border-subtle-b bg-transparent color-text text-left no-underline text-28px touch:text-30px leading-[1.2]";
  function TouchTopBarMenu(props) {
    let [open, setOpen] = d2(!1), rootRef = A2(null), navItemsRef = A2(null);
    return h2(() => {
      let navItems = navItemsRef.current;
      navItems && navItems.replaceChildren(...props.navItems.map((item) => item.cloneNode(!0)));
    }, [open, props.navItems]), h2(() => {
      let onClick = (event) => {
        event.target instanceof Element && rootRef.current?.contains(event.target) || setOpen(!1);
      };
      return document.addEventListener("click", onClick), () => {
        document.removeEventListener("click", onClick);
      };
    }, []), /* @__PURE__ */ k("div", { ref: rootRef, className: "ehpeek-touch-top-bar-menu relative" }, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-touch-top-bar-menu-button ${TOUCH_ICON_BUTTON_CLASS}`,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: (event) => {
          event.stopPropagation(), setOpen(!open);
        }
      },
      "⋮"
    ), open && /* @__PURE__ */ k(
      "div",
      {
        className: "ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+8px)] right-0 z-[2147483645] flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border color-border rounded-4px color-elevated"
      },
      /* @__PURE__ */ k("div", { ref: navItemsRef, className: "contents" }),
      /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: TOUCH_TOP_BAR_MENU_ITEM_CLASS,
          onClick: (event) => {
            event.preventDefault(), event.stopPropagation(), setOpen(!1), props.onSettingsMenuOpen();
          }
        },
        texts_default.settings.menuLabel
      )
    ));
  }
  function TouchTopBar(props) {
    return /* @__PURE__ */ k("nav", { className: "ehpeek-touch-top-bar relative z-[2147483640] flex box-border w-full min-h-56px items-center justify-between py-6px px-[max(16px,env(safe-area-inset-right,0px))] color-surface color-text font-sans" }, /* @__PURE__ */ k("a", { className: `ehpeek-touch-top-bar-home ${TOUCH_ICON_BUTTON_CLASS}`, href: props.info.homeHref }, "⌂"), /* @__PURE__ */ k(TouchTopBarMenu, { navItems: props.info.navItems, onSettingsMenuOpen: props.onSettingsMenuOpen }));
  }

  // src/components/Loading.tsx
  function LoadingSpinner(props) {
    let sizeClass = props.size === "lg" ? "w-34px h-34px border-4" : "w-24px h-24px border-3";
    return /* @__PURE__ */ k("span", { className: "inline-flex items-center justify-center gap-10px color-reader-text", role: "status", "aria-live": "polite" }, /* @__PURE__ */ k(
      "span",
      {
        className: `${sizeClass} inline-block box-border animate-spin rounded-full border-solid border-[rgba(255,255,255,0.28)] border-t-[var(--ehpeek-color-accent)]`,
        "aria-hidden": "true"
      }
    ), /* @__PURE__ */ k("span", null, props.label));
  }
  function LoadingOverlay(props) {
    return props.visible ? /* @__PURE__ */ k("div", { className: "fixed left-1/2 top-1/2 z-[2147483644] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[var(--ehpeek-control-radius-reader)] border color-search-swipe px-18px py-14px pointer-events-none select-none" }, /* @__PURE__ */ k(LoadingSpinner, { label: props.label })) : null;
  }
  function loadingSpinnerElement(label, size) {
    let host = document.createElement("span");
    return R(/* @__PURE__ */ k(LoadingSpinner, { label, size }), host), host;
  }

  // src/components/Enhance/ScrollPageBar.tsx
  var SCROLL_PAGE_BAR_CLASS = "ehpeek-scroll-page-bar", SCROLL_PAGE_BAR_TOP_CLASS = "ehpeek-scroll-page-bar-top", SCROLL_PAGE_BAR_BOTTOM_CLASS = "ehpeek-scroll-page-bar-bottom", SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR = "data-ehpeek-window-index", DRAG_PIXEL_STEP = 18, PAGE_BAR_BOTTOM_CLASS = "mt-0 mb-10px", PAGE_BAR_CELL_CLASS = "control-page p-0 cursor-pointer text-center align-middle select-none", PAGE_BAR_CLASS = "w-max mx-auto touch-pan-y [&[data-dragging=true]]:select-none", PAGE_BAR_LINK_CLASS = "flex control-page items-center justify-center box-border px-0 py-0 border border-current bg-transparent textsize-sm font-inherit no-underline hover:no-underline active:no-underline", PAGE_BAR_TABLE_CLASS = "border-separate border-spacing-4px touch:border-spacing-6px", PAGE_BAR_TOP_CLASS = "mt-2px mb-0", galleryPageBarWindowIndex = null;
  function ScrollPageBar(options) {
    let maxIndex = Math.max(0, options.maxIndex ?? options.currentIndex), currentIndex = clamp(options.currentIndex, 0, maxIndex), [windowIndex, setWindowIndex] = d2(
      () => clamp(galleryPageBarWindowIndex ?? options.initialWindowIndex ?? currentIndex, 0, maxIndex)
    ), dragStartWindowIndex = A2(windowIndex), draggable = () => maxIndex + 1 > 7, slots = pageSlots(windowIndex, currentIndex, maxIndex), firstSlotIndex = slots[0]?.pageIndex ?? currentIndex, lastSlotIndex = slots[slots.length - 1]?.pageIndex ?? currentIndex, currentBeforeWindow = currentIndex < firstSlotIndex, currentAfterWindow = currentIndex > lastSlotIndex, linkCell = (text, pageIndex, current) => current ? /* @__PURE__ */ k("td", { className: `ptds ${PAGE_BAR_CELL_CLASS}` }, /* @__PURE__ */ k("span", { className: PAGE_BAR_LINK_CLASS }, text)) : /* @__PURE__ */ k("td", { className: PAGE_BAR_CELL_CLASS }, /* @__PURE__ */ k("a", { className: PAGE_BAR_LINK_CLASS, href: options.urlForIndex(pageIndex), "data-page-index": String(pageIndex) }, text)), emptyCell = () => /* @__PURE__ */ k("td", { className: `${PAGE_BAR_CELL_CLASS} cursor-default` }, /* @__PURE__ */ k("span", { className: `${PAGE_BAR_LINK_CLASS} invisible` }));
    return options.element.className = `${SCROLL_PAGE_BAR_CLASS} ${PAGE_BAR_CLASS} ${options.top ? `${SCROLL_PAGE_BAR_TOP_CLASS} ${PAGE_BAR_TOP_CLASS}` : `${SCROLL_PAGE_BAR_BOTTOM_CLASS} ${PAGE_BAR_BOTTOM_CLASS}`}`, options.element.setAttribute(SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR, String(windowIndex)), usePointerGestureElement(options.element, {
      shouldCaptureDrag: draggable,
      dragAxis: "x",
      onStart: () => {
        dragStartWindowIndex.current = windowIndex;
      },
      onMove: (info) => {
        if (Math.abs(info.dx) < Math.abs(info.dy))
          return;
        let nextIndex = clamp(dragStartWindowIndex.current - acceleratedPageOffset(info.dx), 0, maxIndex);
        nextIndex !== windowIndex && (galleryPageBarWindowIndex = nextIndex, setWindowIndex(nextIndex));
      }
    }), /* @__PURE__ */ k("table", { className: PAGE_BAR_TABLE_CLASS }, /* @__PURE__ */ k("tbody", null, /* @__PURE__ */ k("tr", null, linkCell("<<", 0, currentIndex === 0), currentBeforeWindow ? linkCell(String(currentIndex + 1), currentIndex, !0) : emptyCell(), linkCell("<", Math.max(0, currentIndex - 1), currentIndex === 0), slots.map((slot) => slot ? linkCell(String(slot.pageIndex + 1), slot.pageIndex, slot.pageIndex === currentIndex) : emptyCell()), linkCell(">", Math.min(maxIndex, currentIndex + 1), currentIndex === maxIndex), currentAfterWindow ? linkCell(String(currentIndex + 1), currentIndex, !0) : emptyCell(), linkCell(">>", maxIndex, currentIndex === maxIndex))));
  }
  function setScrollPageBarWindowIndex(index) {
    galleryPageBarWindowIndex = Math.max(0, Math.round(index));
  }
  function pageSlots(windowIndex, currentIndex, maxIndex) {
    if (maxIndex + 1 <= 7)
      return range(0, maxIndex).map((pageIndex) => ({ type: "page", pageIndex }));
    let windowStart = clamp(windowIndex - 3, -1, maxIndex - 5);
    return range(windowStart, windowStart + 6).map(
      (pageIndex) => pageIndex >= 0 && pageIndex <= maxIndex ? { type: "page", pageIndex } : null
    );
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
      return parsed.pathname === "/" || parsed.pathname.startsWith("/tag/") || parsed.pathname === "/watched" ? {
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
  function galleryPageNumber(url) {
    let page = extractPageType(url);
    return page.type === "image" ? page.pageNum : void 0;
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
    let html = await requestText(url), doc = new DOMParser().parseFromString(html, "text/html"), list = replaceSearchPageContent(doc);
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
  async function pullPreviewPage(index, landingIndex, landingPages) {
    if (index === landingIndex)
      return landingPages;
    let previewUrl = previewUrlForIndex(index), html = await requestText(previewUrl), doc = new DOMParser().parseFromString(html, "text/html");
    return collectGalleryPages2(doc, previewUrl);
  }
  function findClickedImageLink2(target) {
    return findClickedImageLink(target, extractPageType);
  }
  async function loadEhImagePage(page) {
    let html = await requestText(page.url), image = new DOMParser().parseFromString(html, "text/html").querySelector("img#img"), imageSrc = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.currentSrc || "", imageUrl = imageSrc ? normalizeUrl(imageSrc, page.url) : "";
    if (!imageUrl)
      throw new Error(texts_default.errors.imageNotFound);
    return {
      imageUrl,
      width: numericAttribute(image, "width"),
      height: numericAttribute(image, "height")
    };
  }
  function replacePreviewContent2(doc) {
    replacePreviewContent(doc);
  }
  function numericAttribute(element, attribute) {
    let value = Number(element?.getAttribute(attribute) || "");
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  // src/components/Enhance/EnhanceThumbsGrids.tsx
  var PREVIEW_CACHE_LIMIT = 10, SWIPE_MIN_DISTANCE = 96, SWIPE_INTENT_DISTANCE = 28, HORIZONTAL_INTENT_RATIO = 2.2, SWIPE_MAX_VERTICAL_RATIO = 0.38, galleryThumbEnhancementOnError = null, galleryThumbEnhancementClickInstalled = !1, swipeElement = null, setSwipeGestureTarget = null, swipeIndicator = null, swipeIndicatorDirection = "left", swipeState = null, galleryNavigationLoading = !1, replaceGalleryPageBar = null;
  function enhanceThumbsGridsEnabled() {
    return state.gallery.enhanceThumbs.value;
  }
  var GalleryPageProvider = class {
    constructor(landingIndex, landingPages, pageSize, maxPreviewIndex, windowSize, loadPreviewPage) {
      this.landingIndex = landingIndex;
      this.landingPages = landingPages;
      this.pageSize = pageSize;
      this.maxPreviewIndex = maxPreviewIndex;
      this.windowSize = windowSize;
      this.loadPreviewPage = loadPreviewPage;
      this.previewCache = /* @__PURE__ */ new Map();
      this.previewCache.set(landingIndex, landingPages);
    }
    previewIndexForPage(pageNum) {
      return previewPageIndexForGalleryPage(pageNum, this.pageSize, this.maxPreviewIndex);
    }
    async loadDisplayPages(pageNums) {
      let previewIndexes = Array.from(new Set(pageNums.map((pageNum) => this.previewIndexForPage(pageNum)))).filter(
        (value) => value >= 0 && (this.maxPreviewIndex === null || value <= this.maxPreviewIndex)
      ), requested = new Set(pageNums), chunks = await Promise.all(previewIndexes.map((index) => this.cachedPreviewPage(index))), byUrl = /* @__PURE__ */ new Map();
      for (let page of chunks.flat())
        page.pageNum && requested.has(page.pageNum) && byUrl.set(page.url, page);
      return Array.from(byUrl.values()).sort(
        (left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER)
      );
    }
    async cachedPreviewPage(index) {
      let boundedIndex = this.maxPreviewIndex === null ? index : Math.min(index, this.maxPreviewIndex);
      if (boundedIndex < 0)
        return [];
      let cached = this.previewCache.get(boundedIndex);
      if (cached)
        return this.previewCache.delete(boundedIndex), this.previewCache.set(boundedIndex, cached), cached;
      let pages = await this.loadPreviewPage(boundedIndex, this.landingIndex, this.landingPages);
      for (this.previewCache.set(boundedIndex, pages); this.previewCache.size > PREVIEW_CACHE_LIMIT; ) {
        let oldest = this.previewCache.keys().next().value;
        if (oldest === void 0)
          break;
        this.previewCache.delete(oldest);
      }
      return pages;
    }
  };
  function EnhanceThumbsGrids(props) {
    let [gestureTarget, setGestureTarget] = d2(null);
    return h2(() => (setSwipeGestureTarget = setGestureTarget, replaceGalleryPageBar = props.replaceGalleryPageBar, props.enabled && (galleryThumbEnhancementOnError = props.onError, replaceGalleryPageBar(previewPageIndex(), maxPreviewPageIndex()), setThumbsGridSwipeTarget(), galleryThumbEnhancementClickInstalled || (galleryThumbEnhancementClickInstalled = !0, document.addEventListener("click", onPageBarClick, !0))), () => {
      setSwipeGestureTarget === setGestureTarget && (setSwipeGestureTarget = null), replaceGalleryPageBar === props.replaceGalleryPageBar && (replaceGalleryPageBar = null);
    }), [props.enabled, props.onError, props.replaceGalleryPageBar]), usePointerGestureElement(gestureTarget, {
      onStart: () => {
        swipeState = { horizontal: !0, cancelled: !1 }, hideSwipeIndicator();
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
    }), props.enabled ? /* @__PURE__ */ k(
      SwipeIndicator,
      {
        handleRef: (handle) => {
          swipeIndicator = handle;
        }
      }
    ) : null;
  }
  async function navigateGalleryPreview(url, options = {}) {
    if (galleryNavigationLoading)
      return;
    let previousUrl = window.location.href, snapshot = snapshotPreview(), targetPreviewIndex = previewPageIndexFromUrl(url);
    galleryNavigationLoading = !0, swipeElement?.setAttribute("aria-busy", "true"), window.history.replaceState(window.history.state, "", url), targetPreviewIndex !== null && (setScrollPageBarWindowIndex(targetPreviewIndex), replaceGalleryPageBar?.(targetPreviewIndex, maxPreviewPageIndex())), options.scrollToPageBar && scrollToPageBar(options.scrollToPageBar), showPreviewPlaceholder(loadingSpinnerElement(texts_default.reader.loading, "lg"));
    try {
      let html = await requestText(url), doc = new DOMParser().parseFromString(html, "text/html");
      replacePreviewContent2(doc), replaceGalleryPageBar?.(previewPageIndexFromUrl(url) ?? previewPageIndex(), maxPreviewPageIndex()), setThumbsGridSwipeTarget(), options.scrollToPageBar && scrollToPageBar(options.scrollToPageBar);
    } catch (error) {
      throw restorePreview(snapshot), window.history.replaceState(window.history.state, "", previousUrl), replaceGalleryPageBar?.(previewPageIndex(), maxPreviewPageIndex()), error;
    } finally {
      galleryNavigationLoading = !1, swipeElement?.removeAttribute("aria-busy");
    }
  }
  function setThumbsGridSwipeTarget() {
    if (!enhanceThumbsGridsEnabled())
      return;
    let thumbs = document.querySelector("#gdt");
    thumbs && (swipeElement = thumbs, prepareThumbsGridSwipeTargets(thumbs), setSwipeGestureTarget?.(thumbs));
  }
  function updateSwipeIndicator(info) {
    if (!swipeState?.horizontal || swipeState.cancelled)
      return;
    let direction = info.dx < 0 ? "left" : "right", availableUrl = swipeUrlForDelta(info.dx), progress = swipeProgressForDelta(info.dx);
    if (!availableUrl) {
      swipeIndicatorDirection = direction, swipeIndicator?.update({
        blocked: !0,
        direction,
        progress
      });
      return;
    }
    swipeIndicatorDirection = direction, swipeIndicator?.update({ direction, progress });
  }
  function hideSwipeIndicator() {
    swipeIndicator?.hide(swipeIndicatorDirection);
  }
  function navigateBySwipe(info, event) {
    if (!swipeState?.horizontal || swipeState.cancelled)
      return;
    let dx = info.dx, dy = info.dy, absX = Math.abs(dx), absY = Math.abs(dy);
    if (absX < SWIPE_MIN_DISTANCE || absY > absX * SWIPE_MAX_VERTICAL_RATIO)
      return;
    let url = swipeUrlForDelta(dx);
    url && (event.preventDefault(), navigateGalleryPreview(url, { scrollToPageBar: dx < 0 ? "top" : "bottom" }).catch(
      (error) => galleryThumbEnhancementOnError?.(error)
    ));
  }
  function swipeUrlForDelta(dx) {
    let currentIndex = previewPageIndex(), maxIndex = maxPreviewPageIndex(), nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    return nextIndex < 0 || maxIndex !== null && nextIndex > maxIndex ? null : previewUrlForIndex(nextIndex);
  }
  function swipeProgressForDelta(dx) {
    return Math.min(1, Math.max(0, (Math.abs(dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE)));
  }
  function onPageBarClick(event) {
    if (!enhanceThumbsGridsEnabled() || !(event.target instanceof Element))
      return;
    let barItem = event.target.closest(`.${SCROLL_PAGE_BAR_CLASS} a[data-page-index], .${SCROLL_PAGE_BAR_CLASS} button[data-page-jump]`);
    if (!barItem)
      return;
    event.preventDefault(), event.stopPropagation();
    let url = pageBarUrl(barItem);
    if (!url)
      return;
    let targetPreviewIndex = previewPageIndexFromUrl(url);
    targetPreviewIndex !== null && setScrollPageBarWindowIndex(targetPreviewIndex), navigateGalleryPreview(url, { scrollToPageBar: pageBarScrollTarget(barItem, targetPreviewIndex) }).catch(
      (error) => galleryThumbEnhancementOnError?.(error)
    );
  }
  function pageBarScrollTarget(item, targetPreviewIndex) {
    if (item instanceof HTMLButtonElement)
      return "top";
    let currentIndex = previewPageIndex(), maxIndex = maxPreviewPageIndex();
    return targetPreviewIndex !== null && (targetPreviewIndex === currentIndex - 1 || targetPreviewIndex === maxIndex) ? "bottom" : "top";
  }
  function scrollToPageBar(target) {
    let selector = target === "top" ? `.${SCROLL_PAGE_BAR_TOP_CLASS}` : `.${SCROLL_PAGE_BAR_BOTTOM_CLASS}`, block = target === "top" ? "start" : "end";
    document.querySelector(selector)?.scrollIntoView({ block, behavior: "smooth" });
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

  // src/components/Enhance/EnhanceSearchGrids.tsx
  var SWIPE_MIN_DISTANCE2 = 96, SWIPE_INTENT_DISTANCE2 = 28, HORIZONTAL_INTENT_RATIO2 = 2.2, SWIPE_MAX_VERTICAL_RATIO2 = 0.38, installed = !1, swipeElement2 = null, setSearchLoading = null, setSwipeGestureTarget2 = null, swipeIndicator2 = null, swipeIndicatorDirection2 = "left", swipeState2 = null, searchNavigationLoading = !1;
  function EnhanceSearchGrids(props) {
    let [gestureTarget, setGestureTarget] = d2(null), [loading, setLoading] = d2(!1);
    return h2(() => (setSearchLoading = setLoading, setSwipeGestureTarget2 = setGestureTarget, setResultListSwipeTarget(props.resultList), installed || (installed = !0, document.addEventListener("click", onSearchNavigationClick, !0)), () => {
      setSearchLoading === setLoading && (setSearchLoading = null), setSwipeGestureTarget2 === setGestureTarget && (setSwipeGestureTarget2 = null);
    }), [props.resultList]), usePointerGestureElement(gestureTarget, {
      onStart: () => {
        swipeState2 = { horizontal: !0, cancelled: !1 }, hideSwipeIndicator2();
      },
      onMove: (info) => {
        updateSwipeIndicator2(info);
      },
      onEnd: (info, event) => {
        navigateBySwipe2(info, event), swipeState2 = null, hideSwipeIndicator2();
      },
      dragAxis: "x",
      dragIntentRatio: HORIZONTAL_INTENT_RATIO2,
      dragStartThreshold: SWIPE_INTENT_DISTANCE2
    }), /* @__PURE__ */ k(S, null, /* @__PURE__ */ k(
      SwipeIndicator,
      {
        handleRef: (handle) => {
          swipeIndicator2 = handle;
        }
      }
    ), /* @__PURE__ */ k(LoadingOverlay, { label: texts_default.reader.loading, visible: loading }));
  }
  function setResultListSwipeTarget(resultList) {
    resultList.style.touchAction = "pan-y", resultList.style.overscrollBehaviorX = "contain", swipeElement2 = resultList, setSwipeGestureTarget2?.(resultList);
  }
  function onSearchNavigationClick(event) {
    let link = findSearchNavigationLink(event.target);
    link && (event.preventDefault(), event.stopPropagation(), navigateSearchPage(link.href, isNextPageOrJump(link)));
  }
  function updateSwipeIndicator2(info) {
    if (!swipeState2?.horizontal || swipeState2.cancelled)
      return;
    let direction = info.dx < 0 ? "left" : "right", availableUrl = swipeUrlForDelta2(info.dx), progress = swipeProgressForDelta2(info.dx);
    if (!availableUrl) {
      swipeIndicatorDirection2 = direction, swipeIndicator2?.update({
        blocked: !0,
        direction,
        progress
      });
      return;
    }
    swipeIndicatorDirection2 = direction, swipeIndicator2?.update({ direction, progress });
  }
  function hideSwipeIndicator2() {
    swipeIndicator2?.hide(swipeIndicatorDirection2);
  }
  function navigateBySwipe2(info, event) {
    if (!swipeState2?.horizontal || swipeState2.cancelled)
      return;
    let dx = info.dx, dy = info.dy, absX = Math.abs(dx), absY = Math.abs(dy);
    if (absX < SWIPE_MIN_DISTANCE2 || absY > absX * SWIPE_MAX_VERTICAL_RATIO2)
      return;
    let url = swipeUrlForDelta2(dx);
    url && (event.preventDefault(), navigateSearchPage(url, !1));
  }
  async function navigateSearchPage(url, scrollToTopNavigation) {
    if (!searchNavigationLoading) {
      searchNavigationLoading = !0, setSearchLoading?.(!0), swipeElement2?.setAttribute("aria-busy", "true"), scrollSearchNavigationIntoView(scrollToTopNavigation);
      try {
        let resultList = await replaceSearchPageContentFromUrl(url);
        window.history.pushState(window.history.state, "", url), setResultListSwipeTarget(resultList);
      } catch (error) {
        console.error("[ehpeek]", error);
      } finally {
        searchNavigationLoading = !1, setSearchLoading?.(!1), swipeElement2?.removeAttribute("aria-busy");
      }
    }
  }
  function swipeUrlForDelta2(dx) {
    let nav = searchPageNavigation();
    return nav ? dx < 0 ? nav.nextUrl : nav.previousUrl : null;
  }
  function swipeProgressForDelta2(dx) {
    return Math.min(1, Math.max(0, (Math.abs(dx) - SWIPE_INTENT_DISTANCE2) / (SWIPE_MIN_DISTANCE2 - SWIPE_INTENT_DISTANCE2)));
  }
  function scrollSearchNavigationIntoView(enabled) {
    if (!enabled)
      return;
    let target = document.querySelector(".searchnav");
    if (!target)
      return;
    let rect = target.getBoundingClientRect(), currentTop = window.scrollY, targetTop = Math.max(0, currentTop + rect.top);
    currentTop <= targetTop || window.scrollTo({ top: targetTop, behavior: "auto" });
  }
  function isNextPageOrJump(link) {
    let id = link.id.toLowerCase();
    return id.endsWith("next") || id.endsWith("last");
  }

  // src/history.ts
  var HISTORY_KEY_PREFIX = "ehpeek:history:", HISTORY_COUNT_KEY = "ehpeek:history-count";
  var ReaderHistorySession = class {
    constructor(baseRecord) {
      this.baseRecord = baseRecord;
      this.pending = null;
      this.lastSaved = null;
      this.timer = null;
      this.flush = () => {
        this.timer !== null && (window.clearTimeout(this.timer), this.timer = null), this.pending && (this.sameProgress(this.pending, this.lastSaved) || (saveReaderHistory(this.pending), this.lastSaved = this.pending), this.pending = null);
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
      this.timer === null && (this.timer = window.setTimeout(this.flush, 1e4));
    }
    sameProgress(left, right) {
      return !!(left && right && left.galleryId === right.galleryId && left.token === right.token && left.pageNum === right.pageNum && left.totalPages === right.totalPages);
    }
  };
  function loadReaderHistory(galleryId, token) {
    return GM_getValue(historyKey(galleryId, token), null);
  }
  function saveReaderHistory(record) {
    let key = historyKey(record.galleryId, record.token), exists = GM_getValue(key, null) !== null;
    if (GM_setValue(key, record), !exists) {
      let count = GM_getValue(HISTORY_COUNT_KEY, 0) + 1;
      GM_setValue(HISTORY_COUNT_KEY, count), count > 2e3 && pruneReaderHistory();
    }
  }
  function historyKey(galleryId, token) {
    return `${HISTORY_KEY_PREFIX}${galleryId}:${token}`;
  }
  function pruneReaderHistory() {
    let records = GM_listValues().filter((key) => key.startsWith(HISTORY_KEY_PREFIX)).map((key) => ({ key, record: GM_getValue(key, null) })).filter((entry) => entry.record !== null).sort((left, right) => left.record.updatedAt - right.record.updatedAt);
    for (let entry of records.slice(0, 1e3))
      GM_deleteValue(entry.key);
    GM_setValue(HISTORY_COUNT_KEY, Math.max(0, records.length - 1e3));
  }

  // ehpeek-uno-css:ehpeek:uno.css
  var ehpeek_uno_default = `/* layer: preflights */
*,::before,::after{--un-rotate:0;--un-rotate-x:0;--un-rotate-y:0;--un-rotate-z:0;--un-scale-x:1;--un-scale-y:1;--un-scale-z:1;--un-skew-x:0;--un-skew-y:0;--un-translate-x:0;--un-translate-y:0;--un-translate-z:0;--un-pan-x: ;--un-pan-y: ;--un-pinch-zoom: ;--un-scroll-snap-strictness:proximity;--un-ordinal: ;--un-slashed-zero: ;--un-numeric-figure: ;--un-numeric-spacing: ;--un-numeric-fraction: ;--un-border-spacing-x:0;--un-border-spacing-y:0;--un-ring-offset-shadow:0 0 rgb(0 0 0 / 0);--un-ring-shadow:0 0 rgb(0 0 0 / 0);--un-shadow-inset: ;--un-shadow:0 0 rgb(0 0 0 / 0);--un-ring-inset: ;--un-ring-offset-width:0px;--un-ring-offset-color:#fff;--un-ring-width:0px;--un-ring-color:rgb(147 197 253 / 0.5);--un-blur: ;--un-brightness: ;--un-contrast: ;--un-drop-shadow: ;--un-grayscale: ;--un-hue-rotate: ;--un-invert: ;--un-saturate: ;--un-sepia: ;--un-backdrop-blur: ;--un-backdrop-brightness: ;--un-backdrop-contrast: ;--un-backdrop-grayscale: ;--un-backdrop-hue-rotate: ;--un-backdrop-invert: ;--un-backdrop-opacity: ;--un-backdrop-saturate: ;--un-backdrop-sepia: ;}::backdrop{--un-rotate:0;--un-rotate-x:0;--un-rotate-y:0;--un-rotate-z:0;--un-scale-x:1;--un-scale-y:1;--un-scale-z:1;--un-skew-x:0;--un-skew-y:0;--un-translate-x:0;--un-translate-y:0;--un-translate-z:0;--un-pan-x: ;--un-pan-y: ;--un-pinch-zoom: ;--un-scroll-snap-strictness:proximity;--un-ordinal: ;--un-slashed-zero: ;--un-numeric-figure: ;--un-numeric-spacing: ;--un-numeric-fraction: ;--un-border-spacing-x:0;--un-border-spacing-y:0;--un-ring-offset-shadow:0 0 rgb(0 0 0 / 0);--un-ring-shadow:0 0 rgb(0 0 0 / 0);--un-shadow-inset: ;--un-shadow:0 0 rgb(0 0 0 / 0);--un-ring-inset: ;--un-ring-offset-width:0px;--un-ring-offset-color:#fff;--un-ring-width:0px;--un-ring-color:rgb(147 197 253 / 0.5);--un-blur: ;--un-brightness: ;--un-contrast: ;--un-drop-shadow: ;--un-grayscale: ;--un-hue-rotate: ;--un-invert: ;--un-saturate: ;--un-sepia: ;--un-backdrop-blur: ;--un-backdrop-brightness: ;--un-backdrop-contrast: ;--un-backdrop-grayscale: ;--un-backdrop-hue-rotate: ;--un-backdrop-invert: ;--un-backdrop-opacity: ;--un-backdrop-saturate: ;--un-backdrop-sepia: ;}

:root {
  --ehpeek-color-accent: #f0b35a;
  --ehpeek-color-border: #8d7454;
  --ehpeek-color-border-soft: rgba(255, 255, 255, 0.18);
  --ehpeek-color-border-subtle: rgba(255, 255, 255, 0.1);
  --ehpeek-color-accent-hover-bg: rgba(240, 179, 90, 0.12);
  --ehpeek-color-elevated: #3f4249;
  --ehpeek-color-item-hover: rgba(255, 255, 255, 0.08);
  --ehpeek-color-reader-text: #f3f3f3;
  --ehpeek-color-state-off: #8c8f96;
  --ehpeek-color-state-on: #4ec46a;
  --ehpeek-color-surface: #4f535b;
  --ehpeek-color-text: #f1f1f1;
  --ehpeek-control-action-min-height: 52px;
  --ehpeek-control-action-padding-x: 12px;
  --ehpeek-control-action-padding-y: 10px;
  --ehpeek-control-btn-padding-x: 10px;
  --ehpeek-control-btn-padding-y: 7px;
  --ehpeek-control-compact-padding-x: 8px;
  --ehpeek-control-compact-padding-y: 4px;
  --ehpeek-control-icon-size: 44px;
  --ehpeek-control-menu-item-min-height: 56px;
  --ehpeek-control-page-size: 34px;
  --ehpeek-control-primary-height: 87px;
  --ehpeek-control-primary-gap: 10px;
  --ehpeek-control-radius-pill: 999px;
  --ehpeek-control-radius-md: 4px;
  --ehpeek-control-radius-reader: 6px;
  --ehpeek-control-radius-sm: 3px;
  --ehpeek-control-reader-button-height: 40px;
  --ehpeek-control-reader-button-width: 46px;
  --ehpeek-control-tag-min-height: 51px;
  --ehpeek-control-toggle-dot-size: 10px;
  --ehpeek-control-toggle-dot-touch-size: 18px;
  --ehpeek-control-touch-min-height: 80px;
  --ehp-color-accent: #4da3ff;
  --ehp-color-border: rgba(15, 15, 15, 0.92);
  --ehp-color-foreground: #f3f3f3;
  --ehp-color-track: rgba(255, 255, 255, 0.34);
}


/* layer: shortcuts */
.control-primary-action{touch-action:manipulation;min-width:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--ehpeek-control-primary-gap);border-width:0px;background-color:transparent;padding-top:var(--ehpeek-control-action-padding-y);padding-bottom:var(--ehpeek-control-action-padding-y);padding-left:15px;padding-right:15px;text-align:center;color:var(--ehpeek-color-accent);text-transform:uppercase;}
.control-scroll-hidden{scrollbar-width:none;-ms-overflow-style:none;}
.control-touch-menu-item{box-sizing:border-box;display:block;width:100%;min-height:var(--ehpeek-control-menu-item-min-height);border-width:0px;border-bottom-width:1px;border-bottom-color:var(--ehpeek-color-border-subtle);background-color:transparent;padding-top:14px;padding-bottom:14px;padding-left:18px;padding-right:18px;text-align:left;color:var(--ehpeek-color-text);text-decoration:none;}
.control-scroll-hidden::-webkit-scrollbar{display:none;}
.control-action{min-height:var(--ehpeek-control-action-min-height);border-radius:var(--ehpeek-control-radius-sm);padding-top:var(--ehpeek-control-action-padding-y);padding-bottom:var(--ehpeek-control-action-padding-y);padding-left:var(--ehpeek-control-action-padding-x);padding-right:var(--ehpeek-control-action-padding-x);}
html[data-ehpeek-touch-ui="true"] .control-action,
html[data-ehpeek-touch-ui="true"] .control-btn{min-height:var(--ehpeek-control-touch-min-height);padding-top:18px;padding-bottom:18px;padding-left:26px;padding-right:26px;}
.control-icon{width:var(--ehpeek-control-icon-size);height:var(--ehpeek-control-icon-size);align-items:center;justify-content:center;}
.control-page{width:var(--ehpeek-control-page-size);height:var(--ehpeek-control-page-size);border-radius:var(--ehpeek-control-radius-md);}
html[data-ehpeek-touch-ui="true"] .control-page{width:38px;height:38px;border-radius:var(--ehpeek-control-radius-reader);}
.control-reader-btn{width:var(--ehpeek-control-reader-button-width);height:var(--ehpeek-control-reader-button-height);border-radius:var(--ehpeek-control-radius-reader);padding-left:var(--ehpeek-control-btn-padding-x);padding-right:var(--ehpeek-control-btn-padding-x);padding-top:0;padding-bottom:0;}
.control-tag{max-width:100%;min-height:var(--ehpeek-control-tag-min-height);display:inline-flex;align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:var(--ehpeek-control-radius-pill);padding-left:21px;padding-right:21px;text-decoration:none;}
.control-tag-group{min-height:34px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:var(--ehpeek-control-radius-pill);padding-top:7px;padding-bottom:7px;padding-left:10px;padding-right:10px;text-align:center;text-transform:lowercase;}
.color-btn{border-width:1px;border-color:var(--ehpeek-color-border);background-color:transparent;color:var(--ehpeek-color-accent);}
.color-tag{border-width:1px;border-color:var(--ehpeek-color-border);background-color:var(--ehpeek-color-surface);color:var(--ehpeek-color-accent);}
.color-border{border-color:var(--ehpeek-color-border);}
.color-button-reader{border-color:var(--ehpeek-color-border-soft);--un-bg-opacity:0.88;background-color:rgba(35, 35, 35, var(--un-bg-opacity));color:var(--ehpeek-color-reader-text);}
.color-search-swipe{--un-border-opacity:0.34;border-color:rgba(255, 255, 255, var(--un-border-opacity));--un-bg-opacity:0.88;background-color:rgba(64, 64, 64, var(--un-bg-opacity));--un-text-opacity:0.96;color:rgba(255, 255, 255, var(--un-text-opacity));--un-shadow:0 6px 20px var(--un-shadow-color, rgba(0, 0, 0, 0.42));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.color-border-subtle-b{border-bottom-color:var(--ehpeek-color-border-subtle);}
.control-btn{border-radius:var(--ehpeek-control-radius-sm);padding-top:var(--ehpeek-control-btn-padding-y);padding-bottom:var(--ehpeek-control-btn-padding-y);padding-left:var(--ehpeek-control-btn-padding-x);padding-right:var(--ehpeek-control-btn-padding-x);}
.control-compact{border-radius:var(--ehpeek-control-radius-md);padding-top:var(--ehpeek-control-compact-padding-y);padding-bottom:var(--ehpeek-control-compact-padding-y);padding-left:var(--ehpeek-control-compact-padding-x);padding-right:var(--ehpeek-control-compact-padding-x);}
.color-elevated{background-color:var(--ehpeek-color-elevated);--un-shadow:0 8px 24px var(--un-shadow-color, rgba(0, 0, 0, 0.38));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.color-panel-primary{background-color:var(--ehpeek-color-elevated);--un-shadow:0 2px 10px var(--un-shadow-color, rgba(0, 0, 0, 0.32));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
.color-reader-badge{--un-bg-opacity:0.34;background-color:rgba(15, 15, 15, var(--un-bg-opacity));}
.color-surface{background-color:var(--ehpeek-color-surface);}
.color-tag-group{--un-bg-opacity:1;background-color:rgb(91 63 95 / var(--un-bg-opacity));color:var(--ehpeek-color-accent);}
.color-btn:hover{background-color:var(--ehpeek-color-accent-hover-bg);}
.color-item-hover:hover{background-color:var(--ehpeek-color-item-hover);}
.textsize-lg,
html[data-ehpeek-touch-ui="true"] .textsize-md{font-size:26px;}
html[data-ehpeek-touch-ui="true"] .textsize-lg{font-size:30px;}
.textsize-md,
html[data-ehpeek-touch-ui="true"] .textsize-sm{font-size:20px;}
.textsize-sm,
html[data-ehpeek-touch-ui="true"] .textsize-xs{font-size:14px;}
.textsize-xs{font-size:11px;}
.color-accent{color:var(--ehpeek-color-accent);}
.color-reader-text{color:var(--ehpeek-color-reader-text);}
.color-text{color:var(--ehpeek-color-text);}
/* layer: default */
.\\[--progress-bar-fill\\:0\\%\\]{--progress-bar-fill:0%;}
.\\[--progress-bar-track-direction\\:to_right\\]{--progress-bar-track-direction:to right;}
.\\[-webkit-appearance\\:none\\]{-webkit-appearance:none;}
.\\[-webkit-user-drag\\:none\\]{-webkit-user-drag:none;}
.\\[accent-color\\:var\\(--ehp-color-foreground\\)\\]{accent-color:var(--ehp-color-foreground);}
.\\[appearance\\:none\\]{appearance:none;}
.\\[direction\\:ltr\\]{direction:ltr;}
.\\[touch-action\\:manipulation\\]{touch-action:manipulation;}
.\\[unicode-bidi\\:plaintext\\]{unicode-bidi:plaintext;}
.pointer-events-auto{pointer-events:auto;}
.\\[\\&\\[data-open\\=false\\]\\]\\:pointer-events-none[data-open=false],
.pointer-events-none{pointer-events:none;}
.visible{visibility:visible;}
.invisible{visibility:hidden;}
.absolute{position:absolute;}
.fixed{position:fixed;}
.relative{position:relative;}
.inset-0{inset:0;}
.bottom-\\[calc\\(12px\\+env\\(safe-area-inset-bottom\\,0px\\)\\)\\]{bottom:calc(12px + env(safe-area-inset-bottom,0px));}
.left-\\[max\\(12px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{left:max(12px,env(safe-area-inset-left,0px));}
.left-0{left:0;}
.left-1\\/2{left:50%;}
.right-\\[max\\(12px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{right:max(12px,env(safe-area-inset-right,0px));}
.right-0{right:0;}
.right-10px{right:10px;}
.right-24px{right:24px;}
.right-auto{right:auto;}
.top-\\[calc\\(100\\%\\+8px\\)\\]{top:calc(100% + 8px);}
.top-\\[calc\\(10px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(10px + env(safe-area-inset-top,0px));}
.top-\\[calc\\(62px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(62px + env(safe-area-inset-top,0px));}
.top-1\\/2{top:50%;}
.top-24px{top:24px;}
.top-48px{top:48px;}
.line-clamp-2{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;}
.line-clamp-3{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;}
.line-clamp-4{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;line-clamp:4;}
.z-\\[2147483640\\]{z-index:2147483640;}
.z-\\[2147483644\\]{z-index:2147483644;}
.z-\\[2147483645\\]{z-index:2147483645;}
.z-\\[2147483646\\]{z-index:2147483646;}
.z-\\[2147483647\\]{z-index:2147483647;}
.z-1{z-index:1;}
.z-2{z-index:2;}
.z-3{z-index:3;}
.z-4{z-index:4;}
.grid{display:grid;}
.grid-cols-\\[1fr_1fr\\]{grid-template-columns:1fr 1fr;}
.grid-cols-\\[36\\%_minmax\\(0\\,1fr\\)\\]{grid-template-columns:36% minmax(0,1fr);}
.grid-cols-\\[minmax\\(88px\\,28\\%\\)_minmax\\(0\\,1fr\\)\\]{grid-template-columns:minmax(88px,28%) minmax(0,1fr);}
.grid-cols-\\[repeat\\(3\\,minmax\\(0\\,1fr\\)\\)\\]{grid-template-columns:repeat(3,minmax(0,1fr));}
.m-0{margin:0;}
.mx-auto{margin-left:auto;margin-right:auto;}
.mb-0{margin-bottom:0;}
.mb-10px{margin-bottom:10px;}
.mb-12px{margin-bottom:12px;}
.ml-\\[max\\(14px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{margin-left:max(14px,env(safe-area-inset-left,0px));}
.mr-\\[max\\(14px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{margin-right:max(14px,env(safe-area-inset-right,0px));}
.mt--18px{margin-top:-18px;}
.mt-0{margin-top:0;}
.mt-1px{margin-top:1px;}
.mt-2px{margin-top:2px;}
.mt-4px{margin-top:4px;}
.mt-6px{margin-top:6px;}
.mt-auto{margin-top:auto;}
html[data-ehpeek-touch-ui="true"] .touch\\:mt-8px{margin-top:8px;}
.box-border{box-sizing:border-box;}
.block{display:block;}
.inline-block{display:inline-block;}
.contents{display:contents;}
.hidden{display:none;}
.aspect-\\[2\\/3\\]{aspect-ratio:2/3;}
.h-\\[2\\.4em\\]{height:2.4em;}
.h-\\[clamp\\(260px\\,42vh\\,340px\\)\\]{height:clamp(260px,42vh,340px);}
.h-\\[var\\(--ehpeek-control-toggle-dot-size\\)\\]{height:var(--ehpeek-control-toggle-dot-size);}
.h-\\[var\\(--ehpeek-frame-height\\)\\]{height:var(--ehpeek-frame-height);}
.h-\\[var\\(--ehpeek-page-height\\)\\]{height:var(--ehpeek-page-height);}
.h-108px{height:108px;}
.h-24px{height:24px;}
.h-34px{height:34px;}
.h-64px{height:64px;}
.h-full,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:h-full{height:100%;}
.h1{height:0.25rem;}
.max-h-full{max-height:100%;}
.max-h-screen{max-height:100vh;}
.max-w-\\[min\\(78vw\\,320px\\)\\]{max-width:min(78vw,320px);}
.max-w-\\[min\\(86vw\\,760px\\)\\]{max-width:min(86vw,760px);}
.max-w-full{max-width:100%;}
.max-w-none{max-width:none;}
.max-w-screen{max-width:100vw;}
.min-h-\\[var\\(--ehpeek-control-menu-item-min-height\\)\\]{min-height:var(--ehpeek-control-menu-item-min-height);}
.min-h-\\[var\\(--ehpeek-control-primary-height\\)\\]{min-height:var(--ehpeek-control-primary-height);}
.min-h-\\[var\\(--ehpeek-control-touch-min-height\\)\\]{min-height:var(--ehpeek-control-touch-min-height);}
.min-h-0,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:min-h-0{min-height:0;}
.min-h-56px{min-height:56px;}
.min-h-64px{min-height:64px;}
.min-h-full{min-height:100%;}
.min-w-0{min-width:0;}
.min-w-260px{min-width:260px;}
.min-w-285px{min-width:285px;}
.min-w-64px{min-width:64px;}
.w-\\[min\\(86vw\\,360px\\)\\]{width:min(86vw,360px);}
.w-\\[var\\(--ehpeek-control-toggle-dot-size\\)\\]{width:var(--ehpeek-control-toggle-dot-size);}
.w-\\[var\\(--ehpeek-frame-width\\)\\]{width:var(--ehpeek-frame-width);}
.w-24px{width:24px;}
.w-34px{width:34px;}
.w-42px{width:42px;}
.w-64px{width:64px;}
.w-auto,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:w-auto{width:auto;}
.w-full,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:w-full{width:100%;}
.w-max{width:max-content;}
html[data-ehpeek-touch-ui="true"] .touch\\:h-\\[var\\(--ehpeek-control-toggle-dot-touch-size\\)\\]{height:var(--ehpeek-control-toggle-dot-touch-size);}
html[data-ehpeek-touch-ui="true"] .touch\\:min-w-\\[min\\(92vw\\,520px\\)\\]{min-width:min(92vw,520px);}
html[data-ehpeek-touch-ui="true"] .touch\\:w-\\[var\\(--ehpeek-control-toggle-dot-touch-size\\)\\]{width:var(--ehpeek-control-toggle-dot-touch-size);}
.flex{display:flex;}
.inline-flex{display:inline-flex;}
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:flex-\\[0_0_100\\%\\]{flex:0 0 100%;}
.flex-none{flex:none;}
.flex-row,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:flex-row{flex-direction:row;}
.flex-col{flex-direction:column;}
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
.transform{transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.animate-spin{animation:spin 1s linear infinite;}
.cursor-default{cursor:default;}
.cursor-pointer{cursor:pointer;}
.cursor-grab{cursor:grab;}
.\\[\\&\\[data-dragging\\=true\\]\\]\\:cursor-grabbing[data-dragging=true]{cursor:grabbing;}
.active\\:cursor-grabbing:active{cursor:grabbing;}
.touch-pan-y{--un-pan-y:pan-y;touch-action:var(--un-pan-x) var(--un-pan-y) var(--un-pinch-zoom);}
.touch-none,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:touch-none{touch-action:none;}
.\\[\\&\\[data-dragging\\=true\\]\\]\\:select-none[data-dragging=true],
.select-none,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:select-none{-webkit-user-select:none;user-select:none;}
.resize{resize:both;}
.items-start{align-items:flex-start;}
.items-center,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:items-center{align-items:center;}
.self-center{align-self:center;}
.self-stretch{align-self:stretch;}
.justify-end{justify-content:flex-end;}
.justify-center{justify-content:center;}
.justify-between{justify-content:space-between;}
.justify-self-center{justify-self:center;}
.gap-10px,
html[data-ehpeek-touch-ui="true"] .touch\\:gap-10px{gap:10px;}
.gap-12px{gap:12px;}
.gap-16px{gap:16px;}
.gap-18px{gap:18px;}
.gap-4px{gap:4px;}
.gap-6px{gap:6px;}
.gap-8px{gap:8px;}
html[data-ehpeek-touch-ui="true"] .touch\\:gap-20px{gap:20px;}
.gap-x-18px{column-gap:18px;}
.gap-y-14px{row-gap:14px;}
.overflow-auto{overflow:auto;}
.overflow-hidden,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:overflow-hidden{overflow:hidden;}
.overflow-visible{overflow:visible;}
.overscroll-contain{overscroll-behavior:contain;}
.scroll-auto{scroll-behavior:auto;}
.text-ellipsis{text-overflow:ellipsis;}
.whitespace-normal{white-space:normal;}
.whitespace-nowrap{white-space:nowrap;}
.break-normal{overflow-wrap:normal;word-break:normal;}
.break-anywhere{overflow-wrap:anywhere;}
.border{border-width:1px;}
.border-0{border-width:0px;}
.border-3{border-width:3px;}
.border-4{border-width:4px;}
.border-b{border-bottom-width:1px;}
.border-l{border-left-width:1px;}
.border-\\[rgba\\(255\\,178\\,167\\,0\\.64\\)\\]{--un-border-opacity:0.64;border-color:rgba(255, 178, 167, var(--un-border-opacity));}
.border-\\[rgba\\(255\\,255\\,255\\,0\\.12\\)\\]{--un-border-opacity:0.12;border-color:rgba(255, 255, 255, var(--un-border-opacity));}
.border-\\[rgba\\(255\\,255\\,255\\,0\\.28\\)\\]{--un-border-opacity:0.28;border-color:rgba(255, 255, 255, var(--un-border-opacity));}
.border-current{border-color:currentColor;}
.border-t-\\[var\\(--ehpeek-color-accent\\)\\]{border-top-color:var(--ehpeek-color-accent);}
.rounded-\\[var\\(--ehpeek-control-radius-md\\)\\]{border-radius:var(--ehpeek-control-radius-md);}
.rounded-\\[var\\(--ehpeek-control-radius-pill\\)\\]{border-radius:var(--ehpeek-control-radius-pill);}
.rounded-\\[var\\(--ehpeek-control-radius-reader\\)\\]{border-radius:var(--ehpeek-control-radius-reader);}
.rounded-\\[var\\(--ehpeek-control-radius-sm\\)\\]{border-radius:var(--ehpeek-control-radius-sm);}
.rounded-22px{border-radius:22px;}
.rounded-4px{border-radius:4px;}
.rounded-6px{border-radius:6px;}
.rounded-full{border-radius:9999px;}
.border-solid{border-style:solid;}
.bg-\\[\\#070707\\]{--un-bg-opacity:1;background-color:rgb(7 7 7 / var(--un-bg-opacity));}
.bg-\\[\\#151515\\]{--un-bg-opacity:1;background-color:rgb(21 21 21 / var(--un-bg-opacity));}
.bg-\\[\\#34353b\\]{--un-bg-opacity:1;background-color:rgb(52 53 59 / var(--un-bg-opacity));}
.bg-\\[rgba\\(255\\,178\\,167\\,0\\.12\\)\\]{--un-bg-opacity:0.12;background-color:rgba(255, 178, 167, var(--un-bg-opacity));}
.bg-\\[var\\(--ehpeek-color-state-off\\)\\]{background-color:var(--ehpeek-color-state-off);}
.bg-\\[var\\(--ehpeek-color-state-on\\)\\]{background-color:var(--ehpeek-color-state-on);}
.bg-transparent{background-color:transparent;}
.object-contain{object-fit:contain;}
.object-center{object-position:center;}
.p-0,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:p-0{padding:0;}
.p-24px{padding:24px;}
.p-8px{padding:8px;}
.px{padding-left:1rem;padding-right:1rem;}
.px-\\[0\\.6em\\]{padding-left:0.6em;padding-right:0.6em;}
.px-\\[max\\(16px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{padding-left:max(16px,env(safe-area-inset-right,0px));padding-right:max(16px,env(safe-area-inset-right,0px));}
.px-0{padding-left:0;padding-right:0;}
.px-10px{padding-left:10px;padding-right:10px;}
.px-12px{padding-left:12px;padding-right:12px;}
.px-18px{padding-left:18px;padding-right:18px;}
.px-24px{padding-left:24px;padding-right:24px;}
.py-0{padding-top:0;padding-bottom:0;}
.py-14px{padding-top:14px;padding-bottom:14px;}
.py-18px{padding-top:18px;padding-bottom:18px;}
.py-4px{padding-top:4px;padding-bottom:4px;}
.py-56px{padding-top:56px;padding-bottom:56px;}
.py-6px{padding-top:6px;padding-bottom:6px;}
html[data-ehpeek-touch-ui="true"] .touch\\:px-26px{padding-left:26px;padding-right:26px;}
.pb-18px{padding-bottom:18px;}
.pb-48px{padding-bottom:48px;}
.pb-72px{padding-bottom:72px;}
.pb-8px{padding-bottom:8px;}
.pl-\\[max\\(16px\\,env\\(safe-area-inset-left\\,0px\\)\\)\\]{padding-left:max(16px,env(safe-area-inset-left,0px));}
.pr-\\[max\\(16px\\,env\\(safe-area-inset-right\\,0px\\)\\)\\]{padding-right:max(16px,env(safe-area-inset-right,0px));}
.pt-18px{padding-top:18px;}
.pt-28px{padding-top:28px;}
.pt-2px{padding-top:2px;}
.text-center{text-align:center;}
.text-left{text-align:left;}
.align-middle{vertical-align:middle;}
.text-13px{font-size:13px;}
.text-17px{font-size:17px;}
.text-18px{font-size:18px;}
.text-21px{font-size:21px;}
.text-22px{font-size:22px;}
.text-23px{font-size:23px;}
.text-24px{font-size:24px;}
.text-27px{font-size:27px;}
.text-28px{font-size:28px;}
.text-34px{font-size:34px;}
.text-52px{font-size:52px;}
.text-xl{font-size:1.25rem;line-height:1.75rem;}
html[data-ehpeek-touch-ui="true"] .touch\\:text-30px{font-size:30px;}
.text-\\[\\#111\\]{--un-text-opacity:1;color:rgb(17 17 17 / var(--un-text-opacity));}
.text-\\[\\#ffb2a7\\]{--un-text-opacity:1;color:rgb(255 178 167 / var(--un-text-opacity));}
.text-\\[\\#ffddd8\\]{--un-text-opacity:1;color:rgb(255 221 216 / var(--un-text-opacity));}
.text-\\[clamp\\(17px\\,4\\.6vw\\,25px\\)\\]{font-size:clamp(17px,4.6vw,25px);}
.text-\\[clamp\\(22px\\,5\\.9vw\\,32px\\)\\]{font-size:clamp(22px,5.9vw,32px);}
.text-\\[clamp\\(24px\\,6vw\\,42px\\)\\]{font-size:clamp(24px,6vw,42px);}
.text-\\[clamp\\(88px\\,25vw\\,180px\\)\\]{font-size:clamp(88px,25vw,180px);}
.text-\\[rgba\\(245\\,245\\,245\\,0\\.72\\)\\]{--un-text-opacity:0.72;color:rgba(245, 245, 245, var(--un-text-opacity));}
.font-300{font-weight:300;}
.font-400{font-weight:400;}
.font-600{font-weight:600;}
.font-700{font-weight:700;}
.font-850{font-weight:850;}
.leading-\\[1\\.1\\]{line-height:1.1;}
.leading-\\[1\\.15\\]{line-height:1.15;}
.leading-\\[1\\.2\\]{line-height:1.2;}
.leading-\\[1\\.3\\]{line-height:1.3;}
.leading-\\[1\\.4\\]{line-height:1.4;}
.leading-1{line-height:0.25rem;}
.font-inherit{font-family:inherit;}
.font-sans{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";}
.uppercase{text-transform:uppercase;}
.normal-case{text-transform:none;}
.no-underline{text-decoration:none;}
.hover\\:no-underline:hover{text-decoration:none;}
.active\\:no-underline:active{text-decoration:none;}
.\\[\\&\\[data-open\\=false\\]\\]\\:opacity-0[data-open=false]{opacity:0;}
.opacity-72{opacity:0.72;}
.opacity-78{opacity:0.78;}
.opacity-88{opacity:0.88;}
.shadow-none{--un-shadow:0 0 var(--un-shadow-color, rgb(0 0 0 / 0));box-shadow:var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);}
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
.landscape\\:top-\\[calc\\(54px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(54px + env(safe-area-inset-top,0px));}
.landscape\\:max-w-\\[calc\\(100vw-20px\\)\\]{max-width:calc(100vw - 20px);}
.landscape\\:min-w-0{min-width:0;}
.landscape\\:translate-x-0{--un-translate-x:0;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));}
.landscape\\:text-right{text-align:right;}
}
@media (orientation: landscape) and (pointer: coarse){
.coarse-landscape\\:right-8px{right:8px;}
.coarse-landscape\\:top-\\[calc\\(62px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(62px + env(safe-area-inset-top,0px));}
.coarse-landscape\\:max-w-\\[calc\\(100vw-16px\\)\\]{max-width:calc(100vw - 16px);}
}
@media (pointer: coarse){
.coarse\\:right-8px{right:8px;}
.coarse\\:top-\\[calc\\(72px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(72px + env(safe-area-inset-top,0px));}
.coarse\\:top-\\[calc\\(8px\\+env\\(safe-area-inset-top\\,0px\\)\\)\\]{top:calc(8px + env(safe-area-inset-top,0px));}
.coarse\\:h-60px{height:60px;}
.coarse\\:w-68px{width:68px;}
.coarse\\:rounded-8px{border-radius:8px;}
.coarse\\:px-16px{padding-left:16px;padding-right:16px;}
.coarse\\:text-15px{font-size:15px;}
.coarse\\:text-16px{font-size:16px;}
.coarse\\:text-18px{font-size:18px;}
.coarse\\:text-3xl{font-size:1.875rem;line-height:2.25rem;}
}`;

  // src/main.tsx
  var READER_WINDOW_SIZE = 10, UNO_STYLE_ID = "ehpeek-uno-style";
  if (ehpeek_uno_default && !document.getElementById(UNO_STYLE_ID)) {
    let style = document.createElement("style");
    style.id = UNO_STYLE_ID, style.textContent = ehpeek_uno_default, document.head.append(style);
  }
  function settingsMenuState() {
    return {
      readerEnabled: state.reader.enabled.value,
      enhanceThumbsGridsEnabled: enhanceThumbsGridsEnabled(),
      enhanceSearchGridsEnabled: state.search.enhance.value,
      touchUiEnabled: state.touch.enabled.value
    };
  }
  function applySettingsMenuState(next) {
    state.reader.enabled.set(next.readerEnabled), state.gallery.enhanceThumbs.set(next.enhanceThumbsGridsEnabled), state.search.enhance.set(next.enhanceSearchGridsEnabled), state.touch.enabled.set(next.touchUiEnabled), window.location.reload();
  }
  function continueReadingState() {
    if (pageType.type !== "gallery" || !state.reader.enabled.value)
      return null;
    let record = loadReaderHistory(pageType.galleryId, pageType.token), pageNum = record?.pageNum && record.pageNum > 0 ? record.pageNum : 1, totalPages = record?.totalPages ?? readShowingRange()?.total, detail = record && totalPages ? `${pageNum}/${totalPages}` : totalPages ? `${totalPages} ${texts_default.reader.pages}` : String(pageNum);
    return {
      info: {
        label: record ? texts_default.reader.continueReading : texts_default.reader.startReading,
        detail
      },
      onClick: () => {
        let page = collectGalleryPages2()[0];
        page && openReader(page.url, pageNum).catch(reportOpenError);
      }
    };
  }
  var pageType = extractPageType(), initialSettingsState = settingsMenuState();
  initialSettingsState.touchUiEnabled && (document.documentElement.dataset.ehpeekTouchUi = "true");
  var settingsMenuOpen = !1, settingsState = initialSettingsState, settingsMenuHost = document.createElement("div");
  document.body.append(settingsMenuHost);
  var galleryReadButtonMount, touchGalleryReadButtonMount = null, activeReader = null;
  function setSettingsMenuOpen(open) {
    settingsMenuOpen = open, installSettingsMenu();
  }
  function installSettingsMenu() {
    R(
      /* @__PURE__ */ k(
        SettingsMenu,
        {
          open: settingsMenuOpen,
          initState: settingsState,
          onApply: (next) => {
            settingsState = next, applySettingsMenuState(next);
          },
          onOpenChange: setSettingsMenuOpen
        }
      ),
      settingsMenuHost
    );
  }
  function openFullscreenReader(options) {
    activeReader?.close(), removePreviousReaderRoot();
    let host = document.createElement("div"), handle = null, close = () => {
      if (handle) {
        handle.close();
        return;
      }
      onClosed();
    }, onClosed = () => {
      R(/* @__PURE__ */ k(S, null), host), host.remove(), activeReader?.close === close && (activeReader = null);
    };
    host.dataset.ehpeekReaderContainer = "true", document.body.append(host), activeReader = { close }, R(
      /* @__PURE__ */ k(
        FullscreenReader,
        {
          options,
          handleRef: (nextHandle) => {
            handle = nextHandle;
          },
          onClosed
        }
      ),
      host
    );
  }
  function replaceGalleryPageBar2(currentIndex, maxIndex) {
    let mounts = replaceGalleryPageBarMounts(SCROLL_PAGE_BAR_TOP_CLASS, SCROLL_PAGE_BAR_BOTTOM_CLASS);
    for (let mount of mounts)
      R(
        /* @__PURE__ */ k(
          ScrollPageBar,
          {
            currentIndex,
            element: mount.element,
            maxIndex,
            top: mount.top,
            urlForIndex: previewUrlForIndex
          }
        ),
        mount.element
      );
  }
  function installContinueReadingButton() {
    let continueReading = continueReadingState();
    if (settingsState.touchUiEnabled && pageType.type === "gallery") {
      touchGalleryReadButtonMount && R(
        continueReading ? /* @__PURE__ */ k(ReadButton, { info: continueReading.info, onClick: continueReading.onClick, variant: "touchGallery" }) : /* @__PURE__ */ k(S, null),
        touchGalleryReadButtonMount
      );
      return;
    }
    !settingsState.touchUiEnabled && pageType.type === "gallery" && (galleryReadButtonMount ?? (galleryReadButtonMount = galleryContinueReadingButtonMountTarget())), galleryReadButtonMount && R(
      continueReading ? /* @__PURE__ */ k(ReadButton, { info: continueReading.info, onClick: continueReading.onClick, variant: "gallery" }) : /* @__PURE__ */ k(S, null),
      galleryReadButtonMount
    );
  }
  typeof GM_registerMenuCommand == "function" && GM_registerMenuCommand(texts_default.settings.openSettings, () => {
    setSettingsMenuOpen(!0);
  });
  installSettingsMenu();
  if (!settingsState.touchUiEnabled) {
    let target = settingsMenuMountTarget();
    if (target) {
      let mount = document.createElement("span");
      target.append(mount), R(
        /* @__PURE__ */ k(
          "a",
          {
            href: "#",
            className: "textsize-sm font-inherit",
            onClick: (event) => {
              event.preventDefault(), event.stopPropagation(), setSettingsMenuOpen(!0);
            }
          },
          texts_default.settings.menuLabel
        ),
        mount
      );
    }
  }
  if (settingsState.touchUiEnabled && !document.querySelector(".ehpeek-touch-top-bar")) {
    let info = readTouchTopBarInfo(TOUCH_TOP_BAR_MENU_ITEM_CLASS);
    if (info.available) {
      let mount = document.createElement("div");
      insertTouchTopBar(mount) || document.body.prepend(mount), R(
        /* @__PURE__ */ k(
          TouchTopBar,
          {
            info,
            onSettingsMenuOpen: () => {
              setSettingsMenuOpen(!0);
            }
          }
        ),
        mount
      );
    }
  }
  if (settingsState.touchUiEnabled && pageType.type === "gallery") {
    let touchGalleryInfo = readGalleryInfo(TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS, TOUCH_GALLERY_TAG_CLASS);
    if (touchGalleryInfo.available) {
      applyTouchGalleryPanelPageStyle();
      let mount = null;
      document.querySelector(".ehpeek-touch-gallery") || (mount = document.createElement("div"), insertTouchGalleryPanel(mount) || document.body.prepend(mount)), mount && R(
        /* @__PURE__ */ k(
          TouchGalleryPanel,
          {
            source: touchGalleryInfo,
            onPrimaryActionMount: (mount2) => {
              touchGalleryReadButtonMount = mount2, installContinueReadingButton();
            }
          }
        ),
        mount
      );
    }
  }
  installContinueReadingButton();
  if (pageType.type === "gallery") {
    let host = document.createElement("div");
    document.body.append(host), R(
      /* @__PURE__ */ k(
        EnhanceThumbsGrids,
        {
          enabled: settingsState.enhanceThumbsGridsEnabled,
          onError: reportOpenError,
          replaceGalleryPageBar: replaceGalleryPageBar2
        }
      ),
      host
    );
  }
  if (pageType.type === "search" && settingsState.enhanceSearchGridsEnabled) {
    let resultList = searchResultList();
    if (resultList && searchPageNavigation()) {
      let host = document.createElement("div");
      document.body.append(host), R(/* @__PURE__ */ k(EnhanceSearchGrids, { resultList }), host);
    }
  }
  async function openReader(startPageUrl, preferredPageNum) {
    if (!state.reader.enabled.value)
      return;
    let pageType2 = extractPageType();
    if (pageType2.type !== "gallery")
      return;
    let landingIndex = previewPageIndex(), landingPages = collectGalleryPages2(), pageSize = computePreviewPageSize(), maxPreviewIndex = maxPreviewPageIndex(), totalPages = readShowingRange()?.total, provider = new GalleryPageProvider(
      landingIndex,
      landingPages,
      pageSize,
      maxPreviewIndex,
      READER_WINDOW_SIZE,
      pullPreviewPage
    ), startUrl = normalizeUrl(startPageUrl), startPageNum = preferredPageNum ?? peekPageFromHash() ?? galleryPageNumber(startUrl);
    if (!startPageNum)
      throw new Error(texts_default.errors.imageNotFound);
    let pages = [landingPages.find((page) => page.pageNum === startPageNum || page.url === startUrl) ?? {
      url: startUrl,
      aspectRatio: 1.42,
      pageNum: startPageNum
    }], startIndex = 0, lastPageNum = startPageNum, historySession = new ReaderHistorySession({
      galleryId: pageType2.galleryId,
      token: pageType2.token,
      galleryUrl: previewUrlForIndex(landingIndex),
      totalPages
    });
    if (!state.reader.enabled.value) {
      historySession.dispose();
      return;
    }
    openFullscreenReader({
      pages,
      startIndex,
      renderWindowSize: READER_WINDOW_SIZE,
      preloadWindowSize: READER_WINDOW_SIZE,
      nearConcurrentLoads: 3,
      farConcurrentLoads: 6,
      totalPages,
      loadPage: loadEhImagePage,
      loadPages: (pageNums) => provider.loadDisplayPages(pageNums),
      onActivePageChange: (page) => {
        page.pageNum && (lastPageNum = page.pageNum, enhanceThumbsGridsEnabled() && replaceGalleryPageBar2(provider.previewIndexForPage(page.pageNum), maxPreviewIndex)), historySession.update(page.pageNum, totalPages), updatePeekLocation(page.pageNum, pageSize, maxPreviewIndex);
      },
      onExit: () => {
        historySession.dispose(), installContinueReadingButton();
        let exitIndex = lastPageNum ? provider.previewIndexForPage(lastPageNum) : landingIndex, galleryUrl = previewUrlForIndex(exitIndex);
        if (enhanceThumbsGridsEnabled()) {
          replaceGalleryPageBar2(exitIndex, maxPreviewIndex), navigateGalleryPreview(galleryUrl).catch(() => {
            window.location.replace(galleryUrl);
          });
          return;
        }
        exitIndex === landingIndex ? window.history.replaceState(window.history.state, "", galleryUrl) : window.location.replace(galleryUrl);
      },
      onDisableReader: () => {
        historySession.dispose(), state.reader.enabled.set(!1), installContinueReadingButton();
      }
    });
  }
  function reportOpenError(error) {
    let message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
    console.error("[ehpeek]", error), window.alert(message);
  }
  function onDocumentClick(event) {
    if (!state.reader.enabled.value)
      return;
    let link = findClickedImageLink2(event.target);
    link && (event.preventDefault(), event.stopPropagation(), openReader(link.href).catch(reportOpenError));
  }
  async function openReaderFromHash() {
    let peekPage = peekPageFromHash();
    if (peekPage === null)
      return;
    let pages = collectGalleryPages2(), page = pages.find((item) => item.pageNum === peekPage) ?? pages[0];
    page && await openReader(page.url).catch(reportOpenError);
  }
  pageType.type === "gallery" && (document.addEventListener("click", onDocumentClick, !0), state.reader.enabled.value && pageType.peekPage !== null && openReaderFromHash());
})();

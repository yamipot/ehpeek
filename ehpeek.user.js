// ==UserScript==
// @name         ehpeek: E-H/ExH viewer
// @namespace    ehpeek
// @version      260717.1606
// @description  A mobile-optimized E-H/ExH viewer
// @icon         https://raw.githubusercontent.com/yamipot/ehpeek/master/icon.svg
// @icon64       https://raw.githubusercontent.com/yamipot/ehpeek/master/icon.svg
// @match        *://e-hentai.org/*
// @match        *://exhentai.org/*
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
      openOriginalPage: "Open original image page",
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
    search: {
      showCategories: "Show Categories",
      hideCategories: "Hide Categories",
      history: "Search History",
      deleteHistory: "Delete search history item"
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
      enhance: persisted("ehpeek:enhance-search:enabled", !0),
      history: persisted("ehpeek:search:history", [])
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
      this.pinch = null;
      this.onDragStart = (event) => {
        this.drag?.canDrag && event.preventDefault();
      };
      this.onClick = (event) => {
        this.suppressClick && (this.suppressClick = !1, event.preventDefault(), event.stopPropagation());
      };
      this.onContextMenu = () => {
        this.drag?.active || (this.cancel(), this.clearPinch());
      };
      this.onPointerDown = (event) => {
        if (event.pointerType === "mouse" && event.button !== 0 || this.trackPinchPointerDown(event) || this.pinch || this.drag)
          return;
        let canDrag = this.callbacks.shouldCaptureDrag?.(event) ?? !0;
        (canDrag || (this.callbacks.shouldObserveTap?.(event) ?? !1)) && (this.start(event.pointerId, event.pointerType, event.clientX, event.clientY, event, canDrag), event.pointerType === "mouse" && this.addMouseListeners());
      };
      this.onMouseDown = (event) => {
        event.button !== 0 || typeof PointerEvent < "u" || this.drag || !(this.callbacks.shouldCaptureDrag?.(event) ?? !0) || (this.start(this.mousePointerId, "mouse", event.clientX, event.clientY, event, !0), this.addMouseListeners());
      };
      this.onPointerMove = (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || this.drag.pointerType === "mouse" || this.move(event.clientX, event.clientY, event);
      };
      this.onPointerUp = (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || (this.finish(event.clientX, event.clientY, event), this.releasePinchPointer(event));
      };
      this.onPointerCancel = (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || (this.finish(event.clientX, event.clientY, event, !0), this.releasePinchPointer(event));
      };
      this.onMouseMove = (event) => {
        !this.drag || this.drag.pointerType !== "mouse" || this.move(event.clientX, event.clientY, event);
      };
      this.onMouseUp = (event) => {
        !this.drag || this.drag.pointerType !== "mouse" || this.finish(event.clientX, event.clientY, event);
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
      this.setDragging(!1), target.addEventListener("pointerdown", this.onPointerDown), target.addEventListener("mousedown", this.onMouseDown), target.addEventListener("dragstart", this.onDragStart), target.addEventListener("click", this.onClick, !0), target.addEventListener("contextmenu", this.onContextMenu);
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
      if (!cancelled && !drag.active && isTap && this.callbacks.onTap?.({ ...info, startTarget: drag.startTarget }, event), drag.active) {
        if (cancelled) {
          this.callbacks.onEnd?.({ ...info, dx: 0, dy: 0, velocityY: 0 }, event);
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
      drag.active = !0, this.setDragging(!0), this.callbacks.onStart?.(
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
    releaseCapture(drag) {
      drag.captureTarget?.hasPointerCapture(drag.pointerId) && drag.captureTarget.releasePointerCapture(drag.pointerId);
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
    scroller.className = "w-full h-full overflow-auto overscroll-contain scroll-auto touch-pan-y cursor-grab scrollbar-hidden [&[data-dragging=true]]:cursor-grabbing [&[data-dragging=true]]:select-none [#ehpeek-reader[data-view-mode=paged]_&]:overflow-hidden [#ehpeek-reader[data-view-mode=paged]_&]:touch-none [#ehpeek-reader[data-view-mode=paged]_&]:select-none", scroller.tabIndex = -1, strip.className = "flex flex-col w-full min-h-full py-56px px-0 pb-72px [#ehpeek-reader[data-view-mode=paged]_&]:flex-row [#ehpeek-reader[data-view-mode=paged]_&]:w-auto [#ehpeek-reader[data-view-mode=paged]_&]:h-full [#ehpeek-reader[data-view-mode=paged]_&]:min-h-0 [#ehpeek-reader[data-view-mode=paged]_&]:p-0", scroller.append(strip);
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
        let placeholder = content.state === "error" ? errorPlaceholderDom(content.pageNum, text, options.onReloadPage) : placeholderDom(content, text);
        elements.frame.replaceChildren(placeholder);
      },
      setSize(elements, frameWidth, frameHeight) {
        elements.node.style.setProperty("--reader-page-height", `${frameHeight + 8}px`), elements.node.style.setProperty("--reader-frame-width", `${frameWidth}px`), elements.node.style.setProperty("--reader-frame-height", `${frameHeight}px`);
      }
    };
    return { element: scroller, scroller: createPagesScroller(scroller), slots };
  }
  function slotElements() {
    let node = document.createElement("section"), frame = document.createElement("div");
    return node.className = "ehpeek-page flex w-full h-[var(--reader-page-height)] items-start justify-center pb-sm [#ehpeek-reader[data-view-mode=paged]_&]:flex-[0_0_100%] [#ehpeek-reader[data-view-mode=paged]_&]:w-full [#ehpeek-reader[data-view-mode=paged]_&]:h-full [#ehpeek-reader[data-view-mode=paged]_&]:items-center [#ehpeek-reader[data-view-mode=paged]_&]:p-0", frame.className = "flex w-[var(--reader-frame-width)] h-[var(--reader-frame-height)] items-center justify-center overflow-hidden [#ehpeek-reader[data-view-mode=paged]_&]:w-full [#ehpeek-reader[data-view-mode=paged]_&]:h-full", node.append(frame), { node, frame };
  }
  function placeholderDom(content, text) {
    let placeholder = document.createElement("div");
    if (placeholder.className = "relative flex w-full h-full items-center justify-center bg-[var(--color-surface)] text-[var(--color-muted)] leading-1 text-center " + (content.kind === "end" ? "p-xl [direction:ltr] text-[clamp(24px,6vw,42px)] font-700 leading-[1.3] [unicode-bidi:plaintext]" : "text-[clamp(88px,25vw,180px)] desktop:text-[clamp(72px,10vw,140px)] font-mono font-850 [font-variant-numeric:tabular-nums]"), content.state === "loading") {
      let loading = document.createElement("span"), spinner = document.createElement("span"), pageNumber = document.createElement("span");
      return loading.className = "flex w-full h-full flex-col items-center justify-center gap-xl overflow-hidden", loading.setAttribute("aria-hidden", "true"), spinner.className = "block w-md h-md flex-none box-border animate-spin rounded-full border-4px border-solid ehp-color-spinner", pageNumber.className = "block max-w-full flex-none m-0 p-0 text-center leading-[1] whitespace-nowrap [direction:ltr] [unicode-bidi:plaintext]", pageNumber.textContent = text, placeholder.setAttribute("role", "status"), placeholder.setAttribute("aria-label", `${texts_default.reader.loading} ${text}`), loading.append(pageNumber, spinner), placeholder.append(loading), placeholder;
    }
    return placeholder.textContent = text, placeholder;
  }
  function errorPlaceholderDom(pageNum, text, onReloadPage) {
    let button = document.createElement("button"), icon = document.createElement("span"), placeholder = document.createElement("div"), message = document.createElement("div"), stop = (event) => {
      event.preventDefault(), event.stopPropagation();
    };
    return button.className = "inline-flex w-64px h-64px items-center justify-center border border-[var(--color-danger-border)] rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)] cursor-pointer font-sans text-34px font-700 leading-1 active:scale-96 [touch-action:manipulation]", button.type = "button", button.setAttribute("aria-label", texts_default.reader.reload), icon.setAttribute("aria-hidden", "true"), icon.textContent = "↻", button.append(icon), placeholder.className = "flex w-full h-full flex-col items-center justify-center gap-lg bg-[var(--color-surface)] p-xl text-[var(--color-danger)] text-center text-18px font-700 leading-1", message.className = "max-w-[min(86vw,760px)] break-anywhere [direction:ltr] [unicode-bidi:plaintext]", message.textContent = text, placeholder.append(message, button), button.addEventListener("pointerdown", stop), button.addEventListener("click", (event) => {
      stop(event), onReloadPage(pageNum);
    }), placeholder;
  }
  function pageImageDom(pageNum, slotImage) {
    let image = document.createElement("img");
    return image.className = "block w-[var(--reader-frame-width)] h-[var(--reader-frame-height)] object-contain select-none [-webkit-user-drag:none] [#ehpeek-reader[data-view-mode=paged]_&]:w-full [#ehpeek-reader[data-view-mode=paged]_&]:h-full", image.alt = `Page ${pageNum}`, image.decoding = "async", image.loading = "eager", image.draggable = !1, image.setAttribute("fetchpriority", slotImage.highPriority ? "high" : "low"), image.src = slotImage.imageUrl, slotImage.width && slotImage.height && (image.width = slotImage.width, image.height = slotImage.height), image;
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

  // src/components/Icon.tsx
  function Icon(props) {
    let definition = ICON_DEFINITIONS[props.name], filled = definition.solid || definition.fillable && props.filled, size = props.size ?? 24;
    return /* @__PURE__ */ k(
      "svg",
      {
        className: `ehpeek-icon block flex-none${props.className ? ` ${props.className}` : ""}`,
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: filled ? "currentColor" : "none",
        stroke: filled ? "none" : "currentColor",
        "stroke-width": props.strokeWidth ?? 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "data-icon-name": props.name,
        "aria-hidden": "true",
        focusable: "false"
      },
      definition.filledPaths?.map((path) => /* @__PURE__ */ k("path", { key: `filled-${path}`, d: path, fill: "currentColor", stroke: "none" })),
      definition.paths.map((path) => /* @__PURE__ */ k("path", { key: path, d: path }))
    );
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
    heart: {
      fillable: !0,
      paths: ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"]
    },
    home: {
      paths: ["m3 10.5 9-7.5 9 7.5", "M5.5 9v11h13V9", "M9.5 20v-6h5v6"]
    },
    menu: {
      paths: [
        "M12 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
      ],
      solid: !0
    },
    "panda-peek": {
      filledPaths: [
        "M7.2 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z",
        "M16.8 3.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z",
        "M7.6 9.8c.5-1.2 1.6-1.8 2.6-1.3s1.3 1.8.8 3-1.6 1.8-2.6 1.3-1.3-1.8-.8-3Z",
        "M13.8 8.5c1-.5 2.1.1 2.6 1.3s.2 2.5-.8 3-2.1-.1-2.6-1.3-.2-2.5.8-3Z",
        "M10.9 13.6c0-.6.5-.9 1.1-.9s1.1.3 1.1.9-.5 1-1.1 1-1.1-.4-1.1-1Z",
        "M5.2 13.7a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z",
        "M18.8 14.1a2.8 1.9 0 1 0 0 3.8 2.8 1.9 0 0 0 0-3.8Z"
      ],
      paths: [
        "M5 17c-.8-6.4 2.1-10.8 7-10.8s7.8 4.4 7 10.8",
        "M12 14.6v.7c0 .7-.6 1.2-1.3 1.2m1.3-1.2c0 .7.6 1.2 1.3 1.2",
        "M2 17h20"
      ]
    },
    search: {
      paths: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", "m16.2 16.2 4.3 4.3"]
    },
    settings: {
      paths: [
        "M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4A2 2 0 0 0 4 9.9l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z",
        "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      ]
    },
    star: {
      fillable: !0,
      paths: ["m12 2.75 2.85 5.77 6.37.93-4.61 4.49 1.09 6.34L12 17.24 6.3 20.23l1.09-6.34-4.61-4.49 6.37-.93Z"]
    }
  };

  // src/components/Misc.css
  var Misc_default = `.ehpeek-progress-bar::-webkit-slider-runnable-track {
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

  // src/components/Misc.tsx
  var PROGRESS_BAR_CLASS = "ehpeek-progress-bar", PROGRESS_BAR_CLASS_NAME = [
    PROGRESS_BAR_CLASS,
    "w-full h-[2.4em] px-[0.6em] py-0 m-0",
    "bg-transparent",
    "cursor-grab active:cursor-grabbing touch-none select-none",
    "[-webkit-appearance:none] [appearance:none]",
    "[--progress-bar-fill:0%] [--progress-bar-track-direction:to_right]",
    "[accent-color:var(--color-text)]"
  ].join(" ");
  registerGlobalStyle(PROGRESS_BAR_CLASS, Misc_default);
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
    "inline-flex min-w-48px h-48px items-center justify-center px-md py-0 rounded-md coarse:min-w-64px coarse:h-64px coarse:px-lg coarse:rounded-lg coarse:text-18px",
    "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer font-sans textsize-md font-700 leading-1 disabled:opacity-40 disabled:cursor-default"
  ].join(" "), READER_ICON_SIZE = "1.4em", DOWNLOAD_OPTION_CLASS = [
    "flex w-full min-h-lg flex-col items-start justify-center gap-xs px-lg py-md rounded-md",
    "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer text-left",
    "hover:bg-[var(--color-badge)] disabled:opacity-40 disabled:cursor-default"
  ].join(" ");
  function initialToolbarState() {
    return {
      controls: {
        mode: "scroll",
        readDirection: "rtl",
        rightTapAction: "previous"
      },
      downloadAvailable: !1,
      downloadDialog: null,
      open: !1,
      progress: {
        pageNum: 1,
        maxProgressPageNum: 1
      }
    };
  }
  function Toolbar(props) {
    let controls = props.state.controls, progress = props.state.progress, downloadDialog = props.state.downloadDialog, open = props.state.open, modeButton = modeButtonInfo(controls.mode), readDirectionButton = readDirectionButtonInfo(controls.readDirection), rightTapButton = rightTapButtonInfo(controls.rightTapAction);
    return /* @__PURE__ */ k(S, null, /* @__PURE__ */ k(
      "div",
      {
        className: "fixed z-3 flex justify-end pointer-events-none top-[calc(10px+env(safe-area-inset-top,0px))] right-10px coarse:top-[calc(8px+env(safe-area-inset-top,0px))] coarse:right-8px",
        onClick: stopEvent,
        onPointerDown: stopEvent,
        onWheel: stopEvent
      },
      /* @__PURE__ */ k("div", { className: `flex flex-row gap-md coarse:gap-lg pointer-events-auto${open ? "" : " !hidden"}` }, /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: READER_BUTTON_CLASS,
          title: rightTapButton.title,
          onClick: props.callbacks.onRightTapClick
        },
        rightTapButton.text
      ), /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: READER_BUTTON_CLASS,
          title: readDirectionButton.title,
          onClick: props.callbacks.onReadDirectionClick
        },
        /* @__PURE__ */ k(Icon, { name: readDirectionButton.icon, size: READER_ICON_SIZE })
      ), /* @__PURE__ */ k("button", { type: "button", className: READER_BUTTON_CLASS, title: modeButton.title, onClick: props.callbacks.onModeClick }, /* @__PURE__ */ k(Icon, { name: modeButton.icon, size: READER_ICON_SIZE })), /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: READER_BUTTON_CLASS,
          disabled: !props.state.downloadAvailable,
          title: texts_default.reader.download,
          onClick: props.callbacks.onDownloadClick
        },
        /* @__PURE__ */ k(Icon, { name: "download", size: READER_ICON_SIZE })
      ), /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: READER_BUTTON_CLASS,
          title: texts_default.reader.openOriginalPage,
          onClick: props.callbacks.onOpenOriginalPageClick
        },
        /* @__PURE__ */ k(Icon, { name: "external-link", size: READER_ICON_SIZE })
      ), /* @__PURE__ */ k("button", { type: "button", className: READER_BUTTON_CLASS, title: texts_default.reader.close, onClick: props.callbacks.onCloseClick }, /* @__PURE__ */ k(Icon, { name: "close", size: READER_ICON_SIZE })))
    ), /* @__PURE__ */ k(
      "div",
      {
        className: "fixed z-3 pointer-events-none top-[calc(70px+env(safe-area-inset-top,0px))] left-1/2 right-auto -translate-x-1/2 coarse:top-[calc(80px+env(safe-area-inset-top,0px))] landscape:top-[calc(62px+env(safe-area-inset-top,0px))] landscape:left-auto landscape:right-10px landscape:translate-x-0 coarse-landscape:top-[calc(74px+env(safe-area-inset-top,0px))] coarse-landscape:right-8px min-w-64px landscape:min-w-0 max-w-none landscape:max-w-[calc(100vw-20px)] coarse-landscape:max-w-[calc(100vw-16px)] py-xs px-md rounded-md bg-[var(--color-badge)] ehp-color-text font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap text-center landscape:text-right",
        hidden: controls.mode === "scroll" && !open
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
    ), downloadDialog ? /* @__PURE__ */ k(
      "div",
      {
        className: "fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65 pointer-events-auto",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": texts_default.reader.download,
        onClick: (event) => {
          event.stopPropagation(), event.target === event.currentTarget && props.callbacks.onDownloadDialogClose();
        },
        onPointerDown: stopEvent,
        onWheel: stopEvent
      },
      /* @__PURE__ */ k("div", { className: "w-full max-w-420px p-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] shadow-xl" }, /* @__PURE__ */ k("div", { className: "flex items-center justify-between gap-md mb-lg" }, /* @__PURE__ */ k("div", { className: "font-sans textsize-lg font-700" }, `${texts_default.reader.download} · ${downloadDialog.pageNum}`), /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: READER_BUTTON_CLASS,
          title: texts_default.reader.close,
          "aria-label": texts_default.reader.close,
          onClick: props.callbacks.onDownloadDialogClose
        },
        /* @__PURE__ */ k(Icon, { name: "close", size: READER_ICON_SIZE })
      )), /* @__PURE__ */ k("div", { className: "grid gap-md font-sans textsize-md" }, /* @__PURE__ */ k("button", { type: "button", className: DOWNLOAD_OPTION_CLASS, onClick: props.callbacks.onDownloadCurrentClick }, /* @__PURE__ */ k("span", { className: "font-700" }, texts_default.reader.downloadDisplayedImage), /* @__PURE__ */ k("span", { className: "max-w-full overflow-hidden text-ellipsis whitespace-nowrap textsize-sm opacity-75" }, downloadDialog.currentFileName)), /* @__PURE__ */ k(
        "button",
        {
          type: "button",
          className: DOWNLOAD_OPTION_CLASS,
          disabled: !downloadDialog.originalImageUrl,
          onClick: props.callbacks.onDownloadOriginalClick
        },
        /* @__PURE__ */ k("span", { className: "font-700" }, texts_default.reader.downloadOriginalImage),
        /* @__PURE__ */ k("span", { className: "textsize-sm opacity-75" }, downloadDialog.originalImageUrl ? texts_default.reader.originalImageSource : texts_default.reader.originalImageUnavailable)
      )))
    ) : null);
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

  // src/components/Reader/ZoomOverlay.tsx
  var MIN_SCALE = 1, MAX_SCALE = 5, CLOSE_SCALE = 1.02;
  function createZoomOverlayDom() {
    let element = document.createElement("div"), image = document.createElement("img");
    return element.className = "fixed inset-0 z-4 flex items-center justify-center overflow-hidden ehp-color-reader pointer-events-none", element.hidden = !0, element.style.display = "none", image.className = "block max-w-screen max-h-screen object-contain origin-center select-none will-change-transform [-webkit-user-drag:none]", element.append(image), {
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

  // src/components/Reader/index.css
  var Reader_default = `#ehpeek-reader,
#ehpeek-reader * {
  box-sizing: border-box;
}
`;

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
      return registerGlobalStyle(STYLE_ID, Reader_default), document.documentElement.style.overflow = "hidden", document.body.style.overflow = "hidden", () => {
        document.documentElement.style.overflow = previousDocumentOverflow, document.body.style.overflow = previousBodyOverflow;
      };
    }, []), /* @__PURE__ */ k(
      "div",
      {
        id: VIEWER_ID,
        className: "fixed inset-0 z-reader ehp-color-reader font-sans text-13px leading-[1.4]",
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
      this.galleryId = options.galleryId, this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : void 0, this.renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
      for (let [index, page] of options.pages.entries()) {
        let pageNum = pageNumForPage(page, index);
        this.pages.set(pageNum, {
          ...page,
          aspectRatio: normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO2),
          pageNum
        });
      }
      let startIndex = clamp(options.startIndex, 0, Math.max(0, options.pages.length - 1));
      this.currentPageNum = pageNumForPage(options.pages[startIndex], startIndex), this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE, this.loadPages = options.loadPages, this.onExit = options.onExit, this.onActivePageChange = options.onActivePageChange, this.onOpenOriginalPage = options.onOpenOriginalPage, this.closeComponent = bindings.close, this.isDragging = bindings.isDragging, this.setRootComponentState = bindings.setRootState, this.setToolbarComponentState = bindings.setToolbarState, this.toolbarState = initialToolbarState(), this.rootState = {
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
        onDownloadClick: () => this.openDownloadDialog(),
        onDownloadCurrentClick: () => this.downloadDisplayedImage(),
        onDownloadDialogClose: () => this.closeDownloadDialog(),
        onDownloadOriginalClick: () => this.downloadOriginalImage(),
        onOpenOriginalPageClick: () => this.openOriginalPage(),
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
      this.closed || (this.loadedImages.set(target.pageNum, {
        pageNum: target.pageNum,
        imageUrl,
        originalImageUrl: loaded.originalImageUrl ?? null,
        width,
        height
      }), this.viewport.setPageImage(target.pageNum, token, { imageUrl, highPriority: target.pageNum === this.currentPageNum, width, height }, image), target.pageNum === this.currentPageNum && this.updatePageNumber());
    }
    updatePageNumber() {
      this.toolbarState = {
        ...this.toolbarState,
        downloadAvailable: this.loadedImages.has(this.currentPageNum),
        downloadDialog: this.toolbarState.downloadDialog?.pageNum === this.currentPageNum ? this.toolbarState.downloadDialog : null,
        progress: {
          pageNum: this.currentPageNum,
          totalPages: this.totalPages,
          maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
          keepInputValue: this.progressNavigating
        }
      }, this.setToolbarComponentState(this.toolbarState);
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
      if (this.toolbarState.downloadDialog) {
        this.closeDownloadDialog();
        return;
      }
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
    openDownloadDialog() {
      let image = this.loadedImages.get(this.currentPageNum);
      if (!image || !this.isRealPageNum(this.currentPageNum))
        return;
      let downloadDialog = {
        currentFileName: displayedImageFileName(this.galleryId, this.currentPageNum, image.imageUrl),
        currentImageUrl: image.imageUrl,
        originalImageUrl: image.originalImageUrl,
        pageNum: this.currentPageNum
      };
      this.toolbarState = { ...this.toolbarState, downloadDialog }, this.setToolbarComponentState(this.toolbarState);
    }
    closeDownloadDialog() {
      this.toolbarState.downloadDialog && (this.toolbarState = { ...this.toolbarState, downloadDialog: null }, this.setToolbarComponentState(this.toolbarState));
    }
    downloadDisplayedImage() {
      let download = this.toolbarState.downloadDialog;
      download && startImageDownload(download.currentImageUrl, download.currentFileName) && this.closeDownloadDialog();
    }
    downloadOriginalImage() {
      let originalImageUrl = this.toolbarState.downloadDialog?.originalImageUrl;
      originalImageUrl && startImageDownload(originalImageUrl) && this.closeDownloadDialog();
    }
    openOriginalPage() {
      let page = this.pages.get(this.currentPageNum);
      !page || !this.isRealPageNum(this.currentPageNum) || !this.onOpenOriginalPage || this.onOpenOriginalPage(page);
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
        ...name ? { name } : {},
        onerror: (error) => {
          console.error("[ehpeek]", error), window.alert(texts_default.errors.downloadFailed);
        }
      }), !0;
    } catch (error) {
      return console.error("[ehpeek]", error), window.alert(texts_default.errors.downloadFailed), !1;
    }
  }
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
  function pointerTypeForEvent(event) {
    return "pointerType" in event ? event.pointerType : "mouse";
  }

  // src/components/SettingsMenu.tsx
  var SETTINGS_ACTION_BUTTON_CLASS = "block w-full min-h-lg py-sm px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98", SETTINGS_APPLY_BUTTON_COLOR = "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-background)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108", SETTINGS_CLOSE_BUTTON_COLOR = "border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]", SETTINGS_DOT_CLASS = "block flex-none w-10px h-10px touch:w-18px touch:h-18px rounded-full";
  function SwitchButton(props) {
    let [initialChecked, labelOn, labelOff] = props.checked, [checked, setChecked] = d2(initialChecked), setValue = (value) => {
      setChecked(value), props.onChange(value);
    };
    return /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: "flex w-full min-h-lg touch:min-h-xl items-center justify-between gap-lg touch:gap-xl py-md px-md touch:py-lg rounded-xs border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text ehp-color-site-item-hover cursor-pointer font-inherit text-left textsize-lg",
        onClick: (event) => {
          event.stopPropagation(), setValue(!checked);
        }
      },
      /* @__PURE__ */ k("span", null, checked ? labelOn : labelOff),
      /* @__PURE__ */ k("span", { className: `${SETTINGS_DOT_CLASS} ${checked ? "bg-[var(--color-state-on)]" : "bg-[var(--color-state-off)]"}` })
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
    }, [props.open]), props.open ? /* @__PURE__ */ k("div", { ref: menuRef, className: "ehpeek-settings-menu fixed top-24px right-24px z-overlay min-w-260px p-sm border ehp-color-site-border rounded-sm ehp-color-site-elevated ehp-color-site-text textsize-lg leading-[1.2]" }, /* @__PURE__ */ k(
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
    ), /* @__PURE__ */ k("div", { className: "ehpeek-settings-actions grid grid-cols-2 gap-sm mt-md pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]" }, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-settings-apply ${SETTINGS_ACTION_BUTTON_CLASS} ${SETTINGS_APPLY_BUTTON_COLOR}`,
        onClick: (event) => {
          event.stopPropagation(), props.onApply({ ...draft });
        }
      },
      texts_default.settings.apply
    ), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-settings-close ${SETTINGS_ACTION_BUTTON_CLASS} ${SETTINGS_CLOSE_BUTTON_COLOR}`,
        onClick: (event) => {
          event.stopPropagation(), close();
        }
      },
      texts_default.settings.close
    ))) : /* @__PURE__ */ k(S, null);
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
  font-size: 14px !important;
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
  font-size: 23px !important;
  line-height: 1.5 !important;
}

/* Enlarge comment bodies while allowing long content to wrap safely. */
#cdiv .c6 {
  font-size: 23px !important;
  line-height: 1.5 !important;
  overflow-wrap: anywhere;
}

/* Keep comment metadata and form hints visually secondary to comment bodies. */
#cdiv .c3,
#cdiv .c4,
#cdiv .c5,
#cdiv .c7,
#formdiv {
  font-size: 18px !important;
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
  font-size: 20px;
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
  font-size: 23px !important;
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
  font-size: 20px !important;
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
  var TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID = "ehpeek-touch-gallery-page-rearrange-style", TOUCH_FAVORITES_PAGE_CLASS_NAME = "!min-w-0 !max-w-full !overflow-x-hidden", TOUCH_FAVORITES_CONTENT_CLASS_NAME = "box-border !min-w-0 !w-full !max-w-full !overflow-x-hidden", TOUCH_FAVORITES_NAV_CLASS_NAME = "box-border !max-w-full overflow-x-auto", TOUCH_FAVORITES_RESULTS_CLASS_NAME = "ehpeek-touch-favorites-results box-border !min-w-0 !w-full !max-w-full overflow-x-auto", TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME = "!min-w-0 !w-full !max-w-full", TOUCH_FAVORITES_CATEGORIES_CLASS_NAME = "box-border !grid !h-auto !w-full !max-w-full grid-cols-[repeat(5,minmax(0,1fr))] !p-0", TOUCH_FAVORITES_CATEGORY_CLASS_NAME = "!static !float-none !w-full !m-0", TOUCH_FAVORITES_ALL_CATEGORY_CLASS_NAME = "!col-span-full !w-[140px] justify-self-center";
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
    let match = (root.querySelector(".gpc")?.textContent ?? "").match(/([\d,]+)\s*-\s*([\d,]+)\D+([\d,]+)/);
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
  function searchTopNavigationBar(root = document) {
    return searchNavigationBars(root)[0] ?? null;
  }
  function readTouchSearchPanelInfo(root = document) {
    let searchBox = root.querySelector("#searchbox"), categories = searchBox?.querySelector("form > table"), optionLinks = searchBox?.querySelector("#advdiv")?.previousElementSibling, searchInput = searchBox?.querySelector("#f_search"), searchControls = searchInput?.parentElement, searchSubmit = searchControls?.querySelector(
      "input[type='submit'], button[type='submit']"
    ), clearButton = searchControls?.querySelector(
      "input[type='button'], button[type='button']"
    );
    if (!searchBox || !categories || !searchInput || !(optionLinks instanceof HTMLElement) || !searchSubmit || !clearButton)
      return null;
    let categoryToggleMount = document.createElement("span"), searchActionMount = document.createElement("span"), clearActionMount = document.createElement("span"), historyMount = document.createElement("span");
    return categoryToggleMount.className = "contents", searchActionMount.className = "contents", clearActionMount.className = "contents", historyMount.className = "contents", {
      categories,
      categoryToggleMount,
      clearActionMount,
      clearButton,
      clearLabel: searchActionLabel(clearButton),
      fileSearch: root.querySelector("#fsdiv"),
      historyMount,
      optionLinks,
      searchActionMount,
      searchBox,
      searchInput,
      searchLabel: searchActionLabel(searchSubmit),
      searchSubmit
    };
  }
  function prepareTouchSearchPanel(info, optionClassName) {
    let form = info.searchBox.querySelector("form"), searchInput = form?.querySelector("#f_search"), searchControls = searchInput?.parentElement, advancedPanel = form?.querySelector("#advdiv");
    info.searchBox.className = "box-border !w-full !m-0 !p-0 !border-0 !text-left !text-20px [&_.searchadv]:box-border [&_.searchadv]:!w-full [&_.searchadv]:!pt-md [&_.searchadv]:!textsize-md [&_.searchadv>div]:!flex-wrap [&_.searchadv>div]:!justify-start [&_.searchadv>div]:!gap-sm [&_.searchadv>div>div]:!p-sm", form && (form.removeAttribute("style"), form.className = "flex w-full flex-col gap-md m-0 p-0"), info.categories.className = "hidden !w-full !m-0 border-collapse", info.categories.hidden = !0, info.optionLinks.insertAdjacentElement("afterend", info.categories), info.categories.tBodies[0]?.classList.add("flex", "flex-wrap", "gap-xs");
    for (let row of Array.from(info.categories.rows)) {
      row.className = "contents";
      for (let cell of Array.from(row.cells))
        cell.className = "!p-0";
    }
    for (let category of Array.from(info.categories.querySelectorAll("[id^='cat_']"))) {
      let colorClass = Array.from(category.classList).find((className) => /^ct(?:[1-9a])$/.test(className));
      category.className = `${colorClass ? `${colorClass} ` : ""}flex box-border w-auto min-w-104px !h-lg items-center justify-center px-md border rounded-md text-white text-center textsize-md font-700 leading-[1.15] whitespace-nowrap shadow-[0_2px_6px_var(--color-shadow-control)] cursor-pointer select-none transition-opacity [touch-action:manipulation] active:opacity-70 [&[data-disabled]]:opacity-40`;
    }
    searchControls && (searchControls.className = "grid w-full grid-cols-[minmax(0,1fr)_60px_60px] items-start gap-0 !p-0 [&>*:nth-child(n+4)]:col-span-full"), searchInput && (searchInput.className = "appearance-none !box-border !w-full !h-60px min-w-0 col-span-full row-start-1 !m-0 !py-0 !pl-lg !pr-[132px] border ehp-color-site-border rounded-md bg-[var(--color-site-elevated)] ehp-color-site-text text-22px leading-[1.2] outline-none focus:border-[var(--color-site-accent)] focus:bg-[var(--color-site-elevated)] focus:shadow-[0_0_0_3px_var(--color-site-accent-hover)]"), info.searchSubmit.replaceWith(info.searchActionMount), info.clearButton.replaceWith(info.clearActionMount), document.body.append(info.historyMount), info.optionLinks.prepend(info.categoryToggleMount), info.optionLinks.className = "flex w-full flex-wrap items-center justify-start gap-x-md gap-y-sm !p-0 !text-0";
    for (let link of Array.from(info.optionLinks.querySelectorAll("a")))
      link.className = optionClassName;
    advancedPanel && (advancedPanel.className = "box-border w-full !p-0 ehp-color-site-text"), info.fileSearch && (info.fileSearch.style.removeProperty("margin-top"), info.fileSearch.className = "box-border !w-full !m-0 !mt-0 p-lg border ehp-color-site-border rounded-md bg-[var(--color-site-elevated)] ehp-color-site-text !textsize-md text-left [&_form]:flex [&_form]:flex-col [&_form]:gap-sm [&_form>div]:!p-0 [&_.searchadv>div]:!flex-wrap [&_.searchadv>div]:!justify-start [&_.searchadv>div]:!gap-sm [&_.searchadv>div>div]:!p-sm");
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
    replaceFirstElement("#rangebar", doc), replaceFirstElement(".searchtext", doc), replaceSearchRangeScript(doc), replaceSearchNavigationBars(doc);
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
  function applySiteTheme() {
    document.documentElement.dataset.ehpeekSite = window.location.hostname.endsWith("exhentai.org") ? "exhentai" : "e-hentai";
  }
  function applyTouchGalleryPanelPageStyle() {
    if (document.getElementById(TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID))
      return;
    let style = document.createElement("style");
    style.id = TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID, style.textContent = galleryRearrange_default, document.head.append(style);
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
    let categories = document.querySelector(".ido > .nosel");
    if (categories) {
      categories.classList.add(...TOUCH_FAVORITES_CATEGORIES_CLASS_NAME.split(" "));
      for (let child of Array.from(categories.children))
        child.classList.contains("fp") ? (child.classList.add(...TOUCH_FAVORITES_CATEGORY_CLASS_NAME.split(" ")), child.children.length === 0 && child.classList.add(...TOUCH_FAVORITES_ALL_CATEGORY_CLASS_NAME.split(" "))) : child.children.length === 0 && child.classList.add("!hidden");
    }
    for (let navigation of searchNavigationBars())
      navigation.classList.add(...TOUCH_FAVORITES_NAV_CLASS_NAME.split(" "));
    let resultList = searchResultList();
    resultList?.classList.add(...TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME.split(" "));
    let existingWrapper = resultList?.parentElement?.classList.contains("ehpeek-touch-favorites-results") ? resultList.parentElement : null, content = existingWrapper?.parentElement ?? resultList?.parentElement;
    if (resultList?.closest(".ido")?.classList.add(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" ")), content?.classList.add(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" ")), !resultList || existingWrapper)
      return;
    let wrapper = document.createElement("div");
    wrapper.className = TOUCH_FAVORITES_RESULTS_CLASS_NAME, resultList.replaceWith(wrapper), wrapper.append(resultList);
  }
  function insertTouchTopBar(topBar) {
    let original = document.querySelector("#nb");
    return original?.parentElement ? (original.replaceWith(topBar), !0) : !1;
  }
  function insertTouchSearchPanel(panel) {
    let original = document.querySelector("#searchbox");
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
      summary,
      actions: readGalleryActionsDom(actionMenuItemClassName),
      rating: readGalleryRatingInfo(),
      tagGroups: readGalleryTagGroups()
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
  function readGalleryCategoryAppearance() {
    let category = document.querySelector("#gdc"), categoryStyleElement = category?.querySelector("[class*='ct']") ?? category, style = categoryStyleElement ? window.getComputedStyle(categoryStyleElement) : null;
    return {
      backgroundColor: style?.backgroundColor ?? "",
      color: style?.color ?? ""
    };
  }
  function readGalleryRatingInfo() {
    let label = textOf("#rating_label"), count = textOf("#rating_count"), script = galleryRatingScript(), value = scriptNumberValue(script, "display_rating");
    return !label || value === null ? null : { count, label, value };
  }
  function galleryRatingScript() {
    return Array.from(document.scripts).map((item) => item.textContent ?? "").find((text) => text.includes("display_rating")) ?? "";
  }
  function scriptNumberValue(script, name) {
    let match = script.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`)), value = Number(match?.[1]);
    return match && Number.isFinite(value) ? value : null;
  }
  function setGalleryRating(value) {
    let rating = Math.round(value * 2);
    if (rating < 1 || rating > 10)
      throw new RangeError("Gallery rating must be between 0.5 and 5 stars.");
    let area = document.querySelectorAll('map[name="rating"] area')[rating - 1];
    if (!area)
      throw new Error("Gallery rating action is unavailable.");
    area.click();
  }
  function readGalleryActionsDom(actionMenuItemClassName) {
    return Array.from(document.querySelectorAll("#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']")).map((item) => {
      let clone = item.cloneNode(!1);
      return clone.removeAttribute("id"), clone.removeAttribute("style"), clone.className = actionMenuItemClassName, clone instanceof HTMLInputElement || (clone.textContent = item.textContent?.trim() || item.getAttribute("title")?.trim() || item.getAttribute("aria-label")?.trim() || ""), clone;
    }).slice(0, 6);
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
  function readGalleryTag(tag) {
    let label = tag.textContent?.trim() || tag.getAttribute("ehs-tag")?.trim() || tag.title.trim();
    if (!label || !tag.href)
      return null;
    let container = tag.closest("div.gt, div.gtl, div.gtw") ?? tag, tagStyle = window.getComputedStyle(tag), containerStyle = window.getComputedStyle(container), content = document.createElement("span");
    return content.className = "contents", content.append(...Array.from(tag.childNodes, (node) => node.cloneNode(!0))), {
      appearance: {
        backgroundColor: containerStyle.backgroundColor,
        borderColor: containerStyle.borderColor,
        color: tagStyle.color
      },
      content,
      href: tag.href,
      label
    };
  }
  function readGalleryFavoriteInfo() {
    let label = textOf("#favoritelink"), iconTitle = document.querySelector("#fav [title]")?.getAttribute("title")?.trim() ?? "", text = label || iconTitle, favorited = /^favorites?\s+\d+/i.test(text);
    return {
      actionUrl: galleryFavoriteActionUrl(),
      favorited,
      label: favorited ? text : "Not Favorited"
    };
  }
  function parseGalleryFavoriteOptions(doc, favorited) {
    return Array.from(doc.querySelectorAll("input[name='favcat']")).map((input) => ({
      label: input.closest("div[style*='height']")?.textContent?.trim().replace(/\s+/g, " ") || input.value,
      selected: favorited && input.checked,
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
  function numericAttribute(element, attribute) {
    let value = Number(element?.getAttribute(attribute) || "");
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  // src/components/Enhance/Misc.tsx
  function ReadButton(props) {
    let buttonClassName = props.variant === "touchGallery" ? "ehpeek-continue-reading ehpeek-touch-gallery-primary-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-xl font-700" : "ehpeek-continue-reading block box-border w-full max-w-full mt-xs min-h-sm py-xs px-sm rounded-sm border ehp-color-site-border bg-transparent ehp-color-site-accent hover:bg-[var(--color-site-accent-hover)] shadow-none cursor-pointer text-center font-sans textsize-md font-700 leading-[1.15]", detailClassName = props.variant === "touchGallery" ? "ehpeek-continue-reading-page block mt-2px ehp-color-site-accent textsize-md font-600 opacity-78 normal-case" : "ehpeek-continue-reading-page block mt-1px opacity-72 textsize-sm font-600";
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
        className: "ehpeek-swipe-indicator fixed top-1/2 z-overlay flex w-42px h-108px items-center justify-center border border-[var(--color-site-swipe-border)] rounded-full bg-[var(--color-site-swipe-background)] text-[var(--color-site-text)] shadow-[0_6px_20px_var(--color-shadow-floating)] pointer-events-none select-none transition-opacity duration-120 ease-in-out",
        "aria-hidden": "true",
        style: {
          backdropFilter: "blur(8px)",
          display: "none",
          opacity: "0",
          transform: "translate(42px, -50%)"
        }
      },
      /* @__PURE__ */ k(Icon, { name: "close", size: 36 }),
      /* @__PURE__ */ k(Icon, { name: "chevron-left", size: 36 }),
      /* @__PURE__ */ k(Icon, { name: "chevron-right", size: 36 })
    );
  }
  function updateSwipeIndicatorElement(element, state2) {
    let clampedProgress = Math.min(1, Math.max(0, state2.progress)), pull = Math.round(48 * clampedProgress), hidden = clampedProgress <= SWIPE_INDICATOR_HIDE_PROGRESS, offset = state2.direction === "left" ? 42 - pull : pull - 42, iconName = state2.blocked === !0 ? "close" : state2.direction === "left" ? "chevron-left" : "chevron-right";
    element.setAttribute("aria-hidden", hidden ? "true" : "false");
    for (let icon of Array.from(element.querySelectorAll(".ehpeek-icon")))
      icon.style.display = icon.dataset.iconName === iconName ? "block" : "none";
    element.style.display = hidden ? "none" : "flex", element.style.left = state2.direction === "right" ? "6px" : "", element.style.opacity = String(0.35 + clampedProgress * 0.65), element.style.right = state2.direction === "left" ? "6px" : "", element.style.transform = `translate(${offset}px, -50%)`, element.style.width = "";
  }

  // src/components/Enhance/TouchGalleryPanel.tsx
  var TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS = "ehpeek-touch-gallery-actions-menu-item block box-border w-full min-h-lg py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline text-21px leading-[1.2]", RATING_STAR_INDEXES = [0, 1, 2, 3, 4];
  function TouchGalleryPanel(props) {
    let rating = props.source.rating, hasCover = props.source.cover !== null, [ratingValue, setRatingValue] = d2(() => rating?.value ?? 0), [ratingPreview, setRatingPreview] = d2(null), [backToTopVisible, setBackToTopVisible] = d2(!1), displayedRating = ratingPreview ?? ratingValue, selectedRating = ratingPreview ?? selectableRating(ratingValue), ratingLabel = ratingPreview ? `Rate as ${ratingPreview.toFixed(1)} stars` : rating?.label ?? "";
    h2(() => {
      let updateBackToTopVisibility = () => {
        setBackToTopVisible(window.scrollY > Math.max(320, window.innerHeight * 0.5));
      };
      return updateBackToTopVisibility(), window.addEventListener("scroll", updateBackToTopVisibility, { passive: !0 }), () => {
        window.removeEventListener("scroll", updateBackToTopVisibility);
      };
    }, []);
    let submitRating = (value) => {
      rating && (setGalleryRating(value), setRatingValue(value), setRatingPreview(null));
    }, handleRatingKeyDown = (event) => {
      if (!rating)
        return;
      let nextValue = ratingFromKeyboard(event.key, selectedRating);
      if (nextValue !== null) {
        event.preventDefault(), setRatingPreview(nextValue);
        return;
      }
      (event.key === "Enter" || event.key === " ") && (event.preventDefault(), submitRating(selectedRating));
    };
    return /* @__PURE__ */ k("section", { className: "ehpeek-touch-gallery flex box-border w-full flex-col mb-md ehp-color-site-text font-sans" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-hero relative grid min-h-[clamp(260px,42vh,340px)] pt-lg pr-[max(16px,env(safe-area-inset-right,0px))] pb-48px pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-surface ehp-color-site-text" }, /* @__PURE__ */ k(
      "div",
      {
        className: `ehpeek-touch-gallery-summary grid gap-18px items-stretch ${hasCover ? "grid-cols-[minmax(120px,38%)_minmax(0,1fr)]" : "grid-cols-1"}`
      },
      hasCover && /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-cover flex self-center justify-self-stretch w-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden rounded-3px" }, /* @__PURE__ */ k(ExternalDomNode, { node: props.source.cover })),
      /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-hero-side flex self-stretch min-w-0 flex-col items-start gap-8px pt-2px" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-heading flex min-w-0 w-full flex-none flex-col gap-sm items-start pb-xs" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-title-main line-clamp-4 flex-none overflow-hidden text-[clamp(23px,6.2vw,34px)] font-400 leading-[1.16] text-left break-anywhere" }, props.source.titleMain), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-title-sub line-clamp-3 flex-none overflow-hidden opacity-82 text-[clamp(18px,4.8vw,26px)] leading-[1.2] text-left break-anywhere" }, props.source.titleSub)), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-category-row flex w-full flex-none flex-wrap items-center justify-start gap-x-20px gap-y-10px mt-auto pt-md" }, /* @__PURE__ */ k(
        "div",
        {
          className: "ehpeek-touch-gallery-category max-w-full flex-none overflow-hidden text-ellipsis whitespace-nowrap rounded-xs py-6px px-10px ehp-color-site-page ehp-color-site-accent text-15px font-700 leading-[1.1] uppercase",
          style: props.source.categoryAppearance
        },
        props.source.category
      ), rating && /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-rating flex w-auto min-w-0 flex-none flex-col items-start gap-4px" }, /* @__PURE__ */ k(
        "div",
        {
          className: "ehpeek-touch-gallery-rating-stars relative inline-flex max-w-full overflow-hidden cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px",
          role: "slider",
          tabIndex: 0,
          "aria-label": "Rate gallery",
          "aria-valuemin": 0.5,
          "aria-valuemax": 5,
          "aria-valuenow": selectedRating,
          "aria-valuetext": `${selectedRating.toFixed(1)} stars`,
          onPointerMove: (event) => {
            setRatingPreview(ratingFromPointer(event.clientX, event.currentTarget));
          },
          onPointerLeave: () => {
            setRatingPreview(null);
          },
          onClick: (event) => {
            event.detail > 0 && submitRating(ratingFromPointer(event.clientX, event.currentTarget));
          },
          onKeyDown: handleRatingKeyDown,
          onBlur: () => {
            setRatingPreview(null);
          }
        },
        /* @__PURE__ */ k("span", { className: "ehpeek-touch-gallery-rating-stars-empty flex gap-1px text-[rgba(255,255,255,0.25)]", "aria-hidden": "true" }, RATING_STAR_INDEXES.map((index) => /* @__PURE__ */ k(Icon, { key: index, name: "star" }))),
        /* @__PURE__ */ k(
          "span",
          {
            className: "ehpeek-touch-gallery-rating-stars-fill absolute top-0 left-0 flex gap-1px overflow-hidden ehp-color-site-accent",
            "aria-hidden": "true",
            style: { width: `${displayedRating / 5 * 100}%` }
          },
          RATING_STAR_INDEXES.map((index) => /* @__PURE__ */ k(Icon, { key: index, name: "star", filled: !0 }))
        )
      ), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-rating-meta flex max-w-full items-center justify-start gap-6px text-[rgba(255,255,255,0.78)] text-12px leading-[1.15] whitespace-nowrap" }, /* @__PURE__ */ k(
        "span",
        {
          className: "ehpeek-touch-gallery-rating-label min-w-0 overflow-hidden text-ellipsis",
          "aria-live": "polite"
        },
        ratingLabel
      ), rating.count && /* @__PURE__ */ k("span", { className: "ehpeek-touch-gallery-rating-count flex-none pl-6px border-0 border-l border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.58)]" }, rating.count)))))
    )), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-primary relative z-1 grid grid-cols-[1fr_1fr] min-h-87px mt--18px mr-[max(14px,env(safe-area-inset-right,0px))] ml-[max(14px,env(safe-area-inset-left,0px))] overflow-visible rounded-xs bg-[var(--color-site-elevated)] shadow-[0_2px_10px_var(--color-shadow-panel)]" }, /* @__PURE__ */ k(TouchGalleryFavoriteButton, { source: props.source.favorite }), /* @__PURE__ */ k(
      "div",
      {
        className: "ehpeek-touch-gallery-primary-actions flex min-w-0 border-l border-[var(--color-site-border-subtle)]",
        ref: (node) => {
          props.onPrimaryActionMount(node);
        }
      }
    )), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-content flex flex-col gap-lg pt-xl pr-[max(16px,env(safe-area-inset-right,0px))] pb-lg pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-page ehp-color-site-text" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-md gap-x-lg items-center text-27px leading-[1.2] text-center" }, props.source.summary.map((item) => /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal" }, item.value)), /* @__PURE__ */ k(TouchGalleryActionsMenu, { actions: props.source.actions })), props.source.tagGroups.length > 0 && /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-tag-groups flex flex-col gap-md pt-2px" }, props.source.tagGroups.map((group) => /* @__PURE__ */ k(TouchGalleryTagGroup, { group })))), backToTopVisible && /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: "ehpeek-back-to-top fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[calc(max(16px,env(safe-area-inset-bottom,0px))_+_52px)] z-ui inline-flex w-lg h-lg items-center justify-center rounded-full border ehp-color-site-border bg-[var(--color-site-elevated)] ehp-color-site-accent shadow-[0_4px_14px_var(--color-shadow-floating)] cursor-pointer [touch-action:manipulation] active:scale-96",
        "aria-label": texts_default.reader.backToTop,
        title: texts_default.reader.backToTop,
        onClick: () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },
      /* @__PURE__ */ k(Icon, { name: "arrow-up" })
    ));
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
        className: "ehpeek-touch-gallery-actions-menu-button inline-flex w-md h-md items-center justify-center border-0 bg-transparent ehp-color-site-text",
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-label": texts_default.navigation.menu,
        title: texts_default.navigation.menu,
        onClick: (event) => {
          event.stopPropagation(), setOpen(!open);
        }
      },
      /* @__PURE__ */ k(Icon, { name: "menu" })
    ), open && /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-actions-menu-panel absolute top-48px right-0 z-overlay flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated" }, /* @__PURE__ */ k(ExternalDomNodes, { nodes: props.actions, clone: !0 })));
  }
  function TouchGalleryTagGroup(props) {
    return /* @__PURE__ */ k("section", { className: "ehpeek-touch-gallery-tag-group grid grid-cols-[minmax(76px,20%)_minmax(0,1fr)] gap-sm items-start" }, /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-tag-group-name min-h-sm overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[var(--color-site-elevated)] py-sm px-md text-center lowercase ehp-color-site-accent textsize-lg font-600" }, props.group.namespace), /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-tags flex flex-wrap gap-sm" }, props.group.tags.map((tag) => /* @__PURE__ */ k(
      "a",
      {
        className: "ehpeek-touch-gallery-tag inline-flex max-w-full min-h-lg items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] px-lg no-underline ehp-color-site-text textsize-lg transition-[border-color,background-color,color] duration-120 hover:border-[var(--color-site-border)] hover:bg-[var(--color-site-accent-hover)] hover:ehp-color-site-accent",
        href: tag.href,
        style: tag.appearance,
        "aria-label": tag.label
      },
      /* @__PURE__ */ k(ExternalDomNode, { node: tag.content })
    ))));
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
          setOptions(parseGalleryFavoriteOptions(doc, favorite.favorited)), setLoadingState("idle");
        } catch (error) {
          console.error("[ehpeek]", error), setLoadingState("failed");
        }
      }
    };
    return /* @__PURE__ */ k("div", { ref: rootRef, className: "ehpeek-touch-gallery-favorite-menu relative z-2 min-w-0" }, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-xl font-700 normal-case ${favorited ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`,
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
          className: `ehpeek-touch-gallery-favorite-icon block mt-2px opacity-78 normal-case ${favorited ? "ehp-color-site-accent" : "ehp-color-site-text"}`,
          "aria-hidden": "true"
        },
        /* @__PURE__ */ k(Icon, { name: "heart", filled: favorited })
      )
    ), open && /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-favorite-panel absolute top-[calc(100%+8px)] left-0 z-overlay flex w-[min(86vw,360px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated" }, loadingState === "loading" && /* @__PURE__ */ k(TouchGalleryFavoriteStatus, { text: "Loading..." }), loadingState === "failed" && /* @__PURE__ */ k(TouchGalleryFavoriteStatus, { text: "Failed" }), loadingState === "idle" && options.map((option) => /* @__PURE__ */ k(
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
    return /* @__PURE__ */ k("div", { className: "ehpeek-touch-gallery-favorite-loading flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit text-21px leading-[1.2] text-left" }, props.text);
  }
  function TouchGalleryFavoriteOption(props) {
    return /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-touch-gallery-favorite-option flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit text-21px leading-[1.2] text-left ${props.option.value === "favdel" ? "ehpeek-touch-gallery-favorite-option-remove" : ""}`,
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
          className: `ehpeek-touch-gallery-favorite-option-icon flex-none ${props.option.value === "favdel" ? "ehp-color-site-text" : "ehp-color-site-accent"}`,
          "aria-hidden": "true"
        },
        /* @__PURE__ */ k(Icon, { name: "heart", filled: props.option.value !== "favdel" })
      ),
      /* @__PURE__ */ k("span", null, props.option.label),
      /* @__PURE__ */ k(
        "span",
        {
          className: `ml-auto flex-none ehp-color-site-accent ${props.option.selected ? "visible" : "invisible"}`,
          "aria-hidden": "true"
        },
        /* @__PURE__ */ k(Icon, { name: "check" })
      )
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
  function selectableRating(value) {
    return Math.min(5, Math.max(0.5, Math.round(value * 2) / 2));
  }
  function ratingFromPointer(clientX, element) {
    let rect = element.getBoundingClientRect(), progress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.max(0.5, Math.ceil(progress * 10) / 2);
  }
  function ratingFromKeyboard(key, value) {
    return key === "ArrowRight" || key === "ArrowUp" ? Math.min(5, value + 0.5) : key === "ArrowLeft" || key === "ArrowDown" ? Math.max(0.5, value - 0.5) : key === "Home" ? 0.5 : key === "End" ? 5 : null;
  }

  // src/components/Enhance/TouchSearchPanel.tsx
  var TOUCH_SEARCH_OPTION_CLASS = "appearance-none inline-flex min-h-md items-center px-md border-0 rounded-md bg-transparent ehp-color-site-accent text-left textsize-md font-700 font-inherit leading-[1.2] no-underline cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-accent-hover)]", TOUCH_SEARCH_ACTION_CLASS = "appearance-none inline-flex box-border w-60px h-60px items-center justify-center p-0 rounded-md border-0 bg-transparent cursor-pointer transition-[background-color,transform] duration-120 [touch-action:manipulation] active:scale-96 active:bg-[var(--color-site-item-hover)]";
  function TouchSearchPanel(props) {
    let searchBoxHostRef = A2(null), fileSearchHostRef = A2(null);
    return _2(() => {
      searchBoxHostRef.current?.replaceChildren(props.source.searchBox), props.source.fileSearch && fileSearchHostRef.current?.replaceChildren(props.source.fileSearch);
    }, [props.source]), /* @__PURE__ */ k("section", { className: "ehpeek-touch-search-panel box-border flex w-[calc(100%_-_32px)] max-w-960px flex-col gap-md mx-auto mb-lg p-lg border ehp-color-site-border rounded-lg ehp-color-site-surface ehp-color-site-text shadow-[0_8px_24px_var(--color-shadow-panel)] font-sans" }, /* @__PURE__ */ k("div", { ref: searchBoxHostRef, className: "contents" }), /* @__PURE__ */ k("div", { ref: fileSearchHostRef, className: "contents" }));
  }
  function TouchSearchCategoryToggle(props) {
    let [categoriesOpen, setCategoriesOpen] = d2(!1);
    return _2(() => {
      props.source.categories.classList.toggle("hidden", !categoriesOpen), props.source.categories.hidden = !categoriesOpen, props.source.categories.setAttribute("aria-hidden", String(!categoriesOpen));
    }, [categoriesOpen, props.source.categories]), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: TOUCH_SEARCH_OPTION_CLASS,
        "aria-expanded": categoriesOpen,
        "aria-label": categoriesOpen ? texts_default.search.hideCategories : texts_default.search.showCategories,
        onClick: () => {
          setCategoriesOpen(!categoriesOpen);
        }
      },
      categoriesOpen ? texts_default.search.hideCategories : texts_default.search.showCategories
    );
  }
  function TouchSearchAction(props) {
    let originalHostRef = A2(null), search = props.action === "search", original = search ? props.source.searchSubmit : props.source.clearButton;
    return _2(() => {
      original.hidden = !0, originalHostRef.current?.replaceChildren(original);
    }, [original]), /* @__PURE__ */ k(S, null, /* @__PURE__ */ k(
      "button",
      {
        type: search ? "submit" : "button",
        className: search ? `${TOUCH_SEARCH_ACTION_CLASS} z-1 col-start-3 row-start-1 ehp-color-site-accent` : `${TOUCH_SEARCH_ACTION_CLASS} z-1 col-start-2 row-start-1 ehp-color-site-text`,
        "aria-label": search ? props.source.searchLabel : props.source.clearLabel,
        title: search ? props.source.searchLabel : props.source.clearLabel,
        onClick: (event) => {
          if (search) {
            event.preventDefault(), original.click();
            return;
          }
          props.source.searchInput.value = "", props.source.searchInput.dispatchEvent(new Event("input", { bubbles: !0 })), props.source.searchInput.focus();
        }
      },
      /* @__PURE__ */ k(Icon, { name: search ? "search" : "close", size: 32 })
    ), /* @__PURE__ */ k("span", { ref: originalHostRef, className: "contents [&>*:not([hidden])]:col-span-full" }));
  }
  function TouchSearchHistory(props) {
    let dropdownRef = A2(null), [searchValue, setSearchValue] = d2(props.source.searchInput.value), [history, setHistory] = d2(() => state.search.history.reload()), [open, setOpen] = d2(!1), [position, setPosition] = d2(null);
    return _2(() => {
      let input = props.source.searchInput, form = input.form, updatePosition = () => {
        let rect = input.getBoundingClientRect();
        setPosition({
          left: rect.left + window.scrollX,
          top: rect.bottom + window.scrollY,
          width: rect.width
        });
      }, showHistory = () => {
        updatePosition(), setOpen(!0);
      }, updateSearchValue = () => {
        setSearchValue(input.value), !input.value.trim() && document.activeElement === input && showHistory();
      }, recordSearch = () => {
        let value = input.value.trim();
        if (!value)
          return;
        let next = [value, ...state.search.history.value.filter((item) => item !== value)];
        state.search.history.set(next), setHistory(next);
      }, closeOnOutsidePointer = (event) => {
        let target = event.target;
        target === input || target instanceof Node && dropdownRef.current?.contains(target) || setOpen(!1);
      };
      return input.addEventListener("input", updateSearchValue), input.addEventListener("focus", showHistory), input.addEventListener("pointerdown", showHistory), form?.addEventListener("submit", recordSearch), props.source.searchSubmit.addEventListener("click", recordSearch), document.addEventListener("pointerdown", closeOnOutsidePointer, !0), document.addEventListener("scroll", updatePosition, !0), window.addEventListener("resize", updatePosition), updateSearchValue(), () => {
        input.removeEventListener("input", updateSearchValue), input.removeEventListener("focus", showHistory), input.removeEventListener("pointerdown", showHistory), form?.removeEventListener("submit", recordSearch), props.source.searchSubmit.removeEventListener("click", recordSearch), document.removeEventListener("pointerdown", closeOnOutsidePointer, !0), document.removeEventListener("scroll", updatePosition, !0), window.removeEventListener("resize", updatePosition);
      };
    }, [props.source]), !open || searchValue.trim() || history.length === 0 || !position ? null : /* @__PURE__ */ k(
      "section",
      {
        ref: dropdownRef,
        className: "absolute z-ui flex box-border max-h-[50vh] min-w-0 flex-col overflow-hidden overflow-y-auto overscroll-contain rounded-md border ehp-color-site-border ehp-color-site-elevated ehp-color-site-text font-sans",
        style: { left: `${position.left}px`, top: `${position.top}px`, width: `${position.width}px` },
        "aria-label": texts_default.search.history,
        role: "list"
      },
      history.map((item) => /* @__PURE__ */ k(
        "div",
        {
          key: item,
          className: "flex min-w-0 flex-none items-stretch border-0 border-b ehp-color-site-border-subtle-b last:border-b-0",
          role: "listitem"
        },
        /* @__PURE__ */ k(
          "button",
          {
            type: "button",
            className: "appearance-none block min-w-0 min-h-md flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-md border-0 bg-transparent ehp-color-site-text text-left textsize-md font-inherit cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]",
            title: item,
            onClick: () => {
              props.source.searchInput.value = item, props.source.searchInput.dispatchEvent(new Event("input", { bubbles: !0 })), props.source.searchInput.focus(), props.source.searchInput.setSelectionRange(item.length, item.length), setOpen(!1);
            }
          },
          item
        ),
        /* @__PURE__ */ k(
          "button",
          {
            type: "button",
            className: "appearance-none inline-flex w-40px min-h-md flex-none items-center justify-center border-0 border-l ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-24px font-inherit leading-1 cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]",
            "aria-label": `${texts_default.search.deleteHistory}: ${item}`,
            title: texts_default.search.deleteHistory,
            onClick: () => {
              let next = history.filter((candidate) => candidate !== item);
              state.search.history.set(next), setHistory(next);
            }
          },
          "×"
        )
      ))
    );
  }

  // src/components/Enhance/TouchTopBar.tsx
  var TOUCH_TOP_BAR_ICON_SIZE = 34, TOUCH_ICON_BUTTON_CLASS = "inline-flex w-56px h-56px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]", TOUCH_TOP_BAR_MENU_ITEM_CLASS = "ehpeek-touch-top-bar-menu-item block box-border w-full min-h-xl py-lg px-xl touch:px-xl border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline text-28px touch:text-30px leading-[1.2]";
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
        "aria-label": texts_default.navigation.menu,
        title: texts_default.navigation.menu,
        onClick: (event) => {
          event.stopPropagation(), setOpen(!open);
        }
      },
      /* @__PURE__ */ k(Icon, { name: "menu", size: TOUCH_TOP_BAR_ICON_SIZE })
    ), open && /* @__PURE__ */ k(
      "div",
      {
        className: "ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+8px)] right-0 z-overlay flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated"
      },
      /* @__PURE__ */ k("div", { ref: navItemsRef, className: "contents" })
    ));
  }
  function TouchTopBar(props) {
    return /* @__PURE__ */ k("nav", { className: "ehpeek-touch-top-bar relative z-ui flex box-border w-full min-h-xl items-center justify-between py-lg pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] ehp-color-site-surface ehp-color-site-text font-sans" }, /* @__PURE__ */ k(
      "a",
      {
        className: `ehpeek-touch-top-bar-project ${TOUCH_ICON_BUTTON_CLASS}`,
        href: "https://github.com/yamipot/ehpeek",
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": texts_default.navigation.github,
        title: texts_default.navigation.github
      },
      /* @__PURE__ */ k(Icon, { name: "panda-peek", size: 48, strokeWidth: 1.8 })
    ), /* @__PURE__ */ k("div", { className: "flex items-center gap-xs" }, /* @__PURE__ */ k(
      "a",
      {
        className: `ehpeek-touch-top-bar-home ${TOUCH_ICON_BUTTON_CLASS}`,
        href: props.info.homeHref,
        "aria-label": texts_default.navigation.home,
        title: texts_default.navigation.home
      },
      /* @__PURE__ */ k(Icon, { name: "home", size: TOUCH_TOP_BAR_ICON_SIZE })
    ), /* @__PURE__ */ k(
      "a",
      {
        className: `ehpeek-touch-top-bar-favorites ${TOUCH_ICON_BUTTON_CLASS}`,
        href: props.info.favoritesHref,
        "aria-label": texts_default.navigation.favorites,
        title: texts_default.navigation.favorites
      },
      /* @__PURE__ */ k(Icon, { name: "heart", size: TOUCH_TOP_BAR_ICON_SIZE })
    ), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        className: `ehpeek-touch-top-bar-settings ${TOUCH_ICON_BUTTON_CLASS}`,
        "aria-label": texts_default.settings.openSettings,
        title: texts_default.settings.openSettings,
        onClick: (event) => {
          event.stopPropagation(), props.onSettingsMenuOpen();
        }
      },
      /* @__PURE__ */ k(Icon, { name: "settings", size: TOUCH_TOP_BAR_ICON_SIZE })
    ), /* @__PURE__ */ k(TouchTopBarMenu, { navItems: props.info.navItems })));
  }

  // src/components/Loading.tsx
  function LoadingSpinner(props) {
    let sizeClass = props.size === "lg" ? "w-sm h-sm border-4" : "w-xs h-xs border-3";
    return /* @__PURE__ */ k("span", { className: "inline-flex items-center justify-center gap-md ehp-color-text", role: "status", "aria-live": "polite" }, /* @__PURE__ */ k(
      "span",
      {
        className: `${sizeClass} inline-block box-border animate-spin rounded-full border-solid ehp-color-spinner`,
        "aria-hidden": "true"
      }
    ), /* @__PURE__ */ k("span", null, props.label));
  }
  function LoadingOverlay(props) {
    return props.visible ? /* @__PURE__ */ k("div", { className: "fixed left-1/2 top-1/2 z-overlay flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-elevated)] px-lg py-md text-[var(--color-text)] shadow-[0_6px_20px_var(--color-shadow-floating)] pointer-events-none select-none" }, /* @__PURE__ */ k(LoadingSpinner, { label: props.label })) : null;
  }
  function loadingSpinnerElement(label, size) {
    let host = document.createElement("span");
    return R(/* @__PURE__ */ k(LoadingSpinner, { label, size }), host), host;
  }

  // src/components/Enhance/ScrollPageBar.tsx
  var SCROLL_PAGE_BAR_CLASS = "ehpeek-scroll-page-bar", SCROLL_PAGE_BAR_TOP_CLASS = "ehpeek-scroll-page-bar-top", SCROLL_PAGE_BAR_BOTTOM_CLASS = "ehpeek-scroll-page-bar-bottom", SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR = "data-ehpeek-window-index", DRAG_PIXEL_STEP = 18, PAGE_BAR_BOTTOM_CLASS = "mt-0 mb-10px", PAGE_BAR_CELL_CLASS = "!w-sm !h-sm touch:!w-md touch:!h-md !p-0 rounded-sm touch:rounded-md cursor-pointer text-center align-middle select-none", PAGE_BAR_CLASS = "w-max mx-auto touch-pan-y [&[data-dragging=true]]:select-none", PAGE_BAR_LINK_CLASS = "flex !w-sm !h-sm touch:!w-md touch:!h-md items-center justify-center box-border !p-0 rounded-sm touch:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline", PAGE_BAR_LINK_COLOR_CLASS = "!border-transparent !bg-transparent !text-[var(--color-site-text)] visited:!text-[var(--color-site-text)] hover:!bg-[var(--color-site-item-hover)] hover:!text-[var(--color-site-text)] active:!text-[var(--color-site-text)]", PAGE_BAR_CURRENT_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)]", PAGE_BAR_DISABLED_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)] opacity-40 cursor-default", PAGE_BAR_TABLE_CLASS = "border-separate border-spacing-4px touch:border-spacing-6px", PAGE_BAR_TOP_CLASS = "mt-2px mb-0", galleryPageBarWindowIndex = null;
  function ScrollPageBar(options) {
    let maxIndex = Math.max(0, options.maxIndex ?? options.currentIndex), currentIndex = clamp(options.currentIndex, 0, maxIndex), [windowIndex, setWindowIndex] = d2(
      () => clamp(galleryPageBarWindowIndex ?? options.initialWindowIndex ?? currentIndex, 0, maxIndex)
    ), dragStartWindowIndex = A2(windowIndex), draggable = () => maxIndex + 1 > 7, slots = pageSlots(windowIndex, currentIndex, maxIndex), firstSlotIndex = slots[0]?.pageIndex ?? currentIndex, lastSlotIndex = slots[slots.length - 1]?.pageIndex ?? currentIndex, currentBeforeWindow = currentIndex < firstSlotIndex, currentAfterWindow = currentIndex > lastSlotIndex, linkCell = (text, pageIndex, itemState = "link") => itemState !== "link" ? /* @__PURE__ */ k("td", { className: PAGE_BAR_CELL_CLASS }, /* @__PURE__ */ k(
      "span",
      {
        className: `${PAGE_BAR_LINK_CLASS} ${itemState === "current" ? PAGE_BAR_CURRENT_COLOR_CLASS : PAGE_BAR_DISABLED_COLOR_CLASS}`,
        "aria-current": itemState === "current" ? "page" : void 0,
        "aria-disabled": itemState === "disabled" ? "true" : void 0
      },
      text
    )) : /* @__PURE__ */ k("td", { className: PAGE_BAR_CELL_CLASS }, /* @__PURE__ */ k("a", { className: `${PAGE_BAR_LINK_CLASS} ${PAGE_BAR_LINK_COLOR_CLASS}`, href: options.urlForIndex(pageIndex), "data-page-index": String(pageIndex) }, text)), emptyCell = () => /* @__PURE__ */ k("td", { className: `${PAGE_BAR_CELL_CLASS} cursor-default` }, /* @__PURE__ */ k("span", { className: `${PAGE_BAR_LINK_CLASS} ${PAGE_BAR_LINK_COLOR_CLASS} invisible` }));
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
    }), /* @__PURE__ */ k("table", { className: PAGE_BAR_TABLE_CLASS }, /* @__PURE__ */ k("tbody", null, /* @__PURE__ */ k("tr", null, linkCell("<<", 0, currentIndex === 0 ? "disabled" : "link"), currentBeforeWindow ? linkCell(String(currentIndex + 1), currentIndex, "current") : emptyCell(), linkCell("<", Math.max(0, currentIndex - 1), currentIndex === 0 ? "disabled" : "link"), slots.map(
      (slot) => slot ? linkCell(String(slot.pageIndex + 1), slot.pageIndex, slot.pageIndex === currentIndex ? "current" : "link") : emptyCell()
    ), linkCell(">", Math.min(maxIndex, currentIndex + 1), currentIndex === maxIndex ? "disabled" : "link"), currentAfterWindow ? linkCell(String(currentIndex + 1), currentIndex, "current") : emptyCell(), linkCell(">>", maxIndex, currentIndex === maxIndex ? "disabled" : "link"))));
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
      return parsed.pathname === "/favorites.php" ? {
        type: "favorites",
        url: parsed.href
      } : parsed.pathname === "/" || parsed.pathname.startsWith("/tag/") || parsed.pathname === "/watched" ? {
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
    let html = await requestText(page.url), doc = new DOMParser().parseFromString(html, "text/html"), info = readImagePageInfo(doc, page.url);
    if (!info.imageUrl)
      throw new Error(texts_default.errors.imageNotFound);
    return info;
  }
  function replacePreviewContent2(doc) {
    replacePreviewContent(doc);
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
    let previousUrl = window.location.href, snapshot = snapshotPreview(), targetPreviewIndex = previewPageIndexFromUrl(url), maxPreviewIndex = maxPreviewPageIndex();
    galleryNavigationLoading = !0, swipeElement?.setAttribute("aria-busy", "true"), window.history.replaceState(window.history.state, "", url), targetPreviewIndex !== null && (setScrollPageBarWindowIndex(targetPreviewIndex), replaceGalleryPageBar?.(targetPreviewIndex, maxPreviewIndex)), options.scrollToPageBar && scrollToPageBar(options.scrollToPageBar), showPreviewPlaceholder(loadingSpinnerElement(texts_default.reader.loading, "lg"));
    try {
      let html = await requestText(url), doc = new DOMParser().parseFromString(html, "text/html"), nextMaxPreviewIndex = maxPreviewPageIndex(doc, url);
      replacePreviewContent2(doc), replaceGalleryPageBar?.(previewPageIndexFromUrl(url) ?? previewPageIndex(), nextMaxPreviewIndex), setThumbsGridSwipeTarget(), options.scrollToPageBar && scrollToPageBar(options.scrollToPageBar);
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
    link && (event.preventDefault(), event.stopPropagation(), navigateSearchPage(link.href));
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
    url && (event.preventDefault(), navigateSearchPage(url));
  }
  async function navigateSearchPage(url) {
    if (!searchNavigationLoading) {
      searchNavigationLoading = !0, setSearchLoading?.(!0), swipeElement2?.setAttribute("aria-busy", "true");
      try {
        let resultList = await replaceSearchPageContentFromUrl(url);
        window.history.pushState(window.history.state, "", url), document.documentElement.dataset.ehpeekTouchUi === "true" && extractPageType(url).type === "favorites" && prepareTouchFavoritesPage(), setResultListSwipeTarget(resultList), searchTopNavigationBar()?.scrollIntoView({ block: "start", behavior: "auto" });
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

  // src/integrations/EhSyringe.ts
  var ROOT_CLASS = "ehs-injected", TRANSLATED_LANGUAGE = "zh-hans", INITIALIZED_SELECTOR = "#eh-syringe-popup-button", SEARCH_SUBMIT_SELECTOR = "#searchbox button[ehs-input][type='submit']", CLEAR_BUTTON_SELECTOR = "#searchbox button[ehs-input][type='button']", initialUiReady = null;
  function waitForInitialUi() {
    return initialUiReady ?? (initialUiReady = waitFor(() => !isInjected() || !!document.querySelector(INITIALIZED_SELECTOR))), initialUiReady;
  }
  function waitForSearchUi() {
    return waitFor(() => !isTranslatingUi() || searchUiReady());
  }
  function waitFor(ready) {
    return ready() ? Promise.resolve() : new Promise((resolve) => {
      let observer = new MutationObserver(() => {
        ready() && (observer.disconnect(), resolve());
      });
      observer.observe(document.documentElement, {
        childList: !0,
        subtree: !0
      });
    });
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

  // ehpeek-uno-css:ehpeek:uno.css
  var ehpeek_uno_default = `/* layer: preflights */
*,::before,::after{--un-rotate:0;--un-rotate-x:0;--un-rotate-y:0;--un-rotate-z:0;--un-scale-x:1;--un-scale-y:1;--un-scale-z:1;--un-skew-x:0;--un-skew-y:0;--un-translate-x:0;--un-translate-y:0;--un-translate-z:0;--un-pan-x: ;--un-pan-y: ;--un-pinch-zoom: ;--un-scroll-snap-strictness:proximity;--un-ordinal: ;--un-slashed-zero: ;--un-numeric-figure: ;--un-numeric-spacing: ;--un-numeric-fraction: ;--un-border-spacing-x:0;--un-border-spacing-y:0;--un-ring-offset-shadow:0 0 rgb(0 0 0 / 0);--un-ring-shadow:0 0 rgb(0 0 0 / 0);--un-shadow-inset: ;--un-shadow:0 0 rgb(0 0 0 / 0);--un-ring-inset: ;--un-ring-offset-width:0px;--un-ring-offset-color:#fff;--un-ring-width:0px;--un-ring-color:rgb(147 197 253 / 0.5);--un-blur: ;--un-brightness: ;--un-contrast: ;--un-drop-shadow: ;--un-grayscale: ;--un-hue-rotate: ;--un-invert: ;--un-saturate: ;--un-sepia: ;--un-backdrop-blur: ;--un-backdrop-brightness: ;--un-backdrop-contrast: ;--un-backdrop-grayscale: ;--un-backdrop-hue-rotate: ;--un-backdrop-invert: ;--un-backdrop-opacity: ;--un-backdrop-saturate: ;--un-backdrop-sepia: ;}::backdrop{--un-rotate:0;--un-rotate-x:0;--un-rotate-y:0;--un-rotate-z:0;--un-scale-x:1;--un-scale-y:1;--un-scale-z:1;--un-skew-x:0;--un-skew-y:0;--un-translate-x:0;--un-translate-y:0;--un-translate-z:0;--un-pan-x: ;--un-pan-y: ;--un-pinch-zoom: ;--un-scroll-snap-strictness:proximity;--un-ordinal: ;--un-slashed-zero: ;--un-numeric-figure: ;--un-numeric-spacing: ;--un-numeric-fraction: ;--un-border-spacing-x:0;--un-border-spacing-y:0;--un-ring-offset-shadow:0 0 rgb(0 0 0 / 0);--un-ring-shadow:0 0 rgb(0 0 0 / 0);--un-shadow-inset: ;--un-shadow:0 0 rgb(0 0 0 / 0);--un-ring-inset: ;--un-ring-offset-width:0px;--un-ring-offset-color:#fff;--un-ring-width:0px;--un-ring-color:rgb(147 197 253 / 0.5);--un-blur: ;--un-brightness: ;--un-contrast: ;--un-drop-shadow: ;--un-grayscale: ;--un-hue-rotate: ;--un-invert: ;--un-saturate: ;--un-sepia: ;--un-backdrop-blur: ;--un-backdrop-brightness: ;--un-backdrop-contrast: ;--un-backdrop-grayscale: ;--un-backdrop-hue-rotate: ;--un-backdrop-invert: ;--un-backdrop-opacity: ;--un-backdrop-saturate: ;--un-backdrop-sepia: ;}
/* layer: shortcuts */
.scrollbar-hidden{scrollbar-width:none;-ms-overflow-style:none;}
.container{width:100%;}
.z-overlay{z-index:1100;}
.z-reader{z-index:1200;}
.z-ui{z-index:1000;}
.mb-lg{margin-bottom:16px;}
.mb-md{margin-bottom:12px;}
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
.min-h-lg{min-height:52px;}
.min-h-md{min-height:40px;}
.min-h-sm{min-height:32px;}
.min-h-xl,
html[data-ehpeek-touch-ui="true"] .touch\\:min-h-xl{min-height:80px;}
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
.gap-xl,
html[data-ehpeek-touch-ui="true"] .touch\\:gap-xl{gap:24px;}
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
.\\[\\&_\\.searchadv\\>div\\>div\\]\\:\\!p-sm .searchadv>div>div{padding:8px !important;}
.p-sm{padding:8px;}
.p-xl{padding:24px;}
.px-lg{padding-left:16px;padding-right:16px;}
.px-md{padding-left:12px;padding-right:12px;}
.px-sm{padding-left:8px;padding-right:8px;}
.px-xl,
html[data-ehpeek-touch-ui="true"] .touch\\:px-xl{padding-left:24px;padding-right:24px;}
.py-lg,
html[data-ehpeek-touch-ui="true"] .touch\\:py-lg{padding-top:16px;padding-bottom:16px;}
.py-md{padding-top:12px;padding-bottom:12px;}
.py-sm{padding-top:8px;padding-bottom:8px;}
.py-xs{padding-top:4px;padding-bottom:4px;}
.pb-lg{padding-bottom:16px;}
.pb-sm{padding-bottom:8px;}
.pb-xs{padding-bottom:4px;}
.\\!pl-lg{padding-left:16px !important;}
.pt-lg{padding-top:16px;}
.\\[\\&_\\.searchadv\\]\\:\\!pt-md .searchadv{padding-top:12px !important;}
.pt-md{padding-top:12px;}
.pt-xl{padding-top:24px;}
.textsize-lg,
html[data-ehpeek-touch-ui="true"] .textsize-md{font-size:20px;}
html[data-ehpeek-touch-ui="true"] .textsize-lg{font-size:23px;}
.\\!textsize-md,
.\\[\\&_\\.searchadv\\]\\:\\!textsize-md .searchadv{font-size:14px !important;}
.textsize-md,
html[data-ehpeek-touch-ui="true"] .textsize-sm{font-size:14px;}
html[data-ehpeek-touch-ui="true"] .\\!textsize-md,
html[data-ehpeek-touch-ui="true"] .\\[\\&_\\.searchadv\\]\\:\\!textsize-md .searchadv{font-size:20px !important;}
.textsize-sm{font-size:11px;}
.textsize-xl{font-size:26px;}
html[data-ehpeek-touch-ui="true"] .textsize-xl{font-size:30px;}
.ehp-color-site-accent{color:var(--color-site-accent);}
.ehp-color-site-text{color:var(--color-site-text);}
.ehp-color-text{color:var(--color-text);}
.hover\\:ehp-color-site-accent:hover{color:var(--color-site-accent);}
@media (pointer: coarse){
.coarse\\:gap-lg{gap:16px;}
.coarse\\:rounded-lg{border-radius:8px;}
.coarse\\:px-lg{padding-left:16px;padding-right:16px;}
}
@media (min-width: 640px){
.container{max-width:640px;}
}
@media (min-width: 768px){
.container{max-width:768px;}
}
@media (min-width: 1024px){
.container{max-width:1024px;}
}
@media (min-width: 1280px){
.container{max-width:1280px;}
}
@media (min-width: 1536px){
.container{max-width:1536px;}
}
/* layer: default */
.\\[--progress-bar-fill\\:0\\%\\]{--progress-bar-fill:0%;}
.\\[--progress-bar-track-direction\\:to_right\\]{--progress-bar-track-direction:to right;}
.\\[-webkit-appearance\\:none\\]{-webkit-appearance:none;}
.\\[-webkit-tap-highlight-color\\:transparent\\]{-webkit-tap-highlight-color:transparent;}
.\\[-webkit-user-drag\\:none\\]{-webkit-user-drag:none;}
.\\[accent-color\\:var\\(--color-text\\)\\]{accent-color:var(--color-text);}
.\\[appearance\\:none\\]{appearance:none;}
.\\[direction\\:ltr\\]{direction:ltr;}
.\\[font-variant-numeric\\:tabular-nums\\]{font-variant-numeric:tabular-nums;}
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
.\\!static{position:static !important;}
.inset-0{inset:0;}
.bottom-\\[calc\\(12px\\+env\\(safe-area-inset-bottom\\,0px\\)\\)\\]{bottom:calc(12px + env(safe-area-inset-bottom,0px));}
.bottom-\\[calc\\(max\\(16px\\,env\\(safe-area-inset-bottom\\,0px\\)\\)_\\+_52px\\)\\]{bottom:calc(max(16px,env(safe-area-inset-bottom,0px)) + 52px);}
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
.z-1{z-index:1;}
.z-2{z-index:2;}
.z-3{z-index:3;}
.z-4{z-index:4;}
.\\!grid{display:grid !important;}
.grid{display:grid;}
.\\!col-span-full{grid-column:1/-1 !important;}
.\\[\\&\\>\\*\\:not\\(\\[hidden\\]\\)\\]\\:col-span-full>*:not([hidden]),
.\\[\\&\\>\\*\\:nth-child\\(n\\+4\\)\\]\\:col-span-full>*:nth-child(n+4),
.col-span-full{grid-column:1/-1;}
.col-start-2{grid-column-start:2;}
.col-start-3{grid-column-start:3;}
.row-start-1{grid-row-start:1;}
.grid-cols-\\[1fr_1fr\\]{grid-template-columns:1fr 1fr;}
.grid-cols-\\[minmax\\(0\\,1fr\\)_60px_60px\\]{grid-template-columns:minmax(0,1fr) 60px 60px;}
.grid-cols-\\[minmax\\(120px\\,38\\%\\)_minmax\\(0\\,1fr\\)\\]{grid-template-columns:minmax(120px,38%) minmax(0,1fr);}
.grid-cols-\\[minmax\\(76px\\,20\\%\\)_minmax\\(0\\,1fr\\)\\]{grid-template-columns:minmax(76px,20%) minmax(0,1fr);}
.grid-cols-\\[repeat\\(3\\,minmax\\(0\\,1fr\\)\\)\\]{grid-template-columns:repeat(3,minmax(0,1fr));}
.grid-cols-\\[repeat\\(5\\,minmax\\(0\\,1fr\\)\\)\\]{grid-template-columns:repeat(5,minmax(0,1fr));}
.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr));}
.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr));}
.\\!float-none{float:none !important;}
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
.\\[\\&_\\.searchadv\\]\\:box-border .searchadv,
.box-border{box-sizing:border-box;}
.block{display:block;}
.inline-block{display:inline-block;}
.contents{display:contents;}
.\\!hidden{display:none !important;}
.hidden{display:none;}
.aspect-\\[2\\/3\\]{aspect-ratio:2/3;}
.\\!h-60px{height:60px !important;}
.\\!h-auto{height:auto !important;}
.\\!max-w-full{max-width:100% !important;}
.\\!min-w-0{min-width:0 !important;}
.\\!w-\\[140px\\]{width:140px !important;}
.\\!w-full,
.\\[\\&_\\.searchadv\\]\\:\\!w-full .searchadv{width:100% !important;}
.h-\\[2\\.4em\\]{height:2.4em;}
.h-\\[var\\(--reader-frame-height\\)\\]{height:var(--reader-frame-height);}
.h-\\[var\\(--reader-page-height\\)\\]{height:var(--reader-page-height);}
.h-108px{height:108px;}
.h-10px{height:10px;}
.h-48px{height:48px;}
.h-56px{height:56px;}
.h-60px{height:60px;}
.h-64px{height:64px;}
.h-full,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:h-full{height:100%;}
.h1{height:0.25rem;}
.max-h-\\[50vh\\]{max-height:50vh;}
.max-h-full{max-height:100%;}
.max-h-screen{max-height:100vh;}
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
.min-w-104px{min-width:104px;}
.min-w-260px{min-width:260px;}
.min-w-285px{min-width:285px;}
.min-w-48px{min-width:48px;}
.min-w-64px{min-width:64px;}
.w-\\[calc\\(100\\%_-_32px\\)\\]{width:calc(100% - 32px);}
.w-\\[min\\(86vw\\,360px\\)\\]{width:min(86vw,360px);}
.w-\\[var\\(--reader-frame-width\\)\\]{width:var(--reader-frame-width);}
.w-10px{width:10px;}
.w-40px{width:40px;}
.w-42px{width:42px;}
.w-56px{width:56px;}
.w-60px{width:60px;}
.w-64px{width:64px;}
.w-auto,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:w-auto{width:auto;}
.w-full,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:w-full{width:100%;}
.w-max{width:max-content;}
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:min-h-0{min-height:0;}
html[data-ehpeek-touch-ui="true"] .touch\\:h-18px{height:18px;}
html[data-ehpeek-touch-ui="true"] .touch\\:w-18px{width:18px;}
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
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.animate-spin{animation:spin 1s linear infinite;}
.cursor-default{cursor:default;}
.disabled\\:cursor-default:disabled{cursor:default;}
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
.justify-self-center{justify-self:center;}
.justify-self-stretch{justify-self:stretch;}
.gap-0{gap:0;}
.gap-18px{gap:18px;}
.gap-1px{gap:1px;}
.gap-4px{gap:4px;}
.gap-6px{gap:6px;}
.gap-8px{gap:8px;}
.gap-x-20px{column-gap:20px;}
.gap-y-10px{row-gap:10px;}
.overflow-auto{overflow:auto;}
.overflow-hidden,
#ehpeek-reader[data-view-mode=paged] .\\[\\#ehpeek-reader\\[data-view-mode\\=paged\\]_\\&\\]\\:overflow-hidden{overflow:hidden;}
.overflow-visible{overflow:visible;}
.\\!overflow-x-hidden{overflow-x:hidden !important;}
.overflow-x-auto{overflow-x:auto;}
.overflow-y-auto{overflow-y:auto;}
.overscroll-contain{overscroll-behavior:contain;}
.scroll-auto{scroll-behavior:auto;}
.text-ellipsis{text-overflow:ellipsis;}
.whitespace-normal{white-space:normal;}
.whitespace-nowrap{white-space:nowrap;}
.break-normal{overflow-wrap:normal;word-break:normal;}
.break-anywhere{overflow-wrap:anywhere;}
.\\!border{border-width:1px !important;}
.\\!border-0{border-width:0px !important;}
.border{border-width:1px;}
.border-0{border-width:0px;}
.border-3{border-width:3px;}
.border-4,
.border-4px{border-width:4px;}
.border-b{border-bottom-width:1px;}
.border-l{border-left-width:1px;}
.border-t{border-top-width:1px;}
.last\\:border-b-0:last-child{border-bottom-width:0px;}
.\\!border-transparent{border-color:transparent !important;}
.border-\\[rgba\\(255\\,255\\,255\\,0\\.2\\)\\]{--un-border-opacity:0.2;border-color:rgba(255, 255, 255, var(--un-border-opacity));}
.border-\\[var\\(--color-accent\\)\\]{border-color:var(--color-accent);}
.border-\\[var\\(--color-border\\)\\]{border-color:var(--color-border);}
.border-\\[var\\(--color-danger-border\\)\\]{border-color:var(--color-danger-border);}
.border-\\[var\\(--color-site-border-subtle\\)\\]{border-color:var(--color-site-border-subtle);}
.border-\\[var\\(--color-site-swipe-border\\)\\]{border-color:var(--color-site-swipe-border);}
.hover\\:border-\\[var\\(--color-site-border\\)\\]:hover{border-color:var(--color-site-border);}
.focus\\:border-\\[var\\(--color-site-accent\\)\\]:focus{border-color:var(--color-site-accent);}
.border-t-\\[var\\(--color-site-border-subtle\\)\\]{border-top-color:var(--color-site-border-subtle);}
.rounded-3px{border-radius:3px;}
.rounded-full{border-radius:9999px;}
.border-solid{border-style:solid;}
.\\!bg-\\[color-mix\\(in_srgb\\,var\\(--color-site-page\\)_82\\%\\,black\\)\\]{background-color:color-mix(in srgb,var(--color-site-page) 82%,black) !important;}
.\\!bg-transparent{background-color:transparent !important;}
.bg-\\[var\\(--color-accent\\)\\]{background-color:var(--color-accent);}
.bg-\\[var\\(--color-background\\)\\]{background-color:var(--color-background);}
.bg-\\[var\\(--color-badge\\)\\]{background-color:var(--color-badge);}
.bg-\\[var\\(--color-control\\)\\]{background-color:var(--color-control);}
.bg-\\[var\\(--color-danger-soft\\)\\]{background-color:var(--color-danger-soft);}
.bg-\\[var\\(--color-elevated\\)\\]{background-color:var(--color-elevated);}
.bg-\\[var\\(--color-site-elevated\\)\\]{background-color:var(--color-site-elevated);}
.bg-\\[var\\(--color-site-surface\\)\\]{background-color:var(--color-site-surface);}
.bg-\\[var\\(--color-site-swipe-background\\)\\]{background-color:var(--color-site-swipe-background);}
.bg-\\[var\\(--color-state-off\\)\\]{background-color:var(--color-state-off);}
.bg-\\[var\\(--color-state-on\\)\\]{background-color:var(--color-state-on);}
.bg-\\[var\\(--color-surface\\)\\]{background-color:var(--color-surface);}
.bg-black\\/65{background-color:rgb(0 0 0 / 0.65);}
.bg-transparent{background-color:transparent;}
.hover\\:\\!bg-\\[var\\(--color-site-item-hover\\)\\]:hover{background-color:var(--color-site-item-hover) !important;}
.hover\\:bg-\\[var\\(--color-badge\\)\\]:hover{background-color:var(--color-badge);}
.hover\\:bg-\\[var\\(--color-site-accent-hover\\)\\]:hover{background-color:var(--color-site-accent-hover);}
.hover\\:bg-\\[var\\(--color-site-item-hover\\)\\]:hover{background-color:var(--color-site-item-hover);}
.focus\\:bg-\\[var\\(--color-site-elevated\\)\\]:focus{background-color:var(--color-site-elevated);}
.active\\:bg-\\[var\\(--color-site-accent-hover\\)\\]:active{background-color:var(--color-site-accent-hover);}
.active\\:bg-\\[var\\(--color-site-item-hover\\)\\]:active{background-color:var(--color-site-item-hover);}
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
.\\!text-0{font-size:0 !important;}
.\\!text-20px{font-size:20px !important;}
.text-12px{font-size:12px;}
.text-13px{font-size:13px;}
.text-15px{font-size:15px;}
.text-18px{font-size:18px;}
.text-21px{font-size:21px;}
.text-22px{font-size:22px;}
.text-24px{font-size:24px;}
.text-27px{font-size:27px;}
.text-28px{font-size:28px;}
.text-34px{font-size:34px;}
.text-xl{font-size:1.25rem;line-height:1.75rem;}
html[data-ehpeek-touch-ui="true"] .touch\\:text-30px{font-size:30px;}
.\\!text-\\[var\\(--color-site-text\\)\\]{color:var(--color-site-text) !important;}
.text-\\[clamp\\(18px\\,4\\.8vw\\,26px\\)\\]{font-size:clamp(18px,4.8vw,26px);}
.text-\\[clamp\\(23px\\,6\\.2vw\\,34px\\)\\]{font-size:clamp(23px,6.2vw,34px);}
.text-\\[clamp\\(24px\\,6vw\\,42px\\)\\]{font-size:clamp(24px,6vw,42px);}
.text-\\[clamp\\(88px\\,25vw\\,180px\\)\\]{font-size:clamp(88px,25vw,180px);}
.text-\\[rgba\\(255\\,255\\,255\\,0\\.25\\)\\]{--un-text-opacity:0.25;color:rgba(255, 255, 255, var(--un-text-opacity));}
.text-\\[rgba\\(255\\,255\\,255\\,0\\.58\\)\\]{--un-text-opacity:0.58;color:rgba(255, 255, 255, var(--un-text-opacity));}
.text-\\[rgba\\(255\\,255\\,255\\,0\\.78\\)\\]{--un-text-opacity:0.78;color:rgba(255, 255, 255, var(--un-text-opacity));}
.text-\\[var\\(--color-background\\)\\]{color:var(--color-background);}
.text-\\[var\\(--color-danger\\)\\]{color:var(--color-danger);}
.text-\\[var\\(--color-muted\\)\\]{color:var(--color-muted);}
.text-\\[var\\(--color-site-text\\)\\]{color:var(--color-site-text);}
.text-\\[var\\(--color-text\\)\\]{color:var(--color-text);}
.text-white{--un-text-opacity:1;color:rgb(255 255 255 / var(--un-text-opacity));}
.visited\\:\\!text-\\[var\\(--color-site-text\\)\\]:visited{color:var(--color-site-text) !important;}
.hover\\:\\!text-\\[var\\(--color-site-text\\)\\]:hover{color:var(--color-site-text) !important;}
.active\\:\\!text-\\[var\\(--color-site-text\\)\\]:active{color:var(--color-site-text) !important;}
.font-400{font-weight:400;}
.font-600{font-weight:600;}
.font-700{font-weight:700;}
.font-850{font-weight:850;}
.leading-\\[1\\.1\\]{line-height:1.1;}
.leading-\\[1\\.15\\]{line-height:1.15;}
.leading-\\[1\\.16\\]{line-height:1.16;}
.leading-\\[1\\.2\\]{line-height:1.2;}
.leading-\\[1\\.3\\]{line-height:1.3;}
.leading-\\[1\\.4\\]{line-height:1.4;}
.leading-\\[1\\]{line-height:1;}
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
.opacity-72{opacity:0.72;}
.opacity-75{opacity:0.75;}
.opacity-78{opacity:0.78;}
.opacity-82{opacity:0.82;}
.active\\:opacity-70:active{opacity:0.7;}
.disabled\\:opacity-40:disabled{opacity:0.4;}
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
.coarse\\:h-64px{height:64px;}
.coarse\\:min-w-64px{min-width:64px;}
.coarse\\:text-18px{font-size:18px;}
.coarse\\:text-3xl{font-size:1.875rem;line-height:2.25rem;}
}`;

  // src/theme.css
  var theme_default = `:root {
  --color-background: #070707;
  --color-surface: #151515;
  --color-elevated: #232323;
  --color-text: #f3f3f3;
  --color-accent: #4da3ff;
  --color-danger: #ffb2a7;
  --color-state-on: #4ec46a;
  --color-state-off: #8c8f96;
  --color-shadow: #000000;

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

  // src/main.tsx
  var READER_WINDOW_SIZE = 10, THEME_STYLE_ID = "ehpeek-theme-style", UNO_STYLE_ID = "ehpeek-uno-style";
  if (ehpeek_uno_default && !document.getElementById(UNO_STYLE_ID)) {
    let style = document.createElement("style");
    style.id = UNO_STYLE_ID, style.textContent = ehpeek_uno_default, document.head.append(style);
  }
  if (theme_default && !document.getElementById(THEME_STYLE_ID)) {
    let style = document.createElement("style");
    style.id = THEME_STYLE_ID, style.textContent = theme_default, document.head.append(style);
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
  applySiteTheme();
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
            className: "textsize-md font-inherit",
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
  function installTouchTopBar() {
    if (document.querySelector(".ehpeek-touch-top-bar"))
      return;
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
  async function installTouchTopBarWhenReady() {
    await waitForInitialUi(), installTouchTopBar();
  }
  settingsState.touchUiEnabled && installTouchTopBarWhenReady();
  settingsState.touchUiEnabled && pageType.type === "favorites" && prepareTouchFavoritesPage();
  function installTouchGalleryPanel() {
    if (document.querySelector(".ehpeek-touch-gallery"))
      return;
    let touchGalleryInfo = readGalleryInfo(TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS);
    if (touchGalleryInfo.available) {
      applyTouchGalleryPanelPageStyle(), prepareTouchGalleryComments();
      let mount = document.createElement("div");
      insertTouchGalleryPanel(mount) || document.body.prepend(mount), R(
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
  async function installTouchGalleryPanelWhenReady() {
    await waitForInitialUi(), installTouchGalleryPanel();
  }
  settingsState.touchUiEnabled && pageType.type === "gallery" && installTouchGalleryPanelWhenReady();
  function installTouchSearchPanel() {
    if (document.querySelector(".ehpeek-touch-search-panel"))
      return !0;
    let touchSearchInfo = readTouchSearchPanelInfo();
    if (!touchSearchInfo)
      return !1;
    let mount = document.createElement("div");
    return insertTouchSearchPanel(mount) ? (prepareTouchSearchPanel(touchSearchInfo, TOUCH_SEARCH_OPTION_CLASS), R(/* @__PURE__ */ k(TouchSearchPanel, { source: touchSearchInfo }), mount), R(/* @__PURE__ */ k(TouchSearchCategoryToggle, { source: touchSearchInfo }), touchSearchInfo.categoryToggleMount), R(/* @__PURE__ */ k(TouchSearchAction, { action: "search", source: touchSearchInfo }), touchSearchInfo.searchActionMount), R(/* @__PURE__ */ k(TouchSearchAction, { action: "clear", source: touchSearchInfo }), touchSearchInfo.clearActionMount), R(/* @__PURE__ */ k(TouchSearchHistory, { source: touchSearchInfo }), touchSearchInfo.historyMount), !0) : !1;
  }
  async function installTouchSearchPanelWhenReady() {
    await waitForSearchUi(), installTouchSearchPanel();
  }
  settingsState.touchUiEnabled && pageType.type === "search" && installTouchSearchPanelWhenReady();
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
  if ((pageType.type === "search" || pageType.type === "favorites") && settingsState.enhanceSearchGridsEnabled) {
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
    let seedPage = landingPages.find((page) => page.pageNum === startPageNum) ?? (await provider.loadDisplayPages([startPageNum]))[0];
    if (!seedPage || seedPage.pageNum !== startPageNum)
      throw new Error(texts_default.errors.imageNotFound);
    let pages = [seedPage], startIndex = 0, lastPageNum = startPageNum, historySession = new ReaderHistorySession({
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
      galleryId: pageType2.galleryId,
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
      onOpenOriginalPage: (page) => {
        historySession.dispose(), window.location.assign(page.url);
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

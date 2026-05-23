import{p as b,_ as st,j as h,a as f,F as Rn,c as zn}from"./vendor-r3f-79d7e21d.js";import{R as lt,r as G,L as Te,B as jn,u as Fn,b as Dn,c as C,N as L}from"./vendor-react-0f206cf5.js";import{m as M,u as Zt,A as en,M as $n}from"./vendor-ui-71103e14.js";import"./vendor-three-e4da4b44.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function n(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(r){if(r.ep)return;r.ep=!0;const i=n(r);fetch(r.href,i)}})();function kt(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter(function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable})),n.push.apply(n,a)}return n}function m(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]!=null?arguments[t]:{};t%2?kt(Object(n),!0).forEach(function(a){P(e,a,n[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):kt(Object(n)).forEach(function(a){Object.defineProperty(e,a,Object.getOwnPropertyDescriptor(n,a))})}return e}function Me(e){return Me=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},Me(e)}function Yn(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function At(e,t){for(var n=0;n<t.length;n++){var a=t[n];a.enumerable=a.enumerable||!1,a.configurable=!0,"value"in a&&(a.writable=!0),Object.defineProperty(e,a.key,a)}}function Un(e,t,n){return t&&At(e.prototype,t),n&&At(e,n),Object.defineProperty(e,"prototype",{writable:!1}),e}function P(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function ft(e,t){return Hn(e)||Bn(e,t)||tn(e,t)||Xn()}function ge(e){return Wn(e)||Gn(e)||tn(e)||Vn()}function Wn(e){if(Array.isArray(e))return Ve(e)}function Hn(e){if(Array.isArray(e))return e}function Gn(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function Bn(e,t){var n=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(n!=null){var a=[],r=!0,i=!1,o,s;try{for(n=n.call(e);!(r=(o=n.next()).done)&&(a.push(o.value),!(t&&a.length===t));r=!0);}catch(l){i=!0,s=l}finally{try{!r&&n.return!=null&&n.return()}finally{if(i)throw s}}return a}}function tn(e,t){if(e){if(typeof e=="string")return Ve(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);if(n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set")return Array.from(e);if(n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return Ve(e,t)}}function Ve(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,a=new Array(t);n<t;n++)a[n]=e[n];return a}function Vn(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Xn(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}var Nt=function(){},ct={},nn={},an=null,rn={mark:Nt,measure:Nt};try{typeof window<"u"&&(ct=window),typeof document<"u"&&(nn=document),typeof MutationObserver<"u"&&(an=MutationObserver),typeof performance<"u"&&(rn=performance)}catch{}var Kn=ct.navigator||{},Ot=Kn.userAgent,Pt=Ot===void 0?"":Ot,B=ct,x=nn,St=an,xe=rn;B.document;var $=!!x.documentElement&&!!x.head&&typeof x.addEventListener=="function"&&typeof x.createElement=="function",on=~Pt.indexOf("MSIE")||~Pt.indexOf("Trident/"),we,ke,Ae,Ne,Oe,j="___FONT_AWESOME___",Xe=16,sn="fa",ln="svg-inline--fa",ee="data-fa-i2svg",Ke="data-fa-pseudo-element",qn="data-fa-pseudo-element-pending",ut="data-prefix",mt="data-icon",Et="fontawesome-i2svg",Qn="async",Jn=["HTML","HEAD","STYLE","SCRIPT"],fn=function(){try{return!0}catch{return!1}}(),y="classic",w="sharp",dt=[y,w];function he(e){return new Proxy(e,{get:function(n,a){return a in n?n[a]:n[y]}})}var me=he((we={},P(we,y,{fa:"solid",fas:"solid","fa-solid":"solid",far:"regular","fa-regular":"regular",fal:"light","fa-light":"light",fat:"thin","fa-thin":"thin",fad:"duotone","fa-duotone":"duotone",fab:"brands","fa-brands":"brands",fak:"kit","fa-kit":"kit"}),P(we,w,{fa:"solid",fass:"solid","fa-solid":"solid",fasr:"regular","fa-regular":"regular"}),we)),de=he((ke={},P(ke,y,{solid:"fas",regular:"far",light:"fal",thin:"fat",duotone:"fad",brands:"fab",kit:"fak"}),P(ke,w,{solid:"fass",regular:"fasr"}),ke)),ve=he((Ae={},P(Ae,y,{fab:"fa-brands",fad:"fa-duotone",fak:"fa-kit",fal:"fa-light",far:"fa-regular",fas:"fa-solid",fat:"fa-thin"}),P(Ae,w,{fass:"fa-solid",fasr:"fa-regular"}),Ae)),Zn=he((Ne={},P(Ne,y,{"fa-brands":"fab","fa-duotone":"fad","fa-kit":"fak","fa-light":"fal","fa-regular":"far","fa-solid":"fas","fa-thin":"fat"}),P(Ne,w,{"fa-solid":"fass","fa-regular":"fasr"}),Ne)),ea=/fa(s|r|l|t|d|b|k|ss|sr)?[\-\ ]/,cn="fa-layers-text",ta=/Font ?Awesome ?([56 ]*)(Solid|Regular|Light|Thin|Duotone|Brands|Free|Pro|Sharp|Kit)?.*/i,na=he((Oe={},P(Oe,y,{900:"fas",400:"far",normal:"far",300:"fal",100:"fat"}),P(Oe,w,{900:"fass",400:"fasr"}),Oe)),un=[1,2,3,4,5,6,7,8,9,10],aa=un.concat([11,12,13,14,15,16,17,18,19,20]),ra=["class","data-prefix","data-icon","data-fa-transform","data-fa-mask"],Q={GROUP:"duotone-group",SWAP_OPACITY:"swap-opacity",PRIMARY:"primary",SECONDARY:"secondary"},pe=new Set;Object.keys(de[y]).map(pe.add.bind(pe));Object.keys(de[w]).map(pe.add.bind(pe));var ia=[].concat(dt,ge(pe),["2xs","xs","sm","lg","xl","2xl","beat","border","fade","beat-fade","bounce","flip-both","flip-horizontal","flip-vertical","flip","fw","inverse","layers-counter","layers-text","layers","li","pull-left","pull-right","pulse","rotate-180","rotate-270","rotate-90","rotate-by","shake","spin-pulse","spin-reverse","spin","stack-1x","stack-2x","stack","ul",Q.GROUP,Q.SWAP_OPACITY,Q.PRIMARY,Q.SECONDARY]).concat(un.map(function(e){return"".concat(e,"x")})).concat(aa.map(function(e){return"w-".concat(e)})),ce=B.FontAwesomeConfig||{};function oa(e){var t=x.querySelector("script["+e+"]");if(t)return t.getAttribute(e)}function sa(e){return e===""?!0:e==="false"?!1:e==="true"?!0:e}if(x&&typeof x.querySelector=="function"){var la=[["data-family-prefix","familyPrefix"],["data-css-prefix","cssPrefix"],["data-family-default","familyDefault"],["data-style-default","styleDefault"],["data-replacement-class","replacementClass"],["data-auto-replace-svg","autoReplaceSvg"],["data-auto-add-css","autoAddCss"],["data-auto-a11y","autoA11y"],["data-search-pseudo-elements","searchPseudoElements"],["data-observe-mutations","observeMutations"],["data-mutate-approach","mutateApproach"],["data-keep-original-source","keepOriginalSource"],["data-measure-performance","measurePerformance"],["data-show-missing-icons","showMissingIcons"]];la.forEach(function(e){var t=ft(e,2),n=t[0],a=t[1],r=sa(oa(n));r!=null&&(ce[a]=r)})}var mn={styleDefault:"solid",familyDefault:"classic",cssPrefix:sn,replacementClass:ln,autoReplaceSvg:!0,autoAddCss:!0,autoA11y:!0,searchPseudoElements:!1,observeMutations:!0,mutateApproach:"async",keepOriginalSource:!0,measurePerformance:!1,showMissingIcons:!0};ce.familyPrefix&&(ce.cssPrefix=ce.familyPrefix);var oe=m(m({},mn),ce);oe.autoReplaceSvg||(oe.observeMutations=!1);var v={};Object.keys(mn).forEach(function(e){Object.defineProperty(v,e,{enumerable:!0,set:function(n){oe[e]=n,ue.forEach(function(a){return a(v)})},get:function(){return oe[e]}})});Object.defineProperty(v,"familyPrefix",{enumerable:!0,set:function(t){oe.cssPrefix=t,ue.forEach(function(n){return n(v)})},get:function(){return oe.cssPrefix}});B.FontAwesomeConfig=v;var ue=[];function fa(e){return ue.push(e),function(){ue.splice(ue.indexOf(e),1)}}var U=Xe,z={size:16,x:0,y:0,rotate:0,flipX:!1,flipY:!1};function ca(e){if(!(!e||!$)){var t=x.createElement("style");t.setAttribute("type","text/css"),t.innerHTML=e;for(var n=x.head.childNodes,a=null,r=n.length-1;r>-1;r--){var i=n[r],o=(i.tagName||"").toUpperCase();["STYLE","LINK"].indexOf(o)>-1&&(a=i)}return x.head.insertBefore(t,a),e}}var ua="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";function be(){for(var e=12,t="";e-- >0;)t+=ua[Math.random()*62|0];return t}function le(e){for(var t=[],n=(e||[]).length>>>0;n--;)t[n]=e[n];return t}function vt(e){return e.classList?le(e.classList):(e.getAttribute("class")||"").split(" ").filter(function(t){return t})}function dn(e){return"".concat(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function ma(e){return Object.keys(e||{}).reduce(function(t,n){return t+"".concat(n,'="').concat(dn(e[n]),'" ')},"").trim()}function je(e){return Object.keys(e||{}).reduce(function(t,n){return t+"".concat(n,": ").concat(e[n].trim(),";")},"")}function pt(e){return e.size!==z.size||e.x!==z.x||e.y!==z.y||e.rotate!==z.rotate||e.flipX||e.flipY}function da(e){var t=e.transform,n=e.containerWidth,a=e.iconWidth,r={transform:"translate(".concat(n/2," 256)")},i="translate(".concat(t.x*32,", ").concat(t.y*32,") "),o="scale(".concat(t.size/16*(t.flipX?-1:1),", ").concat(t.size/16*(t.flipY?-1:1),") "),s="rotate(".concat(t.rotate," 0 0)"),l={transform:"".concat(i," ").concat(o," ").concat(s)},u={transform:"translate(".concat(a/2*-1," -256)")};return{outer:r,inner:l,path:u}}function va(e){var t=e.transform,n=e.width,a=n===void 0?Xe:n,r=e.height,i=r===void 0?Xe:r,o=e.startCentered,s=o===void 0?!1:o,l="";return s&&on?l+="translate(".concat(t.x/U-a/2,"em, ").concat(t.y/U-i/2,"em) "):s?l+="translate(calc(-50% + ".concat(t.x/U,"em), calc(-50% + ").concat(t.y/U,"em)) "):l+="translate(".concat(t.x/U,"em, ").concat(t.y/U,"em) "),l+="scale(".concat(t.size/U*(t.flipX?-1:1),", ").concat(t.size/U*(t.flipY?-1:1),") "),l+="rotate(".concat(t.rotate,"deg) "),l}var pa=`:root, :host {
  --fa-font-solid: normal 900 1em/1 "Font Awesome 6 Solid";
  --fa-font-regular: normal 400 1em/1 "Font Awesome 6 Regular";
  --fa-font-light: normal 300 1em/1 "Font Awesome 6 Light";
  --fa-font-thin: normal 100 1em/1 "Font Awesome 6 Thin";
  --fa-font-duotone: normal 900 1em/1 "Font Awesome 6 Duotone";
  --fa-font-sharp-solid: normal 900 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-regular: normal 400 1em/1 "Font Awesome 6 Sharp";
  --fa-font-brands: normal 400 1em/1 "Font Awesome 6 Brands";
}

svg:not(:root).svg-inline--fa, svg:not(:host).svg-inline--fa {
  overflow: visible;
  box-sizing: content-box;
}

.svg-inline--fa {
  display: var(--fa-display, inline-block);
  height: 1em;
  overflow: visible;
  vertical-align: -0.125em;
}
.svg-inline--fa.fa-2xs {
  vertical-align: 0.1em;
}
.svg-inline--fa.fa-xs {
  vertical-align: 0em;
}
.svg-inline--fa.fa-sm {
  vertical-align: -0.0714285705em;
}
.svg-inline--fa.fa-lg {
  vertical-align: -0.2em;
}
.svg-inline--fa.fa-xl {
  vertical-align: -0.25em;
}
.svg-inline--fa.fa-2xl {
  vertical-align: -0.3125em;
}
.svg-inline--fa.fa-pull-left {
  margin-right: var(--fa-pull-margin, 0.3em);
  width: auto;
}
.svg-inline--fa.fa-pull-right {
  margin-left: var(--fa-pull-margin, 0.3em);
  width: auto;
}
.svg-inline--fa.fa-li {
  width: var(--fa-li-width, 2em);
  top: 0.25em;
}
.svg-inline--fa.fa-fw {
  width: var(--fa-fw-width, 1.25em);
}

.fa-layers svg.svg-inline--fa {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
}

.fa-layers-counter, .fa-layers-text {
  display: inline-block;
  position: absolute;
  text-align: center;
}

.fa-layers {
  display: inline-block;
  height: 1em;
  position: relative;
  text-align: center;
  vertical-align: -0.125em;
  width: 1em;
}
.fa-layers svg.svg-inline--fa {
  -webkit-transform-origin: center center;
          transform-origin: center center;
}

.fa-layers-text {
  left: 50%;
  top: 50%;
  -webkit-transform: translate(-50%, -50%);
          transform: translate(-50%, -50%);
  -webkit-transform-origin: center center;
          transform-origin: center center;
}

.fa-layers-counter {
  background-color: var(--fa-counter-background-color, #ff253a);
  border-radius: var(--fa-counter-border-radius, 1em);
  box-sizing: border-box;
  color: var(--fa-inverse, #fff);
  line-height: var(--fa-counter-line-height, 1);
  max-width: var(--fa-counter-max-width, 5em);
  min-width: var(--fa-counter-min-width, 1.5em);
  overflow: hidden;
  padding: var(--fa-counter-padding, 0.25em 0.5em);
  right: var(--fa-right, 0);
  text-overflow: ellipsis;
  top: var(--fa-top, 0);
  -webkit-transform: scale(var(--fa-counter-scale, 0.25));
          transform: scale(var(--fa-counter-scale, 0.25));
  -webkit-transform-origin: top right;
          transform-origin: top right;
}

.fa-layers-bottom-right {
  bottom: var(--fa-bottom, 0);
  right: var(--fa-right, 0);
  top: auto;
  -webkit-transform: scale(var(--fa-layers-scale, 0.25));
          transform: scale(var(--fa-layers-scale, 0.25));
  -webkit-transform-origin: bottom right;
          transform-origin: bottom right;
}

.fa-layers-bottom-left {
  bottom: var(--fa-bottom, 0);
  left: var(--fa-left, 0);
  right: auto;
  top: auto;
  -webkit-transform: scale(var(--fa-layers-scale, 0.25));
          transform: scale(var(--fa-layers-scale, 0.25));
  -webkit-transform-origin: bottom left;
          transform-origin: bottom left;
}

.fa-layers-top-right {
  top: var(--fa-top, 0);
  right: var(--fa-right, 0);
  -webkit-transform: scale(var(--fa-layers-scale, 0.25));
          transform: scale(var(--fa-layers-scale, 0.25));
  -webkit-transform-origin: top right;
          transform-origin: top right;
}

.fa-layers-top-left {
  left: var(--fa-left, 0);
  right: auto;
  top: var(--fa-top, 0);
  -webkit-transform: scale(var(--fa-layers-scale, 0.25));
          transform: scale(var(--fa-layers-scale, 0.25));
  -webkit-transform-origin: top left;
          transform-origin: top left;
}

.fa-1x {
  font-size: 1em;
}

.fa-2x {
  font-size: 2em;
}

.fa-3x {
  font-size: 3em;
}

.fa-4x {
  font-size: 4em;
}

.fa-5x {
  font-size: 5em;
}

.fa-6x {
  font-size: 6em;
}

.fa-7x {
  font-size: 7em;
}

.fa-8x {
  font-size: 8em;
}

.fa-9x {
  font-size: 9em;
}

.fa-10x {
  font-size: 10em;
}

.fa-2xs {
  font-size: 0.625em;
  line-height: 0.1em;
  vertical-align: 0.225em;
}

.fa-xs {
  font-size: 0.75em;
  line-height: 0.0833333337em;
  vertical-align: 0.125em;
}

.fa-sm {
  font-size: 0.875em;
  line-height: 0.0714285718em;
  vertical-align: 0.0535714295em;
}

.fa-lg {
  font-size: 1.25em;
  line-height: 0.05em;
  vertical-align: -0.075em;
}

.fa-xl {
  font-size: 1.5em;
  line-height: 0.0416666682em;
  vertical-align: -0.125em;
}

.fa-2xl {
  font-size: 2em;
  line-height: 0.03125em;
  vertical-align: -0.1875em;
}

.fa-fw {
  text-align: center;
  width: 1.25em;
}

.fa-ul {
  list-style-type: none;
  margin-left: var(--fa-li-margin, 2.5em);
  padding-left: 0;
}
.fa-ul > li {
  position: relative;
}

.fa-li {
  left: calc(var(--fa-li-width, 2em) * -1);
  position: absolute;
  text-align: center;
  width: var(--fa-li-width, 2em);
  line-height: inherit;
}

.fa-border {
  border-color: var(--fa-border-color, #eee);
  border-radius: var(--fa-border-radius, 0.1em);
  border-style: var(--fa-border-style, solid);
  border-width: var(--fa-border-width, 0.08em);
  padding: var(--fa-border-padding, 0.2em 0.25em 0.15em);
}

.fa-pull-left {
  float: left;
  margin-right: var(--fa-pull-margin, 0.3em);
}

.fa-pull-right {
  float: right;
  margin-left: var(--fa-pull-margin, 0.3em);
}

.fa-beat {
  -webkit-animation-name: fa-beat;
          animation-name: fa-beat;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, ease-in-out);
          animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-bounce {
  -webkit-animation-name: fa-bounce;
          animation-name: fa-bounce;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.28, 0.84, 0.42, 1));
          animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.28, 0.84, 0.42, 1));
}

.fa-fade {
  -webkit-animation-name: fa-fade;
          animation-name: fa-fade;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
          animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-beat-fade {
  -webkit-animation-name: fa-beat-fade;
          animation-name: fa-beat-fade;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
          animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-flip {
  -webkit-animation-name: fa-flip;
          animation-name: fa-flip;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, ease-in-out);
          animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-shake {
  -webkit-animation-name: fa-shake;
          animation-name: fa-shake;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, linear);
          animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin {
  -webkit-animation-name: fa-spin;
          animation-name: fa-spin;
  -webkit-animation-delay: var(--fa-animation-delay, 0s);
          animation-delay: var(--fa-animation-delay, 0s);
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 2s);
          animation-duration: var(--fa-animation-duration, 2s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, linear);
          animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin-reverse {
  --fa-animation-direction: reverse;
}

.fa-pulse,
.fa-spin-pulse {
  -webkit-animation-name: fa-spin;
          animation-name: fa-spin;
  -webkit-animation-direction: var(--fa-animation-direction, normal);
          animation-direction: var(--fa-animation-direction, normal);
  -webkit-animation-duration: var(--fa-animation-duration, 1s);
          animation-duration: var(--fa-animation-duration, 1s);
  -webkit-animation-iteration-count: var(--fa-animation-iteration-count, infinite);
          animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  -webkit-animation-timing-function: var(--fa-animation-timing, steps(8));
          animation-timing-function: var(--fa-animation-timing, steps(8));
}

@media (prefers-reduced-motion: reduce) {
  .fa-beat,
.fa-bounce,
.fa-fade,
.fa-beat-fade,
.fa-flip,
.fa-pulse,
.fa-shake,
.fa-spin,
.fa-spin-pulse {
    -webkit-animation-delay: -1ms;
            animation-delay: -1ms;
    -webkit-animation-duration: 1ms;
            animation-duration: 1ms;
    -webkit-animation-iteration-count: 1;
            animation-iteration-count: 1;
    -webkit-transition-delay: 0s;
            transition-delay: 0s;
    -webkit-transition-duration: 0s;
            transition-duration: 0s;
  }
}
@-webkit-keyframes fa-beat {
  0%, 90% {
    -webkit-transform: scale(1);
            transform: scale(1);
  }
  45% {
    -webkit-transform: scale(var(--fa-beat-scale, 1.25));
            transform: scale(var(--fa-beat-scale, 1.25));
  }
}
@keyframes fa-beat {
  0%, 90% {
    -webkit-transform: scale(1);
            transform: scale(1);
  }
  45% {
    -webkit-transform: scale(var(--fa-beat-scale, 1.25));
            transform: scale(var(--fa-beat-scale, 1.25));
  }
}
@-webkit-keyframes fa-bounce {
  0% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
  10% {
    -webkit-transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
            transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
  }
  30% {
    -webkit-transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
            transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
  }
  50% {
    -webkit-transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
            transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
  }
  57% {
    -webkit-transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
            transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
  }
  64% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
  100% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
}
@keyframes fa-bounce {
  0% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
  10% {
    -webkit-transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
            transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
  }
  30% {
    -webkit-transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
            transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
  }
  50% {
    -webkit-transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
            transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
  }
  57% {
    -webkit-transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
            transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
  }
  64% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
  100% {
    -webkit-transform: scale(1, 1) translateY(0);
            transform: scale(1, 1) translateY(0);
  }
}
@-webkit-keyframes fa-fade {
  50% {
    opacity: var(--fa-fade-opacity, 0.4);
  }
}
@keyframes fa-fade {
  50% {
    opacity: var(--fa-fade-opacity, 0.4);
  }
}
@-webkit-keyframes fa-beat-fade {
  0%, 100% {
    opacity: var(--fa-beat-fade-opacity, 0.4);
    -webkit-transform: scale(1);
            transform: scale(1);
  }
  50% {
    opacity: 1;
    -webkit-transform: scale(var(--fa-beat-fade-scale, 1.125));
            transform: scale(var(--fa-beat-fade-scale, 1.125));
  }
}
@keyframes fa-beat-fade {
  0%, 100% {
    opacity: var(--fa-beat-fade-opacity, 0.4);
    -webkit-transform: scale(1);
            transform: scale(1);
  }
  50% {
    opacity: 1;
    -webkit-transform: scale(var(--fa-beat-fade-scale, 1.125));
            transform: scale(var(--fa-beat-fade-scale, 1.125));
  }
}
@-webkit-keyframes fa-flip {
  50% {
    -webkit-transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
            transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
  }
}
@keyframes fa-flip {
  50% {
    -webkit-transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
            transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
  }
}
@-webkit-keyframes fa-shake {
  0% {
    -webkit-transform: rotate(-15deg);
            transform: rotate(-15deg);
  }
  4% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  8%, 24% {
    -webkit-transform: rotate(-18deg);
            transform: rotate(-18deg);
  }
  12%, 28% {
    -webkit-transform: rotate(18deg);
            transform: rotate(18deg);
  }
  16% {
    -webkit-transform: rotate(-22deg);
            transform: rotate(-22deg);
  }
  20% {
    -webkit-transform: rotate(22deg);
            transform: rotate(22deg);
  }
  32% {
    -webkit-transform: rotate(-12deg);
            transform: rotate(-12deg);
  }
  36% {
    -webkit-transform: rotate(12deg);
            transform: rotate(12deg);
  }
  40%, 100% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
}
@keyframes fa-shake {
  0% {
    -webkit-transform: rotate(-15deg);
            transform: rotate(-15deg);
  }
  4% {
    -webkit-transform: rotate(15deg);
            transform: rotate(15deg);
  }
  8%, 24% {
    -webkit-transform: rotate(-18deg);
            transform: rotate(-18deg);
  }
  12%, 28% {
    -webkit-transform: rotate(18deg);
            transform: rotate(18deg);
  }
  16% {
    -webkit-transform: rotate(-22deg);
            transform: rotate(-22deg);
  }
  20% {
    -webkit-transform: rotate(22deg);
            transform: rotate(22deg);
  }
  32% {
    -webkit-transform: rotate(-12deg);
            transform: rotate(-12deg);
  }
  36% {
    -webkit-transform: rotate(12deg);
            transform: rotate(12deg);
  }
  40%, 100% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
}
@-webkit-keyframes fa-spin {
  0% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
            transform: rotate(360deg);
  }
}
@keyframes fa-spin {
  0% {
    -webkit-transform: rotate(0deg);
            transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
            transform: rotate(360deg);
  }
}
.fa-rotate-90 {
  -webkit-transform: rotate(90deg);
          transform: rotate(90deg);
}

.fa-rotate-180 {
  -webkit-transform: rotate(180deg);
          transform: rotate(180deg);
}

.fa-rotate-270 {
  -webkit-transform: rotate(270deg);
          transform: rotate(270deg);
}

.fa-flip-horizontal {
  -webkit-transform: scale(-1, 1);
          transform: scale(-1, 1);
}

.fa-flip-vertical {
  -webkit-transform: scale(1, -1);
          transform: scale(1, -1);
}

.fa-flip-both,
.fa-flip-horizontal.fa-flip-vertical {
  -webkit-transform: scale(-1, -1);
          transform: scale(-1, -1);
}

.fa-rotate-by {
  -webkit-transform: rotate(var(--fa-rotate-angle, none));
          transform: rotate(var(--fa-rotate-angle, none));
}

.fa-stack {
  display: inline-block;
  vertical-align: middle;
  height: 2em;
  position: relative;
  width: 2.5em;
}

.fa-stack-1x,
.fa-stack-2x {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
  z-index: var(--fa-stack-z-index, auto);
}

.svg-inline--fa.fa-stack-1x {
  height: 1em;
  width: 1.25em;
}
.svg-inline--fa.fa-stack-2x {
  height: 2em;
  width: 2.5em;
}

.fa-inverse {
  color: var(--fa-inverse, #fff);
}

.sr-only,
.fa-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only-focusable:not(:focus),
.fa-sr-only-focusable:not(:focus) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.svg-inline--fa .fa-primary {
  fill: var(--fa-primary-color, currentColor);
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa .fa-secondary {
  fill: var(--fa-secondary-color, currentColor);
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-primary {
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-secondary {
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa mask .fa-primary,
.svg-inline--fa mask .fa-secondary {
  fill: black;
}

.fad.fa-inverse,
.fa-duotone.fa-inverse {
  color: var(--fa-inverse, #fff);
}`;function vn(){var e=sn,t=ln,n=v.cssPrefix,a=v.replacementClass,r=pa;if(n!==e||a!==t){var i=new RegExp("\\.".concat(e,"\\-"),"g"),o=new RegExp("\\--".concat(e,"\\-"),"g"),s=new RegExp("\\.".concat(t),"g");r=r.replace(i,".".concat(n,"-")).replace(o,"--".concat(n,"-")).replace(s,".".concat(a))}return r}var It=!1;function Ue(){v.autoAddCss&&!It&&(ca(vn()),It=!0)}var ba={mixout:function(){return{dom:{css:vn,insertCss:Ue}}},hooks:function(){return{beforeDOMElementCreation:function(){Ue()},beforeI2svg:function(){Ue()}}}},F=B||{};F[j]||(F[j]={});F[j].styles||(F[j].styles={});F[j].hooks||(F[j].hooks={});F[j].shims||(F[j].shims=[]);var R=F[j],pn=[],ga=function e(){x.removeEventListener("DOMContentLoaded",e),Le=1,pn.map(function(t){return t()})},Le=!1;$&&(Le=(x.documentElement.doScroll?/^loaded|^c/:/^loaded|^i|^c/).test(x.readyState),Le||x.addEventListener("DOMContentLoaded",ga));function ha(e){$&&(Le?setTimeout(e,0):pn.push(e))}function ye(e){var t=e.tag,n=e.attributes,a=n===void 0?{}:n,r=e.children,i=r===void 0?[]:r;return typeof e=="string"?dn(e):"<".concat(t," ").concat(ma(a),">").concat(i.map(ye).join(""),"</").concat(t,">")}function Ct(e,t,n){if(e&&e[t]&&e[t][n])return{prefix:t,iconName:n,icon:e[t][n]}}var ya=function(t,n){return function(a,r,i,o){return t.call(n,a,r,i,o)}},We=function(t,n,a,r){var i=Object.keys(t),o=i.length,s=r!==void 0?ya(n,r):n,l,u,c;for(a===void 0?(l=1,c=t[i[0]]):(l=0,c=a);l<o;l++)u=i[l],c=s(c,t[u],u,t);return c};function xa(e){for(var t=[],n=0,a=e.length;n<a;){var r=e.charCodeAt(n++);if(r>=55296&&r<=56319&&n<a){var i=e.charCodeAt(n++);(i&64512)==56320?t.push(((r&1023)<<10)+(i&1023)+65536):(t.push(r),n--)}else t.push(r)}return t}function qe(e){var t=xa(e);return t.length===1?t[0].toString(16):null}function wa(e,t){var n=e.length,a=e.charCodeAt(t),r;return a>=55296&&a<=56319&&n>t+1&&(r=e.charCodeAt(t+1),r>=56320&&r<=57343)?(a-55296)*1024+r-56320+65536:a}function _t(e){return Object.keys(e).reduce(function(t,n){var a=e[n],r=!!a.icon;return r?t[a.iconName]=a.icon:t[n]=a,t},{})}function Qe(e,t){var n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},a=n.skipHooks,r=a===void 0?!1:a,i=_t(t);typeof R.hooks.addPack=="function"&&!r?R.hooks.addPack(e,_t(t)):R.styles[e]=m(m({},R.styles[e]||{}),i),e==="fas"&&Qe("fa",t)}var Pe,Se,Ee,ne=R.styles,ka=R.shims,Aa=(Pe={},P(Pe,y,Object.values(ve[y])),P(Pe,w,Object.values(ve[w])),Pe),bt=null,bn={},gn={},hn={},yn={},xn={},Na=(Se={},P(Se,y,Object.keys(me[y])),P(Se,w,Object.keys(me[w])),Se);function Oa(e){return~ia.indexOf(e)}function Pa(e,t){var n=t.split("-"),a=n[0],r=n.slice(1).join("-");return a===e&&r!==""&&!Oa(r)?r:null}var wn=function(){var t=function(i){return We(ne,function(o,s,l){return o[l]=We(s,i,{}),o},{})};bn=t(function(r,i,o){if(i[3]&&(r[i[3]]=o),i[2]){var s=i[2].filter(function(l){return typeof l=="number"});s.forEach(function(l){r[l.toString(16)]=o})}return r}),gn=t(function(r,i,o){if(r[o]=o,i[2]){var s=i[2].filter(function(l){return typeof l=="string"});s.forEach(function(l){r[l]=o})}return r}),xn=t(function(r,i,o){var s=i[2];return r[o]=o,s.forEach(function(l){r[l]=o}),r});var n="far"in ne||v.autoFetchSvg,a=We(ka,function(r,i){var o=i[0],s=i[1],l=i[2];return s==="far"&&!n&&(s="fas"),typeof o=="string"&&(r.names[o]={prefix:s,iconName:l}),typeof o=="number"&&(r.unicodes[o.toString(16)]={prefix:s,iconName:l}),r},{names:{},unicodes:{}});hn=a.names,yn=a.unicodes,bt=Fe(v.styleDefault,{family:v.familyDefault})};fa(function(e){bt=Fe(e.styleDefault,{family:v.familyDefault})});wn();function gt(e,t){return(bn[e]||{})[t]}function Sa(e,t){return(gn[e]||{})[t]}function J(e,t){return(xn[e]||{})[t]}function kn(e){return hn[e]||{prefix:null,iconName:null}}function Ea(e){var t=yn[e],n=gt("fas",e);return t||(n?{prefix:"fas",iconName:n}:null)||{prefix:null,iconName:null}}function V(){return bt}var ht=function(){return{prefix:null,iconName:null,rest:[]}};function Fe(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},n=t.family,a=n===void 0?y:n,r=me[a][e],i=de[a][e]||de[a][r],o=e in R.styles?e:null;return i||o||null}var Tt=(Ee={},P(Ee,y,Object.keys(ve[y])),P(Ee,w,Object.keys(ve[w])),Ee);function De(e){var t,n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},a=n.skipLookups,r=a===void 0?!1:a,i=(t={},P(t,y,"".concat(v.cssPrefix,"-").concat(y)),P(t,w,"".concat(v.cssPrefix,"-").concat(w)),t),o=null,s=y;(e.includes(i[y])||e.some(function(u){return Tt[y].includes(u)}))&&(s=y),(e.includes(i[w])||e.some(function(u){return Tt[w].includes(u)}))&&(s=w);var l=e.reduce(function(u,c){var d=Pa(v.cssPrefix,c);if(ne[c]?(c=Aa[s].includes(c)?Zn[s][c]:c,o=c,u.prefix=c):Na[s].indexOf(c)>-1?(o=c,u.prefix=Fe(c,{family:s})):d?u.iconName=d:c!==v.replacementClass&&c!==i[y]&&c!==i[w]&&u.rest.push(c),!r&&u.prefix&&u.iconName){var p=o==="fa"?kn(u.iconName):{},g=J(u.prefix,u.iconName);p.prefix&&(o=null),u.iconName=p.iconName||g||u.iconName,u.prefix=p.prefix||u.prefix,u.prefix==="far"&&!ne.far&&ne.fas&&!v.autoFetchSvg&&(u.prefix="fas")}return u},ht());return(e.includes("fa-brands")||e.includes("fab"))&&(l.prefix="fab"),(e.includes("fa-duotone")||e.includes("fad"))&&(l.prefix="fad"),!l.prefix&&s===w&&(ne.fass||v.autoFetchSvg)&&(l.prefix="fass",l.iconName=J(l.prefix,l.iconName)||l.iconName),(l.prefix==="fa"||o==="fa")&&(l.prefix=V()||"fas"),l}var Ia=function(){function e(){Yn(this,e),this.definitions={}}return Un(e,[{key:"add",value:function(){for(var n=this,a=arguments.length,r=new Array(a),i=0;i<a;i++)r[i]=arguments[i];var o=r.reduce(this._pullDefinitions,{});Object.keys(o).forEach(function(s){n.definitions[s]=m(m({},n.definitions[s]||{}),o[s]),Qe(s,o[s]);var l=ve[y][s];l&&Qe(l,o[s]),wn()})}},{key:"reset",value:function(){this.definitions={}}},{key:"_pullDefinitions",value:function(n,a){var r=a.prefix&&a.iconName&&a.icon?{0:a}:a;return Object.keys(r).map(function(i){var o=r[i],s=o.prefix,l=o.iconName,u=o.icon,c=u[2];n[s]||(n[s]={}),c.length>0&&c.forEach(function(d){typeof d=="string"&&(n[s][d]=u)}),n[s][l]=u}),n}}]),e}(),Mt=[],ae={},ie={},Ca=Object.keys(ie);function _a(e,t){var n=t.mixoutsTo;return Mt=e,ae={},Object.keys(ie).forEach(function(a){Ca.indexOf(a)===-1&&delete ie[a]}),Mt.forEach(function(a){var r=a.mixout?a.mixout():{};if(Object.keys(r).forEach(function(o){typeof r[o]=="function"&&(n[o]=r[o]),Me(r[o])==="object"&&Object.keys(r[o]).forEach(function(s){n[o]||(n[o]={}),n[o][s]=r[o][s]})}),a.hooks){var i=a.hooks();Object.keys(i).forEach(function(o){ae[o]||(ae[o]=[]),ae[o].push(i[o])})}a.provides&&a.provides(ie)}),n}function Je(e,t){for(var n=arguments.length,a=new Array(n>2?n-2:0),r=2;r<n;r++)a[r-2]=arguments[r];var i=ae[e]||[];return i.forEach(function(o){t=o.apply(null,[t].concat(a))}),t}function te(e){for(var t=arguments.length,n=new Array(t>1?t-1:0),a=1;a<t;a++)n[a-1]=arguments[a];var r=ae[e]||[];r.forEach(function(i){i.apply(null,n)})}function D(){var e=arguments[0],t=Array.prototype.slice.call(arguments,1);return ie[e]?ie[e].apply(null,t):void 0}function Ze(e){e.prefix==="fa"&&(e.prefix="fas");var t=e.iconName,n=e.prefix||V();if(t)return t=J(n,t)||t,Ct(An.definitions,n,t)||Ct(R.styles,n,t)}var An=new Ia,Ta=function(){v.autoReplaceSvg=!1,v.observeMutations=!1,te("noAuto")},Ma={i2svg:function(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};return $?(te("beforeI2svg",t),D("pseudoElements2svg",t),D("i2svg",t)):Promise.reject("Operation requires a DOM of some kind.")},watch:function(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},n=t.autoReplaceSvgRoot;v.autoReplaceSvg===!1&&(v.autoReplaceSvg=!0),v.observeMutations=!0,ha(function(){Ra({autoReplaceSvgRoot:n}),te("watch",t)})}},La={icon:function(t){if(t===null)return null;if(Me(t)==="object"&&t.prefix&&t.iconName)return{prefix:t.prefix,iconName:J(t.prefix,t.iconName)||t.iconName};if(Array.isArray(t)&&t.length===2){var n=t[1].indexOf("fa-")===0?t[1].slice(3):t[1],a=Fe(t[0]);return{prefix:a,iconName:J(a,n)||n}}if(typeof t=="string"&&(t.indexOf("".concat(v.cssPrefix,"-"))>-1||t.match(ea))){var r=De(t.split(" "),{skipLookups:!0});return{prefix:r.prefix||V(),iconName:J(r.prefix,r.iconName)||r.iconName}}if(typeof t=="string"){var i=V();return{prefix:i,iconName:J(i,t)||t}}}},T={noAuto:Ta,config:v,dom:Ma,parse:La,library:An,findIconDefinition:Ze,toHtml:ye},Ra=function(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},n=t.autoReplaceSvgRoot,a=n===void 0?x:n;(Object.keys(R.styles).length>0||v.autoFetchSvg)&&$&&v.autoReplaceSvg&&T.dom.i2svg({node:a})};function $e(e,t){return Object.defineProperty(e,"abstract",{get:t}),Object.defineProperty(e,"html",{get:function(){return e.abstract.map(function(a){return ye(a)})}}),Object.defineProperty(e,"node",{get:function(){if($){var a=x.createElement("div");return a.innerHTML=e.html,a.children}}}),e}function za(e){var t=e.children,n=e.main,a=e.mask,r=e.attributes,i=e.styles,o=e.transform;if(pt(o)&&n.found&&!a.found){var s=n.width,l=n.height,u={x:s/l/2,y:.5};r.style=je(m(m({},i),{},{"transform-origin":"".concat(u.x+o.x/16,"em ").concat(u.y+o.y/16,"em")}))}return[{tag:"svg",attributes:r,children:t}]}function ja(e){var t=e.prefix,n=e.iconName,a=e.children,r=e.attributes,i=e.symbol,o=i===!0?"".concat(t,"-").concat(v.cssPrefix,"-").concat(n):i;return[{tag:"svg",attributes:{style:"display: none;"},children:[{tag:"symbol",attributes:m(m({},r),{},{id:o}),children:a}]}]}function yt(e){var t=e.icons,n=t.main,a=t.mask,r=e.prefix,i=e.iconName,o=e.transform,s=e.symbol,l=e.title,u=e.maskId,c=e.titleId,d=e.extra,p=e.watchable,g=p===void 0?!1:p,N=a.found?a:n,E=N.width,k=N.height,I=r==="fak",A=[v.replacementClass,i?"".concat(v.cssPrefix,"-").concat(i):""].filter(function(Y){return d.classes.indexOf(Y)===-1}).filter(function(Y){return Y!==""||!!Y}).concat(d.classes).join(" "),O={children:[],attributes:m(m({},d.attributes),{},{"data-prefix":r,"data-icon":i,class:A,role:d.attributes.role||"img",xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 ".concat(E," ").concat(k)})},_=I&&!~d.classes.indexOf("fa-fw")?{width:"".concat(E/k*16*.0625,"em")}:{};g&&(O.attributes[ee]=""),l&&(O.children.push({tag:"title",attributes:{id:O.attributes["aria-labelledby"]||"title-".concat(c||be())},children:[l]}),delete O.attributes.title);var S=m(m({},O),{},{prefix:r,iconName:i,main:n,mask:a,maskId:u,transform:o,symbol:s,styles:m(m({},_),d.styles)}),K=a.found&&n.found?D("generateAbstractMask",S)||{children:[],attributes:{}}:D("generateAbstractIcon",S)||{children:[],attributes:{}},q=K.children,Ye=K.attributes;return S.children=q,S.attributes=Ye,s?ja(S):za(S)}function Lt(e){var t=e.content,n=e.width,a=e.height,r=e.transform,i=e.title,o=e.extra,s=e.watchable,l=s===void 0?!1:s,u=m(m(m({},o.attributes),i?{title:i}:{}),{},{class:o.classes.join(" ")});l&&(u[ee]="");var c=m({},o.styles);pt(r)&&(c.transform=va({transform:r,startCentered:!0,width:n,height:a}),c["-webkit-transform"]=c.transform);var d=je(c);d.length>0&&(u.style=d);var p=[];return p.push({tag:"span",attributes:u,children:[t]}),i&&p.push({tag:"span",attributes:{class:"sr-only"},children:[i]}),p}function Fa(e){var t=e.content,n=e.title,a=e.extra,r=m(m(m({},a.attributes),n?{title:n}:{}),{},{class:a.classes.join(" ")}),i=je(a.styles);i.length>0&&(r.style=i);var o=[];return o.push({tag:"span",attributes:r,children:[t]}),n&&o.push({tag:"span",attributes:{class:"sr-only"},children:[n]}),o}var He=R.styles;function et(e){var t=e[0],n=e[1],a=e.slice(4),r=ft(a,1),i=r[0],o=null;return Array.isArray(i)?o={tag:"g",attributes:{class:"".concat(v.cssPrefix,"-").concat(Q.GROUP)},children:[{tag:"path",attributes:{class:"".concat(v.cssPrefix,"-").concat(Q.SECONDARY),fill:"currentColor",d:i[0]}},{tag:"path",attributes:{class:"".concat(v.cssPrefix,"-").concat(Q.PRIMARY),fill:"currentColor",d:i[1]}}]}:o={tag:"path",attributes:{fill:"currentColor",d:i}},{found:!0,width:t,height:n,icon:o}}var Da={found:!1,width:512,height:512};function $a(e,t){!fn&&!v.showMissingIcons&&e&&console.error('Icon with name "'.concat(e,'" and prefix "').concat(t,'" is missing.'))}function tt(e,t){var n=t;return t==="fa"&&v.styleDefault!==null&&(t=V()),new Promise(function(a,r){if(D("missingIconAbstract"),n==="fa"){var i=kn(e)||{};e=i.iconName||e,t=i.prefix||t}if(e&&t&&He[t]&&He[t][e]){var o=He[t][e];return a(et(o))}$a(e,t),a(m(m({},Da),{},{icon:v.showMissingIcons&&e?D("missingIconAbstract")||{}:{}}))})}var Rt=function(){},nt=v.measurePerformance&&xe&&xe.mark&&xe.measure?xe:{mark:Rt,measure:Rt},fe='FA "6.3.0"',Ya=function(t){return nt.mark("".concat(fe," ").concat(t," begins")),function(){return Nn(t)}},Nn=function(t){nt.mark("".concat(fe," ").concat(t," ends")),nt.measure("".concat(fe," ").concat(t),"".concat(fe," ").concat(t," begins"),"".concat(fe," ").concat(t," ends"))},xt={begin:Ya,end:Nn},Ce=function(){};function zt(e){var t=e.getAttribute?e.getAttribute(ee):null;return typeof t=="string"}function Ua(e){var t=e.getAttribute?e.getAttribute(ut):null,n=e.getAttribute?e.getAttribute(mt):null;return t&&n}function Wa(e){return e&&e.classList&&e.classList.contains&&e.classList.contains(v.replacementClass)}function Ha(){if(v.autoReplaceSvg===!0)return _e.replace;var e=_e[v.autoReplaceSvg];return e||_e.replace}function Ga(e){return x.createElementNS("http://www.w3.org/2000/svg",e)}function Ba(e){return x.createElement(e)}function On(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},n=t.ceFn,a=n===void 0?e.tag==="svg"?Ga:Ba:n;if(typeof e=="string")return x.createTextNode(e);var r=a(e.tag);Object.keys(e.attributes||[]).forEach(function(o){r.setAttribute(o,e.attributes[o])});var i=e.children||[];return i.forEach(function(o){r.appendChild(On(o,{ceFn:a}))}),r}function Va(e){var t=" ".concat(e.outerHTML," ");return t="".concat(t,"Font Awesome fontawesome.com "),t}var _e={replace:function(t){var n=t[0];if(n.parentNode)if(t[1].forEach(function(r){n.parentNode.insertBefore(On(r),n)}),n.getAttribute(ee)===null&&v.keepOriginalSource){var a=x.createComment(Va(n));n.parentNode.replaceChild(a,n)}else n.remove()},nest:function(t){var n=t[0],a=t[1];if(~vt(n).indexOf(v.replacementClass))return _e.replace(t);var r=new RegExp("".concat(v.cssPrefix,"-.*"));if(delete a[0].attributes.id,a[0].attributes.class){var i=a[0].attributes.class.split(" ").reduce(function(s,l){return l===v.replacementClass||l.match(r)?s.toSvg.push(l):s.toNode.push(l),s},{toNode:[],toSvg:[]});a[0].attributes.class=i.toSvg.join(" "),i.toNode.length===0?n.removeAttribute("class"):n.setAttribute("class",i.toNode.join(" "))}var o=a.map(function(s){return ye(s)}).join(`
`);n.setAttribute(ee,""),n.innerHTML=o}};function jt(e){e()}function Pn(e,t){var n=typeof t=="function"?t:Ce;if(e.length===0)n();else{var a=jt;v.mutateApproach===Qn&&(a=B.requestAnimationFrame||jt),a(function(){var r=Ha(),i=xt.begin("mutate");e.map(r),i(),n()})}}var wt=!1;function Sn(){wt=!0}function at(){wt=!1}var Re=null;function Ft(e){if(St&&v.observeMutations){var t=e.treeCallback,n=t===void 0?Ce:t,a=e.nodeCallback,r=a===void 0?Ce:a,i=e.pseudoElementsCallback,o=i===void 0?Ce:i,s=e.observeMutationsRoot,l=s===void 0?x:s;Re=new St(function(u){if(!wt){var c=V();le(u).forEach(function(d){if(d.type==="childList"&&d.addedNodes.length>0&&!zt(d.addedNodes[0])&&(v.searchPseudoElements&&o(d.target),n(d.target)),d.type==="attributes"&&d.target.parentNode&&v.searchPseudoElements&&o(d.target.parentNode),d.type==="attributes"&&zt(d.target)&&~ra.indexOf(d.attributeName))if(d.attributeName==="class"&&Ua(d.target)){var p=De(vt(d.target)),g=p.prefix,N=p.iconName;d.target.setAttribute(ut,g||c),N&&d.target.setAttribute(mt,N)}else Wa(d.target)&&r(d.target)})}}),$&&Re.observe(l,{childList:!0,attributes:!0,characterData:!0,subtree:!0})}}function Xa(){Re&&Re.disconnect()}function Ka(e){var t=e.getAttribute("style"),n=[];return t&&(n=t.split(";").reduce(function(a,r){var i=r.split(":"),o=i[0],s=i.slice(1);return o&&s.length>0&&(a[o]=s.join(":").trim()),a},{})),n}function qa(e){var t=e.getAttribute("data-prefix"),n=e.getAttribute("data-icon"),a=e.innerText!==void 0?e.innerText.trim():"",r=De(vt(e));return r.prefix||(r.prefix=V()),t&&n&&(r.prefix=t,r.iconName=n),r.iconName&&r.prefix||(r.prefix&&a.length>0&&(r.iconName=Sa(r.prefix,e.innerText)||gt(r.prefix,qe(e.innerText))),!r.iconName&&v.autoFetchSvg&&e.firstChild&&e.firstChild.nodeType===Node.TEXT_NODE&&(r.iconName=e.firstChild.data)),r}function Qa(e){var t=le(e.attributes).reduce(function(r,i){return r.name!=="class"&&r.name!=="style"&&(r[i.name]=i.value),r},{}),n=e.getAttribute("title"),a=e.getAttribute("data-fa-title-id");return v.autoA11y&&(n?t["aria-labelledby"]="".concat(v.replacementClass,"-title-").concat(a||be()):(t["aria-hidden"]="true",t.focusable="false")),t}function Ja(){return{iconName:null,title:null,titleId:null,prefix:null,transform:z,symbol:!1,mask:{iconName:null,prefix:null,rest:[]},maskId:null,extra:{classes:[],styles:{},attributes:{}}}}function Dt(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{styleParser:!0},n=qa(e),a=n.iconName,r=n.prefix,i=n.rest,o=Qa(e),s=Je("parseNodeAttributes",{},e),l=t.styleParser?Ka(e):[];return m({iconName:a,title:e.getAttribute("title"),titleId:e.getAttribute("data-fa-title-id"),prefix:r,transform:z,mask:{iconName:null,prefix:null,rest:[]},maskId:null,symbol:!1,extra:{classes:i,styles:l,attributes:o}},s)}var Za=R.styles;function En(e){var t=v.autoReplaceSvg==="nest"?Dt(e,{styleParser:!1}):Dt(e);return~t.extra.classes.indexOf(cn)?D("generateLayersText",e,t):D("generateSvgReplacementMutation",e,t)}var X=new Set;dt.map(function(e){X.add("fa-".concat(e))});Object.keys(me[y]).map(X.add.bind(X));Object.keys(me[w]).map(X.add.bind(X));X=ge(X);function $t(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;if(!$)return Promise.resolve();var n=x.documentElement.classList,a=function(d){return n.add("".concat(Et,"-").concat(d))},r=function(d){return n.remove("".concat(Et,"-").concat(d))},i=v.autoFetchSvg?X:dt.map(function(c){return"fa-".concat(c)}).concat(Object.keys(Za));i.includes("fa")||i.push("fa");var o=[".".concat(cn,":not([").concat(ee,"])")].concat(i.map(function(c){return".".concat(c,":not([").concat(ee,"])")})).join(", ");if(o.length===0)return Promise.resolve();var s=[];try{s=le(e.querySelectorAll(o))}catch{}if(s.length>0)a("pending"),r("complete");else return Promise.resolve();var l=xt.begin("onTree"),u=s.reduce(function(c,d){try{var p=En(d);p&&c.push(p)}catch(g){fn||g.name==="MissingIcon"&&console.error(g)}return c},[]);return new Promise(function(c,d){Promise.all(u).then(function(p){Pn(p,function(){a("active"),a("complete"),r("pending"),typeof t=="function"&&t(),l(),c()})}).catch(function(p){l(),d(p)})})}function er(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;En(e).then(function(n){n&&Pn([n],t)})}function tr(e){return function(t){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},a=(t||{}).icon?t:Ze(t||{}),r=n.mask;return r&&(r=(r||{}).icon?r:Ze(r||{})),e(a,m(m({},n),{},{mask:r}))}}var nr=function(t){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},a=n.transform,r=a===void 0?z:a,i=n.symbol,o=i===void 0?!1:i,s=n.mask,l=s===void 0?null:s,u=n.maskId,c=u===void 0?null:u,d=n.title,p=d===void 0?null:d,g=n.titleId,N=g===void 0?null:g,E=n.classes,k=E===void 0?[]:E,I=n.attributes,A=I===void 0?{}:I,O=n.styles,_=O===void 0?{}:O;if(t){var S=t.prefix,K=t.iconName,q=t.icon;return $e(m({type:"icon"},t),function(){return te("beforeDOMElementCreation",{iconDefinition:t,params:n}),v.autoA11y&&(p?A["aria-labelledby"]="".concat(v.replacementClass,"-title-").concat(N||be()):(A["aria-hidden"]="true",A.focusable="false")),yt({icons:{main:et(q),mask:l?et(l.icon):{found:!1,width:null,height:null,icon:{}}},prefix:S,iconName:K,transform:m(m({},z),r),symbol:o,title:p,maskId:c,titleId:N,extra:{attributes:A,styles:_,classes:k}})})}},ar={mixout:function(){return{icon:tr(nr)}},hooks:function(){return{mutationObserverCallbacks:function(n){return n.treeCallback=$t,n.nodeCallback=er,n}}},provides:function(t){t.i2svg=function(n){var a=n.node,r=a===void 0?x:a,i=n.callback,o=i===void 0?function(){}:i;return $t(r,o)},t.generateSvgReplacementMutation=function(n,a){var r=a.iconName,i=a.title,o=a.titleId,s=a.prefix,l=a.transform,u=a.symbol,c=a.mask,d=a.maskId,p=a.extra;return new Promise(function(g,N){Promise.all([tt(r,s),c.iconName?tt(c.iconName,c.prefix):Promise.resolve({found:!1,width:512,height:512,icon:{}})]).then(function(E){var k=ft(E,2),I=k[0],A=k[1];g([n,yt({icons:{main:I,mask:A},prefix:s,iconName:r,transform:l,symbol:u,maskId:d,title:i,titleId:o,extra:p,watchable:!0})])}).catch(N)})},t.generateAbstractIcon=function(n){var a=n.children,r=n.attributes,i=n.main,o=n.transform,s=n.styles,l=je(s);l.length>0&&(r.style=l);var u;return pt(o)&&(u=D("generateAbstractTransformGrouping",{main:i,transform:o,containerWidth:i.width,iconWidth:i.width})),a.push(u||i.icon),{children:a,attributes:r}}}},rr={mixout:function(){return{layer:function(n){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=a.classes,i=r===void 0?[]:r;return $e({type:"layer"},function(){te("beforeDOMElementCreation",{assembler:n,params:a});var o=[];return n(function(s){Array.isArray(s)?s.map(function(l){o=o.concat(l.abstract)}):o=o.concat(s.abstract)}),[{tag:"span",attributes:{class:["".concat(v.cssPrefix,"-layers")].concat(ge(i)).join(" ")},children:o}]})}}}},ir={mixout:function(){return{counter:function(n){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=a.title,i=r===void 0?null:r,o=a.classes,s=o===void 0?[]:o,l=a.attributes,u=l===void 0?{}:l,c=a.styles,d=c===void 0?{}:c;return $e({type:"counter",content:n},function(){return te("beforeDOMElementCreation",{content:n,params:a}),Fa({content:n.toString(),title:i,extra:{attributes:u,styles:d,classes:["".concat(v.cssPrefix,"-layers-counter")].concat(ge(s))}})})}}}},or={mixout:function(){return{text:function(n){var a=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=a.transform,i=r===void 0?z:r,o=a.title,s=o===void 0?null:o,l=a.classes,u=l===void 0?[]:l,c=a.attributes,d=c===void 0?{}:c,p=a.styles,g=p===void 0?{}:p;return $e({type:"text",content:n},function(){return te("beforeDOMElementCreation",{content:n,params:a}),Lt({content:n,transform:m(m({},z),i),title:s,extra:{attributes:d,styles:g,classes:["".concat(v.cssPrefix,"-layers-text")].concat(ge(u))}})})}}},provides:function(t){t.generateLayersText=function(n,a){var r=a.title,i=a.transform,o=a.extra,s=null,l=null;if(on){var u=parseInt(getComputedStyle(n).fontSize,10),c=n.getBoundingClientRect();s=c.width/u,l=c.height/u}return v.autoA11y&&!r&&(o.attributes["aria-hidden"]="true"),Promise.resolve([n,Lt({content:n.innerHTML,width:s,height:l,transform:i,title:r,extra:o,watchable:!0})])}}},sr=new RegExp('"',"ug"),Yt=[1105920,1112319];function lr(e){var t=e.replace(sr,""),n=wa(t,0),a=n>=Yt[0]&&n<=Yt[1],r=t.length===2?t[0]===t[1]:!1;return{value:qe(r?t[0]:t),isSecondary:a||r}}function Ut(e,t){var n="".concat(qn).concat(t.replace(":","-"));return new Promise(function(a,r){if(e.getAttribute(n)!==null)return a();var i=le(e.children),o=i.filter(function(q){return q.getAttribute(Ke)===t})[0],s=B.getComputedStyle(e,t),l=s.getPropertyValue("font-family").match(ta),u=s.getPropertyValue("font-weight"),c=s.getPropertyValue("content");if(o&&!l)return e.removeChild(o),a();if(l&&c!=="none"&&c!==""){var d=s.getPropertyValue("content"),p=~["Sharp"].indexOf(l[2])?w:y,g=~["Solid","Regular","Light","Thin","Duotone","Brands","Kit"].indexOf(l[2])?de[p][l[2].toLowerCase()]:na[p][u],N=lr(d),E=N.value,k=N.isSecondary,I=l[0].startsWith("FontAwesome"),A=gt(g,E),O=A;if(I){var _=Ea(E);_.iconName&&_.prefix&&(A=_.iconName,g=_.prefix)}if(A&&!k&&(!o||o.getAttribute(ut)!==g||o.getAttribute(mt)!==O)){e.setAttribute(n,O),o&&e.removeChild(o);var S=Ja(),K=S.extra;K.attributes[Ke]=t,tt(A,g).then(function(q){var Ye=yt(m(m({},S),{},{icons:{main:q,mask:ht()},prefix:g,iconName:O,extra:K,watchable:!0})),Y=x.createElement("svg");t==="::before"?e.insertBefore(Y,e.firstChild):e.appendChild(Y),Y.outerHTML=Ye.map(function(Ln){return ye(Ln)}).join(`
`),e.removeAttribute(n),a()}).catch(r)}else a()}else a()})}function fr(e){return Promise.all([Ut(e,"::before"),Ut(e,"::after")])}function cr(e){return e.parentNode!==document.head&&!~Jn.indexOf(e.tagName.toUpperCase())&&!e.getAttribute(Ke)&&(!e.parentNode||e.parentNode.tagName!=="svg")}function Wt(e){if($)return new Promise(function(t,n){var a=le(e.querySelectorAll("*")).filter(cr).map(fr),r=xt.begin("searchPseudoElements");Sn(),Promise.all(a).then(function(){r(),at(),t()}).catch(function(){r(),at(),n()})})}var ur={hooks:function(){return{mutationObserverCallbacks:function(n){return n.pseudoElementsCallback=Wt,n}}},provides:function(t){t.pseudoElements2svg=function(n){var a=n.node,r=a===void 0?x:a;v.searchPseudoElements&&Wt(r)}}},Ht=!1,mr={mixout:function(){return{dom:{unwatch:function(){Sn(),Ht=!0}}}},hooks:function(){return{bootstrap:function(){Ft(Je("mutationObserverCallbacks",{}))},noAuto:function(){Xa()},watch:function(n){var a=n.observeMutationsRoot;Ht?at():Ft(Je("mutationObserverCallbacks",{observeMutationsRoot:a}))}}}},Gt=function(t){var n={size:16,x:0,y:0,flipX:!1,flipY:!1,rotate:0};return t.toLowerCase().split(" ").reduce(function(a,r){var i=r.toLowerCase().split("-"),o=i[0],s=i.slice(1).join("-");if(o&&s==="h")return a.flipX=!0,a;if(o&&s==="v")return a.flipY=!0,a;if(s=parseFloat(s),isNaN(s))return a;switch(o){case"grow":a.size=a.size+s;break;case"shrink":a.size=a.size-s;break;case"left":a.x=a.x-s;break;case"right":a.x=a.x+s;break;case"up":a.y=a.y-s;break;case"down":a.y=a.y+s;break;case"rotate":a.rotate=a.rotate+s;break}return a},n)},dr={mixout:function(){return{parse:{transform:function(n){return Gt(n)}}}},hooks:function(){return{parseNodeAttributes:function(n,a){var r=a.getAttribute("data-fa-transform");return r&&(n.transform=Gt(r)),n}}},provides:function(t){t.generateAbstractTransformGrouping=function(n){var a=n.main,r=n.transform,i=n.containerWidth,o=n.iconWidth,s={transform:"translate(".concat(i/2," 256)")},l="translate(".concat(r.x*32,", ").concat(r.y*32,") "),u="scale(".concat(r.size/16*(r.flipX?-1:1),", ").concat(r.size/16*(r.flipY?-1:1),") "),c="rotate(".concat(r.rotate," 0 0)"),d={transform:"".concat(l," ").concat(u," ").concat(c)},p={transform:"translate(".concat(o/2*-1," -256)")},g={outer:s,inner:d,path:p};return{tag:"g",attributes:m({},g.outer),children:[{tag:"g",attributes:m({},g.inner),children:[{tag:a.icon.tag,children:a.icon.children,attributes:m(m({},a.icon.attributes),g.path)}]}]}}}},Ge={x:0,y:0,width:"100%",height:"100%"};function Bt(e){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!0;return e.attributes&&(e.attributes.fill||t)&&(e.attributes.fill="black"),e}function vr(e){return e.tag==="g"?e.children:[e]}var pr={hooks:function(){return{parseNodeAttributes:function(n,a){var r=a.getAttribute("data-fa-mask"),i=r?De(r.split(" ").map(function(o){return o.trim()})):ht();return i.prefix||(i.prefix=V()),n.mask=i,n.maskId=a.getAttribute("data-fa-mask-id"),n}}},provides:function(t){t.generateAbstractMask=function(n){var a=n.children,r=n.attributes,i=n.main,o=n.mask,s=n.maskId,l=n.transform,u=i.width,c=i.icon,d=o.width,p=o.icon,g=da({transform:l,containerWidth:d,iconWidth:u}),N={tag:"rect",attributes:m(m({},Ge),{},{fill:"white"})},E=c.children?{children:c.children.map(Bt)}:{},k={tag:"g",attributes:m({},g.inner),children:[Bt(m({tag:c.tag,attributes:m(m({},c.attributes),g.path)},E))]},I={tag:"g",attributes:m({},g.outer),children:[k]},A="mask-".concat(s||be()),O="clip-".concat(s||be()),_={tag:"mask",attributes:m(m({},Ge),{},{id:A,maskUnits:"userSpaceOnUse",maskContentUnits:"userSpaceOnUse"}),children:[N,I]},S={tag:"defs",children:[{tag:"clipPath",attributes:{id:O},children:vr(p)},_]};return a.push(S,{tag:"rect",attributes:m({fill:"currentColor","clip-path":"url(#".concat(O,")"),mask:"url(#".concat(A,")")},Ge)}),{children:a,attributes:r}}}},br={provides:function(t){var n=!1;B.matchMedia&&(n=B.matchMedia("(prefers-reduced-motion: reduce)").matches),t.missingIconAbstract=function(){var a=[],r={fill:"currentColor"},i={attributeType:"XML",repeatCount:"indefinite",dur:"2s"};a.push({tag:"path",attributes:m(m({},r),{},{d:"M156.5,447.7l-12.6,29.5c-18.7-9.5-35.9-21.2-51.5-34.9l22.7-22.7C127.6,430.5,141.5,440,156.5,447.7z M40.6,272H8.5 c1.4,21.2,5.4,41.7,11.7,61.1L50,321.2C45.1,305.5,41.8,289,40.6,272z M40.6,240c1.4-18.8,5.2-37,11.1-54.1l-29.5-12.6 C14.7,194.3,10,216.7,8.5,240H40.6z M64.3,156.5c7.8-14.9,17.2-28.8,28.1-41.5L69.7,92.3c-13.7,15.6-25.5,32.8-34.9,51.5 L64.3,156.5z M397,419.6c-13.9,12-29.4,22.3-46.1,30.4l11.9,29.8c20.7-9.9,39.8-22.6,56.9-37.6L397,419.6z M115,92.4 c13.9-12,29.4-22.3,46.1-30.4l-11.9-29.8c-20.7,9.9-39.8,22.6-56.8,37.6L115,92.4z M447.7,355.5c-7.8,14.9-17.2,28.8-28.1,41.5 l22.7,22.7c13.7-15.6,25.5-32.9,34.9-51.5L447.7,355.5z M471.4,272c-1.4,18.8-5.2,37-11.1,54.1l29.5,12.6 c7.5-21.1,12.2-43.5,13.6-66.8H471.4z M321.2,462c-15.7,5-32.2,8.2-49.2,9.4v32.1c21.2-1.4,41.7-5.4,61.1-11.7L321.2,462z M240,471.4c-18.8-1.4-37-5.2-54.1-11.1l-12.6,29.5c21.1,7.5,43.5,12.2,66.8,13.6V471.4z M462,190.8c5,15.7,8.2,32.2,9.4,49.2h32.1 c-1.4-21.2-5.4-41.7-11.7-61.1L462,190.8z M92.4,397c-12-13.9-22.3-29.4-30.4-46.1l-29.8,11.9c9.9,20.7,22.6,39.8,37.6,56.9 L92.4,397z M272,40.6c18.8,1.4,36.9,5.2,54.1,11.1l12.6-29.5C317.7,14.7,295.3,10,272,8.5V40.6z M190.8,50 c15.7-5,32.2-8.2,49.2-9.4V8.5c-21.2,1.4-41.7,5.4-61.1,11.7L190.8,50z M442.3,92.3L419.6,115c12,13.9,22.3,29.4,30.5,46.1 l29.8-11.9C470,128.5,457.3,109.4,442.3,92.3z M397,92.4l22.7-22.7c-15.6-13.7-32.8-25.5-51.5-34.9l-12.6,29.5 C370.4,72.1,384.4,81.5,397,92.4z"})});var o=m(m({},i),{},{attributeName:"opacity"}),s={tag:"circle",attributes:m(m({},r),{},{cx:"256",cy:"364",r:"28"}),children:[]};return n||s.children.push({tag:"animate",attributes:m(m({},i),{},{attributeName:"r",values:"28;14;28;28;14;28;"})},{tag:"animate",attributes:m(m({},o),{},{values:"1;0;1;1;0;1;"})}),a.push(s),a.push({tag:"path",attributes:m(m({},r),{},{opacity:"1",d:"M263.7,312h-16c-6.6,0-12-5.4-12-12c0-71,77.4-63.9,77.4-107.8c0-20-17.8-40.2-57.4-40.2c-29.1,0-44.3,9.6-59.2,28.7 c-3.9,5-11.1,6-16.2,2.4l-13.1-9.2c-5.6-3.9-6.9-11.8-2.6-17.2c21.2-27.2,46.4-44.7,91.2-44.7c52.3,0,97.4,29.8,97.4,80.2 c0,67.6-77.4,63.5-77.4,107.8C275.7,306.6,270.3,312,263.7,312z"}),children:n?[]:[{tag:"animate",attributes:m(m({},o),{},{values:"1;0;0;0;0;1;"})}]}),n||a.push({tag:"path",attributes:m(m({},r),{},{opacity:"0",d:"M232.5,134.5l7,168c0.3,6.4,5.6,11.5,12,11.5h9c6.4,0,11.7-5.1,12-11.5l7-168c0.3-6.8-5.2-12.5-12-12.5h-23 C237.7,122,232.2,127.7,232.5,134.5z"}),children:[{tag:"animate",attributes:m(m({},o),{},{values:"0;0;1;1;0;0;"})}]}),{tag:"g",attributes:{class:"missing"},children:a}}}},gr={hooks:function(){return{parseNodeAttributes:function(n,a){var r=a.getAttribute("data-fa-symbol"),i=r===null?!1:r===""?!0:r;return n.symbol=i,n}}}},hr=[ba,ar,rr,ir,or,ur,mr,dr,pr,br,gr];_a(hr,{mixoutsTo:T});T.noAuto;T.config;T.library;T.dom;var rt=T.parse;T.findIconDefinition;T.toHtml;var yr=T.icon;T.layer;T.text;T.counter;function Vt(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter(function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable})),n.push.apply(n,a)}return n}function W(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]!=null?arguments[t]:{};t%2?Vt(Object(n),!0).forEach(function(a){re(e,a,n[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):Vt(Object(n)).forEach(function(a){Object.defineProperty(e,a,Object.getOwnPropertyDescriptor(n,a))})}return e}function ze(e){return ze=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},ze(e)}function re(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function xr(e,t){if(e==null)return{};var n={},a=Object.keys(e),r,i;for(i=0;i<a.length;i++)r=a[i],!(t.indexOf(r)>=0)&&(n[r]=e[r]);return n}function wr(e,t){if(e==null)return{};var n=xr(e,t),a,r;if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)a=i[r],!(t.indexOf(a)>=0)&&Object.prototype.propertyIsEnumerable.call(e,a)&&(n[a]=e[a])}return n}function it(e){return kr(e)||Ar(e)||Nr(e)||Or()}function kr(e){if(Array.isArray(e))return ot(e)}function Ar(e){if(typeof Symbol<"u"&&e[Symbol.iterator]!=null||e["@@iterator"]!=null)return Array.from(e)}function Nr(e,t){if(e){if(typeof e=="string")return ot(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);if(n==="Object"&&e.constructor&&(n=e.constructor.name),n==="Map"||n==="Set")return Array.from(e);if(n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return ot(e,t)}}function ot(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,a=new Array(t);n<t;n++)a[n]=e[n];return a}function Or(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Pr(e){var t,n=e.beat,a=e.fade,r=e.beatFade,i=e.bounce,o=e.shake,s=e.flash,l=e.spin,u=e.spinPulse,c=e.spinReverse,d=e.pulse,p=e.fixedWidth,g=e.inverse,N=e.border,E=e.listItem,k=e.flip,I=e.size,A=e.rotation,O=e.pull,_=(t={"fa-beat":n,"fa-fade":a,"fa-beat-fade":r,"fa-bounce":i,"fa-shake":o,"fa-flash":s,"fa-spin":l,"fa-spin-reverse":c,"fa-spin-pulse":u,"fa-pulse":d,"fa-fw":p,"fa-inverse":g,"fa-border":N,"fa-li":E,"fa-flip":k===!0,"fa-flip-horizontal":k==="horizontal"||k==="both","fa-flip-vertical":k==="vertical"||k==="both"},re(t,"fa-".concat(I),typeof I<"u"&&I!==null),re(t,"fa-rotate-".concat(A),typeof A<"u"&&A!==null&&A!==0),re(t,"fa-pull-".concat(O),typeof O<"u"&&O!==null),re(t,"fa-swap-opacity",e.swapOpacity),t);return Object.keys(_).map(function(S){return _[S]?S:null}).filter(function(S){return S})}function Sr(e){return e=e-0,e===e}function In(e){return Sr(e)?e:(e=e.replace(/[\-_\s]+(.)?/g,function(t,n){return n?n.toUpperCase():""}),e.substr(0,1).toLowerCase()+e.substr(1))}var Er=["style"];function Ir(e){return e.charAt(0).toUpperCase()+e.slice(1)}function Cr(e){return e.split(";").map(function(t){return t.trim()}).filter(function(t){return t}).reduce(function(t,n){var a=n.indexOf(":"),r=In(n.slice(0,a)),i=n.slice(a+1).trim();return r.startsWith("webkit")?t[Ir(r)]=i:t[r]=i,t},{})}function Cn(e,t){var n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};if(typeof t=="string")return t;var a=(t.children||[]).map(function(l){return Cn(e,l)}),r=Object.keys(t.attributes||{}).reduce(function(l,u){var c=t.attributes[u];switch(u){case"class":l.attrs.className=c,delete t.attributes.class;break;case"style":l.attrs.style=Cr(c);break;default:u.indexOf("aria-")===0||u.indexOf("data-")===0?l.attrs[u.toLowerCase()]=c:l.attrs[In(u)]=c}return l},{attrs:{}}),i=n.style,o=i===void 0?{}:i,s=wr(n,Er);return r.attrs.style=W(W({},r.attrs.style),o),e.apply(void 0,[t.tag,W(W({},r.attrs),s)].concat(it(a)))}var _n=!1;try{_n=!0}catch{}function _r(){if(!_n&&console&&typeof console.error=="function"){var e;(e=console).error.apply(e,arguments)}}function Xt(e){if(e&&ze(e)==="object"&&e.prefix&&e.iconName&&e.icon)return e;if(rt.icon)return rt.icon(e);if(e===null)return null;if(e&&ze(e)==="object"&&e.prefix&&e.iconName)return e;if(Array.isArray(e)&&e.length===2)return{prefix:e[0],iconName:e[1]};if(typeof e=="string")return{prefix:"fas",iconName:e}}function Be(e,t){return Array.isArray(t)&&t.length>0||!Array.isArray(t)&&t?re({},e,t):{}}var se=lt.forwardRef(function(e,t){var n=e.icon,a=e.mask,r=e.symbol,i=e.className,o=e.title,s=e.titleId,l=e.maskId,u=Xt(n),c=Be("classes",[].concat(it(Pr(e)),it(i.split(" ")))),d=Be("transform",typeof e.transform=="string"?rt.transform(e.transform):e.transform),p=Be("mask",Xt(a)),g=yr(u,W(W(W(W({},c),d),p),{},{symbol:r,title:o,titleId:s,maskId:l}));if(!g)return _r("Could not find icon",u),null;var N=g.abstract,E={ref:t};return Object.keys(e).forEach(function(k){se.defaultProps.hasOwnProperty(k)||(E[k]=e[k])}),Tr(N[0],E)});se.displayName="FontAwesomeIcon";se.propTypes={beat:b.bool,border:b.bool,beatFade:b.bool,bounce:b.bool,className:b.string,fade:b.bool,flash:b.bool,mask:b.oneOfType([b.object,b.array,b.string]),maskId:b.string,fixedWidth:b.bool,inverse:b.bool,flip:b.oneOf([!0,!1,"horizontal","vertical","both"]),icon:b.oneOfType([b.object,b.array,b.string]),listItem:b.bool,pull:b.oneOf(["right","left"]),pulse:b.bool,rotation:b.oneOf([0,90,180,270]),shake:b.bool,size:b.oneOf(["2xs","xs","sm","lg","xl","2xl","1x","2x","3x","4x","5x","6x","7x","8x","9x","10x"]),spin:b.bool,spinPulse:b.bool,spinReverse:b.bool,symbol:b.oneOfType([b.bool,b.string]),title:b.string,titleId:b.string,transform:b.oneOfType([b.string,b.object]),swapOpacity:b.bool};se.defaultProps={border:!1,className:"",mask:null,maskId:null,fixedWidth:!1,inverse:!1,flip:!1,icon:null,listItem:!1,pull:null,pulse:!1,rotation:null,size:null,spin:!1,spinPulse:!1,spinReverse:!1,beat:!1,fade:!1,beatFade:!1,bounce:!1,shake:!1,symbol:!1,title:"",titleId:null,transform:null,swapOpacity:!1};var Tr=Cn.bind(null,lt.createElement),Tn={};(function(e){Object.defineProperty(e,"__esModule",{value:!0});var t="fab",n="github",a=496,r=512,i=[],o="f09b",s="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z";e.definition={prefix:t,iconName:n,icon:[a,r,i,o,s]},e.faGithub=e.definition,e.prefix=t,e.iconName=n,e.width=a,e.height=r,e.ligatures=i,e.unicode=o,e.svgPathData=s,e.aliases=i})(Tn);var Mn={};(function(e){Object.defineProperty(e,"__esModule",{value:!0});var t="fab",n="linkedin",a=448,r=512,i=[],o="f08c",s="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z";e.definition={prefix:t,iconName:n,icon:[a,r,i,o,s]},e.faLinkedin=e.definition,e.prefix=t,e.iconName=n,e.width=a,e.height=r,e.ligatures=i,e.unicode=o,e.svgPathData=s,e.aliases=i})(Mn);const Kt=["Python","C++","CUDA"],qt=[{name:"mmgpy",role:"author",blurb:"Python bindings for the MMG remeshing library with PyVista glue.",links:[{label:"kmarchais/mmgpy",url:"https://github.com/kmarchais/mmgpy"}]},{name:"microgen",role:"author",blurb:"Parametric lattice + TPMS generator for additive manufacturing.",links:[{label:"3MAH/microgen",url:"https://github.com/3MAH/microgen"}]},{name:"blender extensions",role:"author",blurb:"Two Blender add-ons for parametric geometry and scientific mesh I/O.",links:[],children:[{name:"blender-tpms",blurb:"Generate triply periodic minimal surfaces (Gyroid, Schwarz, Neovius, …) parametrically inside Blender.",url:"https://github.com/kmarchais/blender-tpms"},{name:"blender-vtk",blurb:"Import and export VTK formats (.vtk, .vtu, .vtp, .pvd) so Blender can talk to scientific pipelines.",url:"https://github.com/kmarchais/blender-vtk-importer-exporter"}]}],Qt={github:"https://github.com/kmarchais",linkedin:"https://www.linkedin.com/in/kevin-marchais/"},Mr="/assets/profile-071ae894.jpg",Lr=G.lazy(()=>st(()=>import("./GyroidFlowWidget-8f6c272c.js"),["assets/GyroidFlowWidget-8f6c272c.js","assets/vendor-r3f-79d7e21d.js","assets/vendor-react-0f206cf5.js","assets/vendor-three-e4da4b44.js"])),H={hidden:{opacity:0,y:12},show:(e=0)=>({opacity:1,y:0,transition:{delay:.1+e*.06,duration:.55,ease:[.16,1,.3,1]}})},Z=({children:e,className:t=""})=>f("span",{className:`font-mono text-[10.5px] tracking-wider3 uppercase text-bone-400 ${t}`,children:e}),Rr=({className:e=""})=>f("div",{className:`rule ${e}`,"aria-hidden":"true"}),zr=()=>f(M.header,{custom:0,initial:"hidden",animate:"show",variants:H,className:"fixed top-0 left-0 right-0 z-30 bg-ink-900 border-b border-ink-600/40 lg:bg-transparent lg:border-b-0 px-5 sm:px-8 lg:px-14 py-4 lg:py-5",children:h("div",{className:"flex items-center justify-between max-w-[1480px] mx-auto",children:[f(Te,{to:"/",className:"group inline-flex items-baseline gap-3","aria-label":"Kevin Marchais, home",children:f("span",{className:"font-mono text-[11px] tracking-wider3 uppercase text-bone-400 group-hover:text-bone-50 transition-colors",children:"KM"})}),f("nav",{className:"flex items-center gap-7","aria-label":"Primary",children:f(Te,{to:"/blog",className:"font-mono text-[11px] tracking-wider2 uppercase text-bone-400 hover:text-bone-50 transition-colors",children:"Blog"})})]})}),jr=()=>h("div",{className:"space-y-5",children:[h(M.div,{custom:1,initial:"hidden",animate:"show",variants:H,className:"flex items-center gap-4",children:[f("img",{src:Mr,alt:"Portrait of Kevin Marchais",className:"w-14 h-14 rounded-full object-cover ring-1 ring-bone-50/15 grayscale-[35%]"}),f(Z,{children:"Research Engineer · Simulation Software"})]}),h(M.h1,{custom:2,initial:"hidden",animate:"show",variants:H,className:"font-display text-bone-50 font-medium leading-[0.9] tracking-[-0.035em] text-[clamp(2.6rem,7vw,5.5rem)]",children:["Kevin ",f("span",{className:"text-ember-400",children:"Marchais"})]}),f(M.p,{custom:3,initial:"hidden",animate:"show",variants:H,className:"text-bone-200 text-[0.98rem] sm:text-[1.05rem] leading-[1.55] max-w-[48ch] text-left sm:text-justify hyphens-auto",children:"Research engineer working on numerical simulation of mechanical systems. I build the GPU-accelerated code that runs the simulations, the tools that visualize their output, and the neural networks that learn to accelerate them. The aim, across all three: heavy computation, made fast enough to be useful."})]}),Fr=()=>h(M.div,{custom:4,initial:"hidden",animate:"show",variants:H,className:"flex items-center gap-3",children:[f(Z,{children:"Stack"}),f("span",{className:"text-bone-600",children:"·"}),f("ul",{className:"flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[12px] text-bone-200",children:Kt.map((e,t)=>h("li",{className:"inline-flex items-center gap-3",children:[f("span",{children:e}),t<Kt.length-1&&f("span",{"aria-hidden":!0,className:"text-bone-600",children:"/"})]},e))})]}),Dr=({project:e,index:t})=>{var l,u;const n=(((l=e.children)==null?void 0:l.length)??0)>0,[a,r]=G.useState(!1),i=Zt(),o="group grid grid-cols-[60px_1fr_auto] items-baseline gap-4 py-3 hover:bg-ink-800/60 -mx-3 px-3 transition-colors duration-300 rounded-[2px] w-full text-left",s=h(Rn,{children:[f("span",{className:"font-mono text-[10px] tracking-wider2 uppercase text-bone-600",children:e.role==="author"?"Author":"Contrib"}),h("span",{className:"min-w-0",children:[f("span",{className:"font-display text-bone-50 text-[1.25rem] leading-tight font-medium tracking-[-0.015em] group-hover:text-ember-300 transition-colors",children:e.name}),f("span",{className:"block mt-0.5 text-bone-400 text-[0.825rem] leading-[1.45] max-w-[48ch]",children:e.blurb})]}),f("span",{className:"font-mono text-[11px] text-bone-600 group-hover:text-ember-400 transition-colors flex items-center self-center w-4 justify-end",children:n?f(M.span,{"aria-hidden":!0,initial:!1,animate:{rotate:a?45:0},transition:{duration:.2,ease:"easeOut"},className:"inline-block",children:"+"}):f("span",{"aria-hidden":!0,className:"inline-block transition-transform group-hover:translate-x-1 group-hover:-translate-y-1",children:"↗"})})]});return h(M.li,{custom:6+t,initial:"hidden",animate:"show",variants:H,children:[n?f("button",{type:"button",onClick:()=>r(c=>!c),"aria-expanded":a,className:o,children:s}):f("a",{href:(u=e.links[0])==null?void 0:u.url,target:"_blank",rel:"noopener noreferrer",className:o+" block",children:s}),n&&f(en,{initial:!1,children:a&&f(M.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:i?{duration:0}:{duration:.32,ease:[.16,1,.3,1]},className:"overflow-hidden",children:f("ul",{className:"pl-[60px] pr-3 -mx-3 pb-2 pt-1",children:e.children.map((c,d)=>h("li",{className:`relative pl-5 py-2.5 ${d>0?"border-t border-ink-600/40":""}`,children:[f("span",{"aria-hidden":!0,className:"absolute left-0 top-0 bottom-0 w-px bg-ink-600/60"}),h("a",{href:c.url,target:"_blank",rel:"noopener noreferrer",className:"group/child block",children:[h("div",{className:"flex items-baseline justify-between gap-3",children:[f("span",{className:"font-mono text-[12px] text-bone-200 group-hover/child:text-ember-300 transition-colors",children:c.name}),f("span",{"aria-hidden":!0,className:"font-mono text-[11px] text-bone-600 group-hover/child:text-ember-400 transition-all duration-300 group-hover/child:translate-x-1 group-hover/child:-translate-y-0.5",children:"↗"})]}),f("p",{className:"mt-1 text-bone-400 text-[0.8rem] leading-[1.5] max-w-[52ch]",children:c.blurb})]})]},c.url))})},"children")})]})},$r=()=>h(M.section,{custom:5,initial:"hidden",animate:"show",variants:H,"aria-labelledby":"oss-heading",className:"space-y-2",children:[h("div",{className:"flex items-baseline justify-between gap-4",children:[f("h2",{id:"oss-heading",children:f(Z,{children:"Open Source"})}),h(Z,{className:"text-bone-600",children:[String(qt.length).padStart(2,"0")," entries"]})]}),f(Rr,{}),f("ul",{className:"divide-y divide-ink-600/60",children:qt.map((e,t)=>f(Dr,{project:e,index:t},e.name))})]}),Yr=()=>h(M.footer,{custom:9,initial:"hidden",animate:"show",variants:H,className:"flex items-center justify-between gap-6",children:[h("div",{className:"flex items-center gap-5",children:[h("a",{href:Qt.github,target:"_blank",rel:"noopener noreferrer","aria-label":"GitHub",className:"group inline-flex items-center gap-2 text-bone-400 hover:text-bone-50 transition-colors",children:[f(se,{icon:Tn.faGithub,className:"text-[1.25rem]"}),f("span",{className:"font-mono text-[11px] tracking-wider2 uppercase opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300",children:"github"})]}),h("a",{href:Qt.linkedin,target:"_blank",rel:"noopener noreferrer","aria-label":"LinkedIn",className:"group inline-flex items-center gap-2 text-bone-400 hover:text-bone-50 transition-colors",children:[f(se,{icon:Mn.faLinkedin,className:"text-[1.25rem]"}),f("span",{className:"font-mono text-[11px] tracking-wider2 uppercase opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300",children:"linkedin"})]})]}),h(Te,{to:"/blog",className:"group font-mono text-[11px] tracking-wider2 uppercase text-bone-400 hover:text-ember-400 transition-colors flex items-center gap-2",children:[f("span",{children:"Read the blog"}),f("span",{"aria-hidden":!0,className:"transition-transform group-hover:translate-x-1",children:"→"})]})]}),Ie=[{id:1,name:"Gyroid",subtitle:"particles through a TPMS field"},{id:0,name:"Hourglass",subtitle:"granular flow through an hourglass"}],Ur=()=>{const e=Zt(),[t,n]=G.useState(Ie[0].id),a=Math.max(0,Ie.findIndex(i=>i.id===t)),r=Ie[a];return h(M.aside,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.55,duration:.9,ease:[.16,1,.3,1]},className:"relative h-full flex flex-col","aria-label":"Real-time WebGPU particle simulation",children:[h("div",{className:"flex items-center justify-between gap-4 mb-3",children:[h(Z,{children:["Fig. ",String(a+1).padStart(2,"0")," · ",r.name]}),f("div",{role:"radiogroup","aria-label":"Simulation scene",className:"flex items-center gap-3",children:Ie.map((i,o)=>{const s=i.id===t;return h("button",{type:"button",role:"radio","aria-checked":s,onClick:()=>n(i.id),className:`group font-mono text-[10.5px] tracking-wider2 uppercase transition-colors duration-300 ${s?"text-bone-50":"text-bone-600 hover:text-bone-200"}`,children:[f("span",{className:`mr-1 ${s?"text-ember-400":"text-bone-600"}`,children:String(o+1).padStart(2,"0")}),f("span",{className:`relative ${s?"pb-0.5 border-b border-ember-400":""}`,children:i.name})]},i.id)})})]}),f("div",{className:"specimen relative w-full max-w-[520px] mx-auto aspect-[4/5] lg:max-w-none lg:mx-0 lg:aspect-auto lg:flex-1 min-h-[280px] lg:min-h-0",children:f("div",{className:"absolute inset-0 border border-ink-600/80 bg-ink-800/40 overflow-hidden",children:f(G.Suspense,{fallback:f("div",{className:"absolute inset-0 grid place-items-center",children:f("span",{className:"canvas-loader"})}),children:f(Lr,{className:"absolute inset-0",particleCount:e?600:2e3,showHourglass:!0,geometryType:t})})})}),h("div",{className:"flex items-center justify-between mt-3",children:[f(Z,{className:"text-bone-600",children:r.subtitle}),f(Z,{className:"text-bone-600",children:"interactive"})]})]})},Wr=()=>h("div",{className:"relative min-h-screen lg:h-screen text-bone-200 grain lg:overflow-hidden",children:[f(zr,{}),h("main",{className:`
          relative z-10
          mx-auto max-w-[1480px]
          px-5 sm:px-8 lg:px-14
          pt-20 sm:pt-24 lg:pt-20 pb-10 lg:pb-8
          grid grid-cols-1 gap-10 lg:gap-12
          lg:grid-cols-12 lg:h-full
        `,children:[h("div",{className:"lg:col-span-7 xl:col-span-6 flex flex-col gap-8 lg:gap-5 lg:justify-between lg:py-2 lg:min-h-0",children:[h("div",{className:"space-y-7 lg:space-y-7",children:[f(jr,{}),f(Fr,{}),f($r,{})]}),f(Yr,{})]}),f("div",{className:"lg:col-span-5 xl:col-span-6 lg:py-2 lg:min-h-0",children:f(Ur,{})})]})]});class Hr extends G.Component{constructor(t){super(t),this.state={hasError:!1,error:null}}static getDerivedStateFromError(t){return{hasError:!0,error:t}}componentDidCatch(t,n){console.error("ErrorBoundary caught an error:",t,n)}render(){return this.state.hasError?this.props.fallback?this.props.fallback:f("div",{className:"min-h-screen bg-primary flex items-center justify-center p-8",children:h("div",{className:"max-w-lg text-center",children:[f("div",{className:"text-6xl mb-6",children:"⚠️"}),f("h1",{className:"text-2xl font-bold text-tertiary mb-4",children:"Something went wrong"}),f("p",{className:"text-secondary mb-6",children:"An error occurred while rendering this page. This might be due to browser compatibility issues with WebGL or WebGPU features."}),this.state.error&&h("details",{className:"mb-6 text-left",children:[f("summary",{className:"cursor-pointer text-secondary hover:text-tertiary",children:"Error details"}),f("pre",{className:"mt-2 p-4 bg-[#1a1a2e] rounded-lg text-xs text-red-400 overflow-auto",children:this.state.error.message})]}),h("div",{className:"flex gap-4 justify-center",children:[f("button",{onClick:()=>window.location.reload(),className:"px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors",children:"Reload Page"}),f(Te,{to:"/",className:"px-6 py-2 bg-[#1a1a2e] hover:bg-[#252540] text-secondary rounded-lg transition-colors",children:"Go Home"})]})]})}):this.props.children}}const Gr=()=>f("div",{className:"min-h-screen bg-primary flex items-center justify-center",children:h("div",{className:"flex flex-col items-center gap-4",children:[f("div",{className:"w-12 h-12 border-4 border-secondary border-t-tertiary rounded-full animate-spin"}),f("p",{className:"text-secondary text-sm",children:"Loading..."})]})}),Br=G.lazy(()=>st(()=>import("./Blog-fef4e389.js"),["assets/Blog-fef4e389.js","assets/vendor-r3f-79d7e21d.js","assets/vendor-react-0f206cf5.js","assets/vendor-three-e4da4b44.js","assets/blogUtils-49f45a0f.js","assets/vendor-mdx-798a370b.js","assets/vendor-ui-71103e14.js"])),Vr=G.lazy(()=>st(()=>import("./BlogPostPage-eb6bfd35.js"),["assets/BlogPostPage-eb6bfd35.js","assets/vendor-r3f-79d7e21d.js","assets/vendor-react-0f206cf5.js","assets/vendor-three-e4da4b44.js","assets/blogUtils-49f45a0f.js","assets/vendor-mdx-798a370b.js","assets/vendor-ui-71103e14.js","assets/BlogPostPage-2836b595.css"])),Jt=({children:e})=>f(M.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.2,ease:"easeInOut"},children:e}),Xr=()=>{const e=Fn();return f(en,{mode:"wait",children:h(Dn,{location:e,children:[f(C,{path:"/",element:f(Wr,{})}),f(C,{path:"/blog",element:f(Jt,{children:f(Br,{})})}),f(C,{path:"/blog/:slug",element:f(Jt,{children:f(Vr,{})})}),f(C,{path:"/showcase/geometry",element:f(L,{to:"/blog/microgen",replace:!0})}),f(C,{path:"/showcase/simulations",element:f(L,{to:"/blog",replace:!0})}),f(C,{path:"/showcase/simulations/nbody",element:f(L,{to:"/blog",replace:!0})}),f(C,{path:"/showcase/simulations/granular",element:f(L,{to:"/blog",replace:!0})}),f(C,{path:"/showcase/simulations/fluid",element:f(L,{to:"/blog",replace:!0})}),f(C,{path:"/showcase/chess",element:f(L,{to:"/blog",replace:!0})}),f(C,{path:"/tpms-gallery",element:f(L,{to:"/blog/microgen",replace:!0})}),f(C,{path:"/lattice-studio",element:f(L,{to:"/blog/microgen",replace:!0})}),f(C,{path:"/simulations",element:f(L,{to:"/blog",replace:!0})}),f(C,{path:"/Chess",element:f(L,{to:"/blog",replace:!0})}),f(C,{path:"*",element:f(L,{to:"/",replace:!0})})]},e.pathname)})},Kr=()=>f($n,{reducedMotion:"user",children:f(jn,{children:f(Hr,{children:f(G.Suspense,{fallback:f(Gr,{}),children:f(Xr,{})})})})});zn.createRoot(document.getElementById("root")).render(f(lt.StrictMode,{children:f(Kr,{})}));

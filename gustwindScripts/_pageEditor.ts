import{produce as T}from"https://cdn.skypack.dev/immer@9.0.6?min";import{nanoid as G}from"https://cdn.skypack.dev/nanoid@3.1.30?min";function C({element:t,handle:e,xPosition:n},r){if(!t){console.warn("drag is missing elem!");return}S(t,"touchstart","touchmove","touchend",r,e,n),S(t,"mousedown","mousemove","mouseup",r,e,n)}function S(t,e,n,r,o,i,s){o=$(o,s="left");let l=o.begin,a=o.change,d=o.end;E(i||t,e,m=>{let f=R=>v(a,t,R);function b(){H(document,n,f),H(document,r,b),v(d,t,m)}E(document,n,f),E(document,r,b),v(l,t,m)})}function E(t,e,n){let r=!1;try{let o=Object.defineProperty({},"passive",{get:function(){r=!0}});globalThis.addEventListener("testPassive",null,o),globalThis.removeEventListener("testPassive",null,o)}catch(o){console.error(o)}t.addEventListener(e,n,r?{passive:!1}:!1)}function H(t,e,n){t.removeEventListener(e,n,!1)}function $(t,e="left"){if(t)return{begin:t.begin||h,change:t.change||h,end:t.end||h};let n,r;return{begin:function(o){let i=document.body.clientWidth;n={x:e==="left"?o.elem.offsetLeft:i-o.elem.offsetLeft-o.elem.clientWidth,y:o.elem.offsetTop},r=e==="left"?o.cursor:{x:i-o.cursor.x,y:o.cursor.y}},change:function(o){if(typeof n.x!="number"||typeof o.cursor.x!="number"||typeof r.x!="number")return;let i=document.body.clientWidth;k(o.elem,e,e==="left"?n.x+o.cursor.x-r.x+"px":n.x+(i-o.cursor.x)-r.x+"px"),!(typeof n.y!="number"||typeof o.cursor.y!="number"||typeof r.y!="number")&&k(o.elem,"top",n.y+o.cursor.y-r.y+"px")},end:h}}function k(t,e,n){t.style[e]=n}function h(){}function v(t,e,n){n.preventDefault();let r=W(e),o=e.clientWidth,i=e.clientHeight,s={x:B(e,n),y:F(e,n)};if(typeof s.x!="number"||typeof s.y!="number")return;let l=(s.x-r.x)/o,a=(s.y-r.y)/i;t({x:isNaN(l)?0:l,y:isNaN(a)?0:a,cursor:s,elem:e,e:n})}function W(t){let e=t.getBoundingClientRect();return{x:e.left,y:e.top}}function B(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientX:e.clientX}function F(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientY:e.clientY}import{tw as A}from"https://cdn.skypack.dev/twind@0.16.16?min";var g=t=>!Array.isArray(t)&&typeof t=="object";function c(t,e){let n=t;return e.split(".").forEach(r=>{g(n)&&(n=n[r])}),n}async function w(t,e,n,r){if(!n)return Promise.resolve(r);if("Deno"in globalThis){let o=await import("https://deno.land/std@0.107.0/path/mod.ts");return(await Promise.all(n.map(s=>{let l=o.join(e,`${s}.ts`);return Deno.env.get("DEBUG")==="1"&&console.log("importing transform",l,e,s),t==="production"?import("file://"+l):import("file://"+l+"?cache="+new Date().getTime())}))).reduce((s,l)=>l.default(s),r)}return Promise.all(n.map(o=>import(`/transforms/${o}.js`)))}function x(t,e){return!t||!e?[]:Promise.all(Object.entries(e).map(([n,r])=>N(t,n,r)))}async function N(t,e,n){if(e.startsWith("__"))return[e.slice(2),c(t.__bound,n)||c(t,n)];if(e.startsWith("==")){let r=t.__bound||t;return[e.slice(2),await y(n,g(r)?r:{data:r})]}return[e,n]}function y(t,e={}){try{return Promise.resolve(Function.apply(null,Object.keys(e).concat(`return ${t}`))(...Object.values(e)))}catch(n){console.error("Failed to evaluate",t,e,n)}}async function u(t,e,n,r,o={}){if(typeof e=="string")return e;if(e.visibleIf){let a=r.__bound||r;if(!P(a[e.visibleIf])||!await y(e.visibleIf,a))return Promise.resolve("")}let i=e.element&&n[e.element];if(e.__bind&&(g(e.__bind)?r={...r,__bound:{...o,...r,render:a=>u(t,a,n,r,o),...q(e.__bind,r)}}:r={...r,__bound:c(r,e.__bind)||c(r.__bound,e.__bind)}),i){if(Array.isArray(i))return await u(t,{element:"",children:i},n,r,o);e={...e,...i,element:i.element,class:Y(e.class,i.class)}}if(e?.transformWith){let a;if(typeof e.inputText=="string")a=await w("production",t,e?.transformWith,e.inputText);else if(typeof e.inputProperty=="string"){let d=c(r,e.inputProperty);if(!d)throw console.error("Missing input",r,e.inputProperty),new Error("Missing input");a=await w("production",t,e?.transformWith,d)}r={...r,...a}}let s;if(e.__children){let a=e.__children,d=r.__bound||r;typeof a=="string"?s=c(d,a)||c(r,a):s=(await Promise.all((Array.isArray(d)?d:[d]).flatMap(m=>a.map(f=>u(t,f,n,{...r,__bound:m},o))))).join("")}else if(e["==children"]){let a=e["==children"],d=r.__bound||r;s=await y(a,g(d)?{...o,...d}:{...o,data:d})}else if(e.__foreach){let[a,d]=e.__foreach,m=r.__bound||r;s=(await Promise.all(m[a].flatMap(f=>(Array.isArray(d)?d:[d]).map(b=>u(t,b,n,{...r,__bound:f,match:f},o))))).join("")}else s=Array.isArray(e.children)?(await Promise.all(e.children.map(async a=>await u(t,a,n,r,o)))).join(""):e.children;let l=await X(e,r,o);return z(e.element,await J({...o,...r},l?{...e.attributes,class:l}:e.attributes),s)}function q(t,e){let n={};return Object.entries(t).forEach(([r,o])=>{n[r]=c(e,o)||o}),n}async function X(t,e,n){let r=[];return t.__class&&await Object.entries(t.__class).forEach(async([o,i])=>{await y(i,{attributes:t.attributes,context:{...n,...e}})&&r.push(A(o))}),t.class?A(r.concat(t.class.split(" ")).join(" ")):r.join(" ")}function Y(t,e){return t?e?`${t} ${e}`:t:e||""}function z(t,e,n){return t?`<${t}${e?" "+e:""}>${n||""}</${t}>`:typeof n=="string"?n:""}async function J(t,e){return e?(await x(t,e)).map(([r,o])=>P(o)?"":`${r}="${o}"`).join(" "):""}function P(t){return typeof t=="undefined"}function j(){let t=document.querySelector('meta[name="pagepath"]');if(!t){console.error("path element was not found!");return}let e=t.getAttribute("content");if(!e){console.log("pagePath was not found in path element");return}return e}var V="document-tree-element",K="controls-element";async function Q(){console.log("create editor");let[t,e,n,r]=await Promise.all([fetch("/components.json").then(a=>a.json()),fetch("./context.json").then(a=>a.json()),fetch("./layout.json").then(a=>a.json()),fetch("./route.json").then(a=>a.json())]),o=Z(n,r),i=document.createElement("div");i.setAttribute("x-label","selected"),i.setAttribute("x-state","{ componentId: undefined }"),o.appendChild(i);let s=await te(t,e);i.append(s);let l=await ne(t,e);i.append(l),document.body.appendChild(o),evaluateAllDirectives()}var L="editors";function Z(t,e){let n=document.getElementById(L);return n?.remove(),n=document.createElement("div"),n.id=L,n.style.visibility="visible",n.setAttribute("x-state",JSON.stringify({...t,body:U(t.body),meta:e.meta})),n.setAttribute("x-label","editor"),n}function _e(){let t=document.getElementById(L);!t||(t.style.visibility=t.style.visibility==="visible"?"hidden":"visible")}function U(t){if(!t){console.error("initializeBody - missing body");return}return T(t,e=>{p(e,n=>{n._id=G()})})}function ee(t){let e=T(t.body,r=>{p(r,o=>{delete o._id,o.class===""&&delete o.class})}),n={path:j(),data:{...t,body:e}};window.developmentSocket.send(JSON.stringify({type:"update",payload:n}))}async function te(t,e){console.log("creating page editor");let n=document.createElement("div");n.id=V,n.innerHTML=await u("",t.PageEditor,t,e);let r=n.children[0],o=r.children[0];return C({element:r,handle:o}),n}async function ne(t,e){let n=document.createElement("div");n.id=K,n.innerHTML=await u("",t.ComponentEditor,t,e);let r=n.children[0],o=r.children[0];return C({element:r,handle:o,xPosition:"right"}),n}function re(t,e){let{editor:{meta:n}}=getState(t),r=t.dataset.field;if(!r){console.error(`${r} was not found in ${t.dataset}`);return}if(r==="title"){let o=document.querySelector("title");o?o.innerHTML=e||"":console.warn("The page doesn't have a <title>!")}else{let o=document.head.querySelector("meta[name='"+r+"']");o?o.setAttribute("content",e):console.warn(`The page doesn't have a ${r} meta element!`)}setState({meta:{...n,[r]:e}},{element:t,parent:"editor"})}var _=new Set;function oe(t,e){event?.stopPropagation();let{editor:{body:n}}=getState(t),r=o=>{let i=o.target;if(!i){console.warn("inputListener - No element found");return}o.preventDefault(),D(t,i.textContent)};for(let o of _.values())o.classList.remove("border"),o.classList.remove("border-red-800"),o.removeAttribute("contenteditable"),o.removeEventListener("focusout",r),_.delete(o);p(n,(o,i)=>{if(o._id===e){let s=O(document.body,i,n);s.classList.add("border"),s.classList.add("border-red-800"),_.add(s),Array.isArray(o.children)||(s.setAttribute("contenteditable","true"),s.addEventListener("focusout",r))}}),setState({componentId:e},{element:t,parent:"selected"})}function ie(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=M(n,r,(i,s)=>{s?.replaceWith(se(s,e)),i.element=e});setState({body:o},{element:t,parent:"editor"})}function se(t,e){let n=document.createElement(e),r=t.cloneNode(!0);for(;r.firstChild;)n.appendChild(r.firstChild);for(let o of r.attributes)n.setAttribute(o.name,o.value);return n}function D(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=M(n,r,(i,s)=>{s&&(s.innerHTML=e),i.children=e});setState({body:o},{element:t,parent:"editor"})}function ae(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=M(n,r,(i,s)=>{s&&(s.setAttribute("class",e),s.classList.add("border"),s.classList.add("border-red-800")),i.class=e});setState({body:o},{element:t,parent:"editor"})}function M(t,e,n){return T(t,r=>{p(r,(o,i)=>{o._id===e&&n(o,O(document.body,i,t))})})}function O(t,e,n){let r=0;function o(i,s){if(!i)return null;if(Array.isArray(s)){let l=i;for(let a of s){let d=o(l,a);if(d)return d;l=l?.nextElementSibling}}else{if(e===r)return i;if(r++,Array.isArray(s.children)){let l=o(i.firstElementChild,s.children);if(l)return l}}return null}return o(t?.firstElementChild,n)}function le(t,e){let n={},{componentId:r}=e;return p(t.body,o=>{o._id===r&&(n=o)}),n}function p(t,e){let n=0;function r(o,i){Array.isArray(o)?o.forEach(s=>r(s,i)):(i(o,n),n++,Array.isArray(o.children)&&r(o.children,i))}r(t,e)}"Deno"in globalThis||(console.log("Hello from the page editor"),window.createEditor=Q,window.metaChanged=re,window.classChanged=I(ae),window.elementClicked=oe,window.elementChanged=ie,window.contentChanged=I(D),window.getSelectedComponent=le,window.updateFileSystem=ee);function I(t,e=100){let n;return(...r)=>{clearTimeout(n),n=setTimeout(()=>{t.apply(this,r)},e)}}export{Q as createEditor,_e as toggleEditorVisibility};

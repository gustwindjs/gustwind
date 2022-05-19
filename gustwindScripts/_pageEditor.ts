import{produce as T}from"https://cdn.skypack.dev/immer@9.0.6?min";import{nanoid as J}from"https://cdn.skypack.dev/nanoid@3.1.30?min";function b({element:t,handle:e,xPosition:n},r){if(!t){console.warn("drag is missing elem!");return}S(t,"touchstart","touchmove","touchend",r,e,n),S(t,"mousedown","mousemove","mouseup",r,e,n)}function S(t,e,n,r,o,i,s){o=I(o,s="left");let l=o.begin,a=o.change,d=o.end;E(i||t,e,p=>{let y=$=>C(a,t,$);function _(){H(document,n,y),H(document,r,_),C(d,t,p)}E(document,n,y),E(document,r,_),C(l,t,p)})}function E(t,e,n){let r=!1;try{let o=Object.defineProperty({},"passive",{get:function(){r=!0}});globalThis.addEventListener("testPassive",null,o),globalThis.removeEventListener("testPassive",null,o)}catch(o){console.error(o)}t.addEventListener(e,n,r?{passive:!1}:!1)}function H(t,e,n){t.removeEventListener(e,n,!1)}function I(t,e="left"){if(t)return{begin:t.begin||h,change:t.change||h,end:t.end||h};let n,r;return{begin:function(o){let i=document.body.clientWidth;n={x:e==="left"?o.elem.offsetLeft:i-o.elem.offsetLeft-o.elem.clientWidth,y:o.elem.offsetTop},r=e==="left"?o.cursor:{x:i-o.cursor.x,y:o.cursor.y}},change:function(o){if(typeof n.x!="number"||typeof o.cursor.x!="number"||typeof r.x!="number")return;let i=document.body.clientWidth;x(o.elem,e,e==="left"?n.x+o.cursor.x-r.x+"px":n.x+(i-o.cursor.x)-r.x+"px"),!(typeof n.y!="number"||typeof o.cursor.y!="number"||typeof r.y!="number")&&x(o.elem,"top",n.y+o.cursor.y-r.y+"px")},end:h}}function x(t,e,n){t.style[e]=n}function h(){}function C(t,e,n){n.preventDefault();let r=W(e),o=e.clientWidth,i=e.clientHeight,s={x:R(e,n),y:B(e,n)};if(typeof s.x!="number"||typeof s.y!="number")return;let l=(s.x-r.x)/o,a=(s.y-r.y)/i;t({x:isNaN(l)?0:l,y:isNaN(a)?0:a,cursor:s,elem:e,e:n})}function W(t){let e=t.getBoundingClientRect();return{x:e.left,y:e.top}}function R(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientX:e.clientX}function B(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientY:e.clientY}import{tw as k}from"https://cdn.skypack.dev/twind@0.16.16?min";var u=t=>!Array.isArray(t)&&typeof t=="object";function c(t,e){let n=t;return e.split(".").forEach(r=>{u(n)&&(n=n[r])}),n}async function v(t,e,n,r){if(!n)return Promise.resolve(r);if("Deno"in globalThis){let o=await import("https://deno.land/std@0.107.0/path/mod.ts");return(await Promise.all(n.map(s=>{let l=o.join(e,`${s}.ts`);return Deno.env.get("DEBUG")==="1"&&console.log("importing transform",l,e,s),t==="production"?import("file://"+l):import("file://"+l+"?cache="+new Date().getTime())}))).reduce((s,l)=>l.default(s),r)}return Promise.all(n.map(o=>import(`/transforms/${o}.js`)))}function A(t,e){return!t||!e?[]:Object.entries(e).map(([n,r])=>F(t,n,r))}function F(t,e,n){if(e.startsWith("__"))return[e.slice(2),c(t.__bound,n)||c(t,n)];if(e.startsWith("==")){let r=t.__bound||t;return[e.slice(2),m(n,u(r)?r:{data:r})]}return[e,n]}function m(t,e={}){try{return Function.apply(null,Object.keys(e).concat(`return ${t}`))(...Object.values(e))}catch(n){console.error("Failed to evaluate",t,e,n)}}async function f(t,e,n,r,o){if(typeof e=="string")return e;let i=e.element&&n[e.element];if(e.__bind&&(u(e.__bind)?r={...r,__bound:e.__bind}:r={...r,__bound:c(r,e.__bind)||c(r.__bound,e.__bind)}),e.visibleIf){let a=e.visibleIf;if(!m(a,r.__bound||r))return Promise.resolve("")}if(i){if(Array.isArray(i))return await f(t,{element:"",children:i},n,r,o);e={...e,...i,element:i.element,class:q(e.class,i.class)}}if(e?.transformWith){let a;if(typeof e.inputText=="string")a=await v("production",t,e?.transformWith,e.inputText);else if(typeof e.inputProperty=="string"){let d=c(r,e.inputProperty);if(!d)throw console.error("Missing input",r,e.inputProperty),new Error("Missing input");a=await v("production",t,e?.transformWith,d)}r={...r,...a}}let s;if(e.__children){let a=e.__children,d=r.__bound||r;typeof a=="string"?s=c(d,a)||c(r,a):s=(await Promise.all((Array.isArray(d)?d:[d]).flatMap(p=>a.map(y=>f(t,y,n,{...r,__bound:p},o))))).join("")}else if(e["==children"]){let a=e["==children"],d=r.__bound||r;s=m(a,u(d)?{...o,...d}:{...o,data:d})}else s=Array.isArray(e.children)?(await Promise.all(e.children.map(async a=>await f(t,a,n,r,o)))).join(""):e.children;let l=N(e,r,o);return X(e.element,Y(r,l?{...e.attributes,class:l}:e.attributes),s)}function N(t,e,n){let r=[];return t.__class&&Object.entries(t.__class).forEach(([o,i])=>{m(i,{attributes:t.attributes,context:{...n,...e}})&&r.push(k(o))}),t.class?k(r.concat(t.class.split(" ")).join(" ")):r.join(" ")}function q(t,e){return t?e?`${t} ${e}`:t:e||""}function X(t,e,n){return t?`<${t}${e?" "+e:""}>${n||""}</${t}>`:typeof n=="string"?n:""}function Y(t,e){return e?A(t,e).map(([n,r])=>z(r)?"":`${n}="${r}"`).join(" "):""}function z(t){return typeof t=="undefined"}function P(){let t=document.querySelector('meta[name="pagepath"]');if(!t){console.error("path element was not found!");return}let e=t.getAttribute("content");if(!e){console.log("pagePath was not found in path element");return}return e}var G="document-tree-element",V="controls-element";async function K(){console.log("create editor");let[t,e,n,r]=await Promise.all([fetch("/components.json").then(a=>a.json()),fetch("./context.json").then(a=>a.json()),fetch("./layout.json").then(a=>a.json()),fetch("./route.json").then(a=>a.json())]),o=Q(n,r),i=document.createElement("div");i.setAttribute("x-label","selected"),i.setAttribute("x-state","{ componentId: undefined }"),o.appendChild(i);let s=await ee(t,e);i.append(s);let l=await te(t,e);i.append(l),document.body.appendChild(o),evaluateAllDirectives()}var L="editors";function Q(t,e){let n=document.getElementById(L);return n?.remove(),n=document.createElement("div"),n.id=L,n.style.visibility="visible",n.setAttribute("x-state",JSON.stringify({...t,body:Z(t.body),meta:e.meta})),n.setAttribute("x-label","editor"),n}function we(){let t=document.getElementById(L);!t||(t.style.visibility=t.style.visibility==="visible"?"hidden":"visible")}function Z(t){if(!t){console.error("initializeBody - missing body");return}return T(t,e=>{g(e,n=>{n._id=J()})})}function U(t){let e=T(t.body,r=>{g(r,o=>{delete o._id,o.class===""&&delete o.class})}),n={path:P(),data:{...t,body:e}};window.developmentSocket.send(JSON.stringify({type:"update",payload:n}))}async function ee(t,e){console.log("creating page editor");let n=document.createElement("div");n.id=G,n.innerHTML=await f("",t.PageEditor,t,e);let r=n.children[0],o=r.children[0];return b({element:r,handle:o}),n}async function te(t,e){let n=document.createElement("div");n.id=V,n.innerHTML=await f("",t.ComponentEditor,t,e);let r=n.children[0],o=r.children[0];return b({element:r,handle:o,xPosition:"right"}),n}function ne(t,e){let{editor:{meta:n}}=getState(t),r=t.dataset.field;if(!r){console.error(`${r} was not found in ${t.dataset}`);return}if(r==="title"){let o=document.querySelector("title");o?o.innerHTML=e||"":console.warn("The page doesn't have a <title>!")}else{let o=document.head.querySelector("meta[name='"+r+"']");o?o.setAttribute("content",e):console.warn(`The page doesn't have a ${r} meta element!`)}setState({meta:{...n,[r]:e}},{element:t,parent:"editor"})}var w=new Set;function re(t,e){event?.stopPropagation();let{editor:{body:n}}=getState(t),r=o=>{let i=o.target;if(!i){console.warn("inputListener - No element found");return}o.preventDefault(),j(t,i.textContent)};for(let o of w.values())o.classList.remove("border"),o.classList.remove("border-red-800"),o.removeAttribute("contenteditable"),o.removeEventListener("focusout",r),w.delete(o);g(n,(o,i)=>{if(o._id===e){let s=D(document.body,i,n);s.classList.add("border"),s.classList.add("border-red-800"),w.add(s),Array.isArray(o.children)||(s.setAttribute("contenteditable","true"),s.addEventListener("focusout",r))}}),setState({componentId:e},{element:t,parent:"selected"})}function oe(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=M(n,r,(i,s)=>{s?.replaceWith(ie(s,e)),i.element=e});setState({body:o},{element:t,parent:"editor"})}function ie(t,e){let n=document.createElement(e),r=t.cloneNode(!0);for(;r.firstChild;)n.appendChild(r.firstChild);for(let o of r.attributes)n.setAttribute(o.name,o.value);return n}function j(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=M(n,r,(i,s)=>{s&&(s.innerHTML=e),i.children=e});setState({body:o},{element:t,parent:"editor"})}function se(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=M(n,r,(i,s)=>{s&&(s.setAttribute("class",e),s.classList.add("border"),s.classList.add("border-red-800")),i.class=e});setState({body:o},{element:t,parent:"editor"})}function M(t,e,n){return T(t,r=>{g(r,(o,i)=>{o._id===e&&n(o,D(document.body,i,t))})})}function D(t,e,n){let r=0;function o(i,s){if(!i)return null;if(Array.isArray(s)){let l=i;for(let a of s){let d=o(l,a);if(d)return d;l=l?.nextElementSibling}}else{if(e===r)return i;if(r++,Array.isArray(s.children)){let l=o(i.firstElementChild,s.children);if(l)return l}}return null}return o(t?.firstElementChild,n)}function ae(t,e){let n={},{componentId:r}=e;return g(t.body,o=>{o._id===r&&(n=o)}),n}function g(t,e){let n=0;function r(o,i){Array.isArray(o)?o.forEach(s=>r(s,i)):(i(o,n),n++,Array.isArray(o.children)&&r(o.children,i))}r(t,e)}"Deno"in globalThis||(console.log("Hello from the page editor"),window.createEditor=K,window.metaChanged=ne,window.classChanged=O(se),window.elementClicked=re,window.elementChanged=oe,window.contentChanged=O(j),window.getSelectedComponent=ae,window.updateFileSystem=U);function O(t,e=100){let n;return(...r)=>{clearTimeout(n),n=setTimeout(()=>{t.apply(this,r)},e)}}export{K as createEditor,we as toggleEditorVisibility};

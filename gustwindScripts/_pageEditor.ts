function U(t,e){let r=[],n=t.parentElement;for(;n;)n.hasAttribute(e)&&r.push(n),n=n.parentElement;return r}function M(t,e){let r=document.createElement(e),n=t.cloneNode(!0);for(;n.firstChild;)r.appendChild(n.firstChild);for(let o of n.attributes)r.setAttribute(o.name,o.value);return r}function C(t,e){let r=0;function n(o,i){Array.isArray(o)?o.forEach(a=>n(a,i)):(i(o,r),r++,Array.isArray(o.children)&&n(o.children,i),o.props&&n(Object.values(o.props),i))}n(t,e)}function p(t){return typeof t>"u"}var f=t=>!Array.isArray(t)&&typeof t=="object";function y(t,e,r){if(!e)return r;let n=t,o=e.split(".");if(o.length===1){if(t){let i=t[e];return p(i)?r:i}return r}return o.forEach(i=>{f(n)&&(n=n[i])}),p(n)?r:n}async function H(t,e,r){return Object.fromEntries(await Promise.all(Object.entries(t).map(async([n,o])=>[n,typeof o=="string"?o:await u(o,e,r)])))}async function u(t,e,r){if(!e)throw new Error("applyUtility - No utilities were provided");let n=e[t.utility];if(!n)throw console.error({utilities:e,value:t}),new Error("applyUtility - Matching utility was not found");let o=await Promise.all(Array.isArray(t.parameters)?t.parameters.map(i=>{if(typeof i!="string"){if(i.utility&&i.parameters)return u(i,e,r)}return i}):[]);return n.apply(null,[r].concat(o))}var b={concat:(t,...e)=>e.join(""),get:(t,e,r,n)=>y(y(t,e),r,n)};async function g({component:t,components:e,extensions:r,context:n,props:o,utilities:i}){let a=(c,I)=>g({component:I,components:e,extensions:r,context:n,utilities:i});if(i=f(i)?{render:a,...b,...i}:{render:a,...b},Array.isArray(t))return(await Promise.all(t.map(c=>g({component:c,components:e,extensions:r,context:n,props:o,utilities:i})))).join("");let s=t.type,l=s&&typeof s=="string"&&e?.[s],d={...o,...t.props};if(t.bindToProps&&(d={...await H(t.bindToProps,i,{context:n,props:d}),...d}),l)return(await Promise.all((Array.isArray(l)?l:[l]).map(c=>g({component:c,components:e,extensions:r,context:n,props:d,utilities:i})))).join("");if(r){for(let c of r)t=await c(t,{props:d,context:n},i);s=t.type}let m=await O(t.attributes,{props:d,context:n},i),h=s;if(typeof s=="string"||s?.utility&&s?.parameters&&(h=await u(s,i,{context:n,props:d})),t.children){let c=t.children;return typeof c=="string"||(Array.isArray(c)?c=await g({component:c,props:d,components:e,extensions:r,context:n,utilities:i}):c.utility&&i&&(c=await u(c,i,{context:n,props:d}))),j(h,m,c)}return s?typeof t.closingCharacter=="string"?`<${h}${m?" "+m:""} ${t.closingCharacter}>`:j(h,m):""}function j(t,e,r=""){return t?`<${t}${e?" "+e:""}>${r}</${t}>`:r||""}async function O(t,e,r){return t?(await $(t,e,r)).map(([n,o])=>o&&o.length>0?`${n}="${o}"`:n).join(" "):""}async function $(t,e,r){return t?(await Promise.all(await Object.entries(t).map(async([n,o])=>{if(p(o))return[];let i=o;if(p(i))return[];if(i.context?i=y(y(e,i.context),i.property,i.default):i.utility&&r&&(i=await u(i,r,e)),!p(i))return[n,i]}))).filter(Boolean):[]}var w=g;function L(t){return async function(e,r,n){let o=[];if(typeof e.class=="string"?o.push(e.class):e.class?.utility&&e.class.parameters&&o.push(await u(e.class,n,r)),f(e.classList)){let i=(await Promise.all(await Object.entries(e.classList).map(async([a,s])=>{let l=await u(s[0],n,r);if(s.length===1)return l;let d=(await Promise.all(s.map(async m=>l===await u(m,n,r)))).filter(Boolean);return s.length===d.length&&a}))).filter(Boolean).join(" ");o.push(i)}return o.length?{...e,attributes:{...e.attributes,class:o.map(i=>t(i)).join(" ")}}:e}}async function S(t,e,r){if(!e||!t.foreach)return Promise.resolve(t);let[n,o]=t.foreach,i=await u(n,r,e);return Array.isArray(i)?Promise.resolve({...t,children:i.flatMap(a=>Array.isArray(o)?o.map(s=>({...s,props:f(a)?a:{value:a}})):{...o,props:f(a)?a:{value:a}})}):Promise.resolve(t)}async function T(t,e,r){if(!Array.isArray(t.visibleIf))return Promise.resolve(t);if(t.visibleIf.length===0)return Promise.resolve({});let o=(await Promise.all(t.visibleIf.map(async i=>await u(i,r,e)))).filter(Boolean).length===t.visibleIf.length;return Promise.resolve(o?t:{})}import{getStyleTag as ut,getStyleTagProperties as ft,virtualSheet as mt}from"https://cdn.skypack.dev/twind@0.16.16/sheets?min";import{draggable as v}from"https://cdn.skypack.dev/dragjs@v0.13.3?min";import{produce as x}from"https://cdn.skypack.dev/immer@9.0.6?min";import{setup as ht}from"https://cdn.skypack.dev/twind@0.16.16?min";import{tw as Et}from"https://cdn.skypack.dev/twind@0.16.16?min";var B="document-tree-element",D="controls-element";async function N(){console.log("create editor");let[t,e,r,n]=await Promise.all([fetch("/components.json").then(l=>l.json()),fetch("./context.json").then(l=>l.json()),fetch("./layout.json").then(l=>l.json()),fetch("./route.json").then(l=>l.json())]),o=F(r,n),i=await V(t,e);o.append(i);let a=await W(t,e);o.append(a),document.body.appendChild(o),evaluateAllDirectives();let s=R(o);globalThis.onclick=({target:l})=>s(l),globalThis.ontouchstart=({target:l})=>s(l)}function R(t){return function(r){if(!r)return;let n=r,o=n.hasAttribute("data-id")?n:U(n,"data-id")[0];if(!o)return;let i=o.getAttribute("data-id"),{editor:{layout:a}}=getState(t);setState({selectionId:i},{element:t,parent:"editor"}),o&&k(t,o,a)}}var E;function k(t,e,r){let n,o=e.dataset.id;if(!o){console.log("target doesn't have a selection id");return}let i=s=>{!s||!s.target||q(t,r,o,s.target,n)},a=s=>{if(!s.target){console.warn("inputListener - No element found");return}s.preventDefault(),e.removeAttribute("contenteditable"),e.removeEventListener("input",i),e.removeEventListener("focusout",a)};E&&(E.classList.remove("border"),E.classList.remove("border-red-800")),E=e,e.classList.add("border"),e.classList.add("border-red-800"),e.children.length===0&&e.textContent&&(n=e.textContent,e.setAttribute("contenteditable","true"),e.addEventListener("focusout",a),e.addEventListener("input",i),e.focus())}function q(t,e,r,n,o){let i=n.textContent;if(o===i){console.log("content didn't change");return}if(typeof i!="string")return;console.log("content changed",i);let a=x(e,l=>{C(l,d=>{d?.attributes?.["data-id"]===r&&(d.children=i)})}),s=t.children[0];setState({layout:a},{element:s,parent:"editor"})}var A="editors";function F(t,e){let r=document.getElementById(A),n={layout:t,meta:e.meta,selectionId:void 0};return r?.remove(),r=document.createElement("div"),r.id=A,r.style.visibility="visible",r.setAttribute("x-state",JSON.stringify(n)),r.setAttribute("x-label","editor"),r}function xt(){let t=document.getElementById(A);!t||(t.style.visibility=t.style.visibility==="visible"?"hidden":"visible")}async function V(t,e){console.log("creating page editor");let r=document.createElement("div");r.id=B,r.innerHTML=await w({component:t.PageEditor,components:t,context:e,extensions:[L,S,T]});let n=r.children[0],o=n.children[0];return v({element:n,handle:o}),r}async function W(t,e){let r=document.createElement("div");r.id=D,r.innerHTML=await w({component:t.ComponentEditor,components:t,context:e,extensions:[L,S,T]});let n=r.children[0],o=n.children[0];return v({element:n,handle:o,xPosition:"right"}),r}function _(t,e){let{editor:{meta:r}}=getState(t),n=t.dataset.field;if(!n){console.error(`${n} was not found in ${t.dataset}`);return}if(n==="title"){let o=document.querySelector("title");o?o.innerHTML=e||"":console.warn("The page doesn't have a <title>!")}else{let o=document.head.querySelector("meta[name='"+n+"']");o?o.setAttribute("content",e):console.warn(`The page doesn't have a ${n} meta element!`)}setState({meta:{...r,[n]:e}},{element:t,parent:"editor"})}function J(t,e){let{editor:{layout:r,selectionId:n}}=getState(t),o=P(r,n,(i,a)=>{a.forEach(s=>{s.innerHTML=e}),i.children=e});setState({layout:o},{element:t,parent:"editor"})}function G(t,e){let{editor:{layout:r,selectionId:n}}=getState(t),o=P(r,n,(i,a)=>{Array.isArray(i)||(a.forEach(s=>s.setAttribute("class",e)),i.class=e)});setState({layout:o},{element:t,parent:"editor"})}function K(t,e){let{editor:{layout:r,selectionId:n}}=getState(t),o=P(r,n,(i,a)=>{Array.isArray(i)||(a.forEach(s=>s.replaceWith(M(s,e))),i.type=e)});setState({layout:o},{element:t,parent:"editor"})}function P(t,e,r){return x(t,n=>{C(n,o=>{o?.attributes?.["data-id"]===e&&r(o,Array.from(document.querySelectorAll(`*[data-id="${e}"]`)))})})}function Q(t){let{layout:e,selectionId:r}=t;if(!r)return{};let n;return C(e,o=>{o?.attributes?.["data-id"]===r&&(n=o)}),n}"Deno"in globalThis||(console.log("Hello from the page editor"),window.createEditor=N,window.classChanged=G,window.contentChanged=J,window.getSelectedComponent=Q,window.metaChanged=_,window.elementChanged=K);export{N as createEditor,xt as toggleEditorVisibility};

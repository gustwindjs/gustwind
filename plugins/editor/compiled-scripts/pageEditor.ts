import{draggable as I}from"https://cdn.skypack.dev/dragjs@v0.13.3?min";import{produce as O}from"https://cdn.skypack.dev/immer@9.0.16?min";function P(t,e){let r=[],n=t.parentElement;for(;n;)n.hasAttribute(e)&&r.push(n),n=n.parentElement;return r}function U(t,e){let r=document.createElement(e),n=t.cloneNode(!0);for(;n.firstChild;)r.appendChild(n.firstChild);for(let o of n.attributes)r.setAttribute(o.name,o.value);return r}function C(t,e){let r=0;function n(o,i){Array.isArray(o)?o.forEach(a=>n(a,i)):(i(o,r),r++,Array.isArray(o.children)&&n(o.children,i),o.props&&n(Object.values(o.props),i))}n(t,e)}function p(t){return typeof t>"u"}var f=t=>t!==null&&!Array.isArray(t)&&typeof t=="object";function y(t,e,r){if(!f(t))throw console.error(t),new Error("get - data context is not an object!");if(!e)return r;let n=t,o=e.split(".");if(o.length===1){if(t){let i=t[e];return p(i)?r:i}return r}return o.forEach(i=>{f(n)&&(n=n[i])}),p(n)?r:n}async function j(t,e,r){return Object.fromEntries(await Promise.all(Object.entries(t).map(async([n,o])=>[n,typeof o=="string"?o:await u(o,e,r)])))}async function u(t,e,r){if(!e)throw new Error("applyUtility - No utilities were provided");if(typeof t.utility!="string")return;let n=e[t.utility];if(!n)throw console.error({utilities:e,value:t}),new Error("applyUtility - Matching utility was not found");let o=await Promise.all(Array.isArray(t.parameters)?t.parameters.map(i=>{if(typeof i!="string"){if(i.utility&&i.parameters)return u(i,e,r)}return i}):[]);return n.apply(void 0,[r].concat(o))}var w={concat:(t,...e)=>e.join(""),get:(t,e,r,n)=>{let o=y(t,e);if(!f(o))throw console.error(t,e),new Error("get - Found context is not an object");return y(o,r,n)},stringify:(t,e)=>JSON.stringify(e,null,2)};async function $(t){let{context:e={},utilities:r}=t;r?._onRenderStart&&r._onRenderStart(e);let n=await g(t);return r?._onRenderEnd&&r._onRenderEnd(e),n}async function g({component:t,components:e,extensions:r,context:n,props:o,utilities:i}){let a=(c,b)=>M(b)?g({component:b,components:e,extensions:r,context:n,utilities:i}):b;if(i=f(i)?{render:a,...w,...i}:{render:a,...w},Array.isArray(t))return(await Promise.all(t.map(c=>g({component:c,components:e,extensions:r,context:n,props:o,utilities:i})))).join("");let s=t.type,d=s&&typeof s=="string"&&e?.[s],l={...o,...t.props};if(t.bindToProps){let c=await j(t.bindToProps,i,{context:n,props:l});l={...l,...c}}if(d)return(await Promise.all((Array.isArray(d)?d:[d]).map(c=>g({component:c,components:e,extensions:r,context:n,props:l,utilities:i})))).join("");if(r){for(let c of r)t=await c(t,{props:l,context:n},i);s=t.type}let m=await k(t.attributes,{props:l,context:n},i),h=s;if(typeof s=="string"||s?.utility&&s?.parameters&&(h=await u(s,i,{context:n,props:l})),t.children){let c=t.children;return typeof c=="string"||(Array.isArray(c)?c=await g({component:c,props:l,components:e,extensions:r,context:n,utilities:i}):c.utility&&i&&(c=await u(c,i,{context:n,props:l}))),H(h,m,c)}return s?typeof t.closingCharacter=="string"?`<${h}${m?" "+m:""} ${t.closingCharacter}>`:H(h,m):""}function M(t){return Array.isArray(t)?t.every(M):!!(f(t)&&(t.children||t.type))}function H(t,e,r=""){return t?`<${t}${e?" "+e:""}>${r}</${t}>`:r||""}async function k(t,e,r){return t?(await R(t,e,r)).map(([n,o])=>o&&o.length>0?`${n}="${o}"`:n).join(" "):""}async function R(t,e,r){return t?(await Promise.all(await Object.entries(t).map(async([n,o])=>{if(p(o))return[];let i=o;if(p(i))return[];if(i.context?i=y(y(e,i.context),i.property,i.default):i.utility&&r&&(i=await u(i,r,e)),!p(i))return[n,i]}))).filter(Boolean):[]}var L=$;function x(t){return async function(e,r,n){let o=[];if(typeof e.class=="string"?o.push(e.class):e.class?.utility&&e.class.parameters&&o.push(await u(e.class,n,r)),f(e.classList)){let i=(await Promise.all(await Object.entries(e.classList).map(async([a,s])=>{let d=await u(s[0],n,r);if(s.length===1)return d;let l=(await Promise.all(s.map(async m=>d===await u(m,n,r)))).filter(Boolean);return s.length===l.length&&a}))).filter(Boolean).join(" ");o.push(i)}return o.length?{...e,attributes:{...e.attributes,class:t?o.map(i=>t(i)).join(" "):o.join(" ")}}:e}}async function S(t,e,r){if(!e||!t.foreach)return Promise.resolve(t);let[n,o]=t.foreach,i=await u(n,r,e);return Array.isArray(i)?Promise.resolve({...t,children:i.flatMap(a=>Array.isArray(o)?o.map(s=>({...s,props:f(a)?a:{value:a}})):{...o,props:f(a)?a:{value:a}})}):Promise.resolve(t)}async function A(t,e,r){if(!Array.isArray(t.visibleIf))return Promise.resolve(t);if(t.visibleIf.length===0)return Promise.resolve({});let o=(await Promise.all(t.visibleIf.map(async i=>{let a=await u(i,r,e);return Array.isArray(a)?a.length>0:a}))).filter(Boolean).length===t.visibleIf.length;return Promise.resolve(o?t:{})}var N="document-tree-element",D="controls-element";async function B(t){console.log("create editor");let[e,r,n,o]=await Promise.all([fetch("/components.json").then(l=>l.json()),fetch("./context.json").then(l=>l.json()),fetch("./layout.json").then(l=>l.json()),fetch("./route.json").then(l=>l.json())]),i=W(n,o),a=await J(e,r,t);i.append(a);let s=await V(e,r,t);i.append(s),document.body.appendChild(i),evaluateAllDirectives();let d=_(i);globalThis.onclick=({target:l})=>d(l),globalThis.ontouchstart=({target:l})=>d(l)}function _(t){return function(r){if(!r)return;let n=r,o=n.hasAttribute("data-id")?n:P(n,"data-id")[0];if(!o||o.nodeName==="BODY")return;let i=o.getAttribute("data-id"),{editor:{layout:a}}=getState(t);setState({selectionId:i},{element:t,parent:"editor"}),o&&F(t,o,a)}}var E;function F(t,e,r){let n,o=e.dataset.id;if(!o){console.log("target doesn't have a selection id");return}let i=s=>{!s||!s.target||q(t,r,o,s.target,n)},a=s=>{if(!s.target){console.warn("inputListener - No element found");return}s.preventDefault(),e.removeAttribute("contenteditable"),e.removeEventListener("input",i),e.removeEventListener("focusout",a)};E&&(E.classList.remove("border"),E.classList.remove("border-red-800")),E=e,e.classList.add("border"),e.classList.add("border-red-800"),e.children.length===0&&e.textContent&&(n=e.textContent,e.setAttribute("contenteditable","true"),e.addEventListener("focusout",a),e.addEventListener("input",i),e.focus())}function q(t,e,r,n,o){let i=n.textContent;if(o===i){console.log("content didn't change");return}if(typeof i!="string")return;let a=O(e,d=>{C(d,l=>{l?.attributes?.["data-id"]===r&&(l.children=i)})}),s=t.children[0];setState({layout:a},{element:s,parent:"editor"})}var v="editors";function W(t,e){let r=document.getElementById(v),n={layout:t,meta:e.meta,selectionId:void 0};return r?.remove(),r=document.createElement("div"),r.id=v,r.style.visibility="visible",r.setAttribute("x-state",JSON.stringify(n)),r.setAttribute("x-label","editor"),r}function Ct(){let t=document.getElementById(v);t&&(t.style.visibility=t.style.visibility==="visible"?"hidden":"visible")}async function J(t,e,r){console.log("creating page editor");let n=document.createElement("div");n.id=N,n.innerHTML=await L({component:t.PageEditor,components:t,context:e,extensions:[A,x(r),S]});let o=n.children[0],i=o.children[0];return I({element:o,handle:i}),n}async function V(t,e,r){let n=document.createElement("div");n.id=D,n.innerHTML=await L({component:t.ComponentEditor,components:t,context:e,extensions:[A,x(r),S]});let o=n.children[0],i=o.children[0];return I({element:o,handle:i,xPosition:"right"}),n}function Y(t,e){let{editor:{meta:r}}=getState(t),n=t.dataset.field;if(!n){console.error(`${n} was not found in ${t.dataset}`);return}if(n==="title"){let o=document.querySelector("title");o?o.innerHTML=e||"":console.warn("The page doesn't have a <title>!")}else{let o=document.head.querySelector("meta[name='"+n+"']");o?o.setAttribute("content",e):console.warn(`The page doesn't have a ${n} meta element!`)}setState({meta:{...r,[n]:e}},{element:t,parent:"editor"})}function G(t,e){let{editor:{layout:r,selectionId:n}}=getState(t),o=T(r,n,(i,a)=>{a.forEach(s=>{s.innerHTML=e}),i.children=e});setState({layout:o},{element:t,parent:"editor"})}function K(t,e){let{editor:{layout:r,selectionId:n}}=getState(t),o=T(r,n,(i,a)=>{Array.isArray(i)||(a.forEach(s=>s.setAttribute("class",e)),i.class=e)});setState({layout:o},{element:t,parent:"editor"})}function Q(t,e){let{editor:{layout:r,selectionId:n}}=getState(t),o=T(r,n,(i,a)=>{Array.isArray(i)||(a.forEach(s=>s.replaceWith(U(s,e))),i.type=e)});setState({layout:o},{element:t,parent:"editor"})}function T(t,e,r){return O(t,n=>{C(n,o=>{o?.attributes?.["data-id"]===e&&r(o,Array.from(document.querySelectorAll(`*[data-id="${e}"]`)))})})}function X(t){let{layout:e,selectionId:r}=t;if(!r)return{};let n;return C(e,o=>{o?.attributes?.["data-id"]===r&&(n=o)}),n}"Deno"in globalThis||(console.log("Hello from the page editor"),window.createEditor=B,window.classChanged=K,window.contentChanged=G,window.getSelectedComponent=X,window.metaChanged=Y,window.elementChanged=Q);export{B as createEditor,Ct as toggleEditorVisibility};

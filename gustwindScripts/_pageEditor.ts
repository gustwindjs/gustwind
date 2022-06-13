function j(e,r){let n=[],t=e.parentElement;for(;t;)t.hasAttribute(r)&&n.push(t),t=t.parentElement;return n}function H(e,r){let n=document.createElement(r),t=e.cloneNode(!0);for(;t.firstChild;)n.appendChild(t.firstChild);for(let o of t.attributes)n.setAttribute(o.name,o.value);return n}function h(e,r){let n=0;function t(o,i){Array.isArray(o)?o.forEach(s=>t(s,i)):(i(o,n),n++,Array.isArray(o.children)&&t(o.children,i),o.props&&t(Object.values(o.props),i))}t(e,r)}function E(e){return typeof e>"u"}var m=e=>!Array.isArray(e)&&typeof e=="object";function u(e,r){if(!r)return;let n=e;return r.split(".").forEach(t=>{m(n)&&(n=n[t])}),n}function f(e,r={},n=!0){try{return Promise.resolve(Function.apply(null,Object.keys(r).concat(`return ${e}`))(...Object.values(r)))}catch(t){n&&console.error("Failed to evaluate",e,r,t)}}async function g({component:e,components:r,extensions:n,context:t,props:o,utilities:i}){if(Array.isArray(e))return(await Promise.all(e.map(c=>g({component:c,components:r,extensions:n,context:t,props:o,utilities:i})))).join("");let s=e.element,l=s&&r?.[s],a=Object.fromEntries(await M(e.props||o,{context:t,props:o}));if(l)return(await Promise.all((Array.isArray(l)?l:[l]).map(c=>g({component:c,components:r,extensions:n,context:t,props:a,utilities:i})))).join("");if(n){for(let c of n)e=await c(e,{props:a,context:t,utilities:i});s=e.element}e.__element&&(s=u({context:t,props:a},e.__element)||s),e["==element"]&&(s=await f(e["==element"],{props:a,context:t,utilities:i}));let d=await _(e.attributes,typeof e.props!="string"?{props:a,context:t,utilities:i}:t);if(e.children){let c=e.children;return Array.isArray(c)&&(c=await g({component:c,props:a,components:r,extensions:n,context:t,utilities:i})),p(s,d,c)}if(e.__children)return p(s,d,u({context:t,props:a},e.__children));if(e["##children"])return p(s,d,await g({component:u({context:t,props:a},e["##children"]),components:r,extensions:n,context:t,utilities:i}));let y=e["==children"];return y?p(s,d,await f(y,{props:a,context:t,utilities:i})):s?typeof e.closingCharacter=="string"?`<${s}${d?" "+d:""} ${e.closingCharacter}>`:p(s,d):""}function p(e,r,n=""){return e?`<${e}${r?" "+r:""}>${n}</${e}>`:n||""}async function _(e,r){return e?(await M(e,r)).map(([n,t])=>t&&t.length>0?`${n}="${t}"`:n).join(" "):""}async function M(e,r){return e?await Promise.all(Object.entries(e).map(async([n,t])=>{if(E(t))return[];let o=n,i=t;return n.startsWith("__")&&(o=n.split("__").slice(1).join("__"),i=u(r,t)),n.startsWith("==")&&typeof t=="string"&&(o=n.split("==").slice(1).join("=="),i=await f(t,r)),E(i)?[]:[o,i]})):Promise.resolve([])}var b=g;import{getStyleTag as oe,getStyleTagProperties as ie,virtualSheet as se}from"https://cdn.skypack.dev/twind@0.16.16/sheets?min";import{draggable as w}from"https://cdn.skypack.dev/dragjs@v0.13.3?min";import{produce as L}from"https://cdn.skypack.dev/immer@9.0.6?min";import{setup as de}from"https://cdn.skypack.dev/twind@0.16.16?min";import{tw as I}from"https://cdn.skypack.dev/twind@0.16.16?min";async function S(e,r){let n=[];if(typeof e.class=="string"&&n.push(e.class),typeof e.__class=="string"&&n.push(u(r,e.__class)),typeof e["==class"]=="string"&&n.push(await f(e["==class"],r)),m(e.classList)){let t=(await Promise.all(Object.entries(e.classList).map(async([o,i])=>await f(i,r)&&o))).filter(Boolean).join(" ");n.push(t)}return n.length?Promise.resolve({...e,attributes:{...e.attributes,class:n.map(t=>I(t)).join(" ")}}):Promise.resolve(e)}function v(e,r){if(!r||!e.foreach)return Promise.resolve(e);let[n,t]=e.foreach,o=u(r,n);return Array.isArray(o)?Promise.resolve({...e,children:o.flatMap(i=>Array.isArray(t)?t.map(s=>({...s,props:m(i)?i:{value:i}})):{...t,props:m(i)?i:{value:i}})}):Promise.resolve(e)}async function T(e,r){return typeof e.visibleIf!="string"?Promise.resolve(e):await f(e.visibleIf,r)?e:{}}var $="document-tree-element",z="controls-element";async function D(){console.log("create editor");let[e,r,n,t]=await Promise.all([fetch("/components.json").then(a=>a.json()),fetch("./context.json").then(a=>a.json()),fetch("./layout.json").then(a=>a.json()),fetch("./route.json").then(a=>a.json())]),o=N(n,t),i=await V(e,r);o.append(i);let s=await W(e,r);o.append(s),document.body.appendChild(o),evaluateAllDirectives();let l=R(o);globalThis.onclick=({target:a})=>l(a),globalThis.ontouchstart=({target:a})=>l(a)}function R(e){return function(n){if(!n)return;let t=n,o=t.hasAttribute("data-id")?t:j(t,"data-id")[0];if(!o)return;let i=o.getAttribute("data-id"),{editor:{layout:s}}=getState(e);setState({selectionId:i},{element:e,parent:"editor"}),o&&F(e,o,s)}}var C;function F(e,r,n){let t,o=r.dataset.id;if(!o){console.log("target doesn't have a selection id");return}let i=s=>{let l=s.target;if(!l){console.warn("inputListener - No element found");return}s.preventDefault(),r.removeAttribute("contenteditable"),r.removeEventListener("focusout",i);let a=l.textContent;if(t===a){console.log("content didn't change");return}if(typeof a!="string")return;console.log("content changed",a);let d=L(n,c=>{h(c,x=>{x?.attributes?.["data-id"]===o&&(x.children=a)})}),y=e.children[0];setState({layout:d},{element:y,parent:"editor"})};C&&(C.classList.remove("border"),C.classList.remove("border-red-800")),C=r,r.classList.add("border"),r.classList.add("border-red-800"),r.children.length===0&&r.textContent&&(t=r.textContent,r.setAttribute("contenteditable","true"),r.addEventListener("focusout",i),r.focus())}var A="editors";function N(e,r){let n=document.getElementById(A),t={layout:e,meta:r.meta,selectionId:void 0};return n?.remove(),n=document.createElement("div"),n.id=A,n.style.visibility="visible",n.setAttribute("x-state",JSON.stringify(t)),n.setAttribute("x-label","editor"),n}function we(){let e=document.getElementById(A);!e||(e.style.visibility=e.style.visibility==="visible"?"hidden":"visible")}async function V(e,r){console.log("creating page editor");let n=document.createElement("div");n.id=$,n.innerHTML=await b({component:e.PageEditor,components:e,context:r,extensions:[S,v,T]});let t=n.children[0],o=t.children[0];return w({element:t,handle:o}),n}async function W(e,r){let n=document.createElement("div");n.id=z,n.innerHTML=await b({component:e.ComponentEditor,components:e,context:r,extensions:[S,v,T]});let t=n.children[0],o=t.children[0];return w({element:t,handle:o,xPosition:"right"}),n}function B(e,r){let{editor:{meta:n}}=getState(e),t=e.dataset.field;if(!t){console.error(`${t} was not found in ${e.dataset}`);return}if(t==="title"){let o=document.querySelector("title");o?o.innerHTML=r||"":console.warn("The page doesn't have a <title>!")}else{let o=document.head.querySelector("meta[name='"+t+"']");o?o.setAttribute("content",r):console.warn(`The page doesn't have a ${t} meta element!`)}setState({meta:{...n,[t]:r}},{element:e,parent:"editor"})}function U(e,r){let{editor:{layout:n,selectionId:t}}=getState(e),o=P(n,t,(i,s)=>{s.forEach(l=>{l.innerHTML=r}),i.children=r});setState({layout:o},{element:e,parent:"editor"})}function q(e,r){let{editor:{layout:n,selectionId:t}}=getState(e),o=P(n,t,(i,s)=>{Array.isArray(i)||(s.forEach(l=>l.setAttribute("class",r)),i.class=r)});setState({layout:o},{element:e,parent:"editor"})}function J(e,r){let{editor:{layout:n,selectionId:t}}=getState(e),o=P(n,t,(i,s)=>{Array.isArray(i)||(s.forEach(l=>l.replaceWith(H(l,r))),i.element=r)});setState({layout:o},{element:e,parent:"editor"})}function P(e,r,n){return L(e,t=>{h(t,o=>{o?.attributes?.["data-id"]===r&&n(o,Array.from(document.querySelectorAll(`*[data-id="${r}"]`)))})})}function G(e){let{layout:r,selectionId:n}=e;if(!n)return{};let t;return h(r,o=>{o?.attributes?.["data-id"]===n&&(t=o)}),t}"Deno"in globalThis||(console.log("Hello from the page editor"),window.createEditor=D,window.classChanged=q,window.contentChanged=U,window.getSelectedComponent=G,window.metaChanged=B,window.elementChanged=J);export{D as createEditor,we as toggleEditorVisibility};

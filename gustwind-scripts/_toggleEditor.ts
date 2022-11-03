var tt=Object.defineProperty;var u=(t,e)=>()=>(t&&(e=t(t=0)),e);var I=(t,e)=>{for(var n in e)tt(t,n,{get:e[n],enumerable:!0})};var $={};I($,{registerListener:()=>nt});function et(){let t={mode:"silent",target:document.body};Promise.all([import("https://cdn.skypack.dev/twind@0.16.16/shim?min"),import("/twindSetup.js")]).then(([{setup:e},n])=>{console.log("loaded custom twind setup",n.default),e({...t,...n.default}),import("https://cdn.skypack.dev/twind@0.16.16?min").then(({tw:r})=>{O=r,z=!0,B.forEach(o=>o(r))})})}function nt(t){console.log("registering a twind runtime listener"),z?t(O):B.push(t)}var z,O,B,D=u(()=>{z=!1,B=[];"Deno"in globalThis||et()});function N(t,e){let n=[],r=t.parentElement;for(;r;)r.hasAttribute(e)&&n.push(r),r=r.parentElement;return n}var k=u(()=>{});function R(t,e){let n=document.createElement(e),r=t.cloneNode(!0);for(;r.firstChild;)n.appendChild(r.firstChild);for(let o of r.attributes)n.setAttribute(o.name,o.value);return n}var F=u(()=>{});function E(t,e){let n=0;function r(o,i){Array.isArray(o)?o.forEach(a=>r(a,i)):(i(o,n),n++,Array.isArray(o.children)&&r(o.children,i),o.props&&r(Object.values(o.props),i))}r(t,e)}var _=u(()=>{});function y(t){return typeof t>"u"}function g(t,e,n){if(!f(t))throw console.error(t),new Error("get - data context is not an object!");if(!e)return n;let r=t,o=e.split(".");if(o.length===1){if(t){let i=t[e];return y(i)?n:i}return n}return o.forEach(i=>{f(r)&&(r=r[i])}),y(r)?n:r}var f,w=u(()=>{f=t=>!Array.isArray(t)&&typeof t=="object"});async function q(t,e,n){return Object.fromEntries(await Promise.all(Object.entries(t).map(async([r,o])=>[r,typeof o=="string"?o:await m(o,e,n)])))}async function m(t,e,n){if(!e)throw new Error("applyUtility - No utilities were provided");if(typeof t.utility!="string")return;let r=e[t.utility];if(!r)throw console.error({utilities:e,value:t}),new Error("applyUtility - Matching utility was not found");let o=await Promise.all(Array.isArray(t.parameters)?t.parameters.map(i=>{if(typeof i!="string"){if(i.utility&&i.parameters)return m(i,e,n)}return i}):[]);return r.apply(null,[n].concat(o))}var T=u(()=>{});var L,V=u(()=>{w();L={concat:(t,...e)=>e.join(""),get:(t,e,n,r)=>{let o=g(t,e);if(!f(o))throw console.error(t,e),new Error("get - Found context is not an object");return g(o,n,r)},stringify:(t,e)=>JSON.stringify(e,null,2)}});async function h({component:t,components:e,extensions:n,context:r,props:o,utilities:i}){let a=(c,Z)=>h({component:Z,components:e,extensions:n,context:r,utilities:i});if(i=f(i)?{render:a,...L,...i}:{render:a,...L},Array.isArray(t))return(await Promise.all(t.map(c=>h({component:c,components:e,extensions:n,context:r,props:o,utilities:i})))).join("");let s=t.type,l=s&&typeof s=="string"&&e?.[s],d={...o,...t.props};if(t.bindToProps){let c=await q(t.bindToProps,i,{context:r,props:d});d={...d,...c}}if(l)return(await Promise.all((Array.isArray(l)?l:[l]).map(c=>h({component:c,components:e,extensions:n,context:r,props:d,utilities:i})))).join("");if(n){for(let c of n)t=await c(t,{props:d,context:r},i);s=t.type}let p=await rt(t.attributes,{props:d,context:r},i),C=s;if(typeof s=="string"||s?.utility&&s?.parameters&&(C=await m(s,i,{context:r,props:d})),t.children){let c=t.children;return typeof c=="string"||(Array.isArray(c)?c=await h({component:c,props:d,components:e,extensions:n,context:r,utilities:i}):c.utility&&i&&(c=await m(c,i,{context:r,props:d}))),J(C,p,c)}return s?typeof t.closingCharacter=="string"?`<${C}${p?" "+p:""} ${t.closingCharacter}>`:J(C,p):""}function J(t,e,n=""){return t?`<${t}${e?" "+e:""}>${n}</${t}>`:n||""}async function rt(t,e,n){return t?(await ot(t,e,n)).map(([r,o])=>o&&o.length>0?`${r}="${o}"`:r).join(" "):""}async function ot(t,e,n){return t?(await Promise.all(await Object.entries(t).map(async([r,o])=>{if(y(o))return[];let i=o;if(y(i))return[];if(i.context?i=g(g(e,i.context),i.property,i.default):i.utility&&n&&(i=await m(i,n,e)),!y(i))return[r,i]}))).filter(Boolean):[]}var x,W=u(()=>{w();T();V();x=h});function S(t){return async function(e,n,r){let o=[];if(typeof e.class=="string"?o.push(e.class):e.class?.utility&&e.class.parameters&&o.push(await m(e.class,r,n)),f(e.classList)){let i=(await Promise.all(await Object.entries(e.classList).map(async([a,s])=>{let l=await m(s[0],r,n);if(s.length===1)return l;let d=(await Promise.all(s.map(async p=>l===await m(p,r,n)))).filter(Boolean);return s.length===d.length&&a}))).filter(Boolean).join(" ");o.push(i)}return o.length?{...e,attributes:{...e.attributes,class:o.map(i=>t(i)).join(" ")}}:e}}async function v(t,e,n){if(!e||!t.foreach)return Promise.resolve(t);let[r,o]=t.foreach,i=await m(r,n,e);return Array.isArray(i)?Promise.resolve({...t,children:i.flatMap(a=>Array.isArray(o)?o.map(s=>({...s,props:f(a)?a:{value:a}})):{...o,props:f(a)?a:{value:a}})}):Promise.resolve(t)}async function A(t,e,n){if(!Array.isArray(t.visibleIf))return Promise.resolve(t);if(t.visibleIf.length===0)return Promise.resolve({});let o=(await Promise.all(t.visibleIf.map(async i=>await m(i,n,e)))).filter(Boolean).length===t.visibleIf.length;return Promise.resolve(o?t:{})}var G=u(()=>{w();T()});import{getStyleTag as Bt,getStyleTagProperties as $t,virtualSheet as Dt}from"https://cdn.skypack.dev/twind@0.16.16/sheets?min";import{draggable as P}from"https://cdn.skypack.dev/dragjs@v0.13.3?min";import{produce as U}from"https://cdn.skypack.dev/immer@9.0.16?min";import{setup as Ft}from"https://cdn.skypack.dev/twind@0.16.16?min";import{tw as M}from"https://cdn.skypack.dev/twind@0.16.16?min";var K=u(()=>{});var X={};I(X,{createEditor:()=>Q,toggleEditorVisibility:()=>ut});async function Q(){console.log("create editor");let[t,e,n,r]=await Promise.all([fetch("/components.json").then(l=>l.json()),fetch("./context.json").then(l=>l.json()),fetch("./layout.json").then(l=>l.json()),fetch("./route.json").then(l=>l.json())]),o=mt(n,r),i=await ft(t,e);o.append(i);let a=await pt(t,e);o.append(a),document.body.appendChild(o),evaluateAllDirectives();let s=lt(o);globalThis.onclick=({target:l})=>s(l),globalThis.ontouchstart=({target:l})=>s(l)}function lt(t){return function(n){if(!n)return;let r=n,o=r.hasAttribute("data-id")?r:N(r,"data-id")[0];if(!o)return;let i=o.getAttribute("data-id"),{editor:{layout:a}}=getState(t);setState({selectionId:i},{element:t,parent:"editor"}),o&&ct(t,o,a)}}function ct(t,e,n){let r,o=e.dataset.id;if(!o){console.log("target doesn't have a selection id");return}let i=s=>{!s||!s.target||dt(t,n,o,s.target,r)},a=s=>{if(!s.target){console.warn("inputListener - No element found");return}s.preventDefault(),e.removeAttribute("contenteditable"),e.removeEventListener("input",i),e.removeEventListener("focusout",a)};b&&(b.classList.remove("border"),b.classList.remove("border-red-800")),b=e,e.classList.add("border"),e.classList.add("border-red-800"),e.children.length===0&&e.textContent&&(r=e.textContent,e.setAttribute("contenteditable","true"),e.addEventListener("focusout",a),e.addEventListener("input",i),e.focus())}function dt(t,e,n,r,o){let i=r.textContent;if(o===i){console.log("content didn't change");return}if(typeof i!="string")return;let a=U(e,l=>{E(l,d=>{d?.attributes?.["data-id"]===n&&(d.children=i)})}),s=t.children[0];setState({layout:a},{element:s,parent:"editor"})}function mt(t,e){let n=document.getElementById(j),r={layout:t,meta:e.meta,selectionId:void 0};return n?.remove(),n=document.createElement("div"),n.id=j,n.style.visibility="visible",n.setAttribute("x-state",JSON.stringify(r)),n.setAttribute("x-label","editor"),n}function ut(){let t=document.getElementById(j);!t||(t.style.visibility=t.style.visibility==="visible"?"hidden":"visible")}async function ft(t,e){console.log("creating page editor");let n=document.createElement("div");n.id=st,n.innerHTML=await x({component:t.PageEditor,components:t,context:e,extensions:[S(M),v,A]});let r=n.children[0],o=r.children[0];return P({element:r,handle:o}),n}async function pt(t,e){let n=document.createElement("div");n.id=at,n.innerHTML=await x({component:t.ComponentEditor,components:t,context:e,extensions:[S(M),v,A]});let r=n.children[0],o=r.children[0];return P({element:r,handle:o,xPosition:"right"}),n}function yt(t,e){let{editor:{meta:n}}=getState(t),r=t.dataset.field;if(!r){console.error(`${r} was not found in ${t.dataset}`);return}if(r==="title"){let o=document.querySelector("title");o?o.innerHTML=e||"":console.warn("The page doesn't have a <title>!")}else{let o=document.head.querySelector("meta[name='"+r+"']");o?o.setAttribute("content",e):console.warn(`The page doesn't have a ${r} meta element!`)}setState({meta:{...n,[r]:e}},{element:t,parent:"editor"})}function gt(t,e){let{editor:{layout:n,selectionId:r}}=getState(t),o=H(n,r,(i,a)=>{a.forEach(s=>{s.innerHTML=e}),i.children=e});setState({layout:o},{element:t,parent:"editor"})}function ht(t,e){let{editor:{layout:n,selectionId:r}}=getState(t),o=H(n,r,(i,a)=>{Array.isArray(i)||(a.forEach(s=>s.setAttribute("class",e)),i.class=e)});setState({layout:o},{element:t,parent:"editor"})}function Ct(t,e){let{editor:{layout:n,selectionId:r}}=getState(t),o=H(n,r,(i,a)=>{Array.isArray(i)||(a.forEach(s=>s.replaceWith(R(s,e))),i.type=e)});setState({layout:o},{element:t,parent:"editor"})}function H(t,e,n){return U(t,r=>{E(r,o=>{o?.attributes?.["data-id"]===e&&n(o,Array.from(document.querySelectorAll(`*[data-id="${e}"]`)))})})}function Et(t){let{layout:e,selectionId:n}=t;if(!n)return{};let r;return E(e,o=>{o?.attributes?.["data-id"]===n&&(r=o)}),r}var st,at,b,j,Y=u(()=>{k();F();_();W();G();K();st="document-tree-element",at="controls-element";j="editors";"Deno"in globalThis||(console.log("Hello from the page editor"),window.createEditor=Q,window.classChanged=ht,window.contentChanged=gt,window.getSelectedComponent=Et,window.metaChanged=yt,window.elementChanged=Ct)});"Deno"in globalThis||Promise.resolve().then(()=>(D(),$)).then(t=>{t.registerListener(wt)});function wt(t){console.log("initializing editor");let e=!1,n=document.createElement("button");n.className=t("fixed right-4 bottom-4 whitespace-nowrap text-lg"),n.innerText="\u{1F433}\u{1F4A8}",n.onclick=async()=>{let r=await Promise.resolve().then(()=>(Y(),X));e?r.toggleEditorVisibility():(e=!0,r.createEditor())},document.body.appendChild(n)}

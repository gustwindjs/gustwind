var _=Object.defineProperty;var ee=t=>_(t,"__esModule",{value:!0});var d=(t,e)=>()=>(t&&(e=t(t=0)),e);var k=(t,e)=>{ee(t);for(var n in e)_(t,n,{get:e[n],enumerable:!0})};var D={};k(D,{registerListener:()=>ne});function te(){let t={mode:"silent",target:document.body};Promise.all([import("https://cdn.skypack.dev/twind@0.16.16/shim?min"),import("/twindSetup.js")]).then(([{setup:e},n])=>{console.log("loaded custom twind setup",n.default),e({...t,...n.default}),import("https://cdn.skypack.dev/twind@0.16.16?min").then(({tw:r})=>{P=r,A=!0,j.forEach(o=>o(r))})})}function ne(t){console.log("registering a twind runtime listener"),A?t(P):j.push(t)}var A,P,j,O=d(()=>{A=!1,j=[];"Deno"in globalThis||te()});function h({element:t,handle:e,xPosition:n},r){if(!t){console.warn("drag is missing elem!");return}$(t,"touchstart","touchmove","touchend",r,e,n),$(t,"mousedown","mousemove","mouseup",r,e,n)}function $(t,e,n,r,o,i,s){o=re(o,s="left");let a=o.begin,l=o.change,u=o.end;b(i||t,e,p=>{let x=Z=>E(l,t,Z);function H(){W(document,n,x),W(document,r,H),E(u,t,p)}b(document,n,x),b(document,r,H),E(a,t,p)})}function b(t,e,n){let r=!1;try{let o=Object.defineProperty({},"passive",{get:function(){r=!0}});globalThis.addEventListener("testPassive",null,o),globalThis.removeEventListener("testPassive",null,o)}catch(o){console.error(o)}t.addEventListener(e,n,r?{passive:!1}:!1)}function W(t,e,n){t.removeEventListener(e,n,!1)}function re(t,e="left"){if(t)return{begin:t.begin||g,change:t.change||g,end:t.end||g};let n,r;return{begin:function(o){let i=document.body.clientWidth;n={x:e==="left"?o.elem.offsetLeft:i-o.elem.offsetLeft-o.elem.clientWidth,y:o.elem.offsetTop},r=e==="left"?o.cursor:{x:i-o.cursor.x,y:o.cursor.y}},change:function(o){if(typeof n.x!="number"||typeof o.cursor.x!="number"||typeof r.x!="number")return;let i=document.body.clientWidth;B(o.elem,e,e==="left"?n.x+o.cursor.x-r.x+"px":n.x+(i-o.cursor.x)-r.x+"px"),!(typeof n.y!="number"||typeof o.cursor.y!="number"||typeof r.y!="number")&&B(o.elem,"top",n.y+o.cursor.y-r.y+"px")},end:g}}function B(t,e,n){t.style[e]=n}function g(){}function E(t,e,n){n.preventDefault();let r=oe(e),o=e.clientWidth,i=e.clientHeight,s={x:ie(e,n),y:se(e,n)};if(typeof s.x!="number"||typeof s.y!="number")return;let a=(s.x-r.x)/o,l=(s.y-r.y)/i;t({x:isNaN(a)?0:a,y:isNaN(l)?0:l,cursor:s,elem:e,e:n})}function oe(t){let e=t.getBoundingClientRect();return{x:e.left,y:e.top}}function ie(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientX:e.clientX}function se(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientY:e.clientY}var R=d(()=>{});function c(t,e){let n=t;return e.split(".").forEach(r=>{C(n)&&(n=n[r])}),n}var C,T=d(()=>{C=t=>typeof t=="object"});async function w(t,e,n,r){if(!n)return Promise.resolve({content:r});if("Deno"in globalThis){let o=await import("https://deno.land/std@0.107.0/path/mod.ts");return(await Promise.all(n.map(s=>{let a=o.join(e,`${s}.ts`);return Deno.env.get("DEBUG")==="1"&&console.log("importing transform",a,e,s),t==="production"?import("file://"+a):import("file://"+a+"?cache="+new Date().getTime())}))).reduce((s,a)=>a.default(s),r)}return Promise.all(n.map(o=>import(`/transforms/${o}.js`)))}var F=d(()=>{});function I(t,e){return!t||!e?[]:Object.entries(e).map(([n,r])=>ae(t,n,r))}function ae(t,e,n){return e.startsWith("__")?[e.slice(2),c(t.__bound,n)||c(t,n)]:e.startsWith("==")?[e.slice(2),y(n,t.__bound||t)]:[e,n]}function y(t,e={}){try{return Function.apply(null,Object.keys(e).concat(`return ${t}`))(...Object.values(e))}catch(n){console.error("Failed to evaluate",t,e,n)}}var N=d(()=>{T()});import{tw as q}from"https://cdn.skypack.dev/twind@0.16.16?min";async function m(t,e,n,r){if(typeof e=="string")return e;let o=e.element&&n[e.element];if(e.__bind&&(C(e.__bind)?r={...r,__bound:e.__bind}:r={...r,__bound:c(r,e.__bind)}),o){if(Array.isArray(o))return await m(t,{element:"",children:o},n,r);e={...e,...o,element:o.element,class:de(e.class,o.class)}}if(e?.transformWith){let a;if(typeof e.inputText=="string")a=await w("production",t,e?.transformWith,e.inputText);else if(typeof e.inputProperty=="string"){let l=c(r,e.inputProperty);if(!l)throw console.error("Missing input",r,e.inputProperty),new Error("Missing input");a=await w("production",t,e?.transformWith,l)}r={...r,...a}}let i;if(e.__children){let a=e.__children,l=r.__bound||r;typeof a=="string"?i=c(l,a)||c(r,a):i=(await Promise.all((Array.isArray(l)?l:[l]).flatMap(u=>a.map(p=>m(t,p,n,{...r,__bound:u}))))).join("")}else if(e["==children"]){let a=e["==children"];i=y(a,r.__bound||r)}else i=Array.isArray(e.children)?(await Promise.all(e.children.map(async a=>await m(t,a,n,r)))).join(""):e.children;let s=le(e,r);return ce(e.element,ue(r,s?{...e.attributes,class:s}:e.attributes),i)}function le(t,e){let n=[];return t.__class&&Object.entries(t.__class).forEach(([r,o])=>{y(o,{attributes:t.attributes,context:e})&&n.push(q(r))}),t.class?q(n.concat(t.class.split(" ")).join(" ")):n.join(" ")}function de(t,e){return t?e?`${t} ${e}`:t:e||""}function ce(t,e,n){return t?`<${t}${e?" "+e:""}>${n||""}</${t}>`:typeof n=="string"?n:""}function ue(t,e){return e?I(t,e).map(([n,r])=>`${n}="${r}"`).join(" "):""}var z=d(()=>{T();F();N()});function X(){let t=document.querySelector('meta[name="pagepath"]');if(!t){console.error("path element was not found!");return}let e=t.getAttribute("content");if(!e){console.log("pagePath was not found in path element");return}return e}var Y=d(()=>{});var K={};k(K,{createEditor:()=>J,toggleEditorVisibility:()=>ye});import{produce as v}from"https://cdn.skypack.dev/immer@9.0.6?min";import{nanoid as me}from"https://cdn.skypack.dev/nanoid@3.1.30?min";async function J(){console.log("create editor");let[t,e,n,r]=await Promise.all([fetch("/components.json").then(l=>l.json()),fetch("./context.json").then(l=>l.json()),fetch("./layout.json").then(l=>l.json()),fetch("./route.json").then(l=>l.json())]),o=ge(n,r),i=document.createElement("div");i.setAttribute("x-label","selected"),i.setAttribute("x-state","{ componentId: undefined }"),o.appendChild(i);let s=await Ee(t,e);i.append(s);let a=await Ce(t,e);i.append(a),document.body.appendChild(o),evaluateAllDirectives()}function ge(t,e){let n=document.getElementById(L);return n?.remove(),n=document.createElement("div"),n.id=L,n.style.visibility="visible",n.setAttribute("x-state",JSON.stringify({...t,body:he(t.body),meta:e.meta})),n.setAttribute("x-label","editor"),n}function ye(){let t=document.getElementById(L);!t||(t.style.visibility=t.style.visibility==="visible"?"hidden":"visible")}function he(t){if(!t){console.error("initializeBody - missing body");return}return v(t,e=>{f(e,n=>{n._id=me()})})}function be(t){let e=v(t.body,r=>{f(r,o=>{delete o._id,o.class===""&&delete o.class})}),n={path:X(),data:{...t,body:e}};window.developmentSocket.send(JSON.stringify({type:"update",payload:n}))}async function Ee(t,e){console.log("creating page editor");let n=document.createElement("div");n.id=fe,n.innerHTML=await m("",t.PageEditor,t,e);let r=n.children[0],o=r.children[0];return h({element:r,handle:o}),n}async function Ce(t,e){let n=document.createElement("div");n.id=pe,n.innerHTML=await m("",t.ComponentEditor,t,e);let r=n.children[0],o=r.children[0];return h({element:r,handle:o,xPosition:"right"}),n}function Te(t,e){let{editor:{meta:n}}=getState(t),r=t.dataset.field;if(!r){console.error(`${r} was not found in ${t.dataset}`);return}if(r==="title"){let o=document.querySelector("title");o?o.innerHTML=e||"":console.warn("The page doesn't have a <title>!")}else{let o=document.head.querySelector("meta[name='"+r+"']");o?o.setAttribute("content",e):console.warn(`The page doesn't have a ${r} meta element!`)}setState({meta:{...n,[r]:e}},{element:t,parent:"editor"})}function we(t,e){event?.stopPropagation();let{editor:{body:n}}=getState(t),r=o=>{let i=o.target;if(!i){console.warn("inputListener - No element found");return}o.preventDefault(),V(t,i.textContent)};for(let o of M.values())o.classList.remove("border"),o.classList.remove("border-red-800"),o.removeAttribute("contenteditable"),o.removeEventListener("focusout",r),M.delete(o);f(n,(o,i)=>{if(o._id===e){let s=G(document.body,i,n);s.classList.add("border"),s.classList.add("border-red-800"),M.add(s),Array.isArray(o.children)||(s.setAttribute("contenteditable","true"),s.addEventListener("focusout",r))}}),setState({componentId:e},{element:t,parent:"selected"})}function ve(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=S(n,r,(i,s)=>{s?.replaceWith(Le(s,e)),i.element=e});setState({body:o},{element:t,parent:"editor"})}function Le(t,e){let n=document.createElement(e),r=t.cloneNode(!0);for(;r.firstChild;)n.appendChild(r.firstChild);for(let o of r.attributes)n.setAttribute(o.name,o.value);return n}function V(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=S(n,r,(i,s)=>{s&&(s.innerHTML=e),i.children=e});setState({body:o},{element:t,parent:"editor"})}function Me(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=S(n,r,(i,s)=>{s&&(s.setAttribute("class",e),s.classList.add("border"),s.classList.add("border-red-800")),i.class=e});setState({body:o},{element:t,parent:"editor"})}function S(t,e,n){return v(t,r=>{f(r,(o,i)=>{o._id===e&&n(o,G(document.body,i,t))})})}function G(t,e,n){let r=0;function o(i,s){if(!i)return null;if(Array.isArray(s)){let a=i;for(let l of s){let u=o(a,l);if(u)return u;a=a?.nextElementSibling}}else{if(e===r)return i;if(r++,Array.isArray(s.children)){let a=o(i.firstElementChild,s.children);if(a)return a}}return null}return o(t?.firstElementChild,n)}function Se(t,e){let n={},{componentId:r}=e;return f(t.body,o=>{o._id===r&&(n=o)}),n}function f(t,e){let n=0;function r(o,i){Array.isArray(o)?o.forEach(s=>r(s,i)):(i(o,n),n++,Array.isArray(o.children)&&r(o.children,i))}r(t,e)}function U(t,e=100){let n;return(...r)=>{clearTimeout(n),n=setTimeout(()=>{t.apply(this,r)},e)}}var fe,pe,L,M,Q=d(()=>{R();z();Y();fe="document-tree-element",pe="controls-element";L="editors";M=new Set;"Deno"in globalThis||(console.log("Hello from the page editor"),window.createEditor=J,window.metaChanged=Te,window.classChanged=U(Me),window.elementClicked=we,window.elementChanged=ve,window.contentChanged=U(V),window.getSelectedComponent=Se,window.updateFileSystem=be)});"Deno"in globalThis||Promise.resolve().then(()=>(O(),D)).then(t=>{t.registerListener(xe)});function xe(t){console.log("initializing editor");let e=!1,n=document.createElement("button");n.className=t("fixed right-4 bottom-4 whitespace-nowrap text-lg"),n.innerText="\u{1F433}\u{1F4A8}",n.onclick=async()=>{let r=await Promise.resolve().then(()=>(Q(),K));e?r.toggleEditorVisibility():(e=!0,r.createEditor())},document.body.appendChild(n)}

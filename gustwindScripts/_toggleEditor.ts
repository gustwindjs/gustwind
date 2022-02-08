var H=Object.defineProperty;var ee=t=>H(t,"__esModule",{value:!0});var c=(t,e)=>()=>(t&&(e=t(t=0)),e);var k=(t,e)=>{ee(t);for(var n in e)H(t,n,{get:e[n],enumerable:!0})};var D={};k(D,{registerListener:()=>ne});function te(){let t={mode:"silent",target:document.body};Promise.all([import("https://cdn.skypack.dev/twind@0.16.16/shim?min"),import("/twindSetup.js")]).then(([{setup:e},n])=>{console.log("loaded custom twind setup",n.default),e({...t,...n.default}),import("https://cdn.skypack.dev/twind@0.16.16?min").then(({tw:r})=>{P=r,A=!0,j.forEach(i=>i(r))})})}function ne(t){console.log("registering a twind runtime listener"),A?t(P):j.push(t)}var A,P,j,O=c(()=>{A=!1,j=[];"Deno"in globalThis||te()});function h({element:t,handle:e,xPosition:n},r){if(!t){console.warn("drag is missing elem!");return}$(t,"touchstart","touchmove","touchend",r,e,n),$(t,"mousedown","mousemove","mouseup",r,e,n)}function $(t,e,n,r,i,o,s){i=re(i,s="left");let a=i.begin,l=i.change,u=i.end;b(o||t,e,g=>{let S=Z=>E(l,t,Z);function x(){I(document,n,S),I(document,r,x),E(u,t,g)}b(document,n,S),b(document,r,x),E(a,t,g)})}function b(t,e,n){let r=!1;try{let i=Object.defineProperty({},"passive",{get:function(){r=!0}});globalThis.addEventListener("testPassive",null,i),globalThis.removeEventListener("testPassive",null,i)}catch(i){console.error(i)}t.addEventListener(e,n,r?{passive:!1}:!1)}function I(t,e,n){t.removeEventListener(e,n,!1)}function re(t,e="left"){if(t)return{begin:t.begin||y,change:t.change||y,end:t.end||y};let n,r;return{begin:function(i){let o=document.body.clientWidth;n={x:e==="left"?i.elem.offsetLeft:o-i.elem.offsetLeft-i.elem.clientWidth,y:i.elem.offsetTop},r=e==="left"?i.cursor:{x:o-i.cursor.x,y:i.cursor.y}},change:function(i){if(typeof n.x!="number"||typeof i.cursor.x!="number"||typeof r.x!="number")return;let o=document.body.clientWidth;W(i.elem,e,e==="left"?n.x+i.cursor.x-r.x+"px":n.x+(o-i.cursor.x)-r.x+"px"),!(typeof n.y!="number"||typeof i.cursor.y!="number"||typeof r.y!="number")&&W(i.elem,"top",n.y+i.cursor.y-r.y+"px")},end:y}}function W(t,e,n){t.style[e]=n}function y(){}function E(t,e,n){n.preventDefault();let r=ie(e),i=e.clientWidth,o=e.clientHeight,s={x:oe(e,n),y:se(e,n)};if(typeof s.x!="number"||typeof s.y!="number")return;let a=(s.x-r.x)/i,l=(s.y-r.y)/o;t({x:isNaN(a)?0:a,y:isNaN(l)?0:l,cursor:s,elem:e,e:n})}function ie(t){let e=t.getBoundingClientRect();return{x:e.left,y:e.top}}function oe(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientX:e.clientX}function se(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientY:e.clientY}var B=c(()=>{});function d(t,e){let n=t;return e.split(".").forEach(r=>{C(n)&&(n=n[r])}),n}var C,T=c(()=>{C=t=>typeof t=="object"});async function v(t,e,n,r){if(!n)return Promise.resolve(r);if("Deno"in globalThis){let i=await import("https://deno.land/std@0.107.0/path/mod.ts");return(await Promise.all(n.map(s=>{let a=i.join(e,`${s}.ts`);return Deno.env.get("DEBUG")==="1"&&console.log("importing transform",a,e,s),t==="production"?import("file://"+a):import("file://"+a+"?cache="+new Date().getTime())}))).reduce((s,a)=>a.default(s),r)}return Promise.all(n.map(i=>import(`/transforms/${i}.js`)))}var R=c(()=>{});function F(t,e){return!t||!e?[]:Object.entries(e).map(([n,r])=>ae(t,n,r))}function ae(t,e,n){return e.startsWith("__")?[e.slice(2),d(t.__bound,n)||d(t,n)]:e.startsWith("==")?[e.slice(2),m(n,t.__bound||t)]:[e,n]}function m(t,e={}){try{return Function.apply(null,Object.keys(e).concat(`return ${t}`))(...Object.values(e))}catch(n){console.error("Failed to evaluate",t,e,n)}}var N=c(()=>{T()});import{tw as q}from"https://cdn.skypack.dev/twind@0.16.16?min";async function f(t,e,n,r){if(typeof e=="string")return e;let i=e.element&&n[e.element];if(e.__bind&&(C(e.__bind)?r={...r,__bound:e.__bind}:r={...r,__bound:d(r,e.__bind)||d(r.__bound,e.__bind)}),e.visibleIf){let a=e.visibleIf;if(!m(a,r.__bound||r))return Promise.resolve("")}if(i){if(Array.isArray(i))return await f(t,{element:"",children:i},n,r);e={...e,...i,element:i.element,class:de(e.class,i.class)}}if(e?.transformWith){let a;if(typeof e.inputText=="string")a=await v("production",t,e?.transformWith,e.inputText);else if(typeof e.inputProperty=="string"){let l=d(r,e.inputProperty);if(!l)throw console.error("Missing input",r,e.inputProperty),new Error("Missing input");a=await v("production",t,e?.transformWith,l)}r={...r,...a}}let o;if(e.__children){let a=e.__children,l=r.__bound||r;typeof a=="string"?o=d(l,a)||d(r,a):o=(await Promise.all((Array.isArray(l)?l:[l]).flatMap(u=>a.map(g=>f(t,g,n,{...r,__bound:u}))))).join("")}else if(e["==children"]){let a=e["==children"];o=m(a,r.__bound||r)}else o=Array.isArray(e.children)?(await Promise.all(e.children.map(async a=>await f(t,a,n,r)))).join(""):e.children;let s=le(e,r);return ce(e.element,ue(r,s?{...e.attributes,class:s}:e.attributes),o)}function le(t,e){let n=[];return t.__class&&Object.entries(t.__class).forEach(([r,i])=>{m(i,{attributes:t.attributes,context:e})&&n.push(q(r))}),t.class?q(n.concat(t.class.split(" ")).join(" ")):n.join(" ")}function de(t,e){return t?e?`${t} ${e}`:t:e||""}function ce(t,e,n){return t?`<${t}${e?" "+e:""}>${n||""}</${t}>`:typeof n=="string"?n:""}function ue(t,e){return e?F(t,e).map(([n,r])=>`${n}="${r}"`).join(" "):""}var z=c(()=>{T();R();N()});function X(){let t=document.querySelector('meta[name="pagepath"]');if(!t){console.error("path element was not found!");return}let e=t.getAttribute("content");if(!e){console.log("pagePath was not found in path element");return}return e}var Y=c(()=>{});var K={};k(K,{createEditor:()=>J,toggleEditorVisibility:()=>ye});import{produce as w}from"https://cdn.skypack.dev/immer@9.0.6?min";import{nanoid as fe}from"https://cdn.skypack.dev/nanoid@3.1.30?min";async function J(){console.log("create editor");let[t,e,n,r]=await Promise.all([fetch("/components.json").then(l=>l.json()),fetch("./context.json").then(l=>l.json()),fetch("./layout.json").then(l=>l.json()),fetch("./route.json").then(l=>l.json())]),i=ge(n,r),o=document.createElement("div");o.setAttribute("x-label","selected"),o.setAttribute("x-state","{ componentId: undefined }"),i.appendChild(o);let s=await Ee(t,e);o.append(s);let a=await Ce(t,e);o.append(a),document.body.appendChild(i),evaluateAllDirectives()}function ge(t,e){let n=document.getElementById(L);return n?.remove(),n=document.createElement("div"),n.id=L,n.style.visibility="visible",n.setAttribute("x-state",JSON.stringify({...t,body:he(t.body),meta:e.meta})),n.setAttribute("x-label","editor"),n}function ye(){let t=document.getElementById(L);!t||(t.style.visibility=t.style.visibility==="visible"?"hidden":"visible")}function he(t){if(!t){console.error("initializeBody - missing body");return}return w(t,e=>{p(e,n=>{n._id=fe()})})}function be(t){let e=w(t.body,r=>{p(r,i=>{delete i._id,i.class===""&&delete i.class})}),n={path:X(),data:{...t,body:e}};window.developmentSocket.send(JSON.stringify({type:"update",payload:n}))}async function Ee(t,e){console.log("creating page editor");let n=document.createElement("div");n.id=me,n.innerHTML=await f("",t.PageEditor,t,e);let r=n.children[0],i=r.children[0];return h({element:r,handle:i}),n}async function Ce(t,e){let n=document.createElement("div");n.id=pe,n.innerHTML=await f("",t.ComponentEditor,t,e);let r=n.children[0],i=r.children[0];return h({element:r,handle:i,xPosition:"right"}),n}function Te(t,e){let{editor:{meta:n}}=getState(t),r=t.dataset.field;if(!r){console.error(`${r} was not found in ${t.dataset}`);return}if(r==="title"){let i=document.querySelector("title");i?i.innerHTML=e||"":console.warn("The page doesn't have a <title>!")}else{let i=document.head.querySelector("meta[name='"+r+"']");i?i.setAttribute("content",e):console.warn(`The page doesn't have a ${r} meta element!`)}setState({meta:{...n,[r]:e}},{element:t,parent:"editor"})}function ve(t,e){event?.stopPropagation();let{editor:{body:n}}=getState(t),r=i=>{let o=i.target;if(!o){console.warn("inputListener - No element found");return}i.preventDefault(),V(t,o.textContent)};for(let i of _.values())i.classList.remove("border"),i.classList.remove("border-red-800"),i.removeAttribute("contenteditable"),i.removeEventListener("focusout",r),_.delete(i);p(n,(i,o)=>{if(i._id===e){let s=G(document.body,o,n);s.classList.add("border"),s.classList.add("border-red-800"),_.add(s),Array.isArray(i.children)||(s.setAttribute("contenteditable","true"),s.addEventListener("focusout",r))}}),setState({componentId:e},{element:t,parent:"selected"})}function we(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),i=M(n,r,(o,s)=>{s?.replaceWith(Le(s,e)),o.element=e});setState({body:i},{element:t,parent:"editor"})}function Le(t,e){let n=document.createElement(e),r=t.cloneNode(!0);for(;r.firstChild;)n.appendChild(r.firstChild);for(let i of r.attributes)n.setAttribute(i.name,i.value);return n}function V(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),i=M(n,r,(o,s)=>{s&&(s.innerHTML=e),o.children=e});setState({body:i},{element:t,parent:"editor"})}function _e(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),i=M(n,r,(o,s)=>{s&&(s.setAttribute("class",e),s.classList.add("border"),s.classList.add("border-red-800")),o.class=e});setState({body:i},{element:t,parent:"editor"})}function M(t,e,n){return w(t,r=>{p(r,(i,o)=>{i._id===e&&n(i,G(document.body,o,t))})})}function G(t,e,n){let r=0;function i(o,s){if(!o)return null;if(Array.isArray(s)){let a=o;for(let l of s){let u=i(a,l);if(u)return u;a=a?.nextElementSibling}}else{if(e===r)return o;if(r++,Array.isArray(s.children)){let a=i(o.firstElementChild,s.children);if(a)return a}}return null}return i(t?.firstElementChild,n)}function Me(t,e){let n={},{componentId:r}=e;return p(t.body,i=>{i._id===r&&(n=i)}),n}function p(t,e){let n=0;function r(i,o){Array.isArray(i)?i.forEach(s=>r(s,o)):(o(i,n),n++,Array.isArray(i.children)&&r(i.children,o))}r(t,e)}function U(t,e=100){let n;return(...r)=>{clearTimeout(n),n=setTimeout(()=>{t.apply(this,r)},e)}}var me,pe,L,_,Q=c(()=>{B();z();Y();me="document-tree-element",pe="controls-element";L="editors";_=new Set;"Deno"in globalThis||(console.log("Hello from the page editor"),window.createEditor=J,window.metaChanged=Te,window.classChanged=U(_e),window.elementClicked=ve,window.elementChanged=we,window.contentChanged=U(V),window.getSelectedComponent=Me,window.updateFileSystem=be)});"Deno"in globalThis||Promise.resolve().then(()=>(O(),D)).then(t=>{t.registerListener(Se)});function Se(t){console.log("initializing editor");let e=!1,n=document.createElement("button");n.className=t("fixed right-4 bottom-4 whitespace-nowrap text-lg"),n.innerText="\u{1F433}\u{1F4A8}",n.onclick=async()=>{let r=await Promise.resolve().then(()=>(Q(),K));e?r.toggleEditorVisibility():(e=!0,r.createEditor())},document.body.appendChild(n)}

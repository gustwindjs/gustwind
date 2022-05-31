var k=Object.defineProperty;var te=t=>k(t,"__esModule",{value:!0});var u=(t,e)=>()=>(t&&(e=t(t=0)),e);var x=(t,e)=>{te(t);for(var n in e)k(t,n,{get:e[n],enumerable:!0})};var D={};x(D,{registerListener:()=>re});function ne(){let t={mode:"silent",target:document.body};Promise.all([import("https://cdn.skypack.dev/twind@0.16.16/shim?min"),import("/twindSetup.js")]).then(([{setup:e},n])=>{console.log("loaded custom twind setup",n.default),e({...t,...n.default}),import("https://cdn.skypack.dev/twind@0.16.16?min").then(({tw:r})=>{P=r,A=!0,j.forEach(o=>o(r))})})}function re(t){console.log("registering a twind runtime listener"),A?t(P):j.push(t)}var A,P,j,O=u(()=>{A=!1,j=[];"Deno"in globalThis||ne()});function C({element:t,handle:e,xPosition:n},r){if(!t){console.warn("drag is missing elem!");return}R(t,"touchstart","touchmove","touchend",r,e,n),R(t,"mousedown","mousemove","mouseup",r,e,n)}function R(t,e,n,r,o,i,s){o=oe(o,s="left");let l=o.begin,a=o.change,d=o.end;w(i||t,e,p=>{let m=ee=>v(a,t,ee);function b(){I(document,n,m),I(document,r,b),v(d,t,p)}w(document,n,m),w(document,r,b),v(l,t,p)})}function w(t,e,n){let r=!1;try{let o=Object.defineProperty({},"passive",{get:function(){r=!0}});globalThis.addEventListener("testPassive",null,o),globalThis.removeEventListener("testPassive",null,o)}catch(o){console.error(o)}t.addEventListener(e,n,r?{passive:!1}:!1)}function I(t,e,n){t.removeEventListener(e,n,!1)}function oe(t,e="left"){if(t)return{begin:t.begin||E,change:t.change||E,end:t.end||E};let n,r;return{begin:function(o){let i=document.body.clientWidth;n={x:e==="left"?o.elem.offsetLeft:i-o.elem.offsetLeft-o.elem.clientWidth,y:o.elem.offsetTop},r=e==="left"?o.cursor:{x:i-o.cursor.x,y:o.cursor.y}},change:function(o){if(typeof n.x!="number"||typeof o.cursor.x!="number"||typeof r.x!="number")return;let i=document.body.clientWidth;$(o.elem,e,e==="left"?n.x+o.cursor.x-r.x+"px":n.x+(i-o.cursor.x)-r.x+"px"),!(typeof n.y!="number"||typeof o.cursor.y!="number"||typeof r.y!="number")&&$(o.elem,"top",n.y+o.cursor.y-r.y+"px")},end:E}}function $(t,e,n){t.style[e]=n}function E(){}function v(t,e,n){n.preventDefault();let r=ie(e),o=e.clientWidth,i=e.clientHeight,s={x:se(e,n),y:ae(e,n)};if(typeof s.x!="number"||typeof s.y!="number")return;let l=(s.x-r.x)/o,a=(s.y-r.y)/i;t({x:isNaN(l)?0:l,y:isNaN(a)?0:a,cursor:s,elem:e,e:n})}function ie(t){let e=t.getBoundingClientRect();return{x:e.left,y:e.top}}function se(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientX:e.clientX}function ae(t,e){return e instanceof TouchEvent?e.touches.item(0)?.clientY:e.clientY}var W=u(()=>{});function c(t,e){let n=t;return e.split(".").forEach(r=>{g(n)&&(n=n[r])}),n}var g,T=u(()=>{g=t=>!Array.isArray(t)&&typeof t=="object"});async function L(t,e,n,r){if(!n)return Promise.resolve(r);if("Deno"in globalThis){let o=await import("https://deno.land/std@0.107.0/path/mod.ts");return(await Promise.all(n.map(s=>{let l=o.join(e,`${s}.ts`);return Deno.env.get("DEBUG")==="1"&&console.log("importing transform",l,e,s),t==="production"?import("file://"+l):import("file://"+l+"?cache="+new Date().getTime())}))).reduce((s,l)=>l.default(s),r)}return Promise.all(n.map(o=>import(`/transforms/${o}.js`)))}var B=u(()=>{});function F(t,e){return!t||!e?[]:Promise.all(Object.entries(e).map(([n,r])=>le(t,n,r)))}async function le(t,e,n){if(e.startsWith("__"))return[e.slice(2),c(t.__bound,n)||c(t,n)];if(e.startsWith("==")){let r=t.__bound||t;return[e.slice(2),await y(n,g(r)?r:{data:r})]}return[e,n]}function y(t,e={},n=!0){try{return Promise.resolve(Function.apply(null,Object.keys(e).concat(`return ${t}`))(...Object.values(e)))}catch(r){n&&console.error("Failed to evaluate",t,e,r)}}var N=u(()=>{T()});import{tw as q}from"https://cdn.skypack.dev/twind@0.16.16?min";async function f(t,e,n,r,o={}){if(typeof e=="string")return e;if(e.visibleIf){let a=r.__bound||r;if(!z(a[e.visibleIf])||!await y(e.visibleIf,a,!1))return Promise.resolve("")}let i=e.element&&n[e.element];if(e.__bind&&(g(e.__bind)?r={...r,__bound:{...o,...r,render:a=>f(t,a,n,r,o),...de(e.__bind,r)}}:r={...r,__bound:c(r,e.__bind)||c(r.__bound,e.__bind)}),i){if(Array.isArray(i))return await f(t,{element:"",children:i},n,r,o);e={...e,...i,element:i.element,class:ue(e.class,i.class)}}if(e?.transformWith){let a;if(typeof e.inputText=="string")a=await L("production",t,e?.transformWith,e.inputText);else if(typeof e.inputProperty=="string"){let d=c(r,e.inputProperty);if(!d)throw console.error("Missing input",r,e.inputProperty),new Error("Missing input");a=await L("production",t,e?.transformWith,d)}r={...r,...a}}let s;if(e.__children){let a=e.__children,d=r.__bound||r;typeof a=="string"?s=c(d,a)||c(r,a):s=(await Promise.all((Array.isArray(d)?d:[d]).flatMap(p=>a.map(m=>f(t,m,n,{...r,__bound:p},o))))).join("")}else if(e["==children"]){let a=e["==children"],d=r.__bound||r;s=await y(a,g(d)?{...o,...d}:{...o,data:d})}else if(e.__foreach){let[a,d]=e.__foreach,p=r.__bound||r;s=(await Promise.all(p[a].flatMap(m=>(Array.isArray(d)?d:[d]).map(b=>f(t,b,n,{...r,__bound:m,match:m},o))))).join("")}else s=Array.isArray(e.children)?(await Promise.all(e.children.map(async a=>await f(t,a,n,r,o)))).join(""):e.children;let l=await ce(e,r,o);return fe(e.element,await me({...o,...r},l?{...e.attributes,class:l}:e.attributes),s)}function de(t,e){let n={};return Object.entries(t).forEach(([r,o])=>{n[r]=c(e,o)||o}),n}async function ce(t,e,n){let r=[];return t.__class&&await Object.entries(t.__class).forEach(async([o,i])=>{await y(i,{attributes:t.attributes,context:{...n,...e}})&&r.push(q(o))}),t.class?q(r.concat(t.class.split(" ")).join(" ")):r.join(" ")}function ue(t,e){return t?e?`${t} ${e}`:t:e||""}function fe(t,e,n){return t?`<${t}${e?" "+e:""}>${n||""}</${t}>`:typeof n=="string"?n:""}async function me(t,e){return e?(await F(t,e)).map(([r,o])=>z(o)?"":`${r}="${o}"`).join(" "):""}function z(t){return typeof t=="undefined"}var X=u(()=>{T();B();N()});function Y(){let t=document.querySelector('meta[name="pagepath"]');if(!t){console.error("path element was not found!");return}let e=t.getAttribute("content");if(!e){console.log("pagePath was not found in path element");return}return e}var J=u(()=>{});var Z={};x(Z,{createEditor:()=>V,toggleEditorVisibility:()=>be});import{produce as _}from"https://cdn.skypack.dev/immer@9.0.6?min";import{nanoid as pe}from"https://cdn.skypack.dev/nanoid@3.1.30?min";async function V(){console.log("create editor");let[t,e,n,r]=await Promise.all([fetch("/components.json").then(a=>a.json()),fetch("./context.json").then(a=>a.json()),fetch("./layout.json").then(a=>a.json()),fetch("./route.json").then(a=>a.json())]),o=he(n,r),i=document.createElement("div");i.setAttribute("x-label","selected"),i.setAttribute("x-state","{ componentId: undefined }"),o.appendChild(i);let s=await we(t,e);i.append(s);let l=await ve(t,e);i.append(l),document.body.appendChild(o),evaluateAllDirectives()}function he(t,e){let n=document.getElementById(M);return n?.remove(),n=document.createElement("div"),n.id=M,n.style.visibility="visible",n.setAttribute("x-state",JSON.stringify({...t,body:Ee(t.body),meta:e.meta})),n.setAttribute("x-label","editor"),n}function be(){let t=document.getElementById(M);!t||(t.style.visibility=t.style.visibility==="visible"?"hidden":"visible")}function Ee(t){if(!t){console.error("initializeBody - missing body");return}return _(t,e=>{h(e,n=>{n._id=pe()})})}function Ce(t){let e=_(t.body,r=>{h(r,o=>{delete o._id,o.class===""&&delete o.class})}),n={path:Y(),data:{...t,body:e}};window.developmentSocket.send(JSON.stringify({type:"update",payload:n}))}async function we(t,e){console.log("creating page editor");let n=document.createElement("div");n.id=ge,n.innerHTML=await f("",t.PageEditor,t,e);let r=n.children[0],o=r.children[0];return C({element:r,handle:o}),n}async function ve(t,e){let n=document.createElement("div");n.id=ye,n.innerHTML=await f("",t.ComponentEditor,t,e);let r=n.children[0],o=r.children[0];return C({element:r,handle:o,xPosition:"right"}),n}function Te(t,e){let{editor:{meta:n}}=getState(t),r=t.dataset.field;if(!r){console.error(`${r} was not found in ${t.dataset}`);return}if(r==="title"){let o=document.querySelector("title");o?o.innerHTML=e||"":console.warn("The page doesn't have a <title>!")}else{let o=document.head.querySelector("meta[name='"+r+"']");o?o.setAttribute("content",e):console.warn(`The page doesn't have a ${r} meta element!`)}setState({meta:{...n,[r]:e}},{element:t,parent:"editor"})}function Le(t,e){event?.stopPropagation();let{editor:{body:n}}=getState(t),r=o=>{let i=o.target;if(!i){console.warn("inputListener - No element found");return}o.preventDefault(),G(t,i.textContent)};for(let o of S.values())o.classList.remove("border"),o.classList.remove("border-red-800"),o.removeAttribute("contenteditable"),o.removeEventListener("focusout",r),S.delete(o);h(n,(o,i)=>{if(o._id===e){let s=K(document.body,i,n);s.classList.add("border"),s.classList.add("border-red-800"),S.add(s),Array.isArray(o.children)||(s.setAttribute("contenteditable","true"),s.addEventListener("focusout",r))}}),setState({componentId:e},{element:t,parent:"selected"})}function _e(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=H(n,r,(i,s)=>{s?.replaceWith(Me(s,e)),i.element=e});setState({body:o},{element:t,parent:"editor"})}function Me(t,e){let n=document.createElement(e),r=t.cloneNode(!0);for(;r.firstChild;)n.appendChild(r.firstChild);for(let o of r.attributes)n.setAttribute(o.name,o.value);return n}function G(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=H(n,r,(i,s)=>{s&&(s.innerHTML=e),i.children=e});setState({body:o},{element:t,parent:"editor"})}function Se(t,e){let{editor:{body:n},selected:{componentId:r}}=getState(t),o=H(n,r,(i,s)=>{s&&(s.setAttribute("class",e),s.classList.add("border"),s.classList.add("border-red-800")),i.class=e});setState({body:o},{element:t,parent:"editor"})}function H(t,e,n){return _(t,r=>{h(r,(o,i)=>{o._id===e&&n(o,K(document.body,i,t))})})}function K(t,e,n){let r=0;function o(i,s){if(!i)return null;if(Array.isArray(s)){let l=i;for(let a of s){let d=o(l,a);if(d)return d;l=l?.nextElementSibling}}else{if(e===r)return i;if(r++,Array.isArray(s.children)){let l=o(i.firstElementChild,s.children);if(l)return l}}return null}return o(t?.firstElementChild,n)}function He(t,e){let n={},{componentId:r}=e;return h(t.body,o=>{o._id===r&&(n=o)}),n}function h(t,e){let n=0;function r(o,i){Array.isArray(o)?o.forEach(s=>r(s,i)):(i(o,n),n++,Array.isArray(o.children)&&r(o.children,i))}r(t,e)}function Q(t,e=100){let n;return(...r)=>{clearTimeout(n),n=setTimeout(()=>{t.apply(this,r)},e)}}var ge,ye,M,S,U=u(()=>{W();X();J();ge="document-tree-element",ye="controls-element";M="editors";S=new Set;"Deno"in globalThis||(console.log("Hello from the page editor"),window.createEditor=V,window.metaChanged=Te,window.classChanged=Q(Se),window.elementClicked=Le,window.elementChanged=_e,window.contentChanged=Q(G),window.getSelectedComponent=He,window.updateFileSystem=Ce)});"Deno"in globalThis||Promise.resolve().then(()=>(O(),D)).then(t=>{t.registerListener(ke)});function ke(t){console.log("initializing editor");let e=!1,n=document.createElement("button");n.className=t("fixed right-4 bottom-4 whitespace-nowrap text-lg"),n.innerText="\u{1F433}\u{1F4A8}",n.onclick=async()=>{let r=await Promise.resolve().then(()=>(U(),Z));e?r.toggleEditorVisibility():(e=!0,r.createEditor())},document.body.appendChild(n)}

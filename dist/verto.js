!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Verto=t():e.Verto=t()}(window,(function(){return function(e){var t={};function s(i){if(t[i])return t[i].exports;var n=t[i]={i:i,l:!1,exports:{}};return e[i].call(n.exports,n,n.exports,s),n.l=!0,n.exports}return s.m=e,s.c=t,s.d=function(e,t,i){s.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i})},s.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.t=function(e,t){if(1&t&&(e=s(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(s.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var n in e)s.d(i,n,function(t){return e[t]}.bind(null,n));return i},s.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return s.d(t,"a",t),t},s.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},s.p="",s(s.s=1)}([function(e,t,s){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const i=void 0!==window.crypto&&void 0!==window.crypto.getRandomValues?function(){var e=new Uint16Array(8);window.crypto.getRandomValues(e);var t=function(e){for(var t=e.toString(16);t.length<4;)t="0"+t;return t};return t(e[0])+t(e[1])+"-"+t(e[2])+"-"+t(e[3])+"-"+t(e[4])+"-"+t(e[5])+t(e[6])+t(e[7])}:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,(function(e){var t=16*Math.random()|0;return("x"==e?t:3&t|8).toString(16)}))};t.generateGUID=i;t.VertoBase=class{constructor(e){this.event_handlers={},this.debug=e}subscribeEvent(e,t){let s=i();this.event_handlers[e]||(this.event_handlers[e]=[]),this.event_handlers[e].push({id:s,code:t})}unsubscribeEvent(e,t){this.event_handlers[e]=t?this.event_handlers[e].map((e,s,i)=>e.id==t?void 0:e):[]}dispatchEvent(e,t){if(this.debug&&console.log("Dispatch",e,t),this.event_handlers[e])for(let s of this.event_handlers[e])s.code(t)}}},function(e,t,s){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const i=s(2),n=s(3);t.CallDirection=n.CallDirection;const o=s(0);class r extends o.VertoBase{constructor(e,t,s,i,r,c,a){super(a),this.id=i||o.generateGUID(),this.options=r||{},this.direction=s?n.CallDirection.Outgoing:n.CallDirection.Incoming,this.rtc=new n.VertoRtc(e,this.direction,c,a),this.rpc=t,this.rtc.subscribeEvent("send-offer",e=>{this.rpc.call("verto.invite",{dialogParams:{destination_number:s,callID:this.id},sdp:e.sdp},e=>{},e=>{})}),this.rtc.subscribeEvent("send-answer",e=>{this.rpc.call("verto.answer",{dialogParams:{destination_number:s,callID:this.id},sdp:e.sdp},e=>{},e=>{})}),this.rtc.subscribeEvent("track",e=>{this.dispatchEvent("track",e)})}onAnswer(e){this.rtc.onAnswer(e),this.dispatchEvent("answer")}addTrack(e){this.rtc.addTrack(e)}preSdp(e){this.rtc.preSdp(e)}answer(e){this.rtc.answer(e)}hangup(){this.rpc.call("verto.bye",{dialogParams:{callID:this.id}},e=>{},e=>{}),this.clear()}clear(){this.dispatchEvent("bye",this)}}class c extends o.VertoBase{constructor(e){super(e.debug),this.calls={},this.logged_in=!1,this.options=e,this.rpc=new i.JsonRpcClient(e.transportConfig,e.debug),this.rpc.setEventHandler((e,t)=>{switch(e){case"verto.answer":{let e=t.callID;this.calls[e].onAnswer(t.sdp);break}case"verto.invite":{let e=new r(this.options.rtcConfig,this.rpc,"",t.callID,{caller_id_name:t.caller_id_name,caller_id_number:t.caller_id_number},this.options.ice_timeout,this.options.debug);e.preSdp(t.sdp),this.calls[t.callID]=e,this.dispatchEvent("invite",e);break}case"verto.bye":this.calls[t.callID].clear(),delete this.calls[t.callID];break}}),this.rpc.setReconnectHandler(()=>{this.logged_in&&this.login()}),this.options.rtcConfig=Object.assign({iceServers:[{urls:["stun:stun.l.google.com:19302"]}]},this.options.rtcConfig||{})}login(){return new Promise((e,t)=>{this.rpc.call("login",{login:this.options.transportConfig.login,passwd:this.options.transportConfig.passwd},t=>{this.sessid=t.sessid,this.logged_in=!0,e(t)},e=>{t(e)})})}call(e,t,s){let i=new r(this.options.rtcConfig,this.rpc,t,o.generateGUID(),{},this.options.ice_timeout,this.options.debug);for(let t of e)i.addTrack(t);return this.calls[i.id]=i,i}}t.Verto=c},function(e,t,s){"use strict";Object.defineProperty(t,"__esModule",{value:!0});t.JsonRpcClient=class{constructor(e,t){this.request_id=1,this.queue=[],this.callbacks=[],this.debug=!1,this.debug=t,this.options=Object.assign({},e)}initSocket_(){this.socket_=new WebSocket(this.options.socketUrl),this.socket_.onmessage=this.onMessage.bind(this),this.socket_.onclose=()=>{setTimeout(()=>{this.debug&&console.log("WSS reconnect"),this.initSocket_()},1e3)},this.socket_.onopen=()=>{let e="";for(this.reconnectHandler&&this.reconnectHandler();e=this.queue.pop();)this.socket.send(e)}}get socket(){return this.socket_?this.socket_:(this.initSocket_(),this.socket_)}onMessage(e){let t;try{t=JSON.parse(e.data)}catch(e){}if(this.debug&&console.log(t),"object"==typeof t&&"jsonrpc"in t&&"2.0"===t.jsonrpc)if("method"in t)this.eventHandler(t.method,t.params);else if("result"in t&&this.callbacks[t.id]){let e=this.callbacks[t.id].success_cb;delete this.callbacks[t.id],e(Object.assign({},t.result))}else if("error"in t&&this.callbacks[t.id]){let e=this.callbacks[t.id].error_cb,s=Object.assign({},this.callbacks[t.id]);delete this.callbacks[t.id],-32e3==t.error.code&&this.options.login&&this.options.passwd?this.call("login",{login:this.options.login,passwd:this.options.passwd,loginParams:this.options.loginParams,userVariables:this.options.userVariables},e=>{this.socketCall_(s)},s=>{e(Object.assign({},t.result))}):e(Object.assign({},t.result))}}socketCall_({request:e,success_cb:t,error_cb:s}){e.id=this.request_id++;let i=JSON.stringify(e);this.callbacks[e.id]={request:e,success_cb:t,error_cb:s},this.socket.readyState<1?(this.queue.push(i),this.debug&&console.log("Queued",i)):(this.socket.send(i),this.debug&&console.log("Sent",i))}setEventHandler(e){this.eventHandler=e}setReconnectHandler(e){this.reconnectHandler=e}call(e,t,s,i){let n={jsonrpc:"2.0",method:e,params:Object.assign({},t),id:0};this.socket&&this.socketCall_({request:n,success_cb:s,error_cb:i})}}},function(e,t,s){"use strict";Object.defineProperty(t,"__esModule",{value:!0});const i=s(0);var n;!function(e){e[e.Incoming=0]="Incoming",e[e.Outgoing=1]="Outgoing"}(n||(n={})),t.CallDirection=n;class o extends i.VertoBase{constructor(e,t,s,i){super(i),this.state=0,this.direction=n.Incoming,this.ice_timeout=s||3e3,e.iceCandidatePoolSize="iceCandidatePoolSize"in e?e.iceCandidatePoolSize:1,this.pc=new RTCPeerConnection(e),this.pc.ontrack=this.onTrack.bind(this),this.pc.onnegotiationneeded=this.onNegotiation.bind(this),this.pc.onicecandidate=this.onCandidate.bind(this),this.pc.onicegatheringstatechange=this.onIceGatheringStateChange.bind(this),void 0!==t&&(this.direction=t)}onTrack(e){this.dispatchEvent("track",e.track)}onCandidate(e){}onIceGatheringStateChange(e){"complete"==this.pc.iceGatheringState&&(this.ice_timer&&clearTimeout(this.ice_timer),this.direction?this.dispatchEvent("send-offer",this.pc.localDescription):this.dispatchEvent("send-answer",this.pc.localDescription))}iceTimerTriggered(){this.debug&&console.log(this.pc),this.direction?this.dispatchEvent("send-offer",this.pc.localDescription):this.dispatchEvent("send-answer",this.pc.localDescription)}onNegotiation(){this.pc.createOffer().then(e=>(this.ice_timer=setTimeout(this.iceTimerTriggered.bind(this),this.ice_timeout),this.pc.setLocalDescription(e))).then(()=>{this.state=1}).catch(e=>{})}onAnswer(e){this.pc.setRemoteDescription(new RTCSessionDescription({type:"answer",sdp:e})).then(()=>{this.debug&&console.log("answered")}).catch(e=>{this.debug&&console.log("answer error",e)})}preSdp(e){this.presdp=e}addTrack(e){this.pc.addTrack(e)}answer(e){for(let t of e)this.pc.addTrack(t);this.ice_timer=setTimeout(this.iceTimerTriggered.bind(this),this.ice_timeout),this.pc.setRemoteDescription(new RTCSessionDescription({type:"offer",sdp:this.presdp})).then(()=>{this.pc.createAnswer().then(e=>{this.pc.setLocalDescription(e)})})}}t.VertoRtc=o}])}));
//# sourceMappingURL=verto.js.map
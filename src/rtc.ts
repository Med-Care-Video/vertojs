/*

Verto FreeSWITCH interface

Copyright (c) 2019 Roman Yerin <r.yerin@640kb.co.uk>

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import { VertoBase } from './base'

enum CallDirection {
  Incoming,
  Outgoing
}

enum CallState {
  None,
  Schedulled,
  MessageSent,
}

/*

Verto RTC is an interface to WebRTC

*/

const normalizeCRLF = (sdp = "") => sdp.replace(/\r?\n/g, "\r\n");
const serializeSdp = (sdp = "") => sdp;
const isSafariUA = () => {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
};

const mungeSdpIfNeeded = (sdp = "") => {
  sdp = normalizeCRLF(sdp);

  if (!isSafariUA()) {
    // Find VP8 PT from "a=rtpmap:<pt> VP8/90000"
    const vp8Match = sdp.match(/^a=rtpmap:(\d+)\s+VP8\/90000.*$/m);
    if (vp8Match) {
      const pt = vp8Match[1];
      // No spaces after semicolons to avoid line folding
      const params = [
        "x-google-min-bitrate=1000",
        "x-google-start-bitrate=2000",
        "x-google-max-bitrate=4000",
      ].join(";");
      const desiredFmtp = `a=fmtp:${pt} ${params}`;

      const fmtpRe = new RegExp(`^a=fmtp:${pt}\\s+.*$`, "m");
      if (fmtpRe.test(sdp)) {
        sdp = sdp.replace(fmtpRe, desiredFmtp);
      } else {
        const rtpmapRe = new RegExp(`(^a=rtpmap:${pt}.*\\r?\\n)`, "m");
        sdp = sdp.replace(rtpmapRe, `$1${desiredFmtp}\r\n`);
      }
    }
  }

  return serializeSdp(sdp);
};

const stripIceCredentials = (sdp = "") =>
  sdp
    .replace(/^a=ice-ufrag:.*\r?\n/mg, "")
    .replace(/^a=ice-pwd:.*\r?\n/mg, "")
    .replace(/^a=ice-ufrag:.*$/mg, "")
    .replace(/^a=ice-pwd:.*$/mg, "");

class VertoRtc extends VertoBase{
  private pc      : RTCPeerConnection
  private state     : CallState = CallState.None
  private presdp    : string
  private direction : CallDirection = CallDirection.Incoming
  private ice_timer : ReturnType<typeof setTimeout>
  private ice_timeout : number

  constructor(conf: RTCConfiguration, direction?: CallDirection, ice_timeout?: number, debug?: boolean) {
    super(debug)
    this.ice_timeout = (ice_timeout?ice_timeout:3000)
    conf.iceCandidatePoolSize = ('iceCandidatePoolSize' in conf? conf.iceCandidatePoolSize: 1)
    this.pc = new RTCPeerConnection(conf)
    this.pc.ontrack = this.onTrack.bind(this)
    this.pc.onnegotiationneeded = this.onNegotiation.bind(this)
    this.pc.onicecandidate = this.onCandidate.bind(this)
    this.pc.onicegatheringstatechange = this.onIceGatheringStateChange.bind(this)
    if(typeof direction!== 'undefined') this.direction = direction
  }

  private onTrack(event: RTCTrackEvent) {
    this.dispatchEvent('track',event.track)
  }

  private onCandidate(event: RTCPeerConnectionIceEvent) {
    console.log("CAND: ", event.candidate?.candidate)
  }

  private onIceGatheringStateChange(event: Event){
    if(this.pc.iceGatheringState == 'complete') {
      console.log("iceGatheringState, ", this.pc.iceGatheringState)
      if(this.ice_timer) clearTimeout(this.ice_timer)
      if(this.state == CallState.MessageSent) return // Offer or answer is already sent
      if(this.direction) 
        this.dispatchEvent('send-offer',this.pc.localDescription)
      else 
        this.dispatchEvent('send-answer',this.pc.localDescription)
    }
  }

  private iceTimerTriggered() {
    console.log("Timeout triggered:", this.pc)
    if(this.debug) console.log(this.pc)
    if(this.state != CallState.Schedulled) return // The call is not in schedulled state, do nothing
    this.state = CallState.MessageSent
    if(this.direction) 
      this.dispatchEvent('send-offer',this.pc.localDescription)
    else 
      this.dispatchEvent('send-answer',this.pc.localDescription)
  }
  
  private onNegotiation() {
    this.pc
    .createOffer()
    .then(offer => {
      this.ice_timer = setTimeout(this.iceTimerTriggered.bind(this), this.ice_timeout)

      console.log("SDP: ", offer.sdp)
      // // Look for video codecs like VP8, VP9, or H264. Example here for VP8 with payload type 96:
      // const videoCodecRegex = /a=rtpmap:(\d+) VP8\/90000/g;
      // let match = videoCodecRegex.exec(offer.sdp);
      
      // if (match) {
      //     const payloadType = match[1];
      //     const fmtpLine = `a=fmtp:${payloadType} x-google-min-bitrate=500; x-google-start-bitrate=2000; x-google-max-bitrate=4000`;
          
      //     // Insert the fmtp line right after the rtpmap line for VP8
      //     offer.sdp = offer.sdp.replace(new RegExp(`(a=rtpmap:${payloadType}.*\\r\\n)`), `$1${fmtpLine}\\r\\n`);
      // }

      offer.sdp = mungeSdpIfNeeded(offer.sdp)
      // offer.sdp = stripIceCredentials(offer.sdp)

      console.log("MODIFIED OFFER:", offer.sdp)

      return this.pc.setLocalDescription(offer)
    })
    .then(() => {
      // Schedulle offer to remote host
      this.state = CallState.Schedulled
    })
    .catch(error => {})
  }

  getStats() {
    return this.pc ? this.pc.getStats() : Promise.reject()
  }

  onMedia(sdp: string) {
    this.pc.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp}))
    .then(() => {
      if(this.debug) console.log('got remote media')
    })
    .catch(error => {
      if(this.debug) console.log('remote media error', error)
    })
  }

  preSdp(sdp: string){
    this.presdp = sdp
  }

  addTrack(track: MediaStreamTrack) {
    this.pc.addTrack(track)
  }

  answer(tracks: Array<MediaStreamTrack>) {
    for(let t of tracks) this.pc.addTrack(t)
    this.ice_timer = setTimeout(this.iceTimerTriggered.bind(this), this.ice_timeout)
    this.pc.setRemoteDescription(new RTCSessionDescription({type: 'offer', sdp: this.presdp}))
    .then(() => {
      this.pc.createAnswer()
      .then(description => {
        this.pc.setLocalDescription(description)
        this.state = CallState.Schedulled
      })
    })
  }

}

export { VertoRtc, CallDirection }

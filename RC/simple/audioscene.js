/*
Copyright 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

    * Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following disclaimer
in the documentation and/or other materials provided with the
distribution.
    * Neither the name of Google Inc. nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

Taken from Chromium demo: http://chromium.googlecode.com/svn/trunk/samples/audio/simple.html

*/
var audioScene = (function () {
    var context, buffer, convolver, panner, source, dryGainNode, wetGainNode, lowFilter;

    var gTopProjection = 0,
        gFrontProjection = 0;

    var x = 0,
        y = 0,
        z = 0;
    
    var hilightedElement = 0;
    var bufferList;
    var fileList: [];
    var fileCount = 0;
    var kInitialReverbLevel = 0.0;
    
    myPrivateMethod = function( foo ) {
        console.log( foo );
    };
    function mixToMono(buffer) {
        if (buffer.numberOfChannels == 2) {
            var pL = buffer.getChannelData(0);
            var pR = buffer.getChannelData(1);
            var length = buffer.length;

            for (var i = 0; i < length; ++i) {
                var mono = 0.5 * (pL[i] + pR[i]);
                pL[i] = mono;
                pR[i] = mono;
            }
        }
    }
    
    function setAudioSource(i) {
        var buffer = bufferList[i];

        // See if we have cached buffer
        if (buffer) {
            source.buffer = buffer;
        } else {
            // Load asynchronously
            var url = fileList[i];

            var request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.responseType = "arraybuffer";

            request.onload = function() { 
                context.decodeAudioData(
                    request.response,
                    function(buffer) {
                        mixToMono(buffer);
                        source.buffer = buffer;
                        bufferList[i] = buffer;  // cache it
                    },

                    function(buffer) {
                        console.log("Error decoding audio source data!");
                    }
                );
            }

            request.send();
        }
    }   
    
    return {
        setInitialReverb:   
            function(n) {
                kInitialReverbLevel = n;
            },
            
        addFile:            
            function( dir ) {
                fileList.push(dir);
                fileCount = fileList.length;
            },
        setReverbImpulseResponse: function(url) {
            // Load impulse response asynchronously
            var request = new XMLHttpRequest();
                request.open("GET", url, true);
                request.responseType = "arraybuffer";

                request.onload = function() { 
                    context.decodeAudioData(
                        request.response,
                        function(buffer) {
                            convolver.buffer = buffer;
                        },

                        function(buffer) {
                            console.log("Error decoding impulse response!");
                        }
                    );
                }
                request.send();
            },

        setPitch: function(cents) {
        `   // cents should be between -2400 and 2400 
            var rate = Math.pow(2.0, cents / 1200.0);
            source.playbackRate.value = rate;
        }

        setReverb: function(value) {
            // reverb between 0 and 1 
            wetGainNode.gain.value = value;
        }

        setMainGain(value) {
            // main gain between 0 and 1 
            dryGainNode.gain.value = value;
        }

        setCutoff(value) {
            var noctaves = Math.log(22050.0 / 40.0) / Math.LN2;
            var v2 = Math.pow(2.0, noctaves * (value - 1.0));

            var sampleRate = 44100.0;
            var nyquist = sampleRate * 0.5;
            var frequency = v2 * nyquist;
            
            lowFilter.frequency.value = frequency;
        }
        

        
  };
 
})();


    function addSliders() {
        addSlider("pitch");
        addSlider("ambience");
        addSlider("mainGain");
        addSlider("cutoff");
        configureSlider("pitch", 0.0, -2400.0, 2400.0, pitchHandler);
        configureSlider("ambience", kInitialReverbLevel, 0.0, 1.0, reverbHandler);
        configureSlider("mainGain", 1.0, 0.0, 1.0, mainGainHandler);
        configureSlider("cutoff", 0.99, 0.0, 1.0, cutoffHandler);
    }

    function setSourceBuffer(buffer) {
        source.buffer = buffer;
    }

    /**
     * Start panning demo
     */
     function init() {
         addSliders();

         var canvas = document.getElementById('canvasID');
         var canvas2 = document.getElementById('canvasElevationID');

         var ctx = canvas.getContext('2d');
         var ctx2 = canvas2.getContext('2d');

         gTopProjection = new Projection('canvasID', 0);
         gFrontProjection = new Projection('canvasElevationID', 1);

         // draw center
         var width = canvas.width;
         var height = canvas.height;

         ctx.fillStyle = "rgb(0,200,0)";
         ctx.beginPath();
         ctx.arc(width/2, height/2 , 10, 0,Math.PI*2,true)
         ctx.fill();

         ctx2.fillStyle = "rgb(0,200,0)";
         ctx2.beginPath();
         ctx2.arc(width/2, height/2 , 10, 0,Math.PI*2,true)
         ctx2.fill();

         canvas.addEventListener("mousedown", handleMouseDown, true);
         canvas.addEventListener("mousemove", handleAzimuthMouseMove, true);
         canvas.addEventListener("mouseup", handleMouseUp, true);

         canvas2.addEventListener("mousedown", handleMouseDown, true);
         canvas2.addEventListener("mousemove", handleElevationMouseMove, true);
         canvas2.addEventListener("mouseup", handleMouseUp, true);

         // Initialize audio
         context = new webkitAudioContext();

         source = context.createBufferSource();
         dryGainNode = context.createGain();
         wetGainNode = context.createGain();
         panner = context.createPanner();

         lowFilter = context.createBiquadFilter();
         lowFilter.frequency.value = 22050.0;
         lowFilter.Q.value = 5.0;

         convolver = context.createConvolver();

         // Connect audio processing graph
         source.connect(lowFilter);
         lowFilter.connect(panner);

         // Connect dry mix
         panner.connect(dryGainNode);
         dryGainNode.connect(context.destination);

         // Connect wet mix
         panner.connect(convolver);
         convolver.connect(wetGainNode);
         wetGainNode.connect(context.destination);
         wetGainNode.gain.value = kInitialReverbLevel;

         bufferList = new Array(fileCount);
         for (var i = 0; i < fileCount; ++i) {
             bufferList[i] = 0;
         }

         setReverbImpulseResponse('impulse-responses/spatialized3.wav');

         source.playbackRate.value = 1.0;

         panner.setPosition(0, 0, -4.0);
         source.loop = true;

         // Load up initial sound
         setAudioSource(0);

         var cn = {x: 0.0, y: -0.5};
         gTopProjection.drawDotNormalized(cn);

         cn.y = 0.0;
         gFrontProjection.drawDotNormalized(cn);

         var currentTime = context.currentTime;
         source.start(currentTime + 0.020);
     }

    var gIsMouseDown = false;

    // type: 0: top-view  1: front-view
    function Projection(canvasID, type) {
        this.canvasID = canvasID;
        this.canvas = document.getElementById(canvasID);
        this.type = type;
        this.lastX = 0;
        this.lastY = 0;
    }

    // With normalized graphics coordinate system (-1 -> 1)
    Projection.prototype.drawDotNormalized = function(cn) {
        var c = {
            x: 0.5 * (cn.x + 1.0) * this.canvas.width,
            y: 0.5 * (cn.y + 1.0) * this.canvas.height
        }

        this.drawDot(c);
    }

    Projection.prototype.handleMouseMove = function(event, suppressY) {
        if (gIsMouseDown) {
            var eventInfo = {event: event, element:this.canvas};
            var c = getRelativeCoordinates(eventInfo);
            if (suppressY) {
                c.y = this.lastY;
            }
            this.drawDot(c);
        }
    }

    Projection.prototype.eraseLastDot = function() {
        var ctx = this.canvas.getContext('2d');

        // Erase last location
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.beginPath();
        ctx.arc(this.lastX, this.lastY, 12, 0, Math.PI * 2, true)
        ctx.fill();
    }

    Projection.prototype.drawDot = function(c) {
        var canvas = this.canvas;
        var type = this.type;

        var ctx = canvas.getContext('2d');

        // Erase last location
        this.eraseLastDot();

        // Draw new location
        ctx.fillStyle = "rgb(200,0,0)";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 10,0, Math.PI * 2, true);
        ctx.fill();

        // Draw center
        var width = canvas.width;
        var height = canvas.height;
        divWidth = width;
        divHeight = height;

        ctx.fillStyle = "rgb(0,200,0)";
        ctx.beginPath();
        ctx.arc(width / 2, height / 2 , 10, 0, Math.PI * 2, true);
        ctx.fill();

        ctx.strokeRect(0,0, width, height);

        this.lastX = c.x;
        this.lastY = c.y;

        var a = c.x / divWidth;
        var b = c.y / divHeight;

        x = 8.0 * (2.0*a - 1.0);

        if (type == 0) {
            z = 8.0 * (2.0*b - 1.0);
        } else {
            y = -11.0 * (2.0*b - 1.0);
        }

        panner.setPosition(x, y, z);

        lastX = x;
        lastZ = z;    
    }

    function handleMouseDown(event) {
        gIsMouseDown = true;
    }

    function handleMouseUp(event) {
        gIsMouseDown = false;
    }

    function handleAzimuthMouseMove(event) {
        gTopProjection.handleMouseMove(event, false);
        gFrontProjection.handleMouseMove(event, true);
    }

    function handleElevationMouseMove(event) {
        gFrontProjection.handleMouseMove(event, false);
        gTopProjection.handleMouseMove(event, true);
    }
    
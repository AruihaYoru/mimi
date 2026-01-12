/**
 * Mimi Player - A simple text-based music format player.
 * Version: 1.0.0
 * https://github.com/ (Your future repository here!)
 */
(function(global, factory) {
    // Universal Module Definition (UMD) for browser, CommonJS, and AMD support
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        global.MimiPlayer = factory();
    }
}(this, function() {
    'use strict';

    class MimiPlayer {
        /**
         * @param {number} [fps=24] - The number of frames per second to calculate timing.
         */
        constructor(fps = 24) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.connect(this.audioCtx.destination);
            
            this.fps = fps;
            this.notes = [];
            this.activeNodes = new Set();
            this._noiseBuffer = null;
            this._endTimer = null;

            // --- State Management ---
            this.isPlaying = false;
            this.playbackStartTime = 0; // Time when play() was called (in AudioContext time)
            this.startFrame = 0;        // Frame from which playback started

            // --- Event Handlers ---
            this.onPlay = null;
            this.onStop = null;
            this.onEnd = null; // Called when the song finishes naturally
        }

        /**
         * Lazily creates and caches a white noise buffer.
         * @returns {AudioBuffer}
         */
        get noiseBuffer() {
            if (!this._noiseBuffer) {
                const bufferSize = this.audioCtx.sampleRate * 2; // 2 seconds of noise is enough
                this._noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
                const data = this._noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
            }
            return this._noiseBuffer;
        }

        /**
         * Loads and parses a Mimi format string.
         * @param {string} text - The string content of a .mimi file.
         */
        load(text) {
            this.notes = text.split(/\r?\n/)
                .map(line => line.split('#')[0].trim()) // Remove comments and trim whitespace
                .filter(line => line) // Remove empty lines
                .map(line => {
                    try {
                        const cols = line.split(',').map(s => s.trim());
                        if (cols.length < 4) return null;
                        return {
                            type:   parseInt(cols[0], 16),
                            pitch:  parseInt(cols[1], 16),
                            length: parseInt(cols[2], 16),
                            start:  parseInt(cols[3], 16),
                            volume: cols[4] !== undefined ? parseInt(cols[4], 16) : 0xFF,
                            pan:    cols[5] !== undefined ? parseInt(cols[5], 16) : 0x80
                        };
                    } catch (e) {
                        console.warn('Skipping malformed line:', line);
                        return null;
                    }
                })
                .filter(note => note !== null && !isNaN(note.start))
                .sort((a, b) => a.start - b.start);
        }

        /**
         * Starts playback from a specific frame.
         * @param {number} [startFrame=0] - The frame to start playing from.
         */
        play(startFrame = 0) {
            if (this.isPlaying) this.stop();
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            
            this.isPlaying = true;
            this.playbackStartTime = this.audioCtx.currentTime;
            this.startFrame = startFrame;
            
            const frameTime = 1 / this.fps;

            this.notes.forEach(note => {
                const endFrame = note.start + note.length;
                if (endFrame < this.startFrame) return;

                const delay = Math.max(0, (note.start - this.startFrame) * frameTime);
                const startTime = this.playbackStartTime + delay;
                const duration = (note.start < this.startFrame ? endFrame - this.startFrame : note.length) * frameTime;

                if (duration > 0) {
                    this.scheduleNote(note, startTime, duration);
                }
            });

            // Schedule the 'onEnd' event
            const totalFrames = this.notes.reduce((max, note) => Math.max(max, note.start + note.length), 0);
            const totalDuration = (totalFrames - this.startFrame) * frameTime;
            if (totalDuration > 0) {
                this._endTimer = setTimeout(() => {
                    if (!this.isPlaying) return;
                    this.stop();
                    if (typeof this.onEnd === 'function') this.onEnd();
                }, totalDuration * 1000);
            }

            if (typeof this.onPlay === 'function') this.onPlay();
        }

        /**
         * Stops playback immediately.
         */
        stop() {
            if (!this.isPlaying) return;
            
            clearTimeout(this._endTimer);
            this.activeNodes.forEach(node => { try { node.stop(); } catch (e) {} });
            this.activeNodes.clear();
            this.isPlaying = false;
            
            if (typeof this.onStop === 'function') this.onStop();
        }

        /**
         * Gets the current playback frame.
         * @returns {number} The current frame number.
         */
        getCurrentFrame() {
            if (!this.isPlaying) return this.startFrame;
            const elapsedTime = this.audioCtx.currentTime - this.playbackStartTime;
            return this.startFrame + Math.floor(elapsedTime * this.fps);
        }

        /**
         * Schedules a single note to be played. (Internal method)
         * @param {object} note - The note object.
         * @param {number} startTime - The absolute time to start the note.
         * @param {number} duration - The duration of the note in seconds.
         */
        scheduleNote(note, startTime, duration) {
            const gainNode = this.audioCtx.createGain();
            const pannerNode = this.audioCtx.createStereoPanner();
            let sourceNode;

            // Create source node (Oscillator or Noise)
            if (note.type === 4) { // Noise
                sourceNode = this.audioCtx.createBufferSource();
                sourceNode.buffer = this.noiseBuffer;
                sourceNode.loop = true;
            } else { // Waveforms
                sourceNode = this.audioCtx.createOscillator();
                const waveTypes = ['sine', 'triangle', 'square', 'sawtooth'];
                sourceNode.type = waveTypes[note.type] || 'sine';
                // MIDI note number to frequency conversion (A4 = 69 = 440Hz)
                const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
                sourceNode.frequency.setValueAtTime(freq, startTime);
            }

            // Set Pan
            pannerNode.pan.value = (note.pan / 127.5) - 1; // Convert 0-255 to -1.0 to 1.0

            // Set Volume and Envelope (Attack/Release)
            const volume = note.volume / 255;
            const attackTime = 0.005;
            const releaseTime = 0.01;
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
            gainNode.gain.setValueAtTime(volume, startTime + duration - releaseTime);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

            // Connect nodes: source -> gain -> panner -> master
            sourceNode.connect(gainNode).connect(pannerNode).connect(this.masterGain);

            sourceNode.start(startTime);
            sourceNode.stop(startTime + duration);

            this.activeNodes.add(sourceNode);
            sourceNode.onended = () => {
                this.activeNodes.delete(sourceNode);
            };
        }
    }
    
    return MimiPlayer;
}));
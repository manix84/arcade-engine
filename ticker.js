define(function () {

    /**
     * Games Engine v1.0 - Ticker
     * @author  Rob Taylor [manix84@gmail.com]
     * @param {Function} callback - User defined function to run on tick.
     * @param {Object} options - Options for the current ticker.
     * @return {Object} Ticker parent object
     * @constructor
     */
    var ticker = function (callback, options) {
        var options_default = {
                fps: 30
            },
            property;

        // Collecting and saving unique callback.
        this._callback = callback;

        for (property in options) {
            if (options.hasOwnProperty(property)) {
                options_default[property] = options[property];
            }
        }

        // Setting up unique FPS.
        this._fps = options_default.fps;

        // Setting up unique tracking data.
        this._tracking = {
            tickCount: 0,
            currentFps: options_default.fps,
            currentFrame: 0,
            executionTime: 0,
            lastTickStart: 0
        };

        return this;
    };

    ticker.prototype = {

        /**
         * Self perpetuating tick method. Can only be stopped with the stop command. Designed to stop callback stacking.
         * @private
         * @todo Need to look into adding a skip-frame ability.
         */
        _tick: function () {
            var that = this,
                start, end, lastTickStart;

            this._ticker = window.setTimeout(function () {
                that._tick();
                that._tracking.currentFrame++;
                that._tracking.tickCount++;

                start = new Date().getTime();
                that._callback({
                    expectedFps: that._fps,
                    actualFps: that._tracking.currentFps,
                    frame: that._tracking.currentFrame,
                    executionTime: that._tracking.executionTime
                });
                end = new Date().getTime();

                that._tracking.executionTime = ((end - start) / 1000);

            }, (1000 / this._fps));
        },

        /**
         * Ticker interval to track the fps.
         */
        _tickTracking: function () {
            var that = this;
            this._tickerTracking = window.setTimeout(function () {
                that._tickTracking();
                that._tracking.currentFps = that._tracking.tickCount;
                that._tracking.tickCount = 0;
            }, 1000);
        },

        /**
         * Start the ticker, and anything attached too it.
         * @return {Object} Ticker parent object
         */
        start: function () {
            if (!this._callback) {
                throw new Error('Cannot start ticker: No callback set.');
            } else if (!!this._ticker) {
                throw new Error('Cannot start ticker: It\'s already running.');
            }

            this._tracking.lastTickStart = new Date().getTime();
            this._tick();
            this._tickTracking();
            return this;
        },

        /**
         * Stop the ticker, and anything attached too it.
         * @return {Object} Ticker parent object
         */
        stop: function () {
            if (!!this._ticker) {
                window.clearTimeout(this._ticker);
                delete this._ticker;
                delete this._tickerTracking;
            } else {
                throw new Error('Cannot stop ticker: It isn\'t running.');
            }
            return this;
        }
    };

    return ticker;
});
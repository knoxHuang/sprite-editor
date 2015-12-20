(function () {
const Path = require('fire-path');
const GizmosUtils = Editor.require('packages://fire-gizmos/gizmos/utils');
const SVG = require('svg.js');

Editor.registerPanel( 'sprite-editor.panel', {
    is : 'sprite-editor',

    properties: {
        hasContent: {
            type: Boolean,
            value: false
        },
        dirty: {
            type: Boolean,
            value: false
        },
        scale: {
            value: 100,
            observer: '_scaleChanged'
        },
        minScale: 20,
        maxScale:500,
        leftPos: {
            type: Number,
            value: 0,
            observer: 'leftPosChanged'
        },
        rightPos: {
            type: Number,
            value: 0,
            observer: 'rightPosChanged'
        },
        topPos: {
            type: Number,
            value: 0,
            observer: 'topPosChanged'
        },
        bottomPos: {
            type: Number,
            value: 0,
            observer: 'bottomPosChanged'
        }
    },

    ready : function() {
        this._svg = SVG(this.$.svg);
        this._svg.spof();

        this._lastBcr = null;

        this._svgColor = '#5c5';
        this._dotSize = 6;

        // init variables
        this._borderLeft = 0;
        this._borderRight = 0;
        this._borderBottom = 0;
        this._borderTop = 0;

        this._startLeftPos = 0;
        this._startRightPos = 0;
        this._startTopPos = 0;
        this._startBottomPos = 0;

        this._meta = null;
        this._scalingSize = null;

        this.addListeners();
    },

    _T: function (text_id) {
        return Editor.T(text_id);
    },

    'panel:run': function (argv) {
        this.openSprite(argv.uuid);
    },

    addListeners: function() {
        window.addEventListener('resize', function ( event ) {
            if ( !this._image && !this._meta )
                return;
            this._refreshScaleSlider();
            this.resize(this._meta.width * this.scale / 100, this._meta.height * this.scale / 100);
        }.bind(this));
    },
    // 刷新 ScaleSlider 当前值 最小值 最大值
    _refreshScaleSlider: function () {
        var bcr = this.$.content.getBoundingClientRect();
        // 如果窗口宽高相同就不需要重新计算Scale了
        if (this._lastBcr && (bcr.width === this._lastBcr.width && bcr.height === this._lastBcr.height)) {
            return;
        }
        var newScale;
        if (bcr.width < bcr.height) {
            newScale = (bcr.width / this._meta.width) * 100;
        }
        else {
            newScale = (bcr.height / this._meta.height) * 100;
        }
        this.minScale = Math.ceil(newScale / 5);
        this.maxScale = Math.ceil(newScale);
        this.scale = Math.ceil((newScale + this.minScale) / 2);
        this._lastBcr = this.$.content.getBoundingClientRect();
    },

    openSprite : function(theSprite) {
        if ( !theSprite)
            return;

        this._loadMeta( theSprite, function ( err, assetType, meta ) {
            if ( err ) {
                Editor.error( 'Failed to load meta %s, Message: %s', theSprite, err.stack);
                return;
            }

            this.hasContent = true;
            this._refreshScaleSlider();

            Editor.assetdb.queryMetaInfoByUuid(meta.rawTextureUuid, function(info) {
                this._image = new Image();
                this._image.src = info.assetPath;
                this._image.onload = function () {
                    this.resize(this._meta.width * this.scale / 100, this._meta.height * this.scale / 100);
                }.bind(this);
            }.bind(this));

        }.bind(this));
    },

    _loadMeta: function ( id, cb ) {
        if ( id.indexOf('mount-') === 0 ) {
            if ( cb ) cb (new Error('Not support mount type assets.'));
            return;
        }

        Editor.assetdb.queryMetaInfoByUuid( id, function ( info ) {
            if ( !info ) {
                if ( cb ) cb ( new Error('Can not find asset path by uuid ' + id) );
                return;
            }

            var assetType = info.assetType;//info['asset-type'];
            if (assetType !== 'sprite-frame') {
                if (cb) cb (new Error('Only support sprite-frame type assets now.'));
                return;
            }

            var meta = JSON.parse(info.json);
            meta.__name__ = Path.basenameNoExt(info.assetPath);
            meta.__path__ = info.assetPath;
            meta.__mtime__ = info.assetMtime;

            this._meta = meta;
            this.leftPos = meta.borderLeft;
            this.rightPos = meta.borderRight;
            this.topPos = meta.borderTop;
            this.bottomPos = meta.borderBottom;

            if ( cb ) cb ( null, assetType, meta );
        }.bind(this));
    },

    _scaleChanged : function() {
        if ( !this._image || !this._meta )
            return;

        this.resize(this._meta.width * this.scale / 100, this._meta.height * this.scale / 100);
    },

    _onInputChanged: function(event) {
        if (!this._image || !this._meta) {
            return;
        }
        var srcEle = event.srcElement;
        var theValue = srcEle.value;
        var maxValue = 0;

        switch(srcEle.id) {
            case 'inputL':
                maxValue = this._image.width - this.rightPos;
                this.leftPos = this.correctPosValue(theValue, 0, maxValue);
                break;
            case 'inputR':
                maxValue = this._image.width - this.leftPos;
                this.rightPos = this.correctPosValue(theValue, 0, maxValue);
                break;
            case 'inputT':
                maxValue = this._image.height - this.bottomPos;
                this.topPos = this.correctPosValue(theValue, 0, maxValue);
                break;
            case 'inputB':
                maxValue = this._image.height - this.topPos;
                this.bottomPos = this.correctPosValue(theValue, 0, maxValue);
                break;
        }
        if (theValue > maxValue)
            srcEle.value = maxValue;
    },

    resize: function (width, height) {
        var bcr = this.$.content.getBoundingClientRect();
        var result = Editor.Utils.fitSize(
            width,
            height,
            bcr.width,
            bcr.height
        );

        if ( this._meta.rotated ) {
            this._scalingSize = {
                width: Math.ceil(result[1]),
                height: Math.ceil(result[0])
            }
        }

        this.$.canvas.width = Math.ceil(result[0]);
        this.$.canvas.height = Math.ceil(result[1]);

        this.repaint();
    },

    getCanvasRect: function() {
        var ret = {};
        ret.top = this.$.canvas.offsetTop;
        ret.left = this.$.canvas.offsetLeft;
        ret.bottom = this.$.canvas.offsetTop + this.$.canvas.height;
        ret.right = this.$.canvas.offsetLeft + this.$.canvas.width;
        ret.width = this.$.canvas.width;
        ret.height = this.$.canvas.height;

        return ret;
    },

    updateBorderPos: function(bcr) {
        this._borderLeft = bcr.left + this.leftPos * (this.scale / 100);
        this._borderRight = bcr.right - this.rightPos * (this.scale / 100);
        this._borderTop = bcr.top + this.topPos * (this.scale / 100);
        this._borderBottom = bcr.bottom - this.bottomPos * (this.scale / 100);
    },

    repaint: function () {
        var ctx = this.$.canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        var meta = this._meta;
        var canvasWidth = this.$.canvas.width;
        var canvasHeight = this.$.canvas.height;
        var xPos, yPos;
        var trimWidth, trimHeight;
        if ( meta.rotated ) {
            var tempXPos = canvasWidth / 2;
            var tempYPos = canvasHeight / 2;
            ctx.translate(tempXPos, tempYPos);
            ctx.rotate(-90 * Math.PI / 180);
            ctx.translate(-tempXPos, -tempYPos);

            xPos = canvasWidth / 2 - this._scalingSize.width / 2;
            yPos = canvasHeight / 2 - this._scalingSize.height / 2;
            trimWidth = meta.height;
            trimHeight = meta.width;
            canvasWidth = this.$.canvas.height;
            canvasHeight = this.$.canvas.width;
        }
        else {
            xPos = 0;
            yPos = 0;
            trimWidth = meta.width;
            trimHeight = meta.height;
            canvasWidth = this.$.canvas.width;
            canvasHeight = this.$.canvas.height;
        }

        ctx.drawImage(
            this._image,
            meta.trimX, meta.trimY, trimWidth, trimHeight,
            xPos, yPos, canvasWidth, canvasHeight
        );

        this.drawEditElements();
    },

    svgElementMoved: function (id, dx, dy) {
        var movedX = dx / (this.scale / 100);
        var movedY = dy / (this.scale / 100);
        if (movedX > 0)
            movedX = Math.floor(movedX);
        else
            movedX = Math.ceil(movedX);

        if (movedY > 0)
            movedY = Math.floor(movedY);
        else
            movedY = Math.ceil(movedY);

        if (Math.abs(movedX) > 0) {
            if (id.indexOf('l') >= 0) {
                var newLeftValue = this._startLeftPos + movedX;
                this.leftPos = this.correctPosValue(newLeftValue, 0, this._image.width - this.rightPos);
            }
            if (id.indexOf('r') >= 0) {
                var newRightValue = this._startRightPos - movedX;
                this.rightPos = this.correctPosValue(newRightValue, 0, this._image.width - this.leftPos);
            }
        }

        if (Math.abs(movedY) > 0) {
            if (id.indexOf('t') >= 0) {
                var newTopValue = this._startTopPos + movedY;
                this.topPos = this.correctPosValue(newTopValue, 0, this._image.height - this.bottomPos);
            }
            if (id.indexOf('b') >= 0) {
                var newBottomValue = this._startBottomPos - movedY;
                this.bottomPos = this.correctPosValue(newBottomValue, 0, this._image.height - this.topPos);
            }
        }
    },

    svgCallbacks: function(svgId) {
        var callbacks = {};
        callbacks.start = function() {
            this._startLeftPos = this.leftPos;
            this._startRightPos = this.rightPos;
            this._startTopPos = this.topPos;
            this._startBottomPos = this.bottomPos;
        }.bind(this);

        callbacks.update = function(dx, dy) {
            this.svgElementMoved(svgId, dx, dy);
        }.bind(this);
        return callbacks;
    },

    drawLine: function(startX, startY, endX, endY, lineID) {
        var start = {x: startX, y: startY};
        var end = {x: endX, y: endY};
        var line = GizmosUtils.lineTool(this._svg, start, end, this._svgColor, this.svgCallbacks(lineID));
        if (lineID === 'l' || lineID === 'r') {
            line.style('cursor', 'col-resize');
        }
        else if (lineID === 't' || lineID === 'b') {
            line.style('cursor', 'row-resize');
        }
        return line;
    },

    drawDot: function(posX, posY, dotID) {
        var attr = {color: this._svgColor};
        var theDot = GizmosUtils.circleTool(this._svg, this._dotSize, attr, attr, this.svgCallbacks(dotID));
        if (dotID === 'l' || dotID === 'r' || dotID === 't' || dotID === 'b') {
            theDot.style('cursor', 'pointer');
        }
        else if (dotID === 'lb' || dotID === 'rt'){
            theDot.style('cursor', 'nesw-resize');
        }
        else if (dotID === 'rb' || dotID === 'lt') {
            theDot.style('cursor', 'nwse-resize');
        }
        this.moveDotTo(theDot, posX, posY);
        return theDot;
    },

    moveDotTo: function(dot, posX, posY) {
        if (dot)
            dot.move(posX - this._dotSize / 2, posY - this._dotSize / 2);
    },

    drawEditElements: function() {
        if ( !this._image )
            return;

        this._svg.clear();
        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // 4个边
        this.lineLeft = this.drawLine(this._borderLeft, bcr.bottom, this._borderLeft, bcr.top, 'l');
        this.lineRight = this.drawLine(this._borderRight, bcr.bottom, this._borderRight, bcr.top, 'r');
        this.lineTop = this.drawLine(bcr.left, this._borderTop, bcr.right, this._borderTop, 't');
        this.lineBottom = this.drawLine(bcr.left, this._borderBottom, bcr.right, this._borderBottom, 'b');

        // 4个交点
        this.dotLB = this.drawDot(this._borderLeft, this._borderBottom, 'lb');
        this.dotLT = this.drawDot(this._borderLeft, this._borderTop, 'lt');
        this.dotRB = this.drawDot(this._borderRight, this._borderBottom, 'rb');
        this.dotRT = this.drawDot(this._borderRight, this._borderTop, 'rt');

        // 4个边的中点
        this.dotL = this.drawDot(this._borderLeft, bcr.bottom - bcr.height / 2, 'l');
        this.dotR = this.drawDot(this._borderRight, bcr.bottom - bcr.height / 2, 'r');
        this.dotB = this.drawDot(bcr.left + bcr.width / 2, this._borderBottom, 'b');
        this.dotT = this.drawDot(bcr.left + bcr.width / 2, this._borderTop, 't');
    },

    correctPosValue: function(newValue, min, max) {
        if (newValue < min)
            return min;

        if (newValue > max)
            return max;

        return newValue;
    },

    checkState: function() {
        var leftDirty = this.leftPos !== this._meta.borderLeft;
        var rightDirty = this.rightPos !== this._meta.borderRight;
        var topDirty = this.topPos !== this._meta.borderTop;
        var bottomDirty = this.bottomPos !== this._meta.borderBottom;

        this.dirty = leftDirty || rightDirty || topDirty || bottomDirty;
    },

    leftPosChanged: function() {
        if ( !this._image )
            return;

        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // move dots
        this.moveDotTo(this.dotL, this._borderLeft, bcr.bottom - bcr.height / 2);
        this.moveDotTo(this.dotLB, this._borderLeft, this._borderBottom);
        this.moveDotTo(this.dotLT, this._borderLeft, this._borderTop);

        // move line left
        if (this.lineLeft)
            this.lineLeft.plot(this._borderLeft, bcr.bottom, this._borderLeft, bcr.top);

        this.checkState();
    },

    rightPosChanged: function() {
        if ( !this._image )
            return;

        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // move dots
        this.moveDotTo(this.dotR, this._borderRight, bcr.bottom - bcr.height / 2);
        this.moveDotTo(this.dotRB, this._borderRight, this._borderBottom);
        this.moveDotTo(this.dotRT, this._borderRight, this._borderTop);

        // move line left
        if (this.lineRight)
            this.lineRight.plot(this._borderRight, bcr.bottom, this._borderRight, bcr.top);

        this.checkState();
    },

    topPosChanged: function() {
        if ( !this._image )
            return;

        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // move dots
        this.moveDotTo(this.dotT, bcr.left + bcr.width / 2, this._borderTop);
        this.moveDotTo(this.dotLT, this._borderLeft, this._borderTop);
        this.moveDotTo(this.dotRT, this._borderRight, this._borderTop);

        // move line top
        if (this.lineTop)
            this.lineTop.plot(bcr.left, this._borderTop, bcr.right, this._borderTop);

        this.checkState();
    },

    bottomPosChanged: function() {
        if ( !this._image )
            return;

        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // move dots
        this.moveDotTo(this.dotB, bcr.left + bcr.width / 2, this._borderBottom);
        this.moveDotTo(this.dotLB, this._borderLeft, this._borderBottom);
        this.moveDotTo(this.dotRB, this._borderRight, this._borderBottom);

        // move line bottom
        if (this.lineBottom)
            this.lineBottom.plot(bcr.left, this._borderBottom, bcr.right, this._borderBottom);

        this.checkState();
    },

    onMouseWheel: function(event) {
        if ( !this._image )
            return;

        event.stopPropagation();
        var newScale = Editor.Utils.smoothScale(this.scale / 100, event.wheelDelta);
        this.scale = newScale * 100;
    },

    _onRevert: function(event) {
        if ( !this._image || !this._meta)
            return;

        if (event)
            event.stopPropagation();

        var meta = this._meta;
        this.leftPos = meta.borderLeft;
        this.rightPos = meta.borderRight;
        this.topPos = meta.borderTop;
        this.bottomPos = meta.borderBottom;

        this.checkState();
    },

    _onApply: function(event) {
        if ( !this._image || !this._meta)
            return;

        if (event)
            event.stopPropagation();

        var meta = this._meta;
        meta.borderTop = this.topPos;
        meta.borderBottom = this.bottomPos;
        meta.borderLeft = this.leftPos;
        meta.borderRight = this.rightPos;

        var jsonString = JSON.stringify(meta);
        var uuid = meta.uuid;
        Editor.assetdb.saveMeta( uuid, jsonString );

        this.checkState();
    }
});

})();

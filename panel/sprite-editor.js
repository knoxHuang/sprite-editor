
Editor.registerPanel( 'sprite-editor.panel', {
    is : 'sprite-editor',

    properties: {
        scale: {
            type: Number,
            value: 100,
            observer: '_scaleChanged'
        },
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
        this._selectDot = null;

        this.dotNormalColor = 'rgb(0, 255, 0)';
        this.dotSelectColor = 'rgb(0, 0, 255)';

        // init variables
        this._borderLeft = 0;
        this._borderRight = 0;
        this._borderBottom = 0;
        this._borderTop = 0;
        this._mousedownPosX = 0;
        this._mousedownPosY = 0;
        this._startLeftPos = 0;
        this._startRightPos = 0;
        this._startTopPos = 0;
        this._startBottomPos = 0;

        this.addListeners();
    },

    addListeners: function() {
        var unselectDot = function(event) {
            if (! this._selectDot)
                return;
            event.stopPropagation();
            this._selectDot.fill(this.dotNormalColor);
            this._selectDot = null;
        }.bind(this);

        var moveDot = function(event) {
            if (this._selectDot) {
                event.stopPropagation();

                var movedX = (event.x - this._mousedownPosX) / (this.scale / 100);
                var movedY = (event.y - this._mousedownPosY) / (this.scale / 100);
                if (movedX > 0)
                    movedX = Math.floor(movedX);
                else
                    movedX = Math.ceil(movedX);

                if (movedY > 0)
                    movedY = Math.floor(movedY);
                else
                    movedY = Math.ceil(movedY);

                if (Math.abs(movedX) > 0) {
                    if (this._selectDot.id.indexOf('l') >= 0) {
                        var newLeftValue = this._startLeftPos + movedX;
                        this.leftPos = this.correctPosValue(newLeftValue, 0, this._image.width - this.rightPos);
                    }
                    if (this._selectDot.id.indexOf('r') >= 0) {
                        var newRightValue = this._startRightPos - movedX;
                        this.rightPos = this.correctPosValue(newRightValue, 0, this._image.width - this.leftPos);
                    }
                }

                if (Math.abs(movedY) > 0) {
                    if (this._selectDot.id.indexOf('t') >= 0) {
                        var newTopValue = this._startTopPos + movedY;
                        this.topPos = this.correctPosValue(newTopValue, 0, this._image.height - this.bottomPos);
                    }
                    if (this._selectDot.id.indexOf('b') >= 0) {
                        var newBottomValue = this._startBottomPos - movedY;
                        this.bottomPos = this.correctPosValue(newBottomValue, 0, this._image.height - this.topPos);
                    }
                }
            }
        }.bind(this);

        this._svg.on('mouseup', unselectDot);
        //this._svg.on('mouseout', unselectDot);
        this._svg.on('mousemove', moveDot);

        window.addEventListener('resize', function ( event ) {
            if (this._image)
                this.resize(this._image.width * this.scale / 100,
                            this._image.height * this.scale / 100);
        }.bind(this));
    },

    'sprite-editor:open-sprite' : function( theSprite ) {
        this.openSprite(theSprite);
    },

    openSprite : function(theSprite) {
        if ( !theSprite)
            return;

        this.$.scaleSlider.disabled = false;
        this.scale = 100;

        this._image = new Image();
        this._image.onload = function () {
            this.resize(this._image.width, this._image.height);
        }.bind(this);
        this._image.src = theSprite;
    },

    _scaleChanged : function() {
        if ( !this._image )
            return;

        this.resize(this._image.width * this.scale / 100,
                    this._image.height * this.scale / 100);
    },

    _onInputChanged: function(event) {
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
        this.$.canvas.width = width;
        this.$.canvas.height = height;

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
        ctx.drawImage( this._image, 0, 0, this.$.canvas.width, this.$.canvas.height );

        this.drawEditElements();
    },

    drawLine: function(startX, startY, endX, endY) {
        var lineAttr = { width: 1, color: 'rgb(0, 255, 0)'};
        return this._svg.line(startX, startY, endX, endY).stroke(lineAttr);
    },

    moveDotTo: function(dot, posX, posY) {
        if (dot)
            dot.move(posX - 3, posY - 3);
    },

    drawDot: function(posX, posY, dotID) {
        var rect = this._svg.rect(6, 6).fill(this.dotNormalColor);
        this.moveDotTo(rect, posX, posY);
        rect.id = dotID;

        rect.on('mousedown', function(event) {
            event.stopPropagation();
            this._selectDot = rect;
            rect.fill(this.dotSelectColor);
            this._mousedownPosX = event.x;
            this._mousedownPosY = event.y;
            this._startLeftPos = this.leftPos;
            this._startRightPos = this.rightPos;
            this._startTopPos = this.topPos;
            this._startBottomPos = this.bottomPos;
        }.bind(this));

        return rect;
    },

    drawEditElements: function() {
        if ( !this._image )
            return;

        this._svg.clear();
        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // 4个边
        this.lineLeft = this.drawLine(this._borderLeft, bcr.bottom, this._borderLeft, bcr.top);
        this.lineRight = this.drawLine(this._borderRight, bcr.bottom, this._borderRight, bcr.top);
        this.lineTop = this.drawLine(bcr.left, this._borderTop, bcr.right, this._borderTop);
        this.lineBottom = this.drawLine(bcr.left, this._borderBottom, bcr.right, this._borderBottom);

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

    leftPosChanged: function() {
        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // move dots
        this.moveDotTo(this.dotL, this._borderLeft, bcr.bottom - bcr.height / 2);
        this.moveDotTo(this.dotLB, this._borderLeft, this._borderBottom);
        this.moveDotTo(this.dotLT, this._borderLeft, this._borderTop);

        // move line left
        if (this.lineLeft)
            this.lineLeft.plot(this._borderLeft, bcr.bottom, this._borderLeft, bcr.top);
    },

    rightPosChanged: function() {
        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // move dots
        this.moveDotTo(this.dotR, this._borderRight, bcr.bottom - bcr.height / 2);
        this.moveDotTo(this.dotRB, this._borderRight, this._borderBottom);
        this.moveDotTo(this.dotRT, this._borderRight, this._borderTop);

        // move line left
        if (this.lineRight)
            this.lineRight.plot(this._borderRight, bcr.bottom, this._borderRight, bcr.top);
    },

    topPosChanged: function() {
        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // move dots
        this.moveDotTo(this.dotT, bcr.left + bcr.width / 2, this._borderTop);
        this.moveDotTo(this.dotLT, this._borderLeft, this._borderTop);
        this.moveDotTo(this.dotRT, this._borderRight, this._borderTop);

        // move line top
        if (this.lineTop)
            this.lineTop.plot(bcr.left, this._borderTop, bcr.right, this._borderTop);
    },

    bottomPosChanged: function() {
        var bcr = this.getCanvasRect();
        this.updateBorderPos(bcr);

        // move dots
        this.moveDotTo(this.dotB, bcr.left + bcr.width / 2, this._borderBottom);
        this.moveDotTo(this.dotLB, this._borderLeft, this._borderBottom);
        this.moveDotTo(this.dotRB, this._borderRight, this._borderBottom);

        // move line bottom
        if (this.lineBottom)
            this.lineBottom.plot(bcr.left, this._borderBottom, bcr.right, this._borderBottom);
    },

    onMouseWheel: function(event) {
        if ( !this._image )
            return;

        event.stopPropagation();
        var newScale = Editor.Utils.smoothScale(this.scale / 100, event.wheelDelta);
        this.scale = newScale * 100;
    }
});

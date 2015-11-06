
Editor.registerPanel( 'sprite-editor.panel', {
    is : 'sprite-editor',

    properties: {
        scale: {
            type: Number,
            value: 100,
            observer: '_scaleChanged'
        }
    },

    ready : function() {
    },

    'sprite-editor:open-sprite' : function( theSprite ) {
        this.openSprite(theSprite);
    },

    openSprite : function(theSprite) {
        if ( !theSprite)
            return;

        this.$.scaleSlider.disabled = false;

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

    resize: function (width, height) {
        this.$.canvas.width = width;
        this.$.canvas.height = height;

        this.repaint();
    },

    repaint: function () {
        var ctx = this.$.canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage( this._image, 0, 0, this.$.canvas.width, this.$.canvas.height );
    },

    onMouseWheel: function(event) {
        if ( !this._image )
            return;

        if (event.wheelDelta)
            this.scale += event.wheelDelta / 20;
    },

});

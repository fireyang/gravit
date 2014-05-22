(function (_) {

    var _fontArray = null;
    var _font = null;

    var request = new XMLHttpRequest();
    request.open('get', 'font/Arial.ttf', true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
        if (request.status !== 200) {
            //return callback('Font could not be loaded: ' + request.statusText);
        }
        _fontArray = request.response;
        _font = opentype.parse(_fontArray);
        if (!_font.supported) {
            return callback('Font is not supported (is this a Postscript font?)');
        }
    };
    request.send();


    /**
     * A text shape
     * @class GXText
     * @extends GXShape
     * @constructor
     */
    function GXText() {
        GXShape.call(this);
        this._setDefaultProperties(GXText.GeometryProperties);
        this._vertices = new GXVertexContainer();
        this._verticesDirty = false;
    }

    GXNode.inherit("text", GXText, GXShape);

    /**
     * The geometry properties of text with their default values
     */
    GXText.GeometryProperties = {
        /** Fixed width or not */
        fw: false,
        /** Fixed height or not */
        fh: false
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXText.Chunk Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @class GXText.Chunk
     * @extends GXNode
     * @mixes GXNode.Store
     * @private
     */
    GXText.Chunk = function (content) {
        GXNode.call(this);
        this._content = content;
    }

    GXNode.inheritAndMix("txChk", GXText.Chunk, GXNode, [GXNode.Store]);

    /**
     * @type {String}
     * @private
     */
    GXText.Chunk.prototype._content = null;

    /**
     * @returns {String}
     */
    GXText.Chunk.prototype.getContent = function () {
        return this._content;
    };

    /** @override */
    GXText.Chunk.prototype.store = function (blob) {
        if (GXNode.Store.prototype.store.call(this, blob)) {
            blob.cnt = this._content;
            return true;
        }
        return false;
    };

    /** @override */
    GXText.Chunk.prototype.restore = function (blob) {
        if (GXNode.Store.prototype.restore.call(this, blob)) {
            this._content = blob.cnt;
            return true;
        }
        return false;
    };

    /** @override */
    GXText.Chunk.prototype.validateInsertion = function (parent, reference) {
        return parent instanceof GXText.Block;
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXText.Break Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @class GXText.Break
     * @extends GXNode
     * @mixes GXNode.Store
     * @private
     */
    GXText.Break = function () {
        GXNode.call(this);
    }

    GXNode.inheritAndMix("txBrk", GXText.Break, GXNode, [GXNode.Store]);

    /** @override */
    GXText.Break.prototype.validateInsertion = function (parent, reference) {
        return parent instanceof GXText.Block;
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXText.Block Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @class GXText.Block
     * @extends GXNode
     * @mixes GXNode.Properties
     * @mixes GXNode.Store
     * @private
     */
    GXText.Block = function () {
        this._setDefaultProperties(GXText.Block.Properties);
    };

    GObject.inheritAndMix(GXText.Block, GXNode, [GXNode.Properties, GXNode.Store]);

    /**
     * The style of a text
     * @enum
     */
    GXText.Block.TextStyle = {
        Normal: 'n',
        Bold: 'b',
        Italic: 'i',
        BoldItalic: 'bi'
    };

    /**
     * The geometry properties of a block with their default values
     */
    GXText.Block.Properties = {
        /** The font family */
        ff: null,
        /** The font size */
        fi: null,
        /** The font style (GXText.Block.TextStyle) */
        fs: null,
        /** The font color */
        fc: null,
        /** The character spacing */
        cs: null,
        /** The word spacing */
        ws: null
    };

    GXText.Block.propertyToCss = function (property, value, css) {
        if (property === 'ff') {
            css['font-family'] = value;
        } else if (property === 'fi') {
            css['font-size'] = value + 'px';
        } else if (property === 'fs') {
            switch (value) {
                case GXText.Block.TextStyle.Normal:
                    css['font-weight'] = 'normal';
                    css['font-style'] = 'normal';
                    break;
                case GXText.Block.TextStyle.Bold:
                    css['font-weight'] = 'bold';
                    css['font-style'] = 'normal';
                    break;
                case GXText.Block.TextStyle.Italic:
                    css['font-weight'] = 'normal';
                    css['font-style'] = 'italic';
                    break;
                case GXText.Block.TextStyle.BoldItalic:
                    css['font-weight'] = 'bold';
                    css['font-style'] = 'italic';
                    break;
            }
        } else if (property === 'fc') {
            css['color'] = value.asCSSString();
        } else if (property === 'cs') {
            css['letter-spacing'] = value + 'px';
        } else if (property === 'ws') {
            css['word-spacing'] = value + 'px';
        } else {
            throw new Error('Unimplemented property (propertyToCss): ' + property);
        }
    };

    GXText.Block.cssToProperty = function (property, css) {
        if (property === 'ff') {
            if (css['font-family']) {
                return css['font-family'];
            }
        } else if (property === 'fi') {
            var value = parseFloat(css['font-size']);
            if (!isNaN(value)) {
                return value;
            }
        } else if (property === 'fs') {
            var bold = css['font-weight'] === 'bold';
            var italic = css['font-style'] === 'italic';

            if (bold && italic) {
                return GXText.Block.TextStyle.BoldItalic;
            } else if (bold) {
                return GXText.Block.TextStyle.Bold;
            } else if (italic) {
                GXText.Block.TextStyle.Italic;
            } else {
                return GXText.Block.TextStyle.Normal;
            }
        } else if (property === 'fc') {
            var value = GXColor.parseCSSColor(css['color']);
            if (value) {
                return value;
            }
        } else if (property === 'cs') {
            var value = parseFloat(css['letter-spacing']);
            if (!isNaN(value)) {
                return value;
            }
        } else if (property === 'ws') {
            var value = parseFloat(css['word-spacing']);
            if (!isNaN(value)) {
                return value;
            }
        } else {
            throw new Error('Unimplemented property (cssToProperty): ' + property);
        }

        return null;
    };

    /**
     * @return {GXText}
     */
    GXText.Block.prototype.getText = function () {
        for (var parent = this.getParent(); parent !== null; parent = parent.getParent()) {
            if (parent instanceof GXText) {
                return parent;
            }
        }
        return null;
    };

    /** @override */
    GXText.Block.prototype.validateInsertion = function (parent, reference) {
        return parent instanceof GXText.Block;
    };

    /** @override */
    GXText.Block.prototype._handleChange = function (change, args) {
        var text = this.getText();

        if (text) {
            if (text._handleGeometryChangeForProperties(change, args, GXText.Block.Properties) && change == GXNode._Change.BeforePropertiesChange) {
                text._verticesDirty = true;
            } else if (change == GXNode._Change.BeforeChildInsert || change == GXNode._Change.BeforeChildRemove) {
                text.beginUpdate();
            } else if (change == GXNode._Change.AfterChildInsert || change == GXNode._Change.AfterChildRemove) {
                text._verticesDirty = true;
                text.endUpdate();
            }
        }

        GXNode.prototype._handleChange.call(this, change, args);
    };

    /**
     * @param {{}} css
     * @returns {{}}
     */
    GXText.Block.prototype.propertiesToCss = function (css) {
        return this._propertiesToCss(css, GXText.Block.Properties, GXText.Block.propertyToCss);
    };

    /**
     * @param {{}} css
     */
    GXText.Block.prototype.cssToProperties = function (css) {
        this._cssToProperties(css, GXText.Block.Properties, GXText.Block.cssToProperty);
    };

    GXText.Block.prototype._propertiesToCss = function (css, propertyMap, propertyConverter) {
        for (var property in propertyMap) {
            var value = this.getProperty(property);
            if (value !== null) {
                propertyConverter(property, value, css);
            }
        }
        return css;
    };

    GXText.Block.prototype._cssToProperties = function (css, propertyMap, propertyConverter) {
        var properties = [];
        var values = [];
        for (var property in propertyMap) {
            var value = propertyConverter(property, css);
            properties.push(property);
            values.push(value);
        }

        if (properties.length > 0) {
            this.setProperties(properties, values);
        }
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXText.Span Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @class GXText.Span
     * @extends GXText.Block
     * @mixes GXNode.Container
     * @private
     */
    GXText.Span = function () {
        GXText.Block.call(this);
        this._setDefaultProperties(GXText.Span.Properties);
    }

    GXNode.inheritAndMix("txSpan", GXText.Span, GXText.Block, [GXNode.Container]);

    /** @override */
    GXText.Span.prototype.validateInsertion = function (parent, reference) {
        return parent instanceof GXText.Paragraph || parent instanceof GXText.Span;
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXText.Paragraph Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @class GXText.Paragraph
     * @extends GXText.Block
     * @mixes GXNode.Container
     * @private
     */
    GXText.Paragraph = function () {
        GXText.Block.call(this);
        this._setDefaultProperties(GXText.Paragraph.Properties);
    }

    GXNode.inheritAndMix("txPara", GXText.Paragraph, GXText.Block, [GXNode.Container]);

    /**
     * Alignment of a paragraph
     * @enum
     */
    GXText.Paragraph.Alignment = {
        Left: 'l',
        Center: 'c',
        Right: 'r',
        Justify: 'j'
    };

    /**
     * Wrap-Mode of a paragraph
     * @enum
     */
    GXText.Paragraph.WrapMode = {
        /**
         * No word-break
         */
        None: 'n',

        /**
         * Break after words only
         */
        Words: 'w',

        /**
         * Break anywhere including characters
         */
        All: 'a'
    };

    /**
     * The geometry properties of a paragraph with their default values
     */
    GXText.Paragraph.Properties = {
        /** Column count */
        cc: null,
        /** Column gap */
        cg: null,
        /** Wrap-Mode of a paragraph (GXText.Paragraph.WrapMode) */
        wm: null,
        /** The paragraph's alignment (GXText.Paragraph.Alignment) */
        al: null,
        /** The first line intendation */
        in: null,
        /** The line height whereas 1 = 100% */
        lh: null,
        /** Top margin */
        mt: null,
        /** Right margin */
        mr: null,
        /** Bottom margin */
        mb: null,
        /** Left margin */
        ml: null
    };

    GXText.Paragraph.propertyToCss = function (property, value, css) {
        if (property === 'cc') {
            value = value || 1;
            css['column-count'] = value;
            css['-webkit-column-count'] = value;
            css['-moz-column-count'] = value;
        } else if (property === 'cg') {
            css['column-gap'] = value;
            css['-webkit-column-gap'] = value;
            css['-moz-column-gap'] = value;
        } else if (property === 'wm') {
            switch (value) {
                case GXText.Paragraph.WrapMode.None:
                    css['white-space'] = 'nowrap';
                    break;
                case GXText.Paragraph.WrapMode.Words:
                    css['white-space'] = 'pre-wrap';
                    break;
                case GXText.Paragraph.WrapMode.All:
                    css['white-space'] = 'pre-wrap';
                    css['word-break'] = 'break-all';
                    break;
            }
        } else if (property === 'al') {
            switch (value) {
                case GXText.Paragraph.Alignment.Left:
                    css['text-align'] = 'left';
                    break;
                case GXText.Paragraph.Alignment.Center:
                    css['text-align'] = 'center';
                    break;
                case GXText.Paragraph.Alignment.Right:
                    css['text-align'] = 'right';
                    break;
                case GXText.Paragraph.Alignment.Justify:
                    css['text-align'] = 'justify';
                    break;
            }
        } else if (property === 'in') {
            css['text-indent'] = value + 'px';
        } else if (property === 'lh') {
            css['line-height'] = value;
        } else if (property === 'mt') {
            css['margin-top'] = value + 'px';
        } else if (property === 'mr') {
            css['margin-right'] = value + 'px';
        } else if (property === 'mb') {
            css['margin-bottom'] = value + 'px';
        } else if (property === 'ml') {
            css['margin-left'] = value + 'px';
        } else {
            throw new Error('Unimplemented property (propertyToCss): ' + property);
        }
    };

    GXText.Paragraph.cssToProperty = function (property, css) {
        if (property === 'cc') {
            var str = css['column-count'] || css['-webkit-column-count'] || css['-moz-column-count'];
            var value = parseInt(str);
            if (!isNaN(value)) {
                return value;
            }
        } else if (property === 'cg') {
            var str = css['column-gap'] || css['-webkit-column-gap'] || css['-moz-column-gap'];
            var value = parseFloat(str);
            if (!isNaN(value)) {
                return value;
            }
        } else if (property === 'wm') {
            var wspace = css['white-space'];
            var wbreak = css['word-break'];

            if (wspace === 'pre-wrap') {
                if (wbreak === 'break-all') {
                    return GXText.Paragraph.WrapMode.All;
                } else {
                    return GXText.Paragraph.WrapMode.Words;
                }
            } else if (wspace === 'nowrap') {
                return GXText.Paragraph.WrapMode.None;
            }
        } else if (property === 'al') {
            if (value === 'left') {
                return GXText.Paragraph.Alignment.Left;
            } else if (value === 'center') {
                return GXText.Paragraph.Alignment.Center;
            } else if (value === 'right') {
                return GXText.Paragraph.Alignment.Right;
            } else if (value === 'justify') {
                return GXText.Paragraph.Alignment.Justify;
            }
        } else if (property === 'in') {
            var value = parseFloat(css['text-indent']);
            if (!isNaN(value)) {
                return value;
            }
        } else if (property === 'lh') {
            var lineHeight = parseFloat(css['line-height']);
            if (!isNaN(lineHeight)) {
                return lineHeight;
            }
        } else if (property === 'mt') {
            var value = parseFloat(css['margin-top']);
            if (!isNaN(value)) {
                return value;
            }
        } else if (property === 'mr') {
            var value = parseFloat(css['margin-right']);
            if (!isNaN(value)) {
                return value;
            }
        } else if (property === 'mb') {
            var value = parseFloat(css['margin-bottom']);
            if (!isNaN(value)) {
                return value;
            }
        } else if (property === 'ml') {
            var value = parseFloat(css['margin-left']);
            if (!isNaN(value)) {
                return value;
            }
        } else {
            throw new Error('Unimplemented property (cssToProperty): ' + property);
        }
        return null;
    };

    /** @override */
    GXText.Paragraph.prototype._handleChange = function (change, args) {
        var text = this.getText();

        if (text) {
            if (text._handleGeometryChangeForProperties(change, args, GXText.Paragraph.Properties) && change == GXNode._Change.BeforePropertiesChange) {
                text._verticesDirty = true;
            }
        }

        GXText.Block.prototype._handleChange.call(this, change, args);
    };

    /** @override */
    GXText.Paragraph.prototype.validateInsertion = function (parent, reference) {
        return parent instanceof GXText.Content;
    };

    /** @override */
    GXText.Paragraph.prototype.propertiesToCss = function (css) {
        this._propertiesToCss(css, GXText.Paragraph.Properties, GXText.Paragraph.propertyToCss);
        return GXText.Block.prototype.propertiesToCss.call(this, css);
    };

    /**
     * @param {{}} css
     */
    GXText.Paragraph.prototype.cssToProperties = function (css) {
        this._cssToProperties(css, GXText.Paragraph.Properties, GXText.Paragraph.cssToProperty);
        GXText.Block.prototype.cssToProperties.call(this, css);
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXText.Content Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @class GXText.Content
     * @extends GXText.Paragraph
     * @private
     */
    GXText.Content = function () {
        GXText.Paragraph.call(this);
        this._flags |= GXNode.Flag.Shadow;

        // Setup default font stuff
        this.$ff = 'Arial';
        this.$fi = 12;
        this.$fs = GXText.Block.TextStyle.Normal;
        this.$lh = 1;
        this.$wm = GXText.Paragraph.WrapMode.All;
    };

    GXNode.inherit("txContent", GXText.Content, GXText.Paragraph);

    /** @override */
    GXText.Content.prototype.validateInsertion = function (parent, reference) {
        return parent instanceof GXText;
    };

    /** @override */
    GXText.Content.prototype.propertiesToCss = function (css) {
        // Setup default color taking care of attributes if any
        var color = 'black';
        var text = this._parent;
        if (text) {
            var fillColor = text.getAttributes().getFillColor();
            if (fillColor) {
                color = fillColor.asCSSString();
            }
        }
        css['color'] = color;

        return GXText.Paragraph.prototype.propertiesToCss.call(this, css);
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXText Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @type {GXText.Content}
     * @private
     */
    GXText.prototype._content = null;

    /**
     * @type {GPoint}
     * @private
     */
    GXText.prototype._size = null;

    /**
     * @type {GXVertexContainer}
     * @private
     */
    GXText.prototype._vertices = null;

    /**
     * @type {boolean}
     * @private
     */
    GXText.prototype._verticesDirty = false;

    /**
     * Returns the content container of the text node
     * @returns {GXText.Content}
     */
    GXText.prototype.getContent = function () {
        // If we have a _content reference and it not
        // has ourself as a parent, then clear it, first
        if (this._content && this._content.getParent() !== this) {
            this._content = null;
        }

        if (!this._content) {
            // Find our content and save reference for faster access
            for (var child = this.getFirstChild(true); child !== null; child = child.getNext(true)) {
                if (child instanceof GXText.Content) {
                    this._content = child;
                    break;
                }
            }

            if (!this._content) {
                this._content = new GXText.Content();
                this.appendChild(this._content);
            }
        }

        return this._content;
    };

    /**
     * Converts the underlying content to a html string
     * @param {Boolean} segments if true, each single character
     * will be enclosed by a span. Defaults to false.
     * Defaults to false.
     * @returns {String}
     */
    GXText.prototype.asHtml = function (segments) {
        var dummy = $('<div></div>');
        this._asHtml(dummy, this.getContent(), segments);
        return dummy.html();
    };

    /**
     * Clears and replaces the contents of this text from
     * a given html string
     * @param {String} html
     */
    GXText.prototype.fromHtml = function (html) {
        this.beginUpdate();
        try {
            var content = this.getContent();

            // Clear our contents
            content.clearChildren(true);

            // Parse html into a dummy element for iterating (if any)
            if (html && html !== "") {
                var doc = document.createElement('div');
                doc.innerHTML = html;
                for (var child = doc.firstChild; child !== null; child = child.nextSibling) {
                    this._fromHtml(child, content);
                }
            }
        } finally {
            this.endUpdate();
        }
    };

    /** @override */
    GXText.prototype.store = function (blob) {
        if (GXShape.prototype.store.call(this, blob)) {
            this.storeProperties(blob, GXText.GeometryProperties);
            return true;
        }
        return false;
    };

    /** @override */
    GXText.prototype.restore = function (blob) {
        if (GXShape.prototype.restore.call(this, blob)) {
            this.restoreProperties(blob, GXText.GeometryProperties);
            this._verticesDirty = true;
            return true;
        }
        return false;
    };

    /** @override */
    GXText.prototype.rewindVertices = function (index) {
        if (this._verticesDirty || this._vertices == null) {
            this._vertices.clearVertices();

            // TODO : Implement this right and into the subclasses!

            // Calculate our actual text box and line length
            var textBox = GRect.fromPoints(new GPoint(0, 0), new GPoint(1, 1));
            if (this.$trf) {
                textBox = this.$trf.mapRect(textBox);
            }

            // Create our temporary container for holding our html contents
            var container = $('<div></div>')
                .css(this.getContent().propertiesToCss({}))
                .css({
                    'position': 'absolute',
                    'top': '0px',
                    'left': '0px',
                    'visibility': 'hidden',
                    'width': textBox.getWidth() > 1 && this.$fw ? textBox.getWidth() + 'px' : '',
                    'height': textBox.getHeight() > 1 && this.$fh ? textBox.getHeight() + 'px' : ''
                })
                .html(this.asHtml(true))
                .appendTo($('body'));

            // Prepare size information
            var maxWidth = null;
            var maxHeight = null;

            container.find('span:not(:has(span))').each(function (index, span) {
                var $span = $(span);
                var rect = span.getBoundingClientRect();
                var fontSize = parseInt($span.css('font-size'));
                var font = _font; // TODO : FIX THIS
                var char = $span.text()[0];
                var glyph = font.charToGlyph(char);
                var scale = 1 / font.unitsPerEm * fontSize;
                var height = (glyph.yMax - glyph.yMin) * scale;

                // Ignore zero height spans and empty spans
                if (rect.height <= 0 || char === ' ') {
                    return;
                }

                // Calculate our span's baseline
                var baseline = rect.top + (height + (((font.ascender) * scale) - height));

                // Calculate our span's real x/y values
                var x = textBox.getX() + rect.left;
                var y = textBox.getY() + baseline;

                // Query the path for the glyph
                var path = glyph.getPath(x, y, fontSize);

                // Add the path to our vertices
                for (var i = 0; i < path.commands.length; i += 1) {
                    var cmd = path.commands[i];
                    if (cmd.type === 'M') {
                        this._vertices.addVertex(GXVertex.Command.Move, cmd.x, cmd.y);
                    } else if (cmd.type === 'L') {
                        this._vertices.addVertex(GXVertex.Command.Line, cmd.x, cmd.y);
                    } else if (cmd.type === 'C') {
                        this._vertices.addVertex(GXVertex.Command.Curve2, cmd.x, cmd.y);
                        this._vertices.addVertex(GXVertex.Command.Curve2, cmd.x1, cmd.y1);
                        this._vertices.addVertex(GXVertex.Command.Curve2, cmd.x2, cmd.y2);
                    } else if (cmd.type === 'Q') {
                        this._vertices.addVertex(GXVertex.Command.Curve, cmd.x, cmd.y);
                        this._vertices.addVertex(GXVertex.Command.Curve, cmd.x1, cmd.y1);
                    } else if (cmd.type === 'Z') {
                        this._vertices.addVertex(GXVertex.Command.Close);
                    }
                }

                // Contribute to size if necessary
                if (maxWidth === null || rect.right > maxWidth) {
                    maxWidth = rect.right;
                }
                if (maxHeight === null || rect.bottom > maxHeight) {
                    maxHeight = rect.bottom;
                }
            }.bind(this));

            // Remove our container now
            container.remove();

            // Assign new size information
            this._size = maxWidth && maxHeight ? new GPoint(maxWidth, maxHeight) : null;

            // We're done here
            this._verticesDirty = false;
        }
        return this._vertices ? this._vertices.rewindVertices(index) : false;
    };

    /** @override */
    GXText.prototype.readVertex = function (vertex) {
        return this._vertices.readVertex(vertex);
    };

    /** @override */
    GXText.prototype._calculateGeometryBBox = function () {
        // Always rewind to ensure integrity
        this.rewindVertices(0);

        // Not having a size means not having a bbox
        if (!this._size) {
            return null;
        }

        var textBox = GRect.fromPoints(new GPoint(0, 0), new GPoint(1, 1));
        if (this.$trf) {
            textBox = this.$trf.mapRect(textBox);
        }

        var width = this.$fw ? textBox.getWidth() : this._size.getX();
        var height = this.$fh ? textBox.getHeight() : this._size.getY();

        return new GRect(textBox.getX(), textBox.getY(), width, height);
    };

    /** @override */
    GXText.prototype._preparePaint = function (context) {
        if (GXShape.prototype._preparePaint.call(this, context)) {
            // Check if we need to clip rect
            var clipBox = this._getClipBox(context);
            if (clipBox) {
                context.canvas.clipRect(clipBox.getX(), clipBox.getY(), clipBox.getWidth(), clipBox.getHeight());
            }

            return true;
        }
        return false;
    };

    /** @override */
    GXText.prototype._finishPaint = function (context) {
        // Reset clipping if done previously
        if (this._getClipBox(context) !== null) {
            context.canvas.resetClip();
        }

        GXShape.prototype._finishPaint.call(this, context);
    };

    /** @override */
    GXText.prototype._detailHitTest = function (location, transform, tolerance, force) {
        // For now, text is always hit-test by its bbox only so return ourself
        // TODO : Add support for detailed range hit test information here
        return new GXElement.HitResult(this);
    };

    /** @override */
    GXText.prototype._handleChange = function (change, args) {
        GXShape.prototype._handleChange.call(this, change, args);

        if (this._handleGeometryChangeForProperties(change, args, GXText.GeometryProperties) && change == GXNode._Change.BeforePropertiesChange) {
            this._verticesDirty = true;
        }

        if (change === GXNode._Change.BeforePropertiesChange) {
            var transformIdx = args.properties.indexOf('trf');
            if (transformIdx >= 0 && !this._verticesDirty) {
                // TODO : Optimize for cases where no invalidation of vertices is required
                /*
                 // Check whether only translation was changed and if that's
                 // the case we'll simply translate our existing vertices,
                 // otherwise we'll invalidate the vertices
                 var newTransform = args.values[transformIdx];
                 var inverseTransform = this.$trf ? this.$trf.inverted() : new GTransform(1, 0, 0, 1, 0, 0);
                 var deltaTransform = newTransform.multiplied(inverseTransform);
                 if (deltaTransform.isIdentity(true)) {
                 if (this._vertices) {
                 var translation = deltaTransform.getTranslation();
                 this._vertices.transformVertices(new GTransform(1, 0, 0, 1, translation.getX(), translation.getY()));
                 }
                 } else {
                 this._verticesDirty = true;
                 }
                 */
                this._verticesDirty = true;
            }
        }
    };

    /**
     * Returns a clip-box if required, otherwise null
     * @param context
     * @returns {GRect}
     * @private
     */
    GXText.prototype._getClipBox = function (context) {
        var bbox = this.getGeometryBBox();
        if (this._size &&
            ((this.$fw && this._size.getX() >= bbox.getWidth()) ||
                (this.$fh && this._size.getY() >= bbox.getHeight()))) {

            return new GRect(bbox.getX(), bbox.getY(),
                this.$fw ? bbox.getWidth() : context.canvas.getWidth(),
                this.$fh ? bbox.getHeight() : context.canvas.getHeight());
        }
        return null;
    };

    /**
     * Convert contents to html
     * @param parent
     * @param node
     * @param segments
     * @private
     */
    GXText.prototype._asHtml = function (parent, node, segments) {
        if (node instanceof GXText.Break) {
            $('<br>')
                .appendTo(parent);
        } else if (node instanceof GXText.Chunk) {
            var content = node.getContent();
            if (content && content !== "") {
                if (segments) {
                    for (var i = 0; i < content.length; ++i) {
                        $('<span></span>')
                            .text(content[i])
                            .appendTo(parent);
                    }
                } else {
                    parent.append(document.createTextNode(content));
                }
            }
        } else if (node instanceof GXText.Content) {
            // ignore root
        } else if (node instanceof GXText.Paragraph) {
            parent = $('<p></p>')
                .css(node.propertiesToCss({}))
                .appendTo(parent);
        } else if (node instanceof GXText.Span) {
            parent = $('<span></span>')
                .css(node.propertiesToCss({}))
                .appendTo(parent);
        }
        if (node.hasMixin(GXNode.Container)) {
            for (var child = node.getFirstChild(); child !== null; child = child.getNext()) {
                this._asHtml(parent, child, segments);
            }
        }
    };

    /**
     * @param element
     * @param parent
     * @private
     */
    GXText.prototype._fromHtml = function (node, parent) {
        if (node.nodeType === 1) {
            var nodeName = node.nodeName.toLowerCase();

            if (nodeName === 'p' || nodeName === 'div') {
                var paragraph = new GXText.Paragraph();
                paragraph.cssToProperties(node.style);
                parent.appendChild(paragraph);
                parent = paragraph;
            } else if (nodeName === 'span' || nodeName === 'b' || nodeName === 'strong' || nodeName === 'i') {
                var span = new GXText.Span();
                span.cssToProperties(node.style);
                parent.appendChild(span);
                parent = span;

                if (nodeName === 'b' || nodeName === 'strong') {
                    span.setProperty('fs', GXText.Block.TextStyle.Bold);
                } else if (nodeName === 'i') {
                    span.setProperty('fs', GXText.Block.TextStyle.Italic);
                }
            } else if (nodeName === 'br') {
                parent.appendChild(new GXText.Break());
                return; // no children for breaks
            } else {
                // ignore the element alltogether
                return;
            }

            for (var child = node.firstChild; child !== null; child = child.nextSibling) {
                this._fromHtml(child, parent);
            }
        } else if (node.nodeType === 3) {
            if (node.textContent !== "") {
                parent.appendChild(new GXText.Chunk(node.textContent));
            }
        }
    };

    /** @override */
    GXText.prototype.toString = function () {
        return "[GXText]";
    };

    _.GXText = GXText;
})(this);
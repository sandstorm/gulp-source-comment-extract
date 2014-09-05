'use strict';
var gutil = require('gulp-util');
var through = require('through2');

var PLUGIN_NAME = 'gulp-source-comment-extract';

var configPerLanguage = {
    'groovy': {
        'openingComment': '/**',
        'comment': '^\\* ?',
        'skipCommentLinesMatchingRegex': '^@[a-z]+',
        'closingComment': '*/'
    }
};

module.exports = function(language, configOverride) {

    var config = configPerLanguage[language];

    if (configOverride) {
        for (var k in configOverride) {
            config[k] = configOverride[k];
        }
    }

    if (!config.commentPostprocessor) {
        config.commentPostprocessor = function(comment, context) {
            return comment;
        }
    }

    var commentRegex = new RegExp(config.comment, 'g');
    var skipCommentLinesMatchingRegex = new RegExp(config.skipCommentLinesMatchingRegex, 'g');

    return through.obj(function(file, enc, cb) {
        var that = this;
        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
            return cb();
        }

        if (file.isBuffer()) {
            var inComment = false;
            var commentsSoFar = [];
            var currentComment;
            file.contents.toString().split('\n').forEach(function(line, i, allLines) {
                line = line.trim();

                var openingCommentIndex = line.indexOf(config.openingComment);
                var closingCommentIndex = line.indexOf(config.closingComment);

                if (openingCommentIndex !== -1 && closingCommentIndex === -1) {
                    // only opening comment found, no closing comment.
                    inComment = true;
                    currentComment = '';
                } else if (openingCommentIndex === -1 && closingCommentIndex !== -1) {
                    // only closing comment found, no opening comment.
                    inComment = false;

                    var context = {
                        followingLineIs: function(value, numberOfLines) {
                            for (var a = i+1; a < i+1+numberOfLines && a < allLines.length; a++) {
                                if (allLines[a].trim() == value) {
                                    return true;
                                }
                            }
                            return false;
                        },
                        followingLineMatches: function(regex, numberOfLines) {
                            for (var a = i+1; a < i+1+numberOfLines && a < allLines.length; a++) {
                                var result = allLines[a].trim().match(regex);
                                if (result) {
                                    return result;
                                }
                            }
                            return false;
                        }
                    }

                    currentComment = config.commentPostprocessor(currentComment, context);
                    if (currentComment) {
                        commentsSoFar.push(currentComment);
                    }
                } else if (openingCommentIndex !== -1 && closingCommentIndex !== -1) {
                    that.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Found opening and closing comments on the same line -- not supported!'));
                } else if (inComment = true) {
                    line = line.replace(commentRegex, '');

                    if (line.match(skipCommentLinesMatchingRegex)) {
                        // ignore this line
                        return;
                    }
                    currentComment += line + '\n';
                }
            });

            file.contents = new Buffer(commentsSoFar.join('\n'));
        }

        // make sure the file goes through the next gulp plugin
        this.push(file);

        // tell the stream engine that we are done with this file
        cb();
    });
};
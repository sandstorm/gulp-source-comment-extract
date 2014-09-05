var assert = require('assert');
var es = require('event-stream');
var fs = require('fs');
var File = require('vinyl');
var commentExtract = require('./index');

describe('gulp-source-comment-extract', function() {
    describe('in buffer mode', function() {
        it('should be able to extract groovy comments', function(done) {

            // create the fake file
            var fakeFile = new File({
                contents: new Buffer(fs.readFileSync('testFixtures/ExampleGroovy.groovy'))
            });

            // Create a prefixer plugin stream
            var myCommentExtractor = commentExtract('groovy');

            // write the fake file to it
            myCommentExtractor.write(fakeFile);

            // wait for the file to come back out
            myCommentExtractor.once('data', function(file) {
                // make sure it came out the same way it went in
                assert(file.isBuffer());

                // check the contents
                assert.equal(file.contents.toString('utf8'), fs.readFileSync('testFixtures/ExampleGroovyOut.txt').toString());
                done();
            });

        });

        it('should be able to post-process the found comments', function(done) {

            // create the fake file
            var fakeFile = new File({
                contents: new Buffer(fs.readFileSync('testFixtures/ExampleGroovy.groovy'))
            });

            // Create a prefixer plugin stream
            var myCommentExtractor = commentExtract('groovy', {
                commentPostprocessor: function(comment, context) {
                    if (!context.followingLineIs('@API', 4) && comment.indexOf('!non-api!') === -1) {
                        // skip blocks which do not have an API annotation, except if they contain "!non-api!"
                        return;
                    }

                    var result;
                    if (result = context.followingLineMatches(/^public [a-zA-Z]+ ([a-zA-Z]+)\(/, 4)) {
                        comment = '## ' + result[1] + '\n\n' + comment;
                    }

                    return comment;
                }
            });

            // write the fake file to it
            myCommentExtractor.write(fakeFile);

            // wait for the file to come back out
            myCommentExtractor.once('data', function(file) {
                // make sure it came out the same way it went in
                assert(file.isBuffer());

                // check the contents
                assert.equal(file.contents.toString('utf8'), fs.readFileSync('testFixtures/ExampleGroovyOutWithPostprocessor.txt').toString());
                done();
            });

        });
    });
});

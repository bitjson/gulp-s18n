'use strict';

var s18n = require('../');
var path = require('path');
var assert = require('assert');
var streamAssert = require('stream-assert');
var gutil = require('gulp-util');
var gulp = require('gulp');
var async = require('async');


var fixtures = function(glob) {
  return path.join(__dirname, 'fixtures', glob);
};

describe('gulp-s18n: s18n.setLocales()', function() {

  it('should be a method', function() {
    assert.equal(typeof s18n.setLocales, 'function');
  });

  it('should ignore null files', function(done) {
    var stream = s18n.setLocales();
    stream
      .pipe(streamAssert.length(0))
      .pipe(streamAssert.end(done));
    stream.write(new gutil.File());
    stream.end();
  });

  it('should error on streamed file', function(done) {
    gulp.src(fixtures('*'), {
        buffer: false
      })
      .pipe(s18n.setLocales())
      .on('error', function(err) {
        assert.equal(err.message, 'streaming not supported');
        done();
      });
  });

});

describe('gulp-s18n: s18n()', function() {

  it('should be a method', function() {
    assert.equal(typeof s18n, 'function');
  });

  it('should ignore null files', function(done) {
    var stream = s18n();
    stream
      .pipe(streamAssert.length(0))
      .pipe(streamAssert.end(done));
    stream.write(new gutil.File());
    stream.end();
  });

  it('should error on streamed file', function(done) {
    gulp.src(fixtures('*'), {
        buffer: false
      })
      .pipe(s18n())
      .on('error', function(err) {
        assert.equal(err.message, 'streaming not supported');
        done();
      });
  });

  it('should s18n with set locales', function(done) {
    gulp.src(fixtures('{de,en,fr}.json'))
      .pipe(s18n.setLocales('en')
        .on('finish', function(err) {
          if (err) {
            console.error(err);
          }
          var results = {};
          var expected = {
            'de/a.html': '<p>Thís ís á tést.</p>\n',
            'fr/a.html': '<p>Thís ís á tést.</p>\n'
          };
          gulp.src(fixtures('a.html'))
            .pipe(s18n())
            .on('data', function(file) {
              results[file.path.replace(file.base, '')] = String(file.contents);
            })
            .on('finish', function() {
              assert.deepEqual(results, expected);
              done();
            });
        }));
  });

  it('should s18n from different locales caches', function(done) {
    gulp.src(fixtures('{de,en,fr}.json'))
      .pipe(s18n.setLocales('en', {
          cacheId: 'first'
        })
        .on('finish', function(err) {
          if (err) {
            console.error(err);
          }
          gulp.src(fixtures('{de,en,es}.json'))
            .pipe(s18n.setLocales('en', {
              cacheId: 'second'
            }))
            .on('finish', function(err) {
              if (err) {
                console.error(err);
              }

              async.parallel([
                  function(cb) {
                    var results1 = {};
                    var expected1 = {
                      'de/a.html': '<p>Thís ís á tést.</p>\n',
                      'fr/a.html': '<p>Thís ís á tést.</p>\n'
                    };
                    gulp.src(fixtures('a.html'))
                      .pipe(s18n({
                        cacheId: 'first'
                      }))
                      .on('data', function(file) {
                        results1[file.path.replace(file.base, '')] = String(file.contents);
                      })
                      .on('finish', function() {
                        assert.deepEqual(results1, expected1);
                        cb(null);
                      });
                  },
                  function(cb) {
                    var results2 = {};
                    var expected2 = {
                      'de/a.html': '<p>Thís ís á tést.</p>\n',
                      'es/a.html': '<p>Thís ís á tést.</p>\n'
                    };
                    gulp.src(fixtures('a.html'))
                      .pipe(s18n({
                        cacheId: 'second'
                      }))
                      .on('data', function(file) {
                        results2[file.path.replace(file.base, '')] = String(file.contents);
                      })
                      .on('finish', function() {
                        assert.deepEqual(results2, expected2);
                        cb(null);
                      });
                  }
                ],
                done
              );
            });
        }));
  });

});
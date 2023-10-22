const brfs = require('brfs');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const gulp = require('gulp');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('node-sass'));
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');


async function js() {
  const b = browserify('./src/js/main.js');
  b.transform('brfs');

  return b.bundle()
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(gulp.dest('./dist/js'))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist/js'));
}

async function css() {
  return gulp.src('./src/scss/main.scss')
    .pipe(rename('bundle.css'))
    .pipe(sourcemaps.init())
    .pipe(sass({outputStyle: 'condensed', includePaths: ['./node_modules']})
      .on('error', sass.logError))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist/css'));
}

async function watch() {
  gulp.watch('src/js/**.js', js);
  gulp.watch('src/scss/**.scss', css);
}


exports.build = gulp.series(js, css);
exports.watch = watch;

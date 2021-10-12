/* eslint-disable */
const gulp = require('gulp');
const del = require('del');
const less = require('gulp-less');
const rollup = require('rollup');
const loadConfigFile = require('rollup/dist/loadConfigFile');
const path = require('path');
const through2 = require('through2');
const Vinyl = require('vinyl');

async function run_rollup(conf) {
  const { options, warnings } = await loadConfigFile(path.resolve(__dirname, conf), { format: 'es' });
  console.log(`We currently have ${warnings.count} warnings`);
  warnings.flush();
  for (const option of options) {
    const bundle = await rollup.rollup(option);
    await Promise.all(option.output.map(bundle.write));
  }
}

function build_source() {
  return run_rollup('rollup.config.js');
}

function clean() {
  return del(['dist']);
}

function css() {
  return gulp.src('less/*.less').pipe(less()).pipe(gulp.dest('dist/'));
}

function watch() {
  gulp.watch('assets/**', gulp.task('assets'));
  gulp.watch('less/*.less', css);
}

function assets() {
  return gulp.src(['assets/**', '!assets/shaders/**']).pipe(gulp.dest('dist'));
}

function shaders() {
  return gulp.src(['src/**/*.glsl', 'assets/**/*.glsl']).pipe(mergeShaders()).pipe(gulp.dest('dist/shaders'));
}

function mergeShaders() {
  const shaders = {};

  function addShader(file, _, cb) {
    if (file.isBuffer()) {
      shaders[file.relative.replace(/\\/g, '/')] = file.contents.toString().replace(/\r\n/g, '\n');
    }
    cb(null, null);
  }

  function flush(cb) {
    const json = JSON.stringify(shaders);
    const file = new Vinyl({
      cwd: __dirname,
      base: './',
      path: 'shaders.json',
      contents: Buffer.from(json)
    });
    this.push(file);
    cb();
  }

  return through2.obj(addShader, flush);
}

gulp.task('clean', clean);

gulp.task('assets', gulp.parallel(css, assets, shaders));

gulp.task('watch', gulp.series(gulp.task('assets'), watch));

gulp.task('release', gulp.series(clean, gulp.parallel(build_source, assets, shaders, css)));

gulp.task('default', gulp.task('watch'));

gulp.task('shaders', shaders);

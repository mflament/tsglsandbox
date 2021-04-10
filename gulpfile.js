const gulp = require('gulp');
const del = require('del');
const less = require('gulp-less');
const rollup = require('rollup');
const loadConfigFile = require('rollup/dist/loadConfigFile');
const path = require('path');

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
    return gulp.src('less/*.less').pipe(less()).pipe(gulp.dest('dist/css'));
}

function watch() {
    gulp.watch('assets/**', gulp.task('assets'));
    gulp.watch('less/*.less', css);
}

function favicons() {
    return gulp.src('assets/favicons/*').pipe(gulp.dest('dist'));
}

function shaders() {
    return gulp.src('assets/shaders/**/*').pipe(gulp.dest('dist/shaders'));
}

function index() {
    return gulp.src('assets/index.html').pipe(gulp.dest('dist'));
}

gulp.task('clean', clean);

gulp.task('assets', gulp.series(favicons, index, css, shaders));

gulp.task('watch', gulp.series(gulp.task('assets'), watch));

gulp.task('release', gulp.series(clean, gulp.parallel(gulp.task('assets'), build_source)));

gulp.task('default', gulp.task('watch'));

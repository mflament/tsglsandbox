import {Path} from "../../src/utils/Path";

test('dirname', () => {
  expect(Path.dirname('/')).toBe('/');
  expect(Path.dirname('/abcd/def')).toBe('/abcd');
  expect(Path.dirname('/abcd/def/')).toBe('/abcd/def');
  expect(Path.dirname('abcd/def')).toBe('abcd');
});

test('join', () => {
  expect(Path.joins('/')).toBe('/');
  expect(Path.joins('')).toBe('');
  expect(Path.joins('.','/')).toBe('./');
  expect(Path.joins('','')).toBe('');
  expect(Path.joins('/', 'abc')).toBe('/abc');
  expect(Path.joins('/', 'abc', 'def')).toBe('/abc/def');
  expect(Path.joins('/', 'abc/', 'def')).toBe('/abc/def');
  expect(Path.joins('/', 'abc', '/def')).toBe('/abc/def');
  expect(Path.joins('/', 'abc/', '/def')).toBe('/abc/def');
});

test('resolve', () => {
  expect(Path.resolve('/')).toBe('/');
  expect(Path.resolve('..')).toBe('');
  expect(Path.resolve('abc', 'file.txt')).toBe('abc/file.txt');
  expect(Path.resolve('abc/../def')).toBe('def');
  expect(Path.resolve('abc/../..')).toBe('');
  expect(Path.resolve('/abc/../..')).toBe('/');
  expect(Path.resolve('/abc', '../file.txt')).toBe('/file.txt');
  expect(Path.resolve('abc', '../file.txt')).toBe('file.txt');
  expect(Path.resolve('abc', '../../file.txt')).toBe('file.txt');
  expect(Path.resolve('/abc', '../../file.txt')).toBe('/file.txt');
})

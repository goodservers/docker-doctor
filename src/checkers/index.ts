import checker from './checker';

const checkers = [];
checkers['http'] = checker('http');
checkers['https'] = checker('https');

export default checkers;

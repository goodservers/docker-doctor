import { httpChecker } from './http';
import { httpsChecker } from './https';

const checkers = [];
checkers['http'] = httpChecker;
checkers['https'] = httpsChecker;

export default checkers;

const { createQueryOptions } = require('./options');

function parseOperator(key) {
  const start = key.indexOf('[');
  const end = key.indexOf(']');
  if (start === -1 || end === -1 || end < start) {
    return [key, 'eq'];
  }
  const field = key.slice(0, start);
  const operator = key.slice(start + 1, end);
  return [field, operator];
}

function parseQueryParams(params, allowedFields) {
  const opts = createQueryOptions();
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value === '') continue;
    if (key === 'sort') {
      parseSortParam(value, opts);
      continue;
    }
    const [field, operator] = parseOperator(key);
    if (!allowedFields[field]) continue;
    opts.addFilter(field, operator, value);
  }
  return opts;
}

function parseSortParam(value, opts) {
  const fields = value.split(',');
  for (let f of fields) {
    f = f.trim();
    if (f === '') continue;
    let desc = false;
    if (f.startsWith('-')) {
      desc = true;
      f = f.slice(1);
    }
    opts.addSort(f, desc);
  }
}

function getPagination(params, defaultLimit) {
  let limit = defaultLimit;
  if (params.limit !== undefined) {
    const parsed = parseInt(params.limit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = parsed;
      if (limit > 100) limit = 100;
    }
  }
  let offset = 0;
  if (params.page !== undefined) {
    const page = parseInt(params.page, 10);
    if (!isNaN(page) && page > 0) {
      offset = (page - 1) * limit;
    }
  } else if (params.offset !== undefined) {
    const parsed = parseInt(params.offset, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }
  return [offset, limit];
}

module.exports = { parseQueryParams, getPagination, parseOperator, parseSortParam };

const { createQueryOptions } = require('./options');

const validFieldName = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function applyFilter(field, filter) {
  switch (filter.operator) {
    case 'eq': return { [field]: { equals: filter.value } };
    case 'ne': return { [field]: { not: filter.value } };
    case 'gt': return { [field]: { gt: filter.value } };
    case 'gte': return { [field]: { gte: filter.value } };
    case 'lt': return { [field]: { lt: filter.value } };
    case 'lte': return { [field]: { lte: filter.value } };
    case 'like': return { [field]: { contains: filter.value } };
    case 'in': return { [field]: { in: filter.value } };
    case 'nin': return { [field]: { notIn: filter.value } };
    default: return {};
  }
}

function ApplyFilters(opts, allowedFields) {
  const where = {};
  for (const [field, filter] of Object.entries(opts.filters)) {
    if (!allowedFields[field]) continue;
    if (!validFieldName.test(field)) continue;
    Object.assign(where, applyFilter(field, filter));
  }
  return { where };
}

function ApplySort(opts, allowedFields) {
  const orderBy = [];
  for (const sort of opts.sort) {
    if (!allowedFields[sort.field]) continue;
    if (!validFieldName.test(sort.field)) continue;
    orderBy.push({ [sort.field]: sort.desc ? 'desc' : 'asc' });
  }
  return { orderBy };
}

function ApplyDefaultSort(opts, defaultField, defaultDesc) {
  if (opts.sort.length === 0) {
    return { orderBy: [{ [defaultField]: defaultDesc ? 'desc' : 'asc' }] };
  }
  return {};
}

module.exports = { ApplyFilters, ApplySort, ApplyDefaultSort };

function createQueryOptions() {
  return {
    filters: {},
    sort: [],
    addFilter(field, operator, value) {
      this.filters[field] = { operator, value };
    },
    addSort(field, desc) {
      this.sort.push({ field, desc });
    },
  };
}

module.exports = { createQueryOptions };

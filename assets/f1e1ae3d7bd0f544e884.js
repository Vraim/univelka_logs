/* Static GitHub Pages data delivery. Offline HTML never loads this file. */
(() => {
  'use strict';
  let snapshot;
  const loaded = new Set(), pending = new Map(), cache = new Map();
  async function json(path) {
    if (!cache.has(path)) cache.set(path, fetch(path).then(async response => {
      if (!response.ok) throw new Error('Data request failed: ' + response.status);
      return response.json();
    }).catch(error => { cache.delete(path); throw error; }));
    return cache.get(path);
  }
  async function table(id) {
    if (loaded.has(id)) return;
    if (!pending.has(id)) pending.set(id, (async () => {
      const rows = (await Promise.all(snapshot.delivery.tables[id].map(json))).flat();
      // Publish only a complete list, so filters and CSV never see partial data.
      snapshot.datasets[id].rows = rows;
      loaded.add(id);
    })().finally(() => pending.delete(id)));
    return pending.get(id);
  }
  window.univelkaDelivery = {
    attach(value) { snapshot = value; },
    ready(id) { return (snapshot.delivery.sections[id] || []).every(key => loaded.has(key)); },
    async section(id) {
      await Promise.all((snapshot.delivery.sections[id] || []).map(table));
    },
    async detail(row) {
      if (!row || !row.__detail) return;
      const [kind, key, path] = row.__detail;
      const values = (await json(path))[key];
      if (values === undefined) throw new Error('Missing detail');
      if (kind === 'rows') row.details = values;
      else snapshot.datasets[kind].by_key[row.__detail[3]] = values;
    }
  };
})();

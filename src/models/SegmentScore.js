const db = require('../config/db');

// Devuelve un Map cellKey → { rating_sum, rating_count } con todas las celdas calificadas
async function getAll() {
  const { rows } = await db.query('SELECT cell_key, rating_sum, rating_count FROM segment_scores');
  return new Map(rows.map((r) => [r.cell_key, r]));
}

// Suma la calificación de un recorrido a cada celda (~100 m) por la que pasó
async function addRating(cellKeys, stars) {
  for (const key of cellKeys) {
    await db.query(
      `INSERT INTO segment_scores (cell_key, rating_sum, rating_count) VALUES ($1, $2, 1)
       ON CONFLICT (cell_key) DO UPDATE SET rating_sum = segment_scores.rating_sum + $2,
         rating_count = segment_scores.rating_count + 1`,
      [key, stars]
    );
  }
}

module.exports = { getAll, addRating };

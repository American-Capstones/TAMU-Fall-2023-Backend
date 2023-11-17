/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTableIfNotExists('user_repositories', table => {
    table.comment('Store repositories per user');
    table.string('user_id').notNullable();
    table.string('repository').notNullable();
    table.primary(['user_id', 'repository']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_repositories');
};

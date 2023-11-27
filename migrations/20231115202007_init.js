/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('pull_requests', table => {
    table.comment('Store properties added by users to pull requests');
    table.string('pull_request_id').notNullable().primary();
    table.string('priority').checkIn(['Blocker', 'Critical', 'Major', 'Minor', 'Trivial', 'None']);
    table.string('description');
    table.timestamps(true, true);
  })
  .createTable('user_repositories', table => {
    table.comment('Store repository information per user');
    table.string('repository').notNullable();
    table.string('user_id').notNullable();
    table.boolean('display').notNullable();
    table.primary(['user_id', 'repository']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('pull_requests').dropTable('user_repositories');
};
